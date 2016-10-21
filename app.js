/*eslint-env node*/
/*************************************************************************************************

  Define global variables for NPM packages and Cloud Foundry environment

*************************************************************************************************/
"use strict";

var express = require('express'),
    cfenv = require("cfenv"),
    appEnv = cfenv.getAppEnv(),
    app = express(),
    session = require('express-session'),
    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    flash = require('connect-flash'),
    passport = require('passport'),
    request = require('request'),
    watson = require('watson-developer-cloud');

require('./config/passport')(passport);
require('dotenv').load();
var chatbot = require('./config/bot.js');


/*************************************************************************************************

  Cloudant Setup

*************************************************************************************************/
var db, dbs, dbu;
var cloudantURL = process.env.CLOUDANT_URL;
var dbLogs = "logs";
var dbSess = "sessions";
var dbUsers = "accounts";
var Cloudant = require('cloudant')(cloudantURL);

function initDBConnection() {

    Cloudant.db.create(dbSess, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dbSess);
        } else {
            console.log("New database created: ", dbSess);
        }
    });

    db = Cloudant.db.use(dbLogs);
    dbs = Cloudant.db.use(dbSess);
    dbu = Cloudant.db.use(dbUsers);
    console.log("Database data initialized.");
}

/************************************************************************************************* 
  
  Configure the Server
  
*************************************************************************************************/
app.use(cookieParser());
app.use(bodyParser());

app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: 'junglecatwithwings',
    resave: true,
    saveUninitialized: true
}));

app.use(morgan('dev')); // log every request to the console
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

initDBConnection();

/************************************************************************************************* 
  
  Routes
  
*************************************************************************************************/
// Define routes.
app.get('/', function(req, res) {
    res.sendfile('./public/index.html');
});

app.get('/chat', function(req, res) {
   if (req.isAuthenticated()) {
        res.sendfile('./public/chat.html');
    } else {
        res.sendfile('./public/login.html');
    }
});

app.get('/login', function(req, res) {
    res.sendfile('./public/login.html');
});

app.get('/logout',
    function(req, res) {
        req.logout();
        res.redirect('/');
    });

app.get('/register', function(req, res) {
    res.sendfile('./public/signup.html');
});

app.get('/schedule', function(req, res) {
    if (req.isAuthenticated()) {
        res.sendfile('./public/schedule.html');
    } else {
        res.sendfile('./public/login.html');
    }
});

/************************************************************************************************* 
  
  User Login and Account Creation
  
*************************************************************************************************/
app.post('/login', function(req, res, next) {
      passport.authenticate('local-login', function(err, user, info) {
        if (err || !user) { res.status(500).json({'message':info}); }
        else {
            req.logIn(user, function(err) {
                if (err) { res.status(500).json({'message':err}); }
                else { res.status(200).json({'username':user.username,'sessions':user.sessions}); }  
            });      
        }
      })(req, res, next);
    }); 

app.post('/signup', function(req, res, next) {
      passport.authenticate('local-signup', function(err, user, info) {
        if (err || !user) { res.status(500).json({'message':info}); }
        else {
            req.logIn(user, function(err) {
                if (err) { res.status(500).json({'message':err}); }
                else { res.status(200).json({'username':user.username,'sessions':user.sessions}); }  
            });      
        }
      })(req, res, next);
    }); 

app.get('/isLoggedIn', function(req, res) {
    var result = {
        outcome: 'failure'
    };
    
    if (req.isAuthenticated()) {
        result.outcome = 'success';
        result.username = req.username;
        result.sessions = req.sessions;
    }
    res.send(JSON.stringify(result, null, 3));
});

/************************************************************************************************* 
  
  Chatbot and Logs
  
*************************************************************************************************/
app.post('/watson', function(req, res) {
    chatbot.sendMessage(req, function(err, data) {
        if (err) {
            console.log("Error in sending message: ", err);
            return res.status(err.code || 500).json(err);
        } else {
            return res.json(data);
        }
    });

}); 

/************************************************************************************************* 
  
  Session Data
  
*************************************************************************************************/
app.post('/sessions', function(req,res) {
    dbs.find({selector: { number: req.body.param}}, function(err, result) {
                if (err) {
                    console.log("There was an error finding the session: ",err);
                    res.status(500).json({"error":err});
                }
                if (result.docs.length === 0) {
                    console.log("No session exists.");
                    res.status(500).json({"error":"No session exists with parameter of "+req.body.param});
                } else {
                    var session = result.docs[0];
                    res.status(200).json(session);
                }
 
            });
});

app.get('/userSessions', function(req,res) {
    console.log("Got request for user sessions: ",req.user);
    var user = req.user.username;
    
    dbu.find({selector: {username: user}}, function(err,result) {
        if(err) {
            console.log("Error finding the user: ",err);
            res.status(500).json({"error":err});
        } else {
            var user = result.docs[0];
            console.log("Result: ",result);
            
            if(user.sessions) {
                console.log("Found sessions: ",JSON.stringify(user.sessions));
                res.status(200).json({"sessions": user.sessions});
            } else {
                res.status(500).json({"error": "No sessions found. Go chat with Watson to add some."});
            }
        }
    });
});

app.post('/updateSessions', function(req,res) {
    console.log("Updating user session list: ",req.body.sessions);
    var user = req.user.username;
    
    dbu.find({selector: {username: user}}, function(err,result){
        if(err) {
            console.log("Couldn't find user to update.");
            res.status(500).json({"error":err});
        } else {
            var doc = result.docs[0];
            
            doc.sessions = req.body.sessions;
            
            dbu.saveDoc(doc, {
                success: function(response, textStatus, jqXHR){
                    res.status(200).json(response);
                },
                error: function(jqXHR, textStatus, errorThrown){
                    res.status(500).json({"error":errorThrown});
                }
            });
        }
    });
});

/************************************************************************************************* 
  
  Start the Server
  
*************************************************************************************************/
app.listen(appEnv.port, '0.0.0.0', function() {
    console.log("server starting on " + appEnv.url);
});
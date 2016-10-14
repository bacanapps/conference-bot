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

/*************************************************************************************************

  Cloudant Setup

*************************************************************************************************/
var db;
var cloudantURL = process.env.CLOUDANT_URL;
var dbname = "logs";
var Cloudant = require('cloudant')(cloudantURL);

function initDBConnection() {

    // Check to see if the "stats" database exists and create 
    Cloudant.db.create(dbname, function(err, body) {
        if (err) {
            console.log("Database already exists: ", dbname);
        } else {
            console.log("New database created: ", dbname);
        }
    });

    db = Cloudant.db.use(dbname);
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
    res.sendfile('./public/schedule.html');
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
                else { res.status(200).json({'username':user.username}); }  
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
                else { res.status(200).json({'username':user.username}); }  
            });      
        }
      })(req, res, next);
    }); 

app.get('/isLoggedIn', function(req, res) {
    var result = {
        outcome: 'failure'
    };
    if (req.isAuthenticated()) {
        res.outcome = 'success';
        res.username = req.username;
    }
    res.send(JSON.stringify(result, null, 3));
});

/************************************************************************************************* 
  
  Start the Server
  
*************************************************************************************************/
app.listen(appEnv.port, '0.0.0.0', function() {
    console.log("server starting on " + appEnv.url);
});

var LocalStrategy = require('passport-local').Strategy;
require('dotenv').load();

var cloudantURL = process.env.CLOUDANT_URL;
var dbname = "accounts";
var Cloudant = require('cloudant')(cloudantURL);

// Create the accounts DB if it doesn't exist
Cloudant.db.create(dbname, function(err, body) {
        if (err) {
            console.log("Database already exists: ",dbname);
        } else {
            console.log("New database created: ", dbname);
        }
});
var db = Cloudant.db.use(dbname);


module.exports = function(passport) {

    var bcrypt = require('bcrypt-nodejs');

    /// used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    // used to deserialize the user
    passport.deserializeUser(function(username, done) {
        db.find({selector: {username: username}}, function(err, result) {
            if (err) {
                return done(err);
            }
            var user = result.docs[0];
            done(null, user);
        });
    });

    passport.use('local-login', new LocalStrategy({
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {
            
            console.log("Got login request");

            // Use Cloudant query to find the user 
            var db = Cloudant.use(dbname);
            db.find({
                selector: {
                    username: username
                }
            }, function(err, result) {
                if (err) {
                    console.log("There was an error finding the user: " + err);
                    return done(null, false, err);
                }
                if (result.docs.length === 0) {
                    console.log("Username was not found");
                    return done(null, false, "Username or password incorrect.");
                }

                // user was found, now determine if password matches
                var user = result.docs[0];
                if (bcrypt.compareSync(password, user.password)) {
                    console.log("Password matches");
                    return done(null, user, null);
                } else {
                    console.log("Password is not correct");
                    return done(null, false, "Username or password incorrect.");
                }
            });
        }
    ));

    passport.use('local-signup', new LocalStrategy({
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {
  
            // Use Cloudant query to find the user just based on user name
            var db = Cloudant.use(dbname);
            db.find({
                selector: {
                    username: username
                }
            }, function(err, result) {
                if (err) {
                    console.log("There was an error registering the user: " + err);
                    return done(null, null, err);
                } else if (result.docs.length > 0) {
                    console.log("Username was found");
                    return done(null, null, "User already exists. Pick another username.");
               
                }

                // create the new user
                var hash_pass = bcrypt.hashSync(password);
                var user = {
                    username: username,
                    password: hash_pass,
                    sessions: []
                };
                console.log("signup User: " + user);
                db.insert(user, function(err, body) {
                    if (err) {
                        console.log("There was an error registering the user: " + err);
                        return done(null, null, err);
                    } else {
                        console.log("User successfully registered.");
                        // successful creation of the user
                        return done(null, user, null);
                    }
                });
            });
        }
    ));
};
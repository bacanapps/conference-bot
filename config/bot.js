var watson = require('watson-developer-cloud');
require('dotenv').load();

var conversationUsername = process.env.CONVERSATION_USERNAME;
var conversationPassword = process.env.CONVERSATION_PASSWORD;
var conversationWorkspace = process.env.CONVERSATION_WORKSPACE;

var cloudantURL = process.env.CLOUDANT_URL;
var dbname = "logs";
var Cloudant = require('cloudant')(cloudantURL);

// Create the accounts DB if it doesn't exist
Cloudant.db.create(dbname, function(err, body) {
    if (err) {
        console.log("Database already exists: ", dbname);
    } else {
        console.log("New database created: ", dbname);
    }
});
var db = Cloudant.db.use(dbname);
var dbs = Cloudant.db.use("sessions");
var dbu = Cloudant.db.use("accounts");

var conversation = watson.conversation({
    url: 'https://gateway.watsonplatform.net/conversation/api',
    username: conversationUsername,
    password: conversationPassword,
    version_date: '2016-07-11',
    version: 'v1'
});

if (!conversationWorkspace) {
    console.log("No workspace detected. Cannot run the Watson Conversation service.");
}

var chatbot = {
    sendMessage: function(req, callback) {
        var sessions = req.sessions;

        buildContextObject(req, function(err, params) {

            if (err) {
                console.log("Error in building the parameters object: ", err);
                return callback(err);
            }

            if (params) {
                conversation.message(params, function(err, data) {
                    if (err) {
                        console.log("Error in sending message: ", err);
                        return callback(err);
                    }

                    console.log("Got response from Watson: ", JSON.stringify(data));
                    console.log("New Message for User ("+req.user.username+") Input: "+data.input.text+" Watson Says: "+data.output.text[0]);

                    updateContextObject(data, function(err, res) {
                        var owner = req.user.username;
                        var conv = data.context.conversation_id;

                        if (data.context.system.dialog_turn_counter > 1) {
                            chatLogs(owner, conv, res);
                        }

                        if (data.context.type && data.context.type !== "selection") {
                            if (data.context.type === "add") {
                                addSession(res.context.sessions[res.context.number], owner);
                                return callback(null, res);
                            } else {
                                console.log("Doing a query of: ", res.context.type);
                                sessionQuery(res.context.type, res.context.param, function(err, sessions) {
                                    if (sessions) {
                                        res.context.sessions = sessions;
                                        res.context.reprompt = "true";
                                        
                                        console.log("Got sessions: ",sessions);
                                        
                                        return callback(null, res);
                                    }

                                });
                            }
                        } else {
                            return callback(null, res);
                        }
                    });
                });
            }

        });
    }
};

function buildContextObject(req, callback) {

    var message = req.body.text;
    var context;

    // Null out the parameter object to start building
    var params = {
        workspace_id: conversationWorkspace,
        input: {},
        context: {}
    };

    if (req.body.context) {
        context = req.body.context;
        params.context = context;
    } else {
        context = '';
    }

    // Set parameters for payload to Watson Conversation
    params.input = {
        text: message // User defined text to be sent to service
    };

    // This is the first message, add the username
    if (message === '' && !context) {
        params.context = {
            username: req.username,
        };

    }

    return callback(null, params);
}

function addSession(session, user) {

    dbu.find({
        selector: {
            username: user
        }
    }, function(err, result) {
        if (err) {
            console.log("Couldn't find user to update.");
        } else {
            var doc = result.docs[0];
            var userSessions = doc.sessions;
            userSessions.push(session);

            doc.sessions = userSessions;

            dbu.insert(doc, function(err, body) {
                if (err) {
                    console.log("There was an error updating the sessions: ",err);
                } else {
                    console.log("User session successfully updated: ",body);
                }
            });
        }
    });
}


function sessionQuery(type, param, callback) {

    var start = new Date();
    var end = start + 3600000;
    var date = new Date();
    var dateString = (date.getMonth() + 1) + '/' + date.getUTCDate() + '/' + date.getFullYear().toString().substr(2,2);

    var query = {
        "selector": {
            "$text": "cognitive"
        },
        "fields": ["short", "number", "title", "abstract", "start", "end", "location", "speakers", "date", "type", "level"]
    };
    
    console.log(dateString);

    if (type === "keyword") {
        query.selector = {
            "$text": param
        };
        query.limit = 3;
    } else if (type === "next") {
        param = dateString;
        query.selector = {
            date: dateString
        };
    } else if (type === "random") {
        param = dateString;
        query.selector = {
            date: dateString
        };
        query.limit = 3;
    } else if (type === "number") {
        query.selector = {
            number: param
        };
        query.limit = 1;
    } else {
        param = "cognitive";
        query.selector = {
            "$text": "cognitive"
        };
        query.limit = 3;
    }

    dbs.find(query, function(err, result) {
        if (err) {
            console.log("There was an error finding the session: ",err);
            return callback(err, null);
        }
        if (result.docs.length === 0) {
            console.log("No session exists.");
            return callback(null, null);
        } else {
            var sessions = result.docs;

            if (type === "next") {
                var counter = 0;
                var group = [];

                for (var i; i < sessions.length; i++) {
                    if (counter < 3) {
                        console.log("Counting");
                        var sessStart = dateObj(sessions[i].start);

                        if (sessStart < end && sessStart > start) {
                            group.push(sessions[i]);
                            counter++;
                        }
                    } else {
                        console.log(group);
                        return callback(null, group);
                    }
                }
            } else {
                console.log("Got some sessions: ", sessions);
                return callback(null, sessions);
            }
        }

    });
}

function updateContextObject(response, callback) {

    var context = response.context;
    var text = '';

    text = response.output.text[0];
    response.output.text = text;
    response.context = context;

    return callback(null, response);
}

function dateObj(d) {
    var parts = d.split(/:|\s/),
        date = new Date();
    if (parts.pop().toLowerCase() === 'pm') parts[0] = (+parts[0]) + 12;
    date.setHours(+parts.shift());
    date.setMinutes(+parts.shift());
    return date;
}

function chatLogs(owner, conversation, response) {

    console.log("response object is: ", response);

    // Blank log file to parse down the response object
    var logFile = {
        inputText: '',
        responseText: '',
        entities: {},
        intents: {},
    };

    logFile.inputText = response.input.text;
    logFile.responseText = response.output.text;
    logFile.entities = response.entities;
    logFile.intents = response.intents;
    logFile.date = new Date();

    var date = new Date();
    var doc = {};

    var query = {
        selector: {
            'conversation': conversation
        }
    };

    db.find(query, function(err, result) {
        if (err) {
            console.log("Couldn't find log file.");
        } else {
            doc = result.docs[0];

            if (result.docs.length === 0) {
                console.log("No log. Creating new one.");

                doc = {
                    owner: owner,
                    date: date,
                    conversation: conversation,
                    lastContext: response.context,
                    logs: []
                };

                doc.logs.push(logFile);

                db.insert(doc, function(err, body) {
                    if (err) {
                        console.log("There was an error creating the log: ", err);
                    } else {
                        console.log("Log successfull created: ", body);
                    }
                });
            } else {
                doc.lastContext = response.context;
                doc.logs.push(logFile);

                db.insert(doc, function(err, body) {
                    if (err) {
                        console.log("There was an error updating the log: ", err);
                    } else {
                        console.log("Log successfull updated: ", body);
                    }
                });
            }
        }
    });
}

module.exports = chatbot;
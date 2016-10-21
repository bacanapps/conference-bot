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

                    updateContextObject(data, function(err, res) {
                        var owner = req.user.username;
                        var conv = data.conversation;

                        chatLogs(owner, conv, res);

                        return callback(null, res);
                    });
                });
            }

        });
    }
};

function buildContextObject(req, callback) {

    var message = req.body.text;
    var context;

    // Null out the parameter obejct to start building
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

function updateContextObject(response, callback) {

    var context = response.context;
    var text = '';

    text = response.output.text[0];
    response.output.text = text;
    response.context = context;

    return callback(null, response);
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
            console.log("Couldn't find log file to update. Creating new.");

            doc = {
                owner: owner,
                date: date,
                conversation: conversation,
                lastContext: response.context,
                logs: []
            };

            doc.logs.push(logFile);

            db.saveDoc(doc, {
                success: function(response, textStatus, jqXHR) {
                    console.log("Log creation success: ",JSON.stringify(response));
                },
                error: function(err, textStatus, errorThrown) {
                    console.log("Log creation failed: ",errorThrown);
                }
            });
        } else {
            doc = result.docs[0];
            doc.lastContext = response.context;
            doc.logs.push(logFile);

            db.saveDoc(doc, {
                success: function(response, textStatus, jqXHR) {
                    console.log("Log file saved: ",JSON.stringify(response));
                },
                error: function(err, textStatus, errorThrown) {
                    console.log("Log save failed: ",errorThrown);
                }
            });
        }
    });
}

module.exports = chatbot;
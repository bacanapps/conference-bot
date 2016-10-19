var watson = require('watson-developer-cloud');
require('dotenv').load();

var conversationUsername = process.env.CONVERSATION_USERNAME;
var conversationPassword = process.env.CONVERSATION_PASSWORD;
var conversationWorkspace = process.env.CONVERSATION_WORKSPACE;

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

    // This is the first message, add the user's name and get their healthcare object
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

module.exports = chatbot;
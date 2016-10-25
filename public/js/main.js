'user strict';
/*************************************************************************************************

  User Registration and Login

*************************************************************************************************/
function register() {
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var message = document.getElementById('message');
    message.innerHTML = '';

    var xhr = new XMLHttpRequest();

    var uri = 'signup';

    var user = {
        'username': username,
        'password': password
    };

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            console.log("Got response from passport: ", JSON.stringify(response));

            if (response.username) {
                window.location = './login';
            } else {
                message.innerHTML = response.message;
                username = '';
                password = '';
            }
        } else {
            console.error('Server error for passport. Return status of: ', xhr.statusText);
        }

        return false;
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    console.log(JSON.stringify(user));
    xhr.send(JSON.stringify(user));
}

function login() {
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var xhr = new XMLHttpRequest();
    var uri = 'login';

    var message = document.getElementById('message');
    message.innerHTML = '';

    var user = {
        'username': username,
        'password': password
    };

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        var response = JSON.parse(xhr.responseText);

        if (xhr.status === 200 && xhr.responseText) {

            console.log("Got response from passport: ", JSON.stringify(response));

            if (response.username) {
                window.location = './chat';
            } else {
                message.innerHTML = response.message;
                username = '';
                password = '';
            }
        } else {
            message.innerHTML = response.message;
            console.error('Server error for passport. Return status of: ', xhr.statusText);
        }

        return false;
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    //console.log(JSON.stringify(user));
    xhr.send(JSON.stringify(user));
}

function checkStatus() {
    var login = document.getElementById('login');
    var logout = document.getElementById('logout');
    var register = document.getElementById('register');

    var xhr = new XMLHttpRequest();
    var path = '/isLoggedIn';
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var reply = JSON.parse(xhr.responseText);
            console.log("Reply: ", reply);

            if (reply.outcome === 'success') {
                login.style.display = 'none';
                logout.style.display = 'inherit';
                register.style.display = 'none';
                window.location = './schedule';
            }
        } else {
            login.style.display = 'inherit';
            logout.style.display = 'none';
            register.style.display = 'inherit';

        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}

/*************************************************************************************************

  Chatbot Display and Post Calls

*************************************************************************************************/
var params = {};
var text = '';
var bot = 'Watson';
var user = '';
var context;

function newEvent(e, target) {

    if (e.which === 13 || e.keyCode === 13) {
        e.preventDefault();

        if (target === 'message') {

            var userInput = document.getElementById('chatMessage').value;
            text = userInput.replace(/(\r\n|\n|\r)/gm, "");

            if (text) {
                userInput = '';
                displayMessage(text, user);
                userMessage(text);
            } else {
                console.error("No message.");
                userInput = '';

                return false;
            }
        } else if (target === 'login') {
            login();
        }
    }
}

function displayMessage(text, user) {

    var chat = document.getElementById('chatFeed');
    var bubble = document.createElement('div');
    var input = document.getElementById('chatMessage');

    if (user === bot) {
        bubble.className = "bubble watson";
        bubble.innerHTML = "<p>" + text + "</p>";
    } else {
        bubble.className = "bubble user";
        bubble.innerHTML = "<p>" + text + "</p>";
    }

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;

    input.value = '';
    input.focus();
}

function userMessage(message) {

    params.text = message;

    if (context) {
        params.context = context;
    }

    var xhr = new XMLHttpRequest();
    var uri = '/watson';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            text = response.output.text;
            context = response.context;

            console.log("Got response from Watson: ", JSON.stringify(response));

            displayMessage(text, bot);
            
            if(context.reprompt === "true") {
                context.reprompt = "false";
                userMessage(response.input.text);
            }

        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    console.log(JSON.stringify(params));
    xhr.send(JSON.stringify(params));
}

/*************************************************************************************************

  Sessions Schedule Build and Styling

*************************************************************************************************/
var sessions = [];

function getSessions() {
    var xhr = new XMLHttpRequest();
    var uri = '/userSessions';

    xhr.open('GET', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        var response = xhr.responseText;

        if (xhr.status === 200 && xhr.responseText) {

            //console.log("Got response from server: ", response);
            sessions = (JSON.parse(response)).sessions;

            for (var i = 0; i < sessions.length; i++) {
                var sessList = document.getElementById('mySessions');
                var currSess = sessions[i];
                var sessText = currSess.date + " " + currSess.start + " | " + currSess.number + " - " + currSess.title;

                var sessItem = document.createElement('LI');
                sessItem.setAttribute("id", i);

                if (currSess.status === "checked") {
                    sessItem.className = "sessionItem checked";
                } else {
                    sessItem.className = "sessionItem";

                }

                sessItem.innerHTML = sessText;

                var span = document.createElement("SPAN");
                var txt = document.createTextNode("\u00D7");
                span.className = "close";
                span.appendChild(txt);

                sessItem.appendChild(span);
                sessList.appendChild(sessItem);

            }

            listListener();

        } else {
            console.error('Server error for request. Return status of: ', xhr.statusText);
            sessList.innerHTML = response.error;
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    xhr.send();
}

function listListener() {
    var sessList = document.getElementById("mySessions");
    sessList.addEventListener('click', function(ev) {
        if (ev.target.tagName === 'LI') {
            ev.target.classList.toggle('checked');
            updateList(ev.target.id, "checked");
        }
    }, false);

    var closeItems = document.getElementsByClassName("close");
    for (var i = 0; i < closeItems.length; i++) {
        closeItems[i].onclick = function() {
            var div = this.parentElement;
            div.style.display = "none";
            updateList(div.id,"delete");
        };
    }
}  

function updateList(id, action) {
    var sessItem = sessions[id];
    console.log(sessItem);

    if (action === "checked") {
        if(sessItem.status === "checked") {
            sessItem.status = "unchecked";
        } else {
            sessItem.status = action;
        }
        sessions[id] = sessItem;
    } else if (action === "delete") {
        sessions.splice(id, 1);
        console.log(sessions);
    }

        var xhr = new XMLHttpRequest();
        var uri = '/updateSessions';

        var params = {
            sessions: sessions
        };

        xhr.open('POST', uri, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            var response = xhr.responseText;

            if (xhr.status === 200 && xhr.responseText) {
                console.log("Success updated session list for user.");
            } else {
                console.error('Server error for request. Return status of: ', xhr.statusText);
            }
        };

        xhr.onerror = function() {
            console.error('Network error trying to send message!');
        };
        
        xhr.send(JSON.stringify(params));   
}
function register() {
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var message = document.getElementById('message');
    message.innerHTML = '';

    var xhr = new XMLHttpRequest();

    var uri = 'signup';
    
    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        var reply;
        console.log("Status: ",xhr.status);

        if (xhr.responseText) {
            reply = JSON.parse(xhr.responseText);
            console.log(reply);
          
            if (reply.outcome === 'success') {
                window.location = './login';
            } else {
                message.innerHTML = reply;
                username = '';
                password = '';
            }
        } else {
            console.log('Request failed.  Returned status of ' + xhr.status);
        }

    };
    
    xhr.send(encodeURI('username=' + username + '&password=' + password));
}

function login() {
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var xhr = new XMLHttpRequest();
    var uri = 'login';

    var message = document.getElementById('message');
    message.innerHTML = '';
    
    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        var reply = JSON.parse(xhr.responseText);
        console.log(xhr.status);

        if (xhr.responseText) {

            if (reply.outcome === 'success') {
                window.location = './chat';
            } else {
                message.innerHTML = reply;
                username = '';
                password = '';
            }

        } else {
            console.log('Request failed.  Returned status of ' + xhr.status);
        }
    };
    
    xhr.send(encodeURI('username=' + username + '&password=' + password));
}

// Enter is pressed
function newEvent(e, target) {
    if (e.which == 13 || e.keyCode == 13) {

        if (target == "login") {
            login();
        }
    }
}

function checkStatus() {
    var login = document.getElementById('login');
    var logout = document.getElementById('logout');
    var register = document.getElementById('register');

    var xhr = new XMLHttpRequest();
    var path = '/isLoggedIn';
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var reply = JSON.parse(xhr.responseText);
            console.log("Reply: ",reply);
            
            if (reply.outcome == 'success') {
                login.style.display = 'none';
                logout.style.display = 'inherit';
                register.style.display = 'none';
                window.location = './chat';
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
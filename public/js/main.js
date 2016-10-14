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

        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            console.log("Got response from passport: ", JSON.stringify(response));
            
            if(response.username) {
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

        // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            console.log("Got response from passport: ", JSON.stringify(response));
            
            if(response.username) {
                window.location = './chat';
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
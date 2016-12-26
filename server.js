var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');
users = [];
connections = [];

app.use('/public', express.static(__dirname + '/public'));

server.listen(process.env.PORT || 3000);

console.log('server listening on port 3000...');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function(socket){
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    //Disconnect
    socket.on('disconnect', function(data){
        users.splice(users.indexOf(socket.nickname), 1);
        updateNicknames();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length);
    });

    //Send Message
    socket.on('sendMessage', function(data){
        io.sockets.emit('newMessage', {msg: data, user: socket.nickname, time: moment().format("h:mm A")});
    });

    //New User
    socket.on('newUser', function(data, callback){
        if (users.indexOf(data) === -1) {
            callback(true);
            socket.nickname = data;
            users.push(socket.nickname);
            updateNicknames();
        }else{
            callback(false);
        }
    });

    function updateNicknames(){
        io.sockets.emit('getUsers', users);
    }
});

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');
users = []; //list of nicknames
userInChannel = {}; //hashmap: nickname=>channel
channels = ["General", "Channel 1", "Channel 2", "Channel 3", "Channel 15"];
defaultChannel = "General";

app.use('/public', express.static(__dirname + '/public'));

server.listen(process.env.PORT || 3000);

console.log('server listening on port 3000...');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function(socket){

    //Emit channels array
    socket.emit('setup', {
        channels: channels,
        default: defaultChannel
    });

    //Disconnect
    socket.on('disconnect', function(data){
        io.in(socket.channel).emit('disconnectMessage', {user: socket.nickname, time: moment().format("h:mm A")});
        users.splice(users.indexOf(socket.nickname), 1);
        delete userInChannel[socket.nickname];
        sendOnlineUsersList(socket.channel);
    });

    //Send Message
    socket.on('sendMessage', function(data){
        io.in(data.channel).emit('newMessage', {msg: data.msg, user: socket.nickname, time: moment().format("h:mm A")});
    });

    //Switch channel
    socket.on('switchChannel', function(data) {
        socket.leave(data.oldChannel);
        socket.join(data.newChannel);
        socket.channel = data.newChannel;
        userInChannel[socket.nickname] = socket.channel;
        io.in(data.oldChannel).emit('disconnectMessage', {user: socket.nickname, time: moment().format("h:mm A")});
        io.in(data.newChannel).emit('connectMessage', {user: socket.nickname, time: moment().format("h:mm A")});
        sendOnlineUsersList(data.oldChannel);
        sendOnlineUsersList(data.newChannel);
    });

    //New User
    socket.on('newUser', function(data, callback){
        if (users.indexOf(data) === -1) {
            callback(true);
            socket.nickname = data;
            socket.channel = defaultChannel;
            userInChannel[socket.nickname] = socket.channel;
            users.push(socket.nickname);
            socket.join(defaultChannel);
            sendOnlineUsersList(defaultChannel);
            io.in(defaultChannel).emit('connectMessage', {user: socket.nickname, time: moment().format("h:mm A")});
        }else{
            callback(false);
        }
    });

    function sendOnlineUsersList(channel){
        var list = [];
        for(var user in userInChannel){
            if (!userInChannel.hasOwnProperty(user)) {
                continue;
            }
            if(userInChannel[user] === channel){//if user is in current channel
                list.push(user);
            }
        }
        io.in(channel).emit('getUsers', list);
    }
});

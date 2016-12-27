var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');

var db = require('./models/db');
Message = require('./models/messages');

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

//TESTING
app.get('/setup', function(req, res) {
  //TEST DATA
  var chatData = [{
    content: 'Hello world',
    user: 'Chris',
    time: '12:30 AM',
    channel: 'General'
  }, {
    content: 'Hi Chris, how are you doing?',
    user: 'Jonathan',
    time: '2:30 PM',
    channel: 'Channel 1'
  }, {
    content: 'WazzzuP!!!!!',
    user: 'Paul',
    time: '6:30 PM',
    channel: 'Channel 2'
  }, {
    content: 'Heya Paul! xD',
    user: 'Jonathan',
    time: '6:32 PM',
    channel: 'Channel 2'
  }];

  //Loop through each of the test data and insert into the database
  for (i = 0; i < chatData.length; i++) {
    //Create an instance of the chat model
    var message = new Message(chatData[i]);

    //Insert the message into mongodb
    message.save(function(err, data) {});
  }

  //Send a response so the serve would not get stuck
  res.send('test data inserted');
});

//View the chat history of a channel
app.get('/chathistory', function(req, res) {
  if(req.query.channel === undefined){
    Message.find().sort({date: 'desc'}).exec(function(err, data) {
        res.json(data);
    });
  }else{
    Message.find({
        'channel': req.query.channel
    }).sort({date: 'desc'}).exec(function(err, data) {
        res.json(data);
    });
  }

});

//Clear history
app.get('/clearhistory', function(req, res) {
    Message.remove({}, function(){
        res.send('chat history cleared');
    });
});

io.sockets.on('connection', function(socket){

    //Emit channels array on first connect
    socket.emit('setup', {
        channels: channels,
        default: defaultChannel
    });

    //Emit default channel chat history on first connect
    Message.find({'channel': defaultChannel}).sort({date: 'asc'}).exec(function(err, data) {
        socket.emit('chathistory', {
            messages: data
        });
    });



    //Disconnect
    socket.on('disconnect', function(data){
        var currentTime = moment().format("h:mm A");
        var message = new Message({
            user: socket.nickname,
            time: currentTime,
            date: new Date(),
            channel: socket.channel,
            messageType: 2
        });
        //save message to db
        message.save(function(err, msg){
            io.in(socket.channel).emit('disconnectMessage', {user: socket.nickname, time: currentTime});
        });
        users.splice(users.indexOf(socket.nickname), 1);
        delete userInChannel[socket.nickname];
        sendOnlineUsersList(socket.channel);
    });

    //Send Message
    socket.on('sendMessage', function(data){
        var currentTime = moment().format("h:mm A");
        var message = new Message({
            content: data.msg,
            user: socket.nickname,
            time: currentTime,
            date: new Date(),
            channel: data.channel
        });
        //save message to db
        message.save(function(err, msg){
            //broadcast message to users in the channel
            io.in(data.channel).emit('newMessage', {msg: data.msg, user: socket.nickname, time: currentTime});
        });
    });

    //Switch channel
    socket.on('switchChannel', function(data) {
        socket.leave(data.oldChannel);
        socket.join(data.newChannel);
        socket.channel = data.newChannel;
        userInChannel[socket.nickname] = socket.channel;

        //Emit new channel chat history to current socket
        Message.find({'channel': data.newChannel}).sort({date: 'asc'}).exec(function(err, data) {
            socket.emit('chathistory', {
                messages: data
            });
        });

        var currentTime = moment().format("h:mm A");

        var message = new Message({
            user: socket.nickname,
            time: currentTime,
            date: new Date(),
            channel: data.oldChannel,
            messageType: 2
        });
        message.save(function(err, msg){
            if(err){
                console.log(err);
            }
            io.in(data.oldChannel).emit('disconnectMessage', {user: socket.nickname, time: currentTime});
        });
        var _message = new Message({
            user: socket.nickname,
            time: currentTime,
            date: new Date(),
            channel: data.newChannel,
            messageType: 1
        });
        _message.save(function(err, msg){
            if(err){
                console.log(err);
            }
            io.in(data.newChannel).emit('connectMessage', {user: socket.nickname, time: currentTime});
        });

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
            var currentTime = moment().format("h:mm A");
            var message = new Message({
                user: socket.nickname,
                time: currentTime,
                date: new Date(),
                channel: socket.channel,
                messageType: 1
            });
            //save message to db
            message.save(function(err, msg){
                io.in(defaultChannel).emit('connectMessage', {user: socket.nickname, time: currentTime});
            });
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

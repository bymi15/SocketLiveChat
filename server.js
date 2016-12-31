var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');

var db = require('./models/db');
Message = require('./models/messages');
PrivateChannel = require('./models/privatechannels');

users = []; //list of nicknames
userInChannel = {}; //hashmap: nickname=>channel
channels = ["General", "Channel 1", "Channel 2", "Channel 3"];
defaultChannel = "General";

app.use('/public', express.static(__dirname + '/public'));

server.listen(process.env.PORT || 3000);

console.log('server listening on port 3000...');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

//TESTING ROUTES
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

//Private channels
app.get('/privatechannels', function(req, res) {
  if(req.query.channel === undefined){
    PrivateChannel.find().sort({date: 'desc'}).exec(function(err, data) {
        res.json(data);
    });
  }else{
    PrivateChannel.find({
        'creator': req.query.creator
    }).sort({date: 'desc'}).exec(function(err, data) {
        res.json(data);
    });
  }

});

io.sockets.on('connection', function(socket){

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
        });

        sendOnlineUsersList(data.oldChannel);
        sendOnlineUsersList(data.newChannel);
    });

    socket.on('doneLoadingChat', function(data){
        io.in(data).emit('connectMessage', {user: socket.nickname, time: moment().format("h:mm A")});
    });

    //Change channel private
    socket.on('channelPrivate', function(data, callback){
        privateChannelExists(data.newChannel, function(exists){
            if(exists){
                authenticateChannel(data.newChannel, data.passcode, function(authorized){
                        if(authorized){
                            getChannelCreator(data.newChannel, function(creator){
                                io.in(data.oldChannel).emit('changeChannelPrivate', {authorized: true, channelName: data.newChannel, creator: creator});
                            });
                        }else{
                            io.in(data.oldChannel).emit('changeChannelPrivate', {authorized: false, error: '<strong>Oops!</strong> the passcode for the channel: <strong>' + data.newChannel + '</strong> is incorrect.'});
                        }
                    });
            }else{
                io.in(data.oldChannel).emit('changeChannelPrivate', {authorized: false, error: '<strong>Oops!</strong> the channel: <strong>' + data.newChannel + '</strong> does not exist. Please try a different one.'});
            }
        });
    });

    //New User - join public channel
    socket.on('newUser', function(nickname, callback){
        if (users.indexOf(nickname) === -1) {
            callback(true);
            socket.nickname = nickname;
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

            setup(socket);

            //save message to db
            message.save(function(err, msg){
                if(err){
                    console.log(err);
                }
            });
        }else{
            callback(false);
        }
    });

    //New User - join private channel
    socket.on('joinPrivateChannel', function(data, callback){
        if (users.indexOf(data.nickname) === -1) {
            socket.nickname = data.nickname;
            privateChannelExists(data.channelName, function(exists){
                if(exists){
                    authenticateChannel(data.channelName, data.passcode, function(authorized){
                        if(authorized){
                            socket.channel = data.channelName;
                            userInChannel[socket.nickname] = socket.channel;
                            users.push(socket.nickname);
                            socket.join(data.channelName);
                            sendOnlineUsersList(data.channelName);

                            var currentTime = moment().format("h:mm A");
                            var message = new Message({
                                user: socket.nickname,
                                time: currentTime,
                                date: new Date(),
                                channel: socket.channel,
                                messageType: 1
                            });

                            setup(socket);

                            getChannelCreator(data.channelName, function(creator){
                                callback(true, {channelName: data.channelName, creator: creator});
                            });

                            message.save(function(err, msg){
                                if(err){
                                    console.log(err);
                                }
                            });
                        }else{
                            callback(false, '<strong>Oops!</strong> the passcode for the channel: <strong>' + data.channelName + '</strong> is incorrect.');
                        }
                    });
                }else{
                    callback(false, '<strong>Oops!</strong> the channel: <strong>' + data.channelName + '</strong> does not exist. Please try a different one.');
                }
            });
        }else{
            callback(false, '<strong>Oops!</strong> the nickname <strong>' + data.nickname + '</strong> is taken. Please try a different one.');
        }
    });

    //New User - create private channel
    socket.on('createPrivateChannel', function(data, callback){
        if (users.indexOf(data.nickname) === -1) {
            socket.nickname = data.nickname;
            privateChannelExists(data.channelName, function(exists){
                if(!exists){
                    createPrivateChannel(data.channelName, data.passcode, data.nickname);

                    socket.channel = data.channelName;
                    userInChannel[socket.nickname] = socket.channel;
                    users.push(socket.nickname);
                    socket.join(data.channelName);
                    sendOnlineUsersList(data.channelName);

                    var currentTime = moment().format("h:mm A");
                    var message = new Message({
                        user: socket.nickname,
                        time: currentTime,
                        date: new Date(),
                        channel: socket.channel,
                        messageType: 1
                    });

                    setup(socket);

                    callback(true, {channelName: data.channelName, creator: data.nickname});

                    message.save(function(err, msg){
                        if(err){
                            console.log(err);
                        }
                    });
                }else{
                    callback(false, '<strong>Oops!</strong> the channel name <strong>' + data.channelName + '</strong> is taken. Please try a different one.');
                }
            });
        }else{
            callback(false, '<strong>Oops!</strong> the nickname <strong>' + data.nickname + '</strong> is taken. Please try a different one.');
        }
    });

    function setup(socket){
        //Emit channels array
        socket.emit('setup', {
            channels: channels,
            channel: socket.channel
        });

        //Emit default channel chat history
        Message.find({channel: socket.channel}).sort({date: 'asc'}).exec(function(err, data) {
            socket.emit('chathistory', {
                messages: data
            });
        });
    }

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

    function authenticateChannel(channelName, passcode, callback){
        PrivateChannel.findOne({channelName: channelName, passcode: passcode}).exec().then(function(data){
            if(data){
                callback && callback(true);
            }else{
                callback && callback(false);
            }
        }, function(err) {
            callback && callback(false);
        });
    }

    function getChannelCreator(channelName, callback){
        PrivateChannel.findOne({channelName: channelName}).exec().then(function(data){
            if(data){
                callback && callback(data.creator);
            }else{
                callback && callback(false);
            }
        }, function(err) {
            callback && callback(false);
        });
    }

    function privateChannelExists(channelName, callback){
        PrivateChannel.findOne({channelName: channelName}).exec().then(function(data){
            if(data){
                callback && callback(true);
            }else{
                callback && callback(false);
            }
        }, function(err) {
            callback && callback(false);
        });
    }

    function createPrivateChannel(channelName, passcode, creator){
        var channel = new PrivateChannel({channelName: channelName, passcode: passcode, creator: creator, date: new Date()});
        channel.save();
    }
});

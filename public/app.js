$(function(){

    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');
    var $messageArea = $('#messageArea');
    var $userArea = $('#userArea');
    var $userForm = $('#userForm');
    var $users = $('#users');
    var $nickname = $('#nickname');

    //Check connection status
    var checkConnection = setInterval(function() {
        if(!socket.connected){
            $messageArea.prepend('<div class="col-md-12"><div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><strong>Error!</strong> Lost connection with the server. Please refresh the page.</div></div>');
            $message.attr('disabled', 'true');
            clearInterval(checkConnection);
        }
    }, 1000);

    //send message button
    $messageForm.submit(function(e){
        e.preventDefault();
        if($message.val().trim() != ''){
            socket.emit('sendMessage', $message.val());
            $message.val('');
        }
    });

    //send message enter key
    $message.keydown(function(e){
        if((e.keyCode || e.which) == 13 && !e.shiftKey){ //enter key pressed
            e.preventDefault();

            if($message.val().trim() != ''){
                socket.emit('sendMessage', $message.val());
                $message.val('');
            }
        }
    });

    //receive message
    socket.on('newMessage', function(data){
        $msg = $('<div class="well" style="word-wrap: break-word;"><strong>[' + data.time + ']</strong> <strong style="color: #00BAD5;">' + data.user + '</strong>: ' + data.msg + '</div>');
        $msg.hide();
        $chat.append($msg);
        $msg.show('fast', function(){
            $chat[0].scrollTop = $chat[0].scrollHeight;
        });
    });

    //receive connect message
    socket.on('connectMessage', function(data){
        $msg = $('<div class="well" style="word-wrap: break-word;"><strong>[' + data.time + ']</strong> <strong style="color: #00BAD5;">' + data.user + '</strong> has <span style="color: #70E810">connected</span> to the chat</div>');
        $msg.hide();
        $chat.append($msg);
        $msg.show('fast', function(){
            $chat[0].scrollTop = $chat[0].scrollHeight;
        });
    });

    //receive disconnect message
    socket.on('disconnectMessage', function(data){
        $msg = $('<div class="well" style="word-wrap: break-word;"><strong>[' + data.time + ']</strong> <strong style="color: #00BAD5;">' + data.user + '</strong> has <span style="color: red">disconnected</span> from the chat</div>');
        $msg.hide();
        $chat.append($msg);
        $msg.show('fast', function(){
            $chat[0].scrollTop = $chat[0].scrollHeight;
        });
    });

    //join chat
    $userForm.submit(function(e){
        e.preventDefault();
        if($nickname.val().trim() == '') return;
        socket.emit('newUser', $nickname.val(), function(data){
            if(data){
                $userArea.hide();
                $messageArea.show();
                $nickname.val('');
            }else{
                $userForm.append('<div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><strong>Oops!</strong> the nickname <strong>' + $nickname.val() + '</strong> is taken. Please try a different one.</div>');
            }
        });
    });

    //receive online users information
    socket.on('getUsers', function(data){
        var html = '';
        for(i = 0; i < data.length; i++){
            html += '<li class="list-group-item" style="color: #00BAD5;">' + data[i] + '</li>';
        }
        $users.html(html);
    });


});

$(function(){ //document ready

    var socket = io.connect();
    var $messageForm = $('#messageForm');
    var $message = $('#message');
    var $chat = $('#chat');
    var $messageArea = $('#messageArea');
    var $userArea = $('#userArea');
    var $userForm = $('#userForm');
    var $users = $('#users');
    var $nickname = $('#nickname');
    var $channelsTab = $('#channelsTab');
    var channels = []
    var currentChannel = "General";
    var nickname;

    var $channelName = $('#channelName');
    var $passcode = $('#passcode');
    var $btnPublic = $('#joinPublicChannel');
    var $btnJoinPrivate = $('#joinPrivateChannel');
    var $btnCreatePrivate = $('#createPrivateChannel');

    //Join public channel or join/create private channel
    $nickname.focus();
    $nickname.keyup(function(e){
        if($nickname.val().trim() != ''){
            $btnPublic.attr('disabled', false);
        }else{
            $btnPublic.attr('disabled', true);
        }
        if($nickname.val().trim() != '' && $channelName.val().trim() != '' && $passcode.val().trim() != ''){
            $btnJoinPrivate.attr('disabled', false);
            $btnCreatePrivate.attr('disabled', false);
        }else{
            $btnJoinPrivate.attr('disabled', true);
            $btnCreatePrivate.attr('disabled', true);
        }
    });
    $channelName.keyup(function(e){
        if($nickname.val().trim() != '' && $channelName.val().trim() != '' && $passcode.val().trim() != ''){
            $btnJoinPrivate.attr('disabled', false);
            $btnCreatePrivate.attr('disabled', false);
        }else{
            $btnJoinPrivate.attr('disabled', true);
            $btnCreatePrivate.attr('disabled', true);
        }
    });
    $passcode.keyup(function(e){
        if($nickname.val().trim() != '' && $channelName.val().trim() != '' && $passcode.val().trim() != ''){
            $btnJoinPrivate.attr('disabled', false);
            $btnCreatePrivate.attr('disabled', false);
        }else{
            $btnJoinPrivate.attr('disabled', true);
            $btnCreatePrivate.attr('disabled', true);
        }
    });
    $("#modalJoinPrivate").on('keyup', '#modalJoinPrivate-channelName', function(e){
        if($("#modalJoinPrivate-channelName").val().trim != '' && $("#modalJoinPrivate-passcode").val().trim() != ''){
            $("#modalJoinPrivate-joinbtn").attr('disabled', false);
        }else{
            $("#modalJoinPrivate-joinbtn").attr('disabled', true);
        }
    });
    $("#modalJoinPrivate").on('keyup', '#modalJoinPrivate-passcode', function(e){
        if($("#modalJoinPrivate-channelName").val().trim != '' && $("#modalJoinPrivate-passcode").val().trim() != ''){
            $("#modalJoinPrivate-joinbtn").attr('disabled', false);
        }else{
            $("#modalJoinPrivate-joinbtn").attr('disabled', true);
        }
    });
    $("#modalCreatePrivate").on('keyup', '#modalCreatePrivate-channelName', function(e){
        if($("#modalCreatePrivate-channelName").val().trim != '' && $("#modalCreatePrivate-passcode").val().trim() != ''){
            $("#modalCreatePrivate-createbtn").attr('disabled', false);
        }else{
            $("#modalCreatePrivate-createbtn").attr('disabled', true);
        }
    });
    $("#modalCreatePrivate").on('keyup', '#modalCreatePrivate-passcode', function(e){
        if($("#modalCreatePrivate-channelName").val().trim != '' && $("#modalCreatePrivate-passcode").val().trim() != ''){
            $("#modalCreatePrivate-createbtn").attr('disabled', false);
        }else{
            $("#modalCreatePrivate-createbtn").attr('disabled', true);
        }
    });


    $btnJoinPrivate.on('click', function(e){
        e.preventDefault();

        if($nickname.val().trim() == '' || $channelName.val().trim() == '' || $passcode.val().trim()  == ''){
            return;
        }
        socket.emit('joinPrivateChannel', {nickname: $nickname.val(), channelName: $channelName.val(), passcode: $passcode.val()}, function(noerror, data){
            if(noerror){
                nickname = $nickname.val();
                $userArea.hide();
                $messageArea.show();
                $nickname.val('');
                $channelName.val('');
                $passcode.val('');
                showChannelHeader(true);
                showChannelsTab(false);
                currentChannel = data.channelName;
                $('#privateChannelName').append(data.channelName + " <span style='color: white; font-size:14px;'>Hosted by <strong>" + data.creator + "</strong></span>");
            }else{
                $userForm.prepend('<div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' + data + '</div>');
            }
        });
    });
    $btnCreatePrivate.on('click', function(e){
        e.preventDefault();

        if($nickname.val().trim() == '' || $channelName.val().trim() == '' || $passcode.val().trim()  == ''){
            return;
        }
        socket.emit('createPrivateChannel', {nickname: $nickname.val(), channelName: $channelName.val(), passcode: $passcode.val()}, function(noerror, data){
            if(noerror){
                nickname = $nickname.val();
                $userArea.hide();
                $messageArea.show();
                $nickname.val('');
                $channelName.val('');
                $passcode.val('');
                showChannelHeader(true);
                showChannelsTab(false);
                currentChannel = data.channelName;
                $('#privateChannelName').append(data.channelName + " <span style='color: white; font-size:14px;'>Hosted by <strong>" + data.creator + "</strong></span>");
            }else{
                $userForm.prepend('<div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' + data + '</div>');
            }
        });
    });

    //join public channel chat
    $btnPublic.on('click', function(e){
        e.preventDefault();
        if($nickname.val().trim() == '') return;
        socket.emit('newUser', $nickname.val(), function(data){
            if(data){
                nickname = $nickname.val();
                $userArea.hide();
                $messageArea.show();
                $nickname.val('');
                showChannelHeader(false);
                showChannelsTab(true);
            }else{
                $userForm.prepend('<div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a><strong>Oops!</strong> the nickname <strong>' + $nickname.val() + '</strong> is taken. Please try a different one.</div>');
            }
        });
    });

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
            socket.emit('sendMessage', {channel: currentChannel, msg: $message.val()});
            $message.val('');
        }
    });

    //send message enter key
    $message.keydown(function(e){
        if((e.keyCode || e.which) == 13 && !e.shiftKey){ //enter key pressed
            e.preventDefault();

            if($message.val().trim() != ''){
                socket.emit('sendMessage', {channel: currentChannel, msg: $message.val()});
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
        $msg = $('<div class="well" style="word-wrap: break-word;"><strong>[' + data.time + ']</strong> <strong style="color: #00BAD5;">' + data.user + '</strong> has <span style="color: #70E810">connected</span> to the channel</div>');
        $msg.hide();
        $chat.append($msg);
        $msg.show('fast', function(){
            $chat[0].scrollTop = $chat[0].scrollHeight;
        });
    });

    //receive disconnect message
    socket.on('disconnectMessage', function(data){
        $msg = $('<div class="well" style="word-wrap: break-word;"><strong>[' + data.time + ']</strong> <strong style="color: #00BAD5;">' + data.user + '</strong> has <span style="color: red">disconnected</span> from the channel</div>');
        $msg.hide();
        $chat.append($msg);
        $msg.show('fast', function(){
            $chat[0].scrollTop = $chat[0].scrollHeight;
        });
    });

    //receive online users information
    socket.on('getUsers', function(data){
        var html = '';
        for(i = 0; i < data.length; i++){
            html += '<li class="list-group-item" style="color: #00BAD5;">' + data[i] + '</li>';
        }
        $('#onlineUserCount').empty();
        $('#onlineUserCount').append('[' + data.length + ']');
        $users.html(html);
    });

    $('#modalJoinPublic').on('click', '#modalJoinPublic-joinbtn', function(e){
        e.preventDefault();
        $('#modalJoinPublic').modal('toggle');
        showChannelHeader(false);
        showChannelsTab(true);
        changeChannel('ch-' + $('#dropdownChannel').get(0).selectedIndex);
    });
    $('#modalJoinPrivate').on('click', '#modalJoinPrivate-joinbtn', function(e){
        e.preventDefault();
        $('#modalJoinPrivate').modal('toggle');
        showChannelHeader(true);
        showChannelsTab(false);
        var channelName = $('#modalJoinPrivate-channelName').val();
        var passcode = $('#modalJoinPrivate-passcode').val();
        changeChannelPrivate(channelName, passcode);
        $('#modalJoinPrivate-channelName').val('');
        $('#modalJoinPrivate-passcode').val('');
    });
    //Step 1: Send server request to create and change private channel
    //Step 2: Server creates private channel and sends response
    //Step 3: Client receives response and sends request to change channel
    $('#modalCreatePrivate').on('click', '#modalCreatePrivate-createbtn', function(e){
        e.preventDefault();
        $('#modalCreatePrivate').modal('toggle');
        showChannelHeader(true);
        showChannelsTab(false);
        var channelName = $('#modalCreatePrivate-channelName').val();
        var passcode = $('#modalCreatePrivate-passcode').val();
        createChannelPrivate(channelName, passcode);
        $('#modalCreatePrivate-channelName').val('');
        $('#modalCreatePrivate-passcode').val('');
    });

    function showChannelsTab(bool){
        if(bool){
            $channelsTab.show();
        }else{
            $channelsTab.hide();
        }
    }
    function showChannelHeader(bool){
        if(bool){
            $('#privateChannelName').show();
        }else{
            $('#privateChannelName').hide();
        }
    }

    function fillChannelsCombobox(){
        $('#dropdownChannel').empty();
        for(i=0; i<channels.length; i++){
            $('#dropdownChannel').append('<option>' + channels[i] + '</option>');
        }
        $('.selectpicker').selectpicker('refresh');
    }

    function changeChannel(ch){
        var id = ch.split("-")[1];
        var channel = channels[id];

        socket.emit('switchChannel', {
            newChannel: channel,
            oldChannel: currentChannel,
        });
        $('#' + ch).addClass('active');
        $('#ch-' + channels.indexOf(currentChannel)).removeClass('active');
        $channelsTab.off("click", 'li#' + channel);
        $channelsTab.on("click", 'li#' + currentChannel, function(e){
            changeChannel($(this).attr('id'));
        });
        currentChannel = channel;
        $chat.empty();
    }

    function changeChannelPrivate(channelName, passcode){
        socket.emit('channelPrivate', {
            nickname: nickname,
            oldChannel: currentChannel,
            newChannel: channelName,
            passcode: passcode
        });
    }

    function createChannelPrivate(channelName, passcode){
        socket.emit('createChangeChannelPrivate', {
            nickname: nickname,
            oldChannel: currentChannel,
            newChannel: channelName,
            passcode: passcode
        });
    }

    //receive response from server to change private channel
    socket.on('changeChannelPrivate', function(data){
        if(data.authorized){
            socket.emit('switchChannel', {
                newChannel: data.channelName,
                oldChannel: currentChannel,
            });
            currentChannel = data.channelName;
            $('#privateChannelName').empty();
            $('#privateChannelName').append(currentChannel + " <span style='color: white; font-size:14px;'>Hosted by <strong>" + data.creator + "</strong></span>");
            $chat.empty();
        }else{
            $messageArea.prepend('<div class="col-md-12"><div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' + data.error + '</a></div></div>');
        }
    });

    //receive channel list
    socket.on('setup', function(data){
        currentChannel = data.channel;
        $channelsTab.empty();
        for(i = 0; i < data.channels.length; i++){
            channels[i] = data.channels[i];
            if(data.channels[i] == currentChannel){
                $channelsTab.append('<li id="ch-' + i + '" class="active"><a href="javascript:void(0)">' + data.channels[i] + '</a></li>');
            }else{
                $channelsTab.append('<li id="ch-' + i + '"><a href="javascript:void(0)">' + data.channels[i] + '</a></li>');
            }
        }
        fillChannelsCombobox();
        //set up click event handlers
        $channelsTab.on("click", "li:not(.active)", function(e){
            changeChannel($(this).attr('id'));
        });
    });

    //receive chat history
    socket.on('chathistory', function(data){
        for (var key in data) {
            // skip loop if the property is from prototype
            if (!data.hasOwnProperty(key)) continue;

            var message = data[key];
            for (var i in message) {
                // skip loop if the property is from prototype
                if(!message.hasOwnProperty(i)) continue;

                if(message[i].messageType == 1){ //connect
                    msg = '<div class="well" style="word-wrap: break-word;"><strong>[' + message[i].time + ']</strong> <strong style="color: #00BAD5;">' + message[i].user + '</strong> has <span style="color: #70E810">connected</span> to the channel</div>';
                }else if(message[i].messageType == 2){ //disconnect
                    msg = '<div class="well" style="word-wrap: break-word;"><strong>[' + message[i].time + ']</strong> <strong style="color: #00BAD5;">' + message[i].user + '</strong> has <span style="color: red">disconnected</span> from the channel</div>';
                }else{
                    msg = '<div class="well" style="word-wrap: break-word;"><strong>[' + message[i].time + ']</strong> <strong style="color: #00BAD5;">' + message[i].user + '</strong>: ' + message[i].content + '</div>';
                }

                $chat.append(msg);
            }

            $chat[0].scrollTop = $chat[0].scrollHeight;
        }
        socket.emit('doneLoadingChat', currentChannel);
    });

    //JOINING PRIVATE CHANNEL VIA URL
    var $nicknameURL = $('#nicknameURL');
    var $channelURL = $('#channelURL');
    var $passcodeURL = $('#passcodeURL');
    var $btnURL = $('#joinPrivateChannelURL');

    $nicknameURL.focus();
    $nicknameURL.keyup(function(e){
        if($nicknameURL.val().trim() != '' && $passcodeURL.val().trim() != ''){
            $btnURL.attr('disabled', false);
        }else{
            $btnURL.attr('disabled', true);
        }
    });
    $passcodeURL.keyup(function(e){
        if($nicknameURL.val().trim() != '' && $passcodeURL.val().trim() != ''){
            $btnURL.attr('disabled', false);
        }else{
            $btnURL.attr('disabled', true);
        }
    });

    $btnURL.on('click', function(e){
        e.preventDefault();

        if($nicknameURL.val().trim() == '' || $passcodeURL.val().trim()  == ''){
            return;
        }

        socket.emit('joinPrivateChannel', {nickname: $nicknameURL.val(), channelName: $channelURL.data('ref'), passcode: $passcodeURL.val()}, function(noerror, data){
            if(noerror){
                nickname = $nicknameURL.val();
                $userArea.hide();
                $messageArea.show();
                $nicknameURL.val('');
                $channelURL.val('');
                $passcodeURL.val('');
                showChannelHeader(true);
                showChannelsTab(false);
                currentChannel = data.channelName;
                $('#privateChannelName').append(data.channelName + " <span style='color: white; font-size:14px;'>Hosted by <strong>" + data.creator + "</strong></span>");
            }else{
                $userForm.prepend('<div class="alert alert-danger alert-dismissable fade in"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' + data + '</div>');
            }
        });
    });

});

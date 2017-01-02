module.exports = function(app){
    app.get('/', function(req, res){
        //res.sendFile(__dirname + '/public/index.html');
        return res.render('mainview');
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

    //Get Private channels
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

    //Join Private Channel
    app.get('/channel/:channelName', function(req, res) {
      return PrivateChannel.findOne({ channelName: req.params.channelName }, function (err, data) {
        if(err){
            return res.json(err);
        }

        if(data){
            return res.render('privatechannelview', {channelName: data.channelName});
        }else{
            return res.render('mainview');
        }

      });
    });
}

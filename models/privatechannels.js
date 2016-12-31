var mongoose = require('mongoose');

var privateChannelsSchema = mongoose.Schema({
    channelName: {
        type: String,
        required: true
    },
    passcode: {
        type: String,
        required: true
    },
    creator: {
        type: String,
        required: true
    },
    date: {
        type: Date
    }
});

var PrivateChannel = module.exports = mongoose.model('PrivateChannel', privateChannelsSchema);

var mongoose = require('mongoose');

var messagesSchema = mongoose.Schema({
    content: {
        type: String,
        required: false
    },
    user: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true
    },
    messageType: {
        type: Number,
        required: false
    },
    date: {
        type: Date
    }
});

var Message = module.exports = mongoose.model('Message', messagesSchema);

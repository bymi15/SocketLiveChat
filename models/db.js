var mongoose = require('mongoose');

var dbUsername = "admin";
var dbPassword = "adMin123#"
var dbURI = "mongodb://" + dbUsername + ":" + dbPassword + "@ds141368.mlab.com:41368/socketlivechat";

mongoose.connect(dbURI);

// When successfully connected
mongoose.connection.on('connected', function () {
  console.log('Mongoose connected');
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
  console.log('Mongoose connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected due to app termination');
    process.exit(0);
  });
});

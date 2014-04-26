'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var less = require('less-file');
var browserify = require('browserify-middleware');

var app = express();

app.set('views', __dirname + '/views');

app.use(bodyParser());
app.use('/style', less(__dirname + '/style/bundle.less'));
app.get('/client/index.js', browserify(__dirname + '/client/index.js'));

app.get('/', function (req, res) {
  res.render('index.jade');
});

app.use(require('./lib/user.js'));
app.use(require('./lib/config.js'));


var PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('listening on localhost:' + PORT);

'use strict';

var assert = require('assert');
var express = require('express');
var db = require('./database.js');

var app = module.exports = express.Router();

app.get('/user/config', function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.send(403);
  }
  db.widgets.find({email: req.user}).sort({weight: 1}).then(function (widgets) {
    res.json({
      email: req.user,
      widgets: widgets
    });
  }).done(null, next);
});
app.put('/user/config', function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.send(403);
  }
  assert(typeof req.body.name === 'string');
  assert(typeof req.body.weight === 'number');
  assert(req.body.email === req.user);
  db.widgets.insert(req.body).then(function (res) {
    console.dir(res);
  }).done(null, next);
});
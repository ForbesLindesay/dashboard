'use strict';

var assert = require('assert');
var express = require('express');
var db = require('./database.js');

var app = module.exports = express.Router();

app.get('/user/config', function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.send(403);
  }
  db.getWidgets(req.user).then(function (widgets) {
    res.json({
      userid: req.user,
      widgets: widgets
    });
  }).done(null, next);
});
app.put('/user/config', function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.send(403);
  }
  assert(req.body.userid === req.user);
  db.insertWidget(req.body).then(function (options) {
    res.json(options);
  }).done(null, next);
});
app.post('/user/config/:id', function (req, res, next) {
  assert(Object.keys(req.body).length === 1);
  assert(typeof req.body.weight === 'number');
  db.setWeight(req.params.id, req.user, req.body.weight).then(function (result) {
    if (result !== 1) return next();
    res.send(200);
  }).done(null, next);
});
app.delete('/user/config/:id', function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.send(403);
  }
  db.deleteWidget(req.params.id, req.user).then(function (result) {
    if (result !== 1) return next();
    res.send(200);
  }).done(null, next);
});
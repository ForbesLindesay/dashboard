'use strict';

var express = require('express');
var passport = require('passport');
var PersonaStrategy = require('passport-persona').Strategy;
var ms = require('ms');

var app = module.exports = express.Router();

passport.serializeUser(function(email, done) {
  done(null, email);
});

passport.deserializeUser(function(email, done) {
  done(null, email);
});

passport.use(new PersonaStrategy({
  audience: process.env.AUDIENCE || 'http://localhost:3000'
}, function (email, done) {
  done(null, email);
}));

app.use(require('cookie-session')({
  keys: [process.env.COOKIE_SECRET || 'adfkasjast'],
  signed: true,
  path: '/user',
  maxage: ms('30 days')
}));
app.use(passport.initialize());
app.use(passport.session());
app.post('/user/login', passport.authenticate('persona'), function (req, res, next) {
  res.json(req.user);
});
app.post('/user/logout', function (req, res) {
  req.logout();
  res.send(200);
});
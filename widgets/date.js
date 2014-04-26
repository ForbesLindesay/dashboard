'use strict';

var ko = require('knockout');
var constant = require('../client/constant.js');

var WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function DateViewModel() {
  this.updateFrequency = '1 second';
  this.month = ko.observable();
  this.weekday = ko.observable();
  this.time = ko.observable();
  this.update();
}

DateViewModel.prototype.update = function () {
  var now = new Date();
  this.month(now.toISOString().split('T')[0]);
  this.weekday(WEEK_DAYS[now.getDay()]);
  var hours = now.getHours() + '';
  if (hours.length === 1) hours = '0' + hours;
  var minutes = now.getMinutes() + '';
  if (minutes.length === 1) minutes = '0' + minutes;
  this.time(hours + ':' + minutes);
};

function DateForm() {
  this.template = 'date-form';
  this.enabled = ko.observable(true);
}

exports.name = 'date';
exports.init = function () {
  return new DateViewModel()
};
exports.form = new DateForm();;

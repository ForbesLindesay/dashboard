'use strict';

var ko = require('knockout');
var constant = require('../client/constant.js');

var WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function DateViewModel() {
  this.month = ko.observable();
  this.weekday = ko.observable();
  this.time = ko.observable();
  this.update();
  setInterval(this.update.bind(this), 1000);
}

DateViewModel.prototype.update = function () {
  var now = new Date();
  this.month(now.toISOString().split('T')[0]);
  this.weekday(WEEK_DAYS[now.getDay()]);
  var hours = now.getHours() + '';
  if (hours.length === 1) hours = '0' + hours;
  var minutes = now.getMinutes();
  if (minutes.length === 1) minutes = '0' + minutes;
  this.time(hours + ':' + minutes);
};

function DateForm() {
  this.template = 'date-add';
  this.enabled = ko.observable(true);
}
DateForm.prototype.add = function () {
  return {};
};

exports.name = 'date';
exports.init = constant(new DateViewModel());
exports.form = new DateForm();;

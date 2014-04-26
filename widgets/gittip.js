'use strict';

var ko = require('knockout');

function Gittip(options) {
  this.username = ko.observable(options.username);
  this.amount = ko.observable('loading...');
}

function GittipForm() {
  this.template = 'gittip-form';
  this.username = ko.observable('');
  this.enabled = ko.computed(function () {
    return !!this.username();
  }.bind(this));
}

GittipForm.prototype.add = function () {
  var result = { username: this.username() };
  this.username('');
  return result;
};

exports.name = 'gittip';
exports.init = function (options) {
  return new Gittip(options);
};
exports.form = new GittipForm();

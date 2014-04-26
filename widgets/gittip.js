'use strict';

var ko = require('knockout');
var request = require('then-request');

function Gittip(options) {
  this.updateFrequency = '1 minute';
  this.supportsCache = true;
  this.username = ko.observable(options.username);
  this.loading = ko.observable(true);
  this.receiving = ko.observable('loading...');
  this.giving = ko.observable('loading...');
}
Gittip.prototype.update = function () {
  return request('https://www.gittip.com/' + this.username() + '/public.json').then(function (res) {
    if (res.statusCode !== 200) {
      throw new Error('gittip returned a status code of ' + res.statusCode);
    }
    var body = JSON.parse(res.body);
    this.receiving(body.receiving);
    this.giving(body.giving);
    this.loading(false);
  }.bind(this));
};

function GittipForm() {
  this.template = 'gittip-form';
  this.username = ko.observable('');
  this.enabled = ko.computed(function () {
    return !!this.username();
  }.bind(this));
}

GittipForm.prototype.reset = function () {
  this.username('');
};
GittipForm.prototype.options = function () {
  return { username: this.username() };
};

exports.name = 'gittip';
exports.init = function (options) {
  return new Gittip(options);
};
exports.form = new GittipForm();

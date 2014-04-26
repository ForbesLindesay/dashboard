'use strict';

var ko = require('knockout');
var request = require('then-request');
var persona = require('./persona.js');

var widgetTypes = [
  require('../widgets/date.js'),
  require('../widgets/gittip.js')
];

function initWidget(options) {
  var widget =  widgetTypes.filter(function (widget) {
    return widget.name === options.name;
  })[0].init(options);
  widget._id = options._id;
  widget.name = options.name;
  widget.weight = options.weight;
  return widget;
}

function Application() {
  this.widgetTypes = widgetTypes;

  this.loading = ko.observable(true);
  this.email = ko.observable(null);
  this.widgets = ko.observableArray([]);

  this.addFormVisible = ko.observable(false);
  this.selectedWidgetType = ko.observable(null);

  this.loadError = ko.observable(null);
  this.loginError = ko.observable(null);
  this.errors = ko.computed(function () {
    if (this.loadError()) return [this.loadError()];
    if (this.loginError()) return [this.loginError()];
    return this.widgets().map(function (widget) {
      return widget.error && widget.error();
    }).filter(Boolean);
  }.bind(this));

  this.listeningToLoginState = false;
  this.load();
}

Application.prototype.listenToLoginState = function () {
  if (this.listeningToLoginState) return;
  this.listeningToLoginState = true;
  persona.watch({
    loggedInUser: this.email(),
    onlogin: function(assertion) {
      if (this.email()) return;
      this.loading(true);
      request('/user/login', {
        method: 'POST',
        body: JSON.stringify({assertion: assertion}),
        headers: {
          'content-type': 'application/json'
        }
      }).then(function (res) {
        this.loginError(null);
        if (res.statusCode === 200) {
          var email = JSON.parse(res.body);
          if (email === this.email()) return;
        }
        this.load();
      }.bind(this)).done(null, function (err) {
        this.loginError(err.message);
      }.bind(this));
    }.bind(this),
    onlogout: function () {
      if (!this.email()) return;
      this.loading(true);
      request('/user/logout', {method: 'POST'}).then(function (res) {
        if (res.statusCode === 200) {
          this.email(null);
          this.widgets([]);
          this.loading(false);
          this.loginError(null);
        } else {
          throw new Error('/user/logout returned status code ' + res.statusCode);
        }
      }.bind(this)).done(null, function (err) {
        this.loginError(err.message);
      }.bind(this));
    }.bind(this)
  });
};
Application.prototype.load = function () {
  this.loading(true);
  this.widgets([]);
  request('/user/config').then(function (res) {
    if (res.statusCode === 403) {
      this.email(null);
      this.loading(false);
      this.listenToLoginState();
      this.loadError(null);
    } else if (res.statusCode === 200) {
      var body = JSON.parse(res.body);
      if (!body.email) {
        throw new Error('User not logged in but data still returned');
      }
      this.email(body.email);
      this.loading(false);
      this.widgets(body.widgets.map(initWidget));
      this.loadError(null);
    } else {
      throw new Error('/user/config returned status code ' + res.statusCode);
    }
  }.bind(this)).done(null, function (err) {
    this.loadError(err.message);
  }.bind(this));
};
Application.prototype.login = function () {
  navigator.id.request({siteName: 'Dashboard'});
};
Application.prototype.logout = function () {
  this.listenToLoginState();
  navigator.id.logout();
};

Application.prototype.add = function () {
  this.addFormVisible(true);
};
Application.prototype.addWidget = function () {
  var options = this.selectedWidgetType().form.add();
  options.name = this.selectedWidgetType().name;
  options.weight = this.widgets().reduce(function (a, b) {
    return a > b.weight ? a : b.weight;
  }, 0) + 1;
  request('/user/config', {
    method: 'PUT',
    body: JSON.stringify(options),
    headers: {
      'content-type': 'application/json'
    }
  }).then(function (res) {
    if (res.statusCode !== 200) {
      throw new Error('/user/config returned status code ' + res.statusCode);
    }
    this.widgets.push(initWidget(options));
  }.bind(this)).done();
};
Application.prototype.cancelWidget = function () {
  this.addFormVisible(false);
};

ko.applyBindings(new Application());
'use strict';

var Promise = require('promise');
var ms = require('ms');
var ko = require('knockout');
var request = require('then-request');
var persona = require('./persona.js');

var widgetTypes = [
  require('../widgets/date.js'),
  require('../widgets/gittip.js')
];

function saveWeight(widget) {
  return request('/user/config/' + widget._id, {
    method: 'POST',
    body: JSON.stringify({weight: widget.weight()}),
    headers: {
      'content-type': 'application/json'
    }
  });
}
function cacheWidget(widget) {
  widget.lastUpdate(new Date());
  if (window.localStorage && widget.supportsCache) {
    var store = {};
    Object.keys(widget).forEach(function (key) {
      if (ko.isObservable(widget[key]) && !ko.isComputed(widget[key]) && key !== 'weight') {
        store[key] = widget[key]();
      }
    });
    store.lastUpdate = widget.lastUpdate().getTime();
    localStorage.setItem('widget:' + widget._id, JSON.stringify(store));
  }
}
function unCacheWidget(widget) {
  if (window.localStorage && widget.supportsCache) {
    var store = localStorage.getItem('widget:' + widget._id);
    if (store) {
      try {
        store = JSON.parse(store);
        Object.keys(store).forEach(function (key) {
          if (ko.isObservable(widget[key]) && !ko.isComputed(widget[key]) && key !== 'weight') {
            widget[key](store[key]);
          }
        });
      } catch (ex) {}
      widget.lastUpdate(new Date(store.lastUpdate));
    }
  }
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
  setInterval(this.update.bind(this), 1000);
}

Application.prototype.swap = function (widgetA, widgetB) {
  if (widgetA === widgetB) return;
  var temp = widgetA.weight();
  widgetA.weight(widgetB.weight());
  widgetB.weight(temp);
  var saveA = saveWeight(widgetA);
  var saveB = saveWeight(widgetB);
  saveA.then(function () {
    return saveB;
  }).done();
  this.widgets(this.widgets().sort(function (a, b) {
    return a.weight() - b.weight();
  }));
};
Application.prototype.initWidget = function (widgetConfig) {
  var widget =  widgetTypes.filter(function (widget) {
    return widget.name === widgetConfig.name;
  })[0].init(widgetConfig.options);
  widget._id = widgetConfig._id;
  widget.name = widgetConfig.name;
  widget.weight = ko.observable(widgetConfig.weight);

  widget.moveLeft = function () {
    var predecessor = this.widgets()[this.widgets.indexOf(widget) - 1];
    if (!predecessor) predecessor = this.widgets()[this.widgets().length - 1];
    this.swap(widget, predecessor);
  }.bind(this);
  widget.moveRight = function () {
    var successor = this.widgets()[this.widgets.indexOf(widget) + 1];
    if (!successor) successor = this.widgets()[0];
    this.swap(widget, successor);
  }.bind(this);
  widget.remove = function () {
    request('/user/config/' + widget._id, {method: 'DELETE'}).then(function (res) {
      if (res.statusCode !== 200) {
        throw new Error('/user/config/:id returned status code ' + res.statusCode);
      }
      this.widgets.splice(this.widgets.indexOf(widget), 1);
    }.bind(this)).done();
  }.bind(this);

  widget.lastUpdate = ko.observable(new Date());
  unCacheWidget(widget);
  Promise.resolve(widget.update()).done(cacheWidget.bind(this, widget));

  return widget;
}

Application.prototype.update = function () {
  this.widgets().forEach(function (widget) {
    var lastUpdate = widget.lastUpdate().getTime();
    var updateFrequency = ms(widget.updateFrequency + '');
    if (Date.now() - lastUpdate > updateFrequency && !widget.updateInProgress) {
      widget.updateInProgress = true;
      Promise.resolve(widget.update()).then(cacheWidget.bind(this, widget)).done(function () {
        widget.updateInProgress = false;
      }, function (err) {
        widget.updateInProgress = false;
        throw err;
      });
    }
  });
};

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
      this.widgets(body.widgets.map(this.initWidget.bind(this)));
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
  var name = this.selectedWidgetType().name;
  var weight = this.widgets().reduce(function (a, b) {
    return a > b.weight() ? a : b.weight();
  }, 0) + 1;
  var email = this.email();
  var form = this.selectedWidgetType().form;
  var widgetConfig = {name: name, weight: weight, email: email, options: {}, private: {}};
  if (form.options) widgetConfig.options = form.options();
  if (form.credentials) widgetConfig.credentials = form.credentials();
  request('/user/config', {
    method: 'PUT',
    body: JSON.stringify(widgetConfig),
    headers: {
      'content-type': 'application/json'
    }
  }).then(function (res) {
    if (res.statusCode !== 200) {
      throw new Error('/user/config returned status code ' + res.statusCode);
    }
    this.widgets.push(this.initWidget(JSON.parse(res.body)));
    if (form.reset) form.reset();
    this.selectedWidgetType(null);
  }.bind(this)).done();
};
Application.prototype.cancelWidget = function () {
  this.addFormVisible(false);
};

ko.applyBindings(new Application());
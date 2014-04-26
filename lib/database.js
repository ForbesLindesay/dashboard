'use strict';

var assert = require('assert');
var mongo = require('mongod');

if (!process.env.DATABASE) {
  throw new Error('You must define the DATABASE environment variable to run dashboard');
}

var db = mongo(process.env.DATABASE, ['widgets']);

exports.getWidgets = function (userid) {
  return db.widgets.find({userid: userid}).sort({weight: 1}).then(function (widgets) {
    return widgets.map(sanitizeWidget);
  });
};
exports.insertWidget = function (widget) {
  assert(typeof widget.name === 'string');
  assert(typeof widget.weight === 'number');
  assert(typeof widget.userid === 'string');
  return db.widgets.insert({
    name: widget.name,
    weight: widget.weight,
    userid: widget.userid,
    options: widget.options || {},
    credentials: widget.credentials || {}
  }).then(sanitizeWidget);
};
exports.setWeight = function (id, userid, weight) {
  return db.widgets.update({_id: mongo.ObjectId(id), userid: userid}, {
    $set: {weight: weight}
  }).then(function (res) {
    return res.n;
  });
};
exports.deleteWidget = function (id, userid) {
  return db.widgets.remove({_id: mongo.ObjectId(id), userid: userid}).then(function (res) {
    return res.n;
  });
};

function sanitizeWidget(widget) {
  return {
    _id: widget._id + '',
    name: widget.name,
    weight: widget.weight,
    options: widget.options || {}
  };
}
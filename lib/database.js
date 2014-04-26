'use strict';

var mongo = require('mongod');

if (!process.env.DATABASE) {
  throw new Error('You must define the DATABASE environment variable to run dashboard');
}

module.exports = mongo(process.env.DATABASE, ['widgets']);
'use strict';

if (!navigator.id) {
  throw new Error('You must add a script of https://login.persona.org/include.js '
                  + 'to your page to use BrowserID');
}

module.exports = navigator.id;

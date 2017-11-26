'use strict';

var webworkify = require('webworkify');

var Rusha = require('./rusha.js');

// If we're running in a webworker, accept
// messages containing a jobid and a buffer
// or blob object, and return the hash result.
if (typeof FileReaderSync !== 'undefined') {
  require('./worker')();
}

module.exports = Rusha;

Rusha.createWorker = function createWorker() {
  var worker = webworkify(require('./worker'));
  var terminate = worker.terminate;
  worker.terminate = function () {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

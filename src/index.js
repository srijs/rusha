'use strict';

var webworkify = require('webworkify');

var Rusha = require('./rusha.js');
var createHash = require('./hash.js');

// If we're running in a webworker, accept
// messages containing a jobid and a buffer
// or blob object, and return the hash result.
if (typeof FileReaderSync !== 'undefined' && typeof DedicatedWorkerGlobalScope !== 'undefined') {
  Rusha.disableWorkerBehaviour = require('./worker')();
}

Rusha.createWorker = function createWorker() {
  var worker = webworkify(require('./worker'));
  var terminate = worker.terminate;
  worker.terminate = function () {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

Rusha.createHash = createHash;

module.exports = Rusha;

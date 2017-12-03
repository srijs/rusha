/* eslint-env commonjs, browser */

const webworkify = require('webworkify');

const Rusha = require('./rusha.js');
const createHash = require('./hash.js');

// If we're running in a webworker, accept
// messages containing a jobid and a buffer
// or blob object, and return the hash result.
if (typeof FileReaderSync !== 'undefined' && typeof DedicatedWorkerGlobalScope !== 'undefined') {
  Rusha.disableWorkerBehaviour = require('./worker')();
} else {
  Rusha.disableWorkerBehaviour = () => {};
}

Rusha.createWorker = () => {
  const worker = webworkify(require('./worker'));
  const terminate = worker.terminate;
  worker.terminate = () => {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

Rusha.createHash = createHash;

module.exports = Rusha;

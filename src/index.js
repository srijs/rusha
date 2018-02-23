/* eslint-env commonjs, browser */

const work = require('webworkify-webpack');
const Rusha = require('./rusha');
const createHash = require('./hash');
const runWorker = require('./worker');
const { isDedicatedWorkerScope } = require('./utils');

const isRunningInDedicatedWorker = typeof self !== 'undefined'
  && isDedicatedWorkerScope(self);

Rusha.disableWorkerBehaviour = isRunningInDedicatedWorker ? runWorker() : () => {};

Rusha.createWorker = () => {
  const worker = work(require.resolve('./worker'));
  const terminate = worker.terminate;
  worker.terminate = () => {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

Rusha.createHash = createHash;

module.exports = Rusha;
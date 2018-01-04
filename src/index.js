/* eslint-env commonjs, browser */

const webworkify = require('webworkify');

const Rusha = require('./rusha');
const createHash = require('./hash');
const runWorker = require('./worker');

const isRunningInWorker = 'WorkerGlobalScope' in self
  && self instanceof self.WorkerGlobalScope;
const isRunningInSharedWorker = 'SharedWorkerGlobalScope' in self
  && self instanceof self.SharedWorkerGlobalScope;
const isRunningInServiceWorker = 'ServiceWorkerGlobalScope' in self
  && self instanceof self.ServiceWorkerGlobalScope;

// Detects whether we run inside a dedicated worker or not.
//
// We can't just check for `DedicatedWorkerGlobalScope`, since IE11
// has a bug where it only supports `WorkerGlobalScope`.
//
// Therefore, we consider us as running inside a dedicated worker
// when we are running inside a worker, but not in a shared or service worker.
//
// When new types of workers are introduced, we will need to adjust this code.
const isRunningInDedicatedWorker = isRunningInWorker
  && !isRunningInSharedWorker
  && !isRunningInServiceWorker;

Rusha.disableWorkerBehaviour = isRunningInDedicatedWorker ? runWorker() : () => {};

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

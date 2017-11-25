'use strict';

const assert = require('assert');
const fs = require('fs');

const workerSource = fs.readFileSync(__dirname + '/../dist/rusha.min.js', 'utf8');
const workerBlob = new Blob([workerSource], {type: "application/javascript"});
const workerURL = URL.createObjectURL(workerBlob);

const spawnWorker = () => new Worker(workerURL);

describe('Rusha Worker', () => {
  it('1 kiB', (done) => {
    const rw = spawnWorker();
    const zero1k = new Int8Array(1024);
    const blob = new Blob([zero1k]);
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('60cacbf3d72e1e7834203da608037b1bf83b40e8', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, data: blob })
  });

  it('1 kiB file', (done) => {
    const rw = spawnWorker();
    const zero1k = new Int8Array(1024);
    const blob = new Blob([zero1k]);
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('60cacbf3d72e1e7834203da608037b1bf83b40e8', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, file: blob })
  });

  it('1 MiB', (done) => {
    const rw = spawnWorker();
    const zero1M = new Int8Array(1024 * 1024);
    const blob = new Blob([zero1M]);
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('3b71f43ff30f4b15b5cd85dd9e95ebc7e84eb5a3', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, data: blob })
  });

  it('1 MiB file', (done) => {
    const rw = spawnWorker();
    const zero1M = new Int8Array(1024 * 1024);
    const blob = new Blob([zero1M]);
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('3b71f43ff30f4b15b5cd85dd9e95ebc7e84eb5a3', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, file: blob })
  });

  it('10 MiB', (done) => {
    const rw = spawnWorker();
    const zero1M = new Int8Array(1024 * 1024);
    const blob = new Blob(new Array(8).fill(zero1M));
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('5fde1cce603e6566d20da811c9c8bcccb044d4ae', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, data: blob })
  });

  it('10 MiB file', (done) => {
    const rw = spawnWorker();
    const zero1M = new Int8Array(1024 * 1024);
    const blob = new Blob(new Array(8).fill(zero1M));
    rw.onmessage = (e) => {
      rw.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('5fde1cce603e6566d20da811c9c8bcccb044d4ae', e.data.hash);
      done();
    };
    rw.postMessage({ id: 0, file: blob })
  });
});

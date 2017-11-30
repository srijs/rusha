describe('Vanilla Worker Compatibility', () => {
  it('provides compatibility with Rusha worker', (done) => {
    const worker = new Worker('/base/dist/rusha.min.js');
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) {
        throw e.data.error;
      }
      assert.strictEqual('a9993e364706816aba3e25717850c26c9cd0d89d', e.data.hash);
      done();
    };
    worker.postMessage({id: 0, data: 'abc'});
  });
});

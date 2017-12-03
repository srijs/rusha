'use strict';

const conv = require('../../src/conv');

describe('binary string conversion', () => {
  it('converts a full string with a zero offset', () => {
    const buf = new ArrayBuffer(16);
    conv('foobarbazquux42', new Int8Array(buf), new Int32Array(buf), 0, 15, 0);
    expect(Array.from(new Uint8Array(buf))).to.deep.equal(
      [98, 111, 111, 102, 97, 98, 114, 97, 117, 117, 113, 122, 0, 50, 52, 120]
    );
  });
});

describe('Array conversion', () => {
  it('converts a full array with a zero offset', () => {
    const buf = new ArrayBuffer(16);
    const arr = [102, 111, 111, 98, 97, 114, 98, 97, 122, 113, 117, 117, 120, 52, 50];
    conv(arr, new Int8Array(buf), new Int32Array(buf), 0, 15, 0);
    expect(Array.from(new Uint8Array(buf))).to.deep.equal(
      [98, 111, 111, 102, 97, 98, 114, 97, 117, 117, 113, 122, 0, 50, 52, 120]
    );
  });
});

describe('ArrayBuffer conversion', () => {
  it('converts a full array with a zero offset', () => {
    const buf = new ArrayBuffer(16);
    const arr = Uint8Array.from([102, 111, 111, 98, 97, 114, 98, 97, 122, 113, 117, 117, 120, 52, 50]);
    conv(arr.buffer, new Int8Array(buf), new Int32Array(buf), 0, 15, 0);
    expect(Array.from(new Uint8Array(buf))).to.deep.equal(
      [98, 111, 111, 102, 97, 98, 114, 97, 117, 117, 113, 122, 0, 50, 52, 120]
    );
  });
});

describe('TypedArray conversion', () => {
  it('converts a full array with a zero offset', () => {
    const buf = new ArrayBuffer(16);
    const arr = Uint8Array.from([102, 111, 111, 98, 97, 114, 98, 97, 122, 113, 117, 117, 120, 52, 50]);
    conv(arr, new Int8Array(buf), new Int32Array(buf), 0, 15, 0);
    expect(Array.from(new Uint8Array(buf))).to.deep.equal(
      [98, 111, 111, 102, 97, 98, 114, 97, 117, 117, 113, 122, 0, 50, 52, 120]
    );
  }); 
});

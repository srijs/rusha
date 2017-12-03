/* eslint-env commonjs, browser */

const RushaCore = require('./core.sjs');
const utils = require('./utils');
const conv = require('./conv');

// The Rusha object is a wrapper around the low-level RushaCore.
// It provides means of converting different inputs to the
// format accepted by RushaCore as well as other utility methods.
module.exports = function Rusha (chunkSize) {
  // Private object structure.
  const self = {};

  // Calculate the length of buffer that the sha1 routine uses
  // including the padding.
  const padlen = (len) => {
    for (len += 9; len % 64 > 0; len += 1);
    return len;
  };

  const padZeroes = (bin, len) => {
    const h8 = new Uint8Array(bin.buffer);
    const om = len % 4, align = len - om;
    switch (om) {
    case 0: h8[align + 3] = 0;
    case 1: h8[align + 2] = 0;
    case 2: h8[align + 1] = 0;
    case 3: h8[align + 0] = 0;
    }
    for (let i = (len >> 2) + 1; i < bin.length; i++)
      bin[i] = 0;
  };

  const padData = (bin, chunkLen, msgLen) => {
    bin[chunkLen>>2] |= 0x80 << (24 - (chunkLen % 4 << 3));
    // To support msgLen >= 2 GiB, use a float division when computing the
    // high 32-bits of the big-endian message length in bits.
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 14] = (msgLen / (1 << 29)) |0;
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 15] = msgLen << 3;
  };

  // Initialize the internal data structures to a new capacity.
  const init = (size) => {
    if (size % 64 > 0) {
      throw new Error('Chunk size must be a multiple of 128 bit');
    }
    self.offset = 0;
    self.maxChunkLen = size;
    self.padMaxChunkLen = padlen(size);
    // The size of the heap is the sum of:
    // 1. The padded input message size
    // 2. The extended space the algorithm needs (320 byte)
    // 3. The 160 bit state the algoritm uses
    self.heap     = new ArrayBuffer(utils.ceilHeapSize(self.padMaxChunkLen + 320 + 20));
    self.h32      = new Int32Array(self.heap);
    self.h8       = new Int8Array(self.heap);
    self.core     = new RushaCore({Int32Array: Int32Array}, {}, self.heap);
    self.buffer   = null;
  };

  // Iinitializethe datastructures according
  // to a chunk siyze.
  init(chunkSize || 64 * 1024);

  const initState = (heap, padMsgLen) => {
    self.offset = 0;
    const io = new Int32Array(heap, padMsgLen + 320, 5);
    io[0] = 1732584193;
    io[1] = -271733879;
    io[2] = -1732584194;
    io[3] = 271733878;
    io[4] = -1009589776;
  };

  const padChunk = (chunkLen, msgLen) => {
    const padChunkLen = padlen(chunkLen);
    const view = new Int32Array(self.heap, 0, padChunkLen >> 2);
    padZeroes(view, chunkLen);
    padData(view, chunkLen, msgLen);
    return padChunkLen;
  };

  // Write data to the heap.
  const write = (data, chunkOffset, chunkLen, off) => {
    conv(data, self.h8, self.h32, chunkOffset, chunkLen, off || 0);
  };

  // Initialize and call the RushaCore,
  // assuming an input buffer of length len * 4.
  const coreCall = (data, chunkOffset, chunkLen, msgLen, finalize) => {
    let padChunkLen = chunkLen;
    write(data, chunkOffset, chunkLen);
    if (finalize) {
      padChunkLen = padChunk(chunkLen, msgLen);
    }
    self.core.hash(padChunkLen, self.padMaxChunkLen);
  };

  const getRawDigest = (heap, padMaxChunkLen) => {
    const io = new Int32Array(heap, padMaxChunkLen + 320, 5);
    const out = new Int32Array(5);
    const arr = new DataView(out.buffer);
    arr.setInt32(0, io[0], false);
    arr.setInt32(4, io[1], false);
    arr.setInt32(8, io[2], false);
    arr.setInt32(12, io[3], false);
    arr.setInt32(16, io[4], false);
    return out;
  };

  // Calculate the hash digest as an array of 5 32bit integers.
  const rawDigest = (str) => {
    const msgLen = str.byteLength || str.length || str.size || 0;
    initState(self.heap, self.padMaxChunkLen);
    let chunkOffset = 0, chunkLen = self.maxChunkLen;
    for (chunkOffset = 0; msgLen > chunkOffset + chunkLen; chunkOffset += chunkLen) {
      coreCall(str, chunkOffset, chunkLen, msgLen, false);
    }
    coreCall(str, chunkOffset, msgLen - chunkOffset, msgLen, true);
    return getRawDigest(self.heap, self.padMaxChunkLen);
  };

  this.rawDigest = rawDigest;

  const digest = (str) => utils.toHex(rawDigest(str).buffer);

  // The digest and digestFrom* interface returns the hash digest
  // as a hex string.
  this.digest = digest;
  this.digestFromString = digest;
  this.digestFromBuffer = digest;
  this.digestFromArrayBuffer = digest;

  this.resetState = function () {
    initState(self.heap, self.padMaxChunkLen);
    return this;
  };

  this.append = function (chunk) {
    let chunkOffset = 0;
    let chunkLen = chunk.byteLength || chunk.length || chunk.size || 0;
    let turnOffset = self.offset % self.maxChunkLen;
    let inputLen;

    self.offset += chunkLen;
    while (chunkOffset < chunkLen) {
      inputLen = Math.min(chunkLen - chunkOffset, self.maxChunkLen - turnOffset);
      write(chunk, chunkOffset, inputLen, turnOffset);
      turnOffset += inputLen;
      chunkOffset += inputLen;
      if (turnOffset === self.maxChunkLen) {
        self.core.hash(self.maxChunkLen, self.padMaxChunkLen);
        turnOffset = 0;
      }
    }
    return this;
  };

  this.getState = function () {
    const turnOffset = self.offset % self.maxChunkLen;
    let heap;
    if (!turnOffset) {
      const io = new Int32Array(self.heap, self.padMaxChunkLen + 320, 5);
      heap = io.buffer.slice(io.byteOffset, io.byteOffset + io.byteLength);
    } else {
      heap = self.heap.slice(0);
    }
    return {
      offset: self.offset,
      heap: heap
    };
  };

  this.setState = function (state) {
    self.offset = state.offset;
    if (state.heap.byteLength === 20) {
      const io = new Int32Array(self.heap, self.padMaxChunkLen + 320, 5);
      io.set(new Int32Array(state.heap));
    } else {
      self.h32.set(new Int32Array(state.heap));  
    }
    return this;
  };

  const rawEnd = () => {
    const msgLen = self.offset;
    const chunkLen = msgLen % self.maxChunkLen;
    const padChunkLen = padChunk(chunkLen, msgLen);
    self.core.hash(padChunkLen, self.padMaxChunkLen);
    const result = getRawDigest(self.heap, self.padMaxChunkLen);
    initState(self.heap, self.padMaxChunkLen);
    return result;
  };

  this.rawEnd = rawEnd;

  this.end = () => utils.toHex(rawEnd().buffer);
};

module.exports._core = RushaCore;

'use strict';

var RushaCore = require('./core.sjs');
var utils = require('./utils');

// The Rusha object is a wrapper around the low-level RushaCore.
// It provides means of converting different inputs to the
// format accepted by RushaCore as well as other utility methods.
module.exports = function Rusha (chunkSize) {
  var getDataType = function (data) {
    if (typeof data === 'string') {
      return 'string';
    }
    if (data instanceof Array) {
      return 'array';
    }
    if (typeof global !== 'undefined' && global.Buffer && global.Buffer.isBuffer(data)) {
      return 'buffer';
    }
    if (data instanceof ArrayBuffer) {
      return 'arraybuffer';
    }
    if (data.buffer instanceof ArrayBuffer) {
      return 'view';
    }
    if (data instanceof Blob) {
      return 'blob';
    }
    throw new Error('Unsupported data type.');
  };

  // Private object structure.
  var self = {};

  // Calculate the length of buffer that the sha1 routine uses
  // including the padding.
  var padlen = function (len) {
    for (len += 9; len % 64 > 0; len += 1);
    return len;
  };

  var padZeroes = function (bin, len) {
    var h8 = new Uint8Array(bin.buffer);
    var om = len % 4, align = len - om;
    switch (om) {
      case 0: h8[align + 3] = 0;
      case 1: h8[align + 2] = 0;
      case 2: h8[align + 1] = 0;
      case 3: h8[align + 0] = 0;
    }
    for (var i = (len >> 2) + 1; i < bin.length; i++)
      bin[i] = 0;
  };

  var padData = function (bin, chunkLen, msgLen) {
    bin[chunkLen>>2] |= 0x80 << (24 - (chunkLen % 4 << 3));
    // To support msgLen >= 2 GiB, use a float division when computing the
    // high 32-bits of the big-endian message length in bits.
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 14] = (msgLen / (1 << 29)) |0;
    bin[(((chunkLen >> 2) + 2) & ~0x0f) + 15] = msgLen << 3;
  };

  // Convert a binary string and write it to the heap.
  // A binary string is expected to only contain char codes < 256.
  var convStr = function (H8, H32, start, len, off) {
    var str = this, i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    switch (om) {
      case 0: H8[off] = str.charCodeAt(start+3);
      case 1: H8[off+1-(om<<1)|0] = str.charCodeAt(start+2);
      case 2: H8[off+2-(om<<1)|0] = str.charCodeAt(start+1);
      case 3: H8[off+3-(om<<1)|0] = str.charCodeAt(start);
    }
    if (len < lm + om) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2] = str.charCodeAt(start+i)   << 24 |
                      str.charCodeAt(start+i+1) << 16 |
                      str.charCodeAt(start+i+2) <<  8 |
                      str.charCodeAt(start+i+3);
    }
    switch (lm) {
      case 3: H8[off+j+1|0] = str.charCodeAt(start+j+2);
      case 2: H8[off+j+2|0] = str.charCodeAt(start+j+1);
      case 1: H8[off+j+3|0] = str.charCodeAt(start+j);
    }
  };

  // Convert a buffer or array and write it to the heap.
  // The buffer or array is expected to only contain elements < 256.
  var convBuf = function (H8, H32, start, len, off) {
    var buf = this, i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    switch (om) {
      case 0: H8[off] = buf[start + 3];
      case 1: H8[off+1-(om<<1)|0] = buf[start+2];
      case 2: H8[off+2-(om<<1)|0] = buf[start+1];
      case 3: H8[off+3-(om<<1)|0] = buf[start];
    }
    if (len < lm + om) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2|0] = buf[start+i]   << 24 |
                        buf[start+i+1] << 16 | 
                        buf[start+i+2] <<  8 | 
                        buf[start+i+3];
    }
    switch (lm) {
        case 3: H8[off+j+1|0] = buf[start+j+2];
        case 2: H8[off+j+2|0] = buf[start+j+1];
        case 1: H8[off+j+3|0] = buf[start+j];
    }
  };

  var convBlob = function (H8, H32, start, len, off) {
    var blob = this, i, om = off % 4, lm = (len + om) % 4, j = len - lm;
    var buf = new Uint8Array(reader.readAsArrayBuffer(blob.slice(start, start + len)));
    switch (om) {
      case 0: H8[off] = buf[3];
      case 1: H8[off+1-(om<<1)|0] = buf[2];
      case 2: H8[off+2-(om<<1)|0] = buf[1];
      case 3: H8[off+3-(om<<1)|0] = buf[0];
    }
    if (len < lm + om) {
      return;
    }
    for (i = 4 - om; i < j; i = i + 4 | 0) {
      H32[off+i>>2|0] = buf[i]   << 24 | 
                        buf[i+1] << 16 |
                        buf[i+2] <<  8 |
                        buf[i+3];
    }
    switch (lm) {
      case 3: H8[off+j+1|0] = buf[j + 2];
      case 2: H8[off+j+2|0] = buf[j + 1];
      case 1: H8[off+j+3|0] = buf[j];
    }
  };

  var convFn = function (data) {
    switch (getDataType(data)) {
      case 'string': return convStr.bind(data);
      case 'array': return convBuf.bind(data);
      case 'buffer': return convBuf.bind(data);
      case 'arraybuffer': return convBuf.bind(new Uint8Array(data));
      case 'view': return convBuf.bind(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      case 'blob': return convBlob.bind(data);
    }
  };

  var slice = function (data, offset) {
    switch (getDataType(data)) {
      case 'string': return data.slice(offset);
      case 'array': return data.slice(offset);
      case 'buffer': return data.slice(offset);
      case 'arraybuffer': return data.slice(offset);
      case 'view': return data.buffer.slice(offset);
    }
  };

  // Initialize the internal data structures to a new capacity.
  var init = function (size) {
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

  var initState = function (heap, padMsgLen) {
    self.offset = 0;
    var io  = new Int32Array(heap, padMsgLen + 320, 5);
    io[0] =  1732584193;
    io[1] =  -271733879;
    io[2] = -1732584194;
    io[3] =   271733878;
    io[4] = -1009589776;
  };

  var padChunk = function (chunkLen, msgLen) {
    var padChunkLen = padlen(chunkLen);
    var view = new Int32Array(self.heap, 0, padChunkLen >> 2);
    padZeroes(view, chunkLen);
    padData(view, chunkLen, msgLen);
    return padChunkLen;
  };

  // Write data to the heap.
  var write = function (data, chunkOffset, chunkLen, off) {
    convFn(data)(self.h8, self.h32, chunkOffset, chunkLen, off || 0);
  };

  // Initialize and call the RushaCore,
  // assuming an input buffer of length len * 4.
  var coreCall = function (data, chunkOffset, chunkLen, msgLen, finalize) {
    var padChunkLen = chunkLen;
    write(data, chunkOffset, chunkLen);
    if (finalize) {
      padChunkLen = padChunk(chunkLen, msgLen);
    }
    self.core.hash(padChunkLen, self.padMaxChunkLen);
  };

  var getRawDigest = function (heap, padMaxChunkLen) {
    var io  = new Int32Array(heap, padMaxChunkLen + 320, 5);
    var out = new Int32Array(5);
    var arr = new DataView(out.buffer);
    arr.setInt32(0,  io[0], false);
    arr.setInt32(4,  io[1], false);
    arr.setInt32(8,  io[2], false);
    arr.setInt32(12, io[3], false);
    arr.setInt32(16, io[4], false);
    return out;
  };

  // Calculate the hash digest as an array of 5 32bit integers.
  var rawDigest = this.rawDigest = function (str) {
    var msgLen = str.byteLength || str.length || str.size || 0;
    initState(self.heap, self.padMaxChunkLen);
    var chunkOffset = 0, chunkLen = self.maxChunkLen;
    for (chunkOffset = 0; msgLen > chunkOffset + chunkLen; chunkOffset += chunkLen) {
      coreCall(str, chunkOffset, chunkLen, msgLen, false);
    }
    coreCall(str, chunkOffset, msgLen - chunkOffset, msgLen, true);
    return getRawDigest(self.heap, self.padMaxChunkLen);
  };

  // The digest and digestFrom* interface returns the hash digest
  // as a hex string.
  this.digest = this.digestFromString =
  this.digestFromBuffer = this.digestFromArrayBuffer =
  function (str) {
    return utils.toHex(rawDigest(str).buffer);
  };

  this.resetState = function () {
    initState(self.heap, self.padMaxChunkLen);
    return this;
  };

  this.append = function (chunk) {
    var chunkOffset = 0;
    var chunkLen = chunk.byteLength || chunk.length || chunk.size || 0;
    var turnOffset = self.offset % self.maxChunkLen;
    var inputLen;
    
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
    var turnOffset = self.offset % self.maxChunkLen;
    var heap;
    if (!turnOffset) {
      var io = new Int32Array(self.heap, self.padMaxChunkLen + 320, 5);
      heap = io.buffer.slice(io.byteOffset, io.byteOffset + io.byteLength)
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
      var io = new Int32Array(self.heap, self.padMaxChunkLen + 320, 5);
      io.set(new Int32Array(state.heap));
    } else {
      self.h32.set(new Int32Array(state.heap));  
    }
    return this;
  };

  var rawEnd = this.rawEnd = function () {
    var msgLen = self.offset;
    var chunkLen = msgLen % self.maxChunkLen;
    var padChunkLen = padChunk(chunkLen, msgLen);
    self.core.hash(padChunkLen, self.padMaxChunkLen);
    var result = getRawDigest(self.heap, self.padMaxChunkLen);
    initState(self.heap, self.padMaxChunkLen);
    return result;
  };

  this.end = function () {
    return utils.toHex(rawEnd().buffer);
  };
};

module.exports._core = RushaCore;

// If we're running in a webworker, accept
// messages containing a jobid and a buffer
// or blob object, and return the hash result.
if (typeof FileReaderSync !== 'undefined') {
  var reader = new FileReaderSync();
}

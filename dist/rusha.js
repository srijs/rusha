(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Rusha = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn, options) {
    var wkey;
    var cacheKeys = Object.keys(cache);

    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        var exp = cache[key].exports;
        // Using babel as a transpiler to use esmodule, the export will always
        // be an object with the default export as a property of it. To ensure
        // the existing api and babel esmodule exports are both supported we
        // check for both
        if (exp === fn || exp && exp.default === fn) {
            wkey = key;
            break;
        }
    }

    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            'function(require,module,exports){' + fn + '(self); }',
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        'function(require,module,exports){' +
            // try to call default if defined to also support babel esmodule exports
            'var f = require(' + stringify(wkey) + ');' +
            '(f.default ? f.default : f)(self);' +
        '}',
        scache
    ];

    var workerSources = {};
    resolveSources(skey);

    function resolveSources(key) {
        workerSources[key] = true;

        for (var depPath in sources[key][1]) {
            var depKey = sources[key][1][depPath];
            if (!workerSources[depKey]) {
                resolveSources(depKey);
            }
        }
    }

    var src = '(' + bundleFn + ')({'
        + Object.keys(workerSources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;

    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    var blob = new Blob([src], { type: 'text/javascript' });
    if (options && options.bare) { return blob; }
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);
    worker.objectURL = workerUrl;
    return worker;
};

},{}],2:[function(_dereq_,module,exports){
(function (global){
'use strict';

/* eslint-env commonjs, browser */

var reader;
if (typeof self !== 'undefined' && typeof self.FileReaderSync !== 'undefined') {
  reader = new self.FileReaderSync();
}

// Convert a binary string and write it to the heap.
// A binary string is expected to only contain char codes < 256.
function convStr(str, H8, H32, start, len, off) {
  var i, om = off % 4, lm = (len + om) % 4, j = len - lm;
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
}

// Convert a buffer or array and write it to the heap.
// The buffer or array is expected to only contain elements < 256.
function convBuf(buf, H8, H32, start, len, off) {
  var i, om = off % 4, lm = (len + om) % 4, j = len - lm;
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
}

function convBlob(blob, H8, H32, start, len, off) {
  var i, om = off % 4, lm = (len + om) % 4, j = len - lm;
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
}

module.exports = function conv(data, H8, H32, start, len, off) {
  if (typeof data === 'string') {
    return convStr(data, H8, H32, start, len, off);
  }
  if (data instanceof Array) {
    return convBuf(data, H8, H32, start, len, off);
  }
  if (global.Buffer && global.Buffer.isBuffer(data)) {
    return convBuf(data, H8, H32, start, len, off);
  }
  if (data instanceof ArrayBuffer) {
    return convBuf(new Uint8Array(data), H8, H32, start, len, off);
  }
  if (data.buffer instanceof ArrayBuffer) {
    return convBuf(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), H8, H32, start, len, off);
  }
  if (data instanceof Blob) {
    return convBlob(data, H8, H32, start, len, off);
  }
  throw new Error('Unsupported data type.');
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(_dereq_,module,exports){
// The low-level RushCore module provides the heart of Rusha,
// a high-speed sha1 implementation working on an Int32Array heap.
// At first glance, the implementation seems complicated, however
// with the SHA1 spec at hand, it is obvious this almost a textbook
// implementation that has a few functions hand-inlined and a few loops
// hand-unrolled.
module.exports = function RushaCore(stdlib$1186, foreign$1187, heap$1188) {
    'use asm';
    var H$1189 = new stdlib$1186.Int32Array(heap$1188);
    function hash$1190(k$1191, x$1192) {
        // k in bytes
        k$1191 = k$1191 | 0;
        x$1192 = x$1192 | 0;
        var i$1193 = 0, j$1194 = 0, y0$1195 = 0, z0$1196 = 0, y1$1197 = 0, z1$1198 = 0, y2$1199 = 0, z2$1200 = 0, y3$1201 = 0, z3$1202 = 0, y4$1203 = 0, z4$1204 = 0, t0$1205 = 0, t1$1206 = 0;
        y0$1195 = H$1189[x$1192 + 320 >> 2] | 0;
        y1$1197 = H$1189[x$1192 + 324 >> 2] | 0;
        y2$1199 = H$1189[x$1192 + 328 >> 2] | 0;
        y3$1201 = H$1189[x$1192 + 332 >> 2] | 0;
        y4$1203 = H$1189[x$1192 + 336 >> 2] | 0;
        for (i$1193 = 0; (i$1193 | 0) < (k$1191 | 0); i$1193 = i$1193 + 64 | 0) {
            z0$1196 = y0$1195;
            z1$1198 = y1$1197;
            z2$1200 = y2$1199;
            z3$1202 = y3$1201;
            z4$1204 = y4$1203;
            for (j$1194 = 0; (j$1194 | 0) < 64; j$1194 = j$1194 + 4 | 0) {
                t1$1206 = H$1189[i$1193 + j$1194 >> 2] | 0;
                t0$1205 = ((y0$1195 << 5 | y0$1195 >>> 27) + (y1$1197 & y2$1199 | ~y1$1197 & y3$1201) | 0) + ((t1$1206 + y4$1203 | 0) + 1518500249 | 0) | 0;
                y4$1203 = y3$1201;
                y3$1201 = y2$1199;
                y2$1199 = y1$1197 << 30 | y1$1197 >>> 2;
                y1$1197 = y0$1195;
                y0$1195 = t0$1205;
                H$1189[k$1191 + j$1194 >> 2] = t1$1206;
            }
            for (j$1194 = k$1191 + 64 | 0; (j$1194 | 0) < (k$1191 + 80 | 0); j$1194 = j$1194 + 4 | 0) {
                t1$1206 = (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) << 1 | (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) >>> 31;
                t0$1205 = ((y0$1195 << 5 | y0$1195 >>> 27) + (y1$1197 & y2$1199 | ~y1$1197 & y3$1201) | 0) + ((t1$1206 + y4$1203 | 0) + 1518500249 | 0) | 0;
                y4$1203 = y3$1201;
                y3$1201 = y2$1199;
                y2$1199 = y1$1197 << 30 | y1$1197 >>> 2;
                y1$1197 = y0$1195;
                y0$1195 = t0$1205;
                H$1189[j$1194 >> 2] = t1$1206;
            }
            for (j$1194 = k$1191 + 80 | 0; (j$1194 | 0) < (k$1191 + 160 | 0); j$1194 = j$1194 + 4 | 0) {
                t1$1206 = (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) << 1 | (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) >>> 31;
                t0$1205 = ((y0$1195 << 5 | y0$1195 >>> 27) + (y1$1197 ^ y2$1199 ^ y3$1201) | 0) + ((t1$1206 + y4$1203 | 0) + 1859775393 | 0) | 0;
                y4$1203 = y3$1201;
                y3$1201 = y2$1199;
                y2$1199 = y1$1197 << 30 | y1$1197 >>> 2;
                y1$1197 = y0$1195;
                y0$1195 = t0$1205;
                H$1189[j$1194 >> 2] = t1$1206;
            }
            for (j$1194 = k$1191 + 160 | 0; (j$1194 | 0) < (k$1191 + 240 | 0); j$1194 = j$1194 + 4 | 0) {
                t1$1206 = (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) << 1 | (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) >>> 31;
                t0$1205 = ((y0$1195 << 5 | y0$1195 >>> 27) + (y1$1197 & y2$1199 | y1$1197 & y3$1201 | y2$1199 & y3$1201) | 0) + ((t1$1206 + y4$1203 | 0) - 1894007588 | 0) | 0;
                y4$1203 = y3$1201;
                y3$1201 = y2$1199;
                y2$1199 = y1$1197 << 30 | y1$1197 >>> 2;
                y1$1197 = y0$1195;
                y0$1195 = t0$1205;
                H$1189[j$1194 >> 2] = t1$1206;
            }
            for (j$1194 = k$1191 + 240 | 0; (j$1194 | 0) < (k$1191 + 320 | 0); j$1194 = j$1194 + 4 | 0) {
                t1$1206 = (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) << 1 | (H$1189[j$1194 - 12 >> 2] ^ H$1189[j$1194 - 32 >> 2] ^ H$1189[j$1194 - 56 >> 2] ^ H$1189[j$1194 - 64 >> 2]) >>> 31;
                t0$1205 = ((y0$1195 << 5 | y0$1195 >>> 27) + (y1$1197 ^ y2$1199 ^ y3$1201) | 0) + ((t1$1206 + y4$1203 | 0) - 899497514 | 0) | 0;
                y4$1203 = y3$1201;
                y3$1201 = y2$1199;
                y2$1199 = y1$1197 << 30 | y1$1197 >>> 2;
                y1$1197 = y0$1195;
                y0$1195 = t0$1205;
                H$1189[j$1194 >> 2] = t1$1206;
            }
            y0$1195 = y0$1195 + z0$1196 | 0;
            y1$1197 = y1$1197 + z1$1198 | 0;
            y2$1199 = y2$1199 + z2$1200 | 0;
            y3$1201 = y3$1201 + z3$1202 | 0;
            y4$1203 = y4$1203 + z4$1204 | 0;
        }
        H$1189[x$1192 + 320 >> 2] = y0$1195;
        H$1189[x$1192 + 324 >> 2] = y1$1197;
        H$1189[x$1192 + 328 >> 2] = y2$1199;
        H$1189[x$1192 + 332 >> 2] = y3$1201;
        H$1189[x$1192 + 336 >> 2] = y4$1203;
    }
    return { hash: hash$1190 };
};

},{}],4:[function(_dereq_,module,exports){
'use strict';

/* eslint-env commonjs, browser */

var Rusha = _dereq_('./rusha.js');
var utils = _dereq_('./utils.js');

function Hash() {
  this._rusha = new Rusha();
  this._rusha.resetState();
}

Hash.prototype.update = function update(data) {
  this._rusha.append(data);
  return this;
};

Hash.prototype.digest = function digest(encoding) {
  var digest = this._rusha.rawEnd().buffer;
  if (!encoding) {
    return digest;
  }
  if (encoding === 'hex') {
    return utils.toHex(digest);
  }
  throw new Error('unsupported digest encoding');
};

module.exports = function createHash() {
  return new Hash();
};

},{"./rusha.js":6,"./utils.js":7}],5:[function(_dereq_,module,exports){
'use strict';

/* eslint-env commonjs, browser */

var webworkify = _dereq_('webworkify');

var Rusha = _dereq_('./rusha.js');
var createHash = _dereq_('./hash.js');

// If we're running in a webworker, accept
// messages containing a jobid and a buffer
// or blob object, and return the hash result.
if (typeof FileReaderSync !== 'undefined' && typeof DedicatedWorkerGlobalScope !== 'undefined') {
  Rusha.disableWorkerBehaviour = _dereq_('./worker')();
} else {
  Rusha.disableWorkerBehaviour = function () {};
}

Rusha.createWorker = function createWorker() {
  var worker = webworkify(_dereq_('./worker'));
  var terminate = worker.terminate;
  worker.terminate = function () {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

Rusha.createHash = createHash;

module.exports = Rusha;

},{"./hash.js":4,"./rusha.js":6,"./worker":8,"webworkify":1}],6:[function(_dereq_,module,exports){
'use strict';

/* eslint-env commonjs, browser */

var RushaCore = _dereq_('./core.sjs');
var utils = _dereq_('./utils');
var conv = _dereq_('./conv');

// The Rusha object is a wrapper around the low-level RushaCore.
// It provides means of converting different inputs to the
// format accepted by RushaCore as well as other utility methods.
module.exports = function Rusha (chunkSize) {
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
    conv(data, self.h8, self.h32, chunkOffset, chunkLen, off || 0);
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

},{"./conv":2,"./core.sjs":3,"./utils":7}],7:[function(_dereq_,module,exports){
'use strict';

/* eslint-env commonjs, browser */

//
// toHex
//

var precomputedHex = new Array(256);
for (var i = 0; i < 256; i++) {
  precomputedHex[i] = (i < 0x10 ? '0' : '') + i.toString(16);
}

module.exports.toHex = function (arrayBuffer) {
  var binarray = new Uint8Array(arrayBuffer);
  var res = new Array(arrayBuffer.byteLength);
  for (var i = 0; i < res.length; i++) {
    res[i] = precomputedHex[binarray[i]];
  }
  return res.join('');
};

//
// ceilHeapSize
//

module.exports.ceilHeapSize = function (v) {
  // The asm.js spec says:
  // The heap object's byteLength must be either
  // 2^n for n in [12, 24) or 2^24 * n for n ≥ 1.
  // Also, byteLengths smaller than 2^16 are deprecated.
  var p;
  // If v is smaller than 2^16, the smallest possible solution
  // is 2^16.
  if (v <= 65536) return 65536;
  // If v < 2^24, we round up to 2^n,
  // otherwise we round up to 2^24 * n.
  if (v < 16777216) {
    for (p = 1; p < v; p = p << 1);
  } else {
    for (p = 16777216; p < v; p += 16777216);
  }
  return p;
};

},{}],8:[function(_dereq_,module,exports){
'use strict';

/* eslint-env commonjs, worker */

module.exports = function worker() {
  var Rusha = _dereq_('./rusha.js');

  var hashData = function hashData (hasher, data, cb) {
    try {
      return cb(null, hasher.digest(data));
    } catch (e) {
      return cb(e);
    }
  };

  var hashFile = function hashFile (hasher, readTotal, blockSize, file, cb) {
    var reader = new self.FileReader();
    reader.onloadend = function onloadend () {
      if (reader.error) {
        return cb(reader.error);
      }
      var buffer = reader.result;
      readTotal += reader.result.byteLength;
      try {
        hasher.append(buffer);
      }
      catch (e) {
        cb(e);
        return;
      }
      if (readTotal < file.size) {
        hashFile(hasher, readTotal, blockSize, file, cb);
      } else {
        cb(null, hasher.end());
      }
    };
    reader.readAsArrayBuffer(file.slice(readTotal, readTotal + blockSize));
  };

  var workerBehaviourEnabled = true;

  self.onmessage = function onMessage (event) {
    if (!workerBehaviourEnabled) {
      return;
    }

    var data = event.data.data, file = event.data.file, id = event.data.id;
    if (typeof id === 'undefined') return;
    if (!file && !data) return;
    var blockSize = event.data.blockSize || (4 * 1024 * 1024);
    var hasher = new Rusha(blockSize);
    hasher.resetState();
    var done = function done (err, hash) {
      if (!err) {
        self.postMessage({id: id, hash: hash});
      } else {
        self.postMessage({id: id, error: err.name});
      }
    };
    if (data) hashData(hasher, data, done);
    if (file) hashFile(hasher, 0, blockSize, file, done);
  };

  return function disableWorkerBehaviour() {
    workerBehaviourEnabled = false;
  };
};

},{"./rusha.js":6}]},{},[5])(5)
});
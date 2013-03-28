/*
 * Rusha, a JavaScript implementation of the Secure Hash Algorithm, SHA-1,
 * as defined in FIPS PUB 180-1, tuned for high performance with large inputs.
 * (http://github.com/srijs/rusha)
 *
 * Inspired by Paul Johnstons implementation (http://pajhome.org.uk/crypt/md5).
 *
 * Copyright (c) 2013 Sam Rijs (http://awesam.de).
 * Released under the terms of the MIT license as follows:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function () {

  // If we'e running in Node.JS, export a module.
  if (typeof module !== 'undefined') {
    module.exports = Rusha;
  }

  // If we're running in a DOM context, export
  // the Rusha object to toplevel.
  if (typeof window !== 'undefined') {
    window.Rusha = Rusha;
  }

  // If we're running in a webworker, accept
  // messages containing a jobid and a buffer
  // or blob object, and return the hash result.
  if (typeof FileReaderSync !== 'undefined') {
    var reader = new FileReaderSync(),
        hasher = new Rusha(4 * 1024 * 1024);
    self.onmessage = function (event) {
      var hash, data = event.data.data;
      if (typeof data === 'string') {
        hash = hasher.digestFromString(data);
      } else if (data instanceof ArrayBuffer) {
        hash = hasher.digestFromArrayBuffer(data);
      } else if (data instanceof Array) {
        hash = hasher.digestFromBuffer(data);
      } else if (data instanceof Blob) {
        hash = hasher.digestFromString(reader.readAsBinaryString(data));
      }
      self.postMessage({id: event.data.id, hash: hash});
    };
  }

  // The Rusha object is a wrapper around the low-level RushaCore.
  // It provides means of converting different inputs to the
  // format accepted by RushaCore as well as other utility methods.
  function Rusha (sizeHint) {
    "use strict";

    // Private object structure.
    var self = {};

    // Calculate the length of buffer that the sha1 routine uses
    // including the padding.
    var padlen = function (len) {
      return len + 1 + ((len + 1) % 64 < 56 ? 56 : 56 + 64) - (len + 1) % 64 + 8;
    };

    // Convert a binary string to a big-endian Int32Array using
    // four characters per slot and pad it per the sha1 spec.
    // A binary string is expected to only contain char codes < 256.
    var conv = function (str) {
      var i, len = padlen(str.length),
          bin = new Int32Array(self.heap, 0, len / 4);
      for (i = str.length>>2; i < bin.length; i++) bin[i] = 0;
      for (i = 0; i < str.length; i+=4) {
        bin[i>>2] = (str.charCodeAt(i)   << 24) |
                    (str.charCodeAt(i+1) << 16) |
                    (str.charCodeAt(i+2) <<  8) |
                    (str.charCodeAt(i+3));
      }
      bin[str.length>>2] |= 0x80 << (24 - (str.length % 4 << 3));
      bin[(((str.length >> 2) + 2) & ~0x0f) + 15] = str.length << 3;
      return bin.length;
    };

    // Convert a buffer or array to a big-endian Int32Array using
    // four elements per slot and pad it per the sha1 spec.
    // The buffer or array is expected to only contain elements < 256. 
    var convBuf = function (buf) {
      var i, len = padlen(buf.length),
          bin = new Int32Array(self.heap, 0, len / 4);
      for (i = buf.length>>2; i < bin.length; i++) bin[i] = 0;
      for (i = 0; i < buf.length; i+=4) {
        bin[i>>2] = (buf[i]   << 24) |
                    (buf[i+1] << 16) |
                    (buf[i+2] <<  8) |
                    (buf[i+3]);
      }
      bin[buf.length>>2] |= 0x80 << (24 - (buf.length % 4 << 3));
      bin[(((buf.length >> 2) + 2) & ~0x0f) + 15] = buf.length << 3;
      return bin.length;
    };

    // Convert a array containing 32 bit integers
    // into its hexadecimal string representation.
    var hex = function (binarray) {
      var i, x, hex_tab = "0123456789abcdef", res = [];
      for (i = 0; i < binarray.length; i++) {
        x = binarray[i];
        res[i] = hex_tab.charAt((x >> 28) & 0xF) +
                 hex_tab.charAt((x >> 24) & 0xF) +
                 hex_tab.charAt((x >> 20) & 0xF) +
                 hex_tab.charAt((x >> 16) & 0xF) +
                 hex_tab.charAt((x >> 12) & 0xF) +
                 hex_tab.charAt((x >>  8) & 0xF) +
                 hex_tab.charAt((x >>  4) & 0xF) +
                 hex_tab.charAt((x >>  0) & 0xF);
      }
      return res.join('');
    };

    var nextPow2 = function (v) {
      var p = 1; while (p < v) p = p << 1; return p;
    };

    // Resize the internal data structures to a new capacity.
    var resize = function (size) {
      self.sizeHint = size;
      self.heap     = new ArrayBuffer(nextPow2(padlen(size) + 320));
      self.core     = RushaCore({Int32Array: Int32Array}, {}, self.heap);
    };

    // On initialize, resize the datastructures according
    // to an optional size hint.
    resize(sizeHint || 0);

    // Initialize and call the RushaCore,
    // assuming an input buffer of length len * 4.
    var coreCall = function (len) {
      var h = new Int32Array(self.heap, len << 2, 5);
      h[0] =  1732584193;
      h[1] =  -271733879;
      h[2] = -1732584194;
      h[3] =   271733878;
      h[4] = -1009589776;
      self.core.hash(len);
    };

    // The digestFromString interface returns the hash digest
    // of a binary string.
    this.digestFromString = function (str) {
      if (str.length > self.sizeHint) {
        resize(str.length);
      }
      coreCall(conv(str));
      return hex(new Int32Array(self.heap, 0, 5));
    };

    // The digestFromBuffer interface returns the hash digest
    // of a buffer or array containing 8-bit integers.
    this.digestFromBuffer = function (buf) {
      if (buf.length > self.sizeHint) {
        resize(buf.length);
      }
      coreCall(convBuf(buf));
      return hex(new Int32Array(self.heap, 0, 5));
    };

    // The digestFromArrayBuffer interface returns the hash digest
    // of an ArrayBuffer.
    this.digestFromArrayBuffer = function (buf) {
      if (buf.length > self.sizeHint) {
        resize(buf.byteLength);
      }
      coreCall(convBuf(buf));
      return hex(new Int32Array(self.heap, 0, 5));
    };
  };

  // The low-level RushCore module provides the heart of Rusha,
  // a high-speed sha1 implementation working on an Int32Array heap.
  // At first glance, the implementation seems complicated, however
  // with the SHA1 spec at hand, it is obvious this almost a textbook
  // implementation that has a few functions hand-inlined and a few loops
  // hand-unrolled.
  function RushaCore (stdlib, foreign, heap) {
    "use asm";

    var H = new stdlib.Int32Array(heap);

    function hash (k) {

      k = k|0;
      var i = 0, j = 0,
          y0 = 0, z0 = 0, y1 = 0, z1 = 0,
          y2 = 0, z2 = 0, y3 = 0, z3 = 0,
          y4 = 0, z4 = 0, t0 = 0, t1 = 0;

      y0 = H[k+0<<2>>2]|0;
      y1 = H[k+1<<2>>2]|0;
      y2 = H[k+2<<2>>2]|0;
      y3 = H[k+3<<2>>2]|0;
      y4 = H[k+4<<2>>2]|0;
 
      for (i = 0; (i|0) < (k|0); i = i + 16 |0) {

        z0 = y0;
        z1 = y1;
        z2 = y2;
        z3 = y3;
        z4 = y4;

        for (j = 0; (j|0) < 16; j = j + 1 |0) {
          H[k+j<<2>>2] = H[i+j<<2>>2];
          t1 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0) +
               ((y4 + (H[k+j<<2>>2]|0) |0) + (1518500249) |0) |0;
          y4 = y3;
          y3 = y2;
          y2 = y1 << 30 | y1 >>> 2;
          y1 = y0;
          y0 = t1;
        }

        for (j = k + 16 |0; (j|0) < (k + 20 |0); j = j + 1 |0) {
          t0 = H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2];
          H[j<<2>>2] = t0 << 1 | t0 >>> 31;
          t1 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0) +
               ((y4 + (H[j<<2>>2]|0) |0) + (1518500249) |0) |0;
          y4 = y3;
          y3 = y2;
          y2 = y1 << 30 | y1 >>> 2;
          y1 = y0;
          y0 = t1;
        }

        for (j = k + 20 |0; (j|0) < (k + 40 |0); j = j + 1 |0) {
          t0 = H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2];
          H[j<<2>>2] = t0 << 1 | t0 >>> 31;
          t1 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0) +
               ((y4 + (H[j<<2>>2]|0) |0) + (1859775393) |0) |0;
          y4 = y3;
          y3 = y2;
          y2 = y1 << 30 | y1 >>> 2;
          y1 = y0;
          y0 = t1;
        }

        for (j = k + 40 |0; (j|0) < (k + 60 |0); j = j + 1 |0) {
          t0 = H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2];
          H[j<<2>>2] = t0 << 1 | t0 >>> 31;
          t1 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0) +
               ((y4 + (H[j<<2>>2]|0) |0) - (1894007588) |0) |0;
          y4 = y3;
          y3 = y2;
          y2 = y1 << 30 | y1 >>> 2;
          y1 = y0;
          y0 = t1;
        }

        for (j = k + 60 |0; (j|0) < (k + 80 |0); j = j + 1 |0) {
          t0 = H[j-3<<2>>2] ^ H[j-8<<2>>2] ^ H[j-14<<2>>2] ^ H[j-16<<2>>2];
          H[j<<2>>2] = t0 << 1 | t0 >>> 31;
          t1 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0) +
               ((y4 + (H[j<<2>>2]|0) |0) - (899497514) |0) |0;
          y4 = y3;
          y3 = y2;
          y2 = y1 << 30 | y1 >>> 2;
          y1 = y0;
          y0 = t1;
        }

        y0 = y0 + z0 |0;
        y1 = y1 + z1 |0;
        y2 = y2 + z2 |0;
        y3 = y3 + z3 |0;
        y4 = y4 + z4 |0;

      }

      H[0] = y0;
      H[1] = y1;
      H[2] = y2;
      H[3] = y3;
      H[4] = y4;

    }

    return {hash: hash};

  }

})();

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
      if (data instanceof Blob) {
        data = reader.readAsBinaryString(data);
      }
      hash = hasher.digest(data);
      self.postMessage({id: event.data.id, hash: hash});
    };
  }

  // The Rusha object is a wrapper around the low-level RushaCore.
  // It provides means of converting different inputs to the
  // format accepted by RushaCore as well as other utility methods.
  function Rusha (sizeHint) {
    "use strict";

    // Private object structure.
    var self = {fill: 0};

    // Calculate the length of buffer that the sha1 routine uses
    // including the padding.
    var padlen = function (len) {
      return len + 1 + ((len ) % 64 < 56 ? 56 : 56 + 64) - (len ) % 64 + 8;
    };

    var padData = function (bin, len, copyloop) {
      for (var i = len>>2; i < bin.length; i++) bin[i] = 0;
      copyloop(bin);
      bin[len>>2] |= 0x80 << (24 - (len % 4 << 3));
      bin[(((len >> 2) + 2) & ~0x0f) + 15] = len << 3;
      return bin.length;
    };

    // Convert a binary string to a big-endian Int32Array using
    // four characters per slot and pad it per the sha1 spec.
    // A binary string is expected to only contain char codes < 256.
    var convStr = function (str) {
      return function (bin) {
        for (var i = 0; i < str.length; i+=4) {
          bin[i>>2] = (str.charCodeAt(i)   << 24) |
                      (str.charCodeAt(i+1) << 16) |
                      (str.charCodeAt(i+2) <<  8) |
                      (str.charCodeAt(i+3));
        }
      };
    };

    // Convert a buffer or array to a big-endian Int32Array using
    // four elements per slot and pad it per the sha1 spec.
    // The buffer or array is expected to only contain elements < 256. 
    var convBuf = function (buf) {
      return function (bin) {
        for (var i = 0; i < buf.length; i+=4) {
          bin[i>>2] = (buf[i]   << 24) |
                      (buf[i+1] << 16) |
                      (buf[i+2] <<  8) |
                      (buf[i+3]);
        }
      };
    };

    // Convert general data to a big-endian Int32Array written on the
    // heap and return it's length;
    var conv = function (data) {
      if (typeof data === 'string') {
        return convStr(data);
      } else if (data instanceof Array || (typeof Buffer !== 'undefined' &&
                                           Buffer.isBuffer(data))) {
        return convBuf(data);
      } else if (data instanceof ArrayBuffer) {
        return convBuf(new Uint8Array(data));
      } else if (data.buffer instanceof ArrayBuffer) {
        return convBuf(new Uint8Array(data.buffer));
      } else {
        throw new Error('Unsupported data type.');
      }
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
    this.digest = this.digestFromString =
    this.digestFromBuffer = this.digestFromArrayBuffer =
    function (str) {
      var len = str.byteLength || str.length;
      if (len > self.sizeHint) {
        resize(len);
      }
      var view = new Int32Array(self.heap, 0, padlen(len) >> 2);
      coreCall(padData(view, len, conv(str)));
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
      var i = 0,
          y0 = 0, z0 = 0, y1 = 0, z1 = 0,
          y2 = 0, z2 = 0, y3 = 0, z3 = 0,
          y4 = 0, z4 = 0, t0 = 0;

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

        H[k+0<<2>>2] = H[i+0<<2>>2];
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0)+ ((y4 + (H[k+0<<2>>2]|0) ) + (1518500249) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;
        H[k+1<<2>>2] = H[i+1<<2>>2];
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | ~y0 & y2) |0)+ ((y3 + (H[k+1<<2>>2]|0) ) + (1518500249) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;
        H[k+2<<2>>2] = H[i+2<<2>>2];
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | ~y4 & y1) |0)+ ((y2 + (H[k+2<<2>>2]|0) ) + (1518500249) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;
        H[k+3<<2>>2] = H[i+3<<2>>2];
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | ~y3 & y0) |0)+ ((y1 + (H[k+3<<2>>2]|0) ) + (1518500249) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;
        H[k+4<<2>>2] = H[i+4<<2>>2];
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | ~y2 & y4) |0)+ ((y0 + (H[k+4<<2>>2]|0) ) + (1518500249) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;
        H[k+5<<2>>2] = H[i+5<<2>>2];
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0)+ ((y4 + (H[k+5<<2>>2]|0) ) + (1518500249) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;
        H[k+6<<2>>2] = H[i+6<<2>>2];
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | ~y0 & y2) |0)+ ((y3 + (H[k+6<<2>>2]|0) ) + (1518500249) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;
        H[k+7<<2>>2] = H[i+7<<2>>2];
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | ~y4 & y1) |0)+ ((y2 + (H[k+7<<2>>2]|0) ) + (1518500249) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;
        H[k+8<<2>>2] = H[i+8<<2>>2];
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | ~y3 & y0) |0)+ ((y1 + (H[k+8<<2>>2]|0) ) + (1518500249) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;
        H[k+9<<2>>2] = H[i+9<<2>>2];
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | ~y2 & y4) |0)+ ((y0 + (H[k+9<<2>>2]|0) ) + (1518500249) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;
        H[k+10<<2>>2] = H[i+10<<2>>2];
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0)+ ((y4 + (H[k+10<<2>>2]|0) ) + (1518500249) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;
        H[k+11<<2>>2] = H[i+11<<2>>2];
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | ~y0 & y2) |0)+ ((y3 + (H[k+11<<2>>2]|0) ) + (1518500249) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;
        H[k+12<<2>>2] = H[i+12<<2>>2];
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | ~y4 & y1) |0)+ ((y2 + (H[k+12<<2>>2]|0) ) + (1518500249) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;
        H[k+13<<2>>2] = H[i+13<<2>>2];
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | ~y3 & y0) |0)+ ((y1 + (H[k+13<<2>>2]|0) ) + (1518500249) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;
        H[k+14<<2>>2] = H[i+14<<2>>2];
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | ~y2 & y4) |0)+ ((y0 + (H[k+14<<2>>2]|0) ) + (1518500249) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;
        H[k+15<<2>>2] = H[i+15<<2>>2];
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) |0)+ ((y4 + (H[k+15<<2>>2]|0) ) + (1518500249) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;
        t0 = H[k+16 -3<<2>>2] ^ H[k+16 -8<<2>>2] ^ H[k+16 -14<<2>>2] ^ H[k+16 -16<<2>>2];
        H[k+16<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | ~y0 & y2) |0)+ ((y3 + (H[k+16<<2>>2]|0) ) + (1518500249) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+17 -3<<2>>2] ^ H[k+17 -8<<2>>2] ^ H[k+17 -14<<2>>2] ^ H[k+17 -16<<2>>2];
        H[k+17<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | ~y4 & y1) |0)+ ((y2 + (H[k+17<<2>>2]|0) ) + (1518500249) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+18 -3<<2>>2] ^ H[k+18 -8<<2>>2] ^ H[k+18 -14<<2>>2] ^ H[k+18 -16<<2>>2];
        H[k+18<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | ~y3 & y0) |0)+ ((y1 + (H[k+18<<2>>2]|0) ) + (1518500249) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+19 -3<<2>>2] ^ H[k+19 -8<<2>>2] ^ H[k+19 -14<<2>>2] ^ H[k+19 -16<<2>>2];
        H[k+19<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | ~y2 & y4) |0)+ ((y0 + (H[k+19<<2>>2]|0) ) + (1518500249) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+20 -3<<2>>2] ^ H[k+20 -8<<2>>2] ^ H[k+20 -14<<2>>2] ^ H[k+20 -16<<2>>2];
        H[k+20<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+20<<2>>2]|0) ) + (1859775393) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+21 -3<<2>>2] ^ H[k+21 -8<<2>>2] ^ H[k+21 -14<<2>>2] ^ H[k+21 -16<<2>>2];
        H[k+21<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+21<<2>>2]|0) ) + (1859775393) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+22 -3<<2>>2] ^ H[k+22 -8<<2>>2] ^ H[k+22 -14<<2>>2] ^ H[k+22 -16<<2>>2];
        H[k+22<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+22<<2>>2]|0) ) + (1859775393) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+23 -3<<2>>2] ^ H[k+23 -8<<2>>2] ^ H[k+23 -14<<2>>2] ^ H[k+23 -16<<2>>2];
        H[k+23<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+23<<2>>2]|0) ) + (1859775393) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+24 -3<<2>>2] ^ H[k+24 -8<<2>>2] ^ H[k+24 -14<<2>>2] ^ H[k+24 -16<<2>>2];
        H[k+24<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+24<<2>>2]|0) ) + (1859775393) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+25 -3<<2>>2] ^ H[k+25 -8<<2>>2] ^ H[k+25 -14<<2>>2] ^ H[k+25 -16<<2>>2];
        H[k+25<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+25<<2>>2]|0) ) + (1859775393) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+26 -3<<2>>2] ^ H[k+26 -8<<2>>2] ^ H[k+26 -14<<2>>2] ^ H[k+26 -16<<2>>2];
        H[k+26<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+26<<2>>2]|0) ) + (1859775393) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+27 -3<<2>>2] ^ H[k+27 -8<<2>>2] ^ H[k+27 -14<<2>>2] ^ H[k+27 -16<<2>>2];
        H[k+27<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+27<<2>>2]|0) ) + (1859775393) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+28 -3<<2>>2] ^ H[k+28 -8<<2>>2] ^ H[k+28 -14<<2>>2] ^ H[k+28 -16<<2>>2];
        H[k+28<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+28<<2>>2]|0) ) + (1859775393) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+29 -3<<2>>2] ^ H[k+29 -8<<2>>2] ^ H[k+29 -14<<2>>2] ^ H[k+29 -16<<2>>2];
        H[k+29<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+29<<2>>2]|0) ) + (1859775393) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+30 -3<<2>>2] ^ H[k+30 -8<<2>>2] ^ H[k+30 -14<<2>>2] ^ H[k+30 -16<<2>>2];
        H[k+30<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+30<<2>>2]|0) ) + (1859775393) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+31 -3<<2>>2] ^ H[k+31 -8<<2>>2] ^ H[k+31 -14<<2>>2] ^ H[k+31 -16<<2>>2];
        H[k+31<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+31<<2>>2]|0) ) + (1859775393) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+32 -3<<2>>2] ^ H[k+32 -8<<2>>2] ^ H[k+32 -14<<2>>2] ^ H[k+32 -16<<2>>2];
        H[k+32<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+32<<2>>2]|0) ) + (1859775393) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+33 -3<<2>>2] ^ H[k+33 -8<<2>>2] ^ H[k+33 -14<<2>>2] ^ H[k+33 -16<<2>>2];
        H[k+33<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+33<<2>>2]|0) ) + (1859775393) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+34 -3<<2>>2] ^ H[k+34 -8<<2>>2] ^ H[k+34 -14<<2>>2] ^ H[k+34 -16<<2>>2];
        H[k+34<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+34<<2>>2]|0) ) + (1859775393) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+35 -3<<2>>2] ^ H[k+35 -8<<2>>2] ^ H[k+35 -14<<2>>2] ^ H[k+35 -16<<2>>2];
        H[k+35<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+35<<2>>2]|0) ) + (1859775393) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+36 -3<<2>>2] ^ H[k+36 -8<<2>>2] ^ H[k+36 -14<<2>>2] ^ H[k+36 -16<<2>>2];
        H[k+36<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+36<<2>>2]|0) ) + (1859775393) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+37 -3<<2>>2] ^ H[k+37 -8<<2>>2] ^ H[k+37 -14<<2>>2] ^ H[k+37 -16<<2>>2];
        H[k+37<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+37<<2>>2]|0) ) + (1859775393) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+38 -3<<2>>2] ^ H[k+38 -8<<2>>2] ^ H[k+38 -14<<2>>2] ^ H[k+38 -16<<2>>2];
        H[k+38<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+38<<2>>2]|0) ) + (1859775393) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+39 -3<<2>>2] ^ H[k+39 -8<<2>>2] ^ H[k+39 -14<<2>>2] ^ H[k+39 -16<<2>>2];
        H[k+39<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+39<<2>>2]|0) ) + (1859775393) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+40 -3<<2>>2] ^ H[k+40 -8<<2>>2] ^ H[k+40 -14<<2>>2] ^ H[k+40 -16<<2>>2];
        H[k+40<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0)+ ((y4 + (H[k+40<<2>>2]|0) ) + (-1894007588) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+41 -3<<2>>2] ^ H[k+41 -8<<2>>2] ^ H[k+41 -14<<2>>2] ^ H[k+41 -16<<2>>2];
        H[k+41<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | y0 & y2 | y1 & y2) |0)+ ((y3 + (H[k+41<<2>>2]|0) ) + (-1894007588) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+42 -3<<2>>2] ^ H[k+42 -8<<2>>2] ^ H[k+42 -14<<2>>2] ^ H[k+42 -16<<2>>2];
        H[k+42<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | y4 & y1 | y0 & y1) |0)+ ((y2 + (H[k+42<<2>>2]|0) ) + (-1894007588) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+43 -3<<2>>2] ^ H[k+43 -8<<2>>2] ^ H[k+43 -14<<2>>2] ^ H[k+43 -16<<2>>2];
        H[k+43<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | y3 & y0 | y4 & y0) |0)+ ((y1 + (H[k+43<<2>>2]|0) ) + (-1894007588) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+44 -3<<2>>2] ^ H[k+44 -8<<2>>2] ^ H[k+44 -14<<2>>2] ^ H[k+44 -16<<2>>2];
        H[k+44<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | y2 & y4 | y3 & y4) |0)+ ((y0 + (H[k+44<<2>>2]|0) ) + (-1894007588) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+45 -3<<2>>2] ^ H[k+45 -8<<2>>2] ^ H[k+45 -14<<2>>2] ^ H[k+45 -16<<2>>2];
        H[k+45<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0)+ ((y4 + (H[k+45<<2>>2]|0) ) + (-1894007588) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+46 -3<<2>>2] ^ H[k+46 -8<<2>>2] ^ H[k+46 -14<<2>>2] ^ H[k+46 -16<<2>>2];
        H[k+46<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | y0 & y2 | y1 & y2) |0)+ ((y3 + (H[k+46<<2>>2]|0) ) + (-1894007588) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+47 -3<<2>>2] ^ H[k+47 -8<<2>>2] ^ H[k+47 -14<<2>>2] ^ H[k+47 -16<<2>>2];
        H[k+47<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | y4 & y1 | y0 & y1) |0)+ ((y2 + (H[k+47<<2>>2]|0) ) + (-1894007588) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+48 -3<<2>>2] ^ H[k+48 -8<<2>>2] ^ H[k+48 -14<<2>>2] ^ H[k+48 -16<<2>>2];
        H[k+48<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | y3 & y0 | y4 & y0) |0)+ ((y1 + (H[k+48<<2>>2]|0) ) + (-1894007588) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+49 -3<<2>>2] ^ H[k+49 -8<<2>>2] ^ H[k+49 -14<<2>>2] ^ H[k+49 -16<<2>>2];
        H[k+49<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | y2 & y4 | y3 & y4) |0)+ ((y0 + (H[k+49<<2>>2]|0) ) + (-1894007588) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+50 -3<<2>>2] ^ H[k+50 -8<<2>>2] ^ H[k+50 -14<<2>>2] ^ H[k+50 -16<<2>>2];
        H[k+50<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0)+ ((y4 + (H[k+50<<2>>2]|0) ) + (-1894007588) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+51 -3<<2>>2] ^ H[k+51 -8<<2>>2] ^ H[k+51 -14<<2>>2] ^ H[k+51 -16<<2>>2];
        H[k+51<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | y0 & y2 | y1 & y2) |0)+ ((y3 + (H[k+51<<2>>2]|0) ) + (-1894007588) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+52 -3<<2>>2] ^ H[k+52 -8<<2>>2] ^ H[k+52 -14<<2>>2] ^ H[k+52 -16<<2>>2];
        H[k+52<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | y4 & y1 | y0 & y1) |0)+ ((y2 + (H[k+52<<2>>2]|0) ) + (-1894007588) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+53 -3<<2>>2] ^ H[k+53 -8<<2>>2] ^ H[k+53 -14<<2>>2] ^ H[k+53 -16<<2>>2];
        H[k+53<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | y3 & y0 | y4 & y0) |0)+ ((y1 + (H[k+53<<2>>2]|0) ) + (-1894007588) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+54 -3<<2>>2] ^ H[k+54 -8<<2>>2] ^ H[k+54 -14<<2>>2] ^ H[k+54 -16<<2>>2];
        H[k+54<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | y2 & y4 | y3 & y4) |0)+ ((y0 + (H[k+54<<2>>2]|0) ) + (-1894007588) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+55 -3<<2>>2] ^ H[k+55 -8<<2>>2] ^ H[k+55 -14<<2>>2] ^ H[k+55 -16<<2>>2];
        H[k+55<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) |0)+ ((y4 + (H[k+55<<2>>2]|0) ) + (-1894007588) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+56 -3<<2>>2] ^ H[k+56 -8<<2>>2] ^ H[k+56 -14<<2>>2] ^ H[k+56 -16<<2>>2];
        H[k+56<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 & y1 | y0 & y2 | y1 & y2) |0)+ ((y3 + (H[k+56<<2>>2]|0) ) + (-1894007588) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+57 -3<<2>>2] ^ H[k+57 -8<<2>>2] ^ H[k+57 -14<<2>>2] ^ H[k+57 -16<<2>>2];
        H[k+57<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 & y0 | y4 & y1 | y0 & y1) |0)+ ((y2 + (H[k+57<<2>>2]|0) ) + (-1894007588) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+58 -3<<2>>2] ^ H[k+58 -8<<2>>2] ^ H[k+58 -14<<2>>2] ^ H[k+58 -16<<2>>2];
        H[k+58<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 & y4 | y3 & y0 | y4 & y0) |0)+ ((y1 + (H[k+58<<2>>2]|0) ) + (-1894007588) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+59 -3<<2>>2] ^ H[k+59 -8<<2>>2] ^ H[k+59 -14<<2>>2] ^ H[k+59 -16<<2>>2];
        H[k+59<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 & y3 | y2 & y4 | y3 & y4) |0)+ ((y0 + (H[k+59<<2>>2]|0) ) + (-1894007588) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+60 -3<<2>>2] ^ H[k+60 -8<<2>>2] ^ H[k+60 -14<<2>>2] ^ H[k+60 -16<<2>>2];
        H[k+60<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+60<<2>>2]|0) ) + (-899497514) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+61 -3<<2>>2] ^ H[k+61 -8<<2>>2] ^ H[k+61 -14<<2>>2] ^ H[k+61 -16<<2>>2];
        H[k+61<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+61<<2>>2]|0) ) + (-899497514) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+62 -3<<2>>2] ^ H[k+62 -8<<2>>2] ^ H[k+62 -14<<2>>2] ^ H[k+62 -16<<2>>2];
        H[k+62<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+62<<2>>2]|0) ) + (-899497514) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+63 -3<<2>>2] ^ H[k+63 -8<<2>>2] ^ H[k+63 -14<<2>>2] ^ H[k+63 -16<<2>>2];
        H[k+63<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+63<<2>>2]|0) ) + (-899497514) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+64 -3<<2>>2] ^ H[k+64 -8<<2>>2] ^ H[k+64 -14<<2>>2] ^ H[k+64 -16<<2>>2];
        H[k+64<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+64<<2>>2]|0) ) + (-899497514) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+65 -3<<2>>2] ^ H[k+65 -8<<2>>2] ^ H[k+65 -14<<2>>2] ^ H[k+65 -16<<2>>2];
        H[k+65<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+65<<2>>2]|0) ) + (-899497514) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+66 -3<<2>>2] ^ H[k+66 -8<<2>>2] ^ H[k+66 -14<<2>>2] ^ H[k+66 -16<<2>>2];
        H[k+66<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+66<<2>>2]|0) ) + (-899497514) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+67 -3<<2>>2] ^ H[k+67 -8<<2>>2] ^ H[k+67 -14<<2>>2] ^ H[k+67 -16<<2>>2];
        H[k+67<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+67<<2>>2]|0) ) + (-899497514) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+68 -3<<2>>2] ^ H[k+68 -8<<2>>2] ^ H[k+68 -14<<2>>2] ^ H[k+68 -16<<2>>2];
        H[k+68<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+68<<2>>2]|0) ) + (-899497514) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+69 -3<<2>>2] ^ H[k+69 -8<<2>>2] ^ H[k+69 -14<<2>>2] ^ H[k+69 -16<<2>>2];
        H[k+69<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+69<<2>>2]|0) ) + (-899497514) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+70 -3<<2>>2] ^ H[k+70 -8<<2>>2] ^ H[k+70 -14<<2>>2] ^ H[k+70 -16<<2>>2];
        H[k+70<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+70<<2>>2]|0) ) + (-899497514) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+71 -3<<2>>2] ^ H[k+71 -8<<2>>2] ^ H[k+71 -14<<2>>2] ^ H[k+71 -16<<2>>2];
        H[k+71<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+71<<2>>2]|0) ) + (-899497514) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+72 -3<<2>>2] ^ H[k+72 -8<<2>>2] ^ H[k+72 -14<<2>>2] ^ H[k+72 -16<<2>>2];
        H[k+72<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+72<<2>>2]|0) ) + (-899497514) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+73 -3<<2>>2] ^ H[k+73 -8<<2>>2] ^ H[k+73 -14<<2>>2] ^ H[k+73 -16<<2>>2];
        H[k+73<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+73<<2>>2]|0) ) + (-899497514) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+74 -3<<2>>2] ^ H[k+74 -8<<2>>2] ^ H[k+74 -14<<2>>2] ^ H[k+74 -16<<2>>2];
        H[k+74<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+74<<2>>2]|0) ) + (-899497514) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;
        t0 = H[k+75 -3<<2>>2] ^ H[k+75 -8<<2>>2] ^ H[k+75 -14<<2>>2] ^ H[k+75 -16<<2>>2];
        H[k+75<<2>>2] = t0 << 1 | t0 >>> 31;
        y4 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) |0)+ ((y4 + (H[k+75<<2>>2]|0) ) + (-899497514) |0) |0;
        y1 = y1 << 30 | y1 >>> 2;;
        t0 = H[k+76 -3<<2>>2] ^ H[k+76 -8<<2>>2] ^ H[k+76 -14<<2>>2] ^ H[k+76 -16<<2>>2];
        H[k+76<<2>>2] = t0 << 1 | t0 >>> 31;
        y3 = ((y4 << 5 | y4 >>> 27) + (y0 ^ y1 ^ y2) |0)+ ((y3 + (H[k+76<<2>>2]|0) ) + (-899497514) |0) |0;
        y0 = y0 << 30 | y0 >>> 2;;
        t0 = H[k+77 -3<<2>>2] ^ H[k+77 -8<<2>>2] ^ H[k+77 -14<<2>>2] ^ H[k+77 -16<<2>>2];
        H[k+77<<2>>2] = t0 << 1 | t0 >>> 31;
        y2 = ((y3 << 5 | y3 >>> 27) + (y4 ^ y0 ^ y1) |0)+ ((y2 + (H[k+77<<2>>2]|0) ) + (-899497514) |0) |0;
        y4 = y4 << 30 | y4 >>> 2;;
        t0 = H[k+78 -3<<2>>2] ^ H[k+78 -8<<2>>2] ^ H[k+78 -14<<2>>2] ^ H[k+78 -16<<2>>2];
        H[k+78<<2>>2] = t0 << 1 | t0 >>> 31;
        y1 = ((y2 << 5 | y2 >>> 27) + (y3 ^ y4 ^ y0) |0)+ ((y1 + (H[k+78<<2>>2]|0) ) + (-899497514) |0) |0;
        y3 = y3 << 30 | y3 >>> 2;;
        t0 = H[k+79 -3<<2>>2] ^ H[k+79 -8<<2>>2] ^ H[k+79 -14<<2>>2] ^ H[k+79 -16<<2>>2];
        H[k+79<<2>>2] = t0 << 1 | t0 >>> 31;
        y0 = ((y1 << 5 | y1 >>> 27) + (y2 ^ y3 ^ y4) |0)+ ((y0 + (H[k+79<<2>>2]|0) ) + (-899497514) |0) |0;
        y2 = y2 << 30 | y2 >>> 2;;

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

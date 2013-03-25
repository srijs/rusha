if (typeof require === 'function') {
  var crypto = require('crypto');
  var johnston = require('./bench/johnston');
  var Rusha = require('./rusha');
}

var fnNative, randomBytes;

if (typeof crypto !== 'undefined' && typeof crypto.pseudoRandomBytes === 'function') {

  fnNative = function (bytes) {
    var shasum = crypto.createHash('sha1');
    shasum.update(bytes);
    return shasum.digest('hex');
  };

  randomBytes = function (size) {
    return crypto.pseudoRandomBytes(size);
  };

} else {

  fnNative = function () { return 'unavailable'; };

  randomBytes = function (size) {
    var bytes = new Uint8Array(size);
    var r;
    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }
    return bytes;
  }

}

var sizes = [4*1024, 1024*1024, 4*1024*1024, 8*1024*1024];

var _rush = new Rusha(Math.max.apply(Math, sizes)),
    fnRusha = function (bytes) {
  return _rush.digestFromBuffer(bytes);
};

var fnJohnston = function (bytes) {
  return johnston(bytes);
};

var ids = ['Native  ', 'Rusha   ', 'Johnst. '];
var fns = [fnNative, fnRusha, fnJohnston];

var bench = function () {
  sizes.forEach(function (size) {
    console.log('Benchmarking ' + size + ' bytes ...');
    var bytes = randomBytes(size);
    fns.forEach(function (fn, i) {
      var t0 = (new Date()).getTime();
      var res = fn(bytes);
      var t1 = (new Date()).getTime();
      console.log(ids[i] + ' emitted ' + res + ' in ' + (t1-t0) + ' milliseconds');
    });
  });
}

bench();


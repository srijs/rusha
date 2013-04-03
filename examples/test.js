if (typeof require === 'function') {
  var crypto = require('crypto');
  var johnston = require('./bench/johnston');
  var Rusha = require('../rusha');
  var cifre_utils = require('./bench/cifre/utils.js');
  var cifre_sha1 = require('./bench/cifre/sha1.js');
}

var fnNative, randomBytes;

if (typeof crypto !== 'undefined' && typeof crypto.pseudoRandomBytes === 'function') {

  fnNative = function (bytes) {
    var shasum = crypto.createHash('sha1');
    shasum.update(bytes);
    return shasum.digest('hex');
  };

} else {

  fnNative = function () { return 'unavailable'; };

}

var _rush = new Rusha(1),
    fnRusha = function (bytes) {
  return _rush.digestFromBuffer(bytes);
};

var fnJohnston = function (bytes) {
  return johnston(bytes);
};

var fnCifre = function (bytes) {
  return cifre_utils.tohex(cifre_sha1(bytes));
};

var ids = ['Native  ', 'Rusha   '];
var fns = [fnNative, fnRusha];
// Cifre seems to be broken on a few sizes, fnCifre];

var bench = function () {
  for (size=0;size<8192;size++) {
    // use fixed test data
    var bytes = new Uint8Array(size);
    for (var i = 0; i < size; i++) {
        bytes[i] = i % 255;
    }
    var ref = "";
    fns.forEach(function (fn, i) {
      var res = fn(bytes);
      if (ref == "")
        ref = res;
      else if (ref != res)
        console.log(ids[i] + ' hash mismatch on size ' + size + ': ' + res + ' expected: ' + ref);
    });
    if (!(size % 1000))
        console.log(size);
  };
}

bench();


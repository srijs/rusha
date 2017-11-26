'use strict';

/* eslint-env commonjs, worker */

module.exports = function worker() {
  var Rusha = require('./rusha.js');

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

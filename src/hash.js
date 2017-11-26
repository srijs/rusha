var Rusha = require('./rusha.js');
var utils = require('./utils.js');

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

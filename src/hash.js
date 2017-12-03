/* eslint-env commonjs, browser */

const Rusha = require('./rusha.js');
const utils = require('./utils.js');

class Hash {
  constructor() {
    this._rusha = new Rusha();
    this._rusha.resetState();
  }

  update(data) {
    this._rusha.append(data);
    return this;
  }

  digest(encoding) {
    const digest = this._rusha.rawEnd().buffer;
    if (!encoding) {
      return digest;
    }
    if (encoding === 'hex') {
      return utils.toHex(digest);
    }
    throw new Error('unsupported digest encoding');
  }
}

module.exports = () => {
  return new Hash();
};

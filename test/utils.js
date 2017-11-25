'use strict';

const assert = require('assert');

module.exports.assertBytesEqual = (buffer1, buffer2) => {
    const v1 = new Int8Array(buffer1);
    const v2 = new Int8Array(buffer2);
    assert.strictEqual(v1.length, v2.length, 'Buffers do not have the same length');
    for (let i = 0; i < v1.length; i++) {
        assert.strictEqual(v1[i], v2[i], 'Item at ' + i + ' differs: ' + v1[i] + ' vs ' + v2[i]);
    }
};

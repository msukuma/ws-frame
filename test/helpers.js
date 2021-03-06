const assert = require('assert');
const Frame = require('../frame');
const { makeFrameBuffer } = require('../private');
const { testFrameSize, payload } = require('../constants');
const { Uint64BE } = require('int64-buffer');

function makePayload(size) {
  let i = 0;
  const buf = Buffer.allocUnsafe(size);

  while (i < size) {
    buf.write(payload, i);
    i += 8;
  }

  return buf;
}

module.exports = {
  makePayload,

  itExists: prop => it('exists', () => {
    assert(Frame.prototype.hasOwnProperty(prop));
  }),

  completeFrame: (mask, size = testFrameSize) => {
    const args = { payload: makePayload(size) };

    if (mask)
      args.maskingKey = Buffer.from('mask');

    return new Frame(makeFrameBuffer(args));
  },

  payloadLessFrame: () => new Frame(makeFrameBuffer({})),

  incompleteFrame: size => new Frame(Buffer.concat([
    Buffer.from([0x81, 0xff]),
    new Uint64BE(size).toBuffer(),
    Buffer.allocUnsafe(32),
    Buffer.from('incomplete frame...'),
  ])),
};

const {
  opcode,
  payloadLength,
  flags,
  minFrameLength,
  frame0Props,
  maskingKeyLength,
  minOffset,
  uInt8Max,
  uInt16Max,
} = require('./constants');

const { clear } = require('./helpers');
const { validations } = require('./validations');
const { Uint64BE } = require('int64-buffer');
const privates = new WeakMap();

function validate(args) {
  if (!args)
    throw new TypeError(`args must be a buffer or a plain object`);

  if (args instanceof Buffer) {
    if (args.length < minFrameLength)
      throw new Error('${buffer} must be at least 2 bytes long');
  }
  else {
    Object.keys(args).forEach(prop => {
      if (validations.hasOwnProperty(prop))
        validations[prop](args);
    });
  }
}

function setPrivates(ctx, obj) {
  privates.set(ctx, obj);
}

function getBuffer(ctx) {
  return privates.get(ctx).buffer;
}

function setBuffer(ctx, buffer) {
  privates.get(ctx).buffer = buffer;
}

function isMasked(ctx) {
  return privates.get(ctx).masked;
}

function setMasked(ctx, val) {
  privates.get(ctx).masked = val;
}

function makePayloadLengthBuf(frameBuf, idx, length) {
  let buf;

  if (length > uInt16Max) {
    frameBuf[idx] = clear(frameBuf[idx], payloadLength) | 127;
    buf = new Uint64BE(length).toBuffer();
  }
  else if (length > uInt8Max) {
    frameBuf[idx] = clear(frameBuf[idx], payloadLength) | 126;
    buf = Buffer.alloc(2);
    buf.writeUInt16BE(length, 0);
  }
  else {
    frameBuf[idx] = clear(frameBuf[idx], payloadLength) | length;
  }

  return buf;
}

function makeFrameBuffer(args) {
  let payloadLength;
  let extPayloadLengthBuf;
  let maskingKeyBuf;
  let payloadBuf;
  const buffers = [];
  const frame0 = Buffer.alloc(1);
  const frame1 = Buffer.alloc(1);

  frame0Props.forEach(prop => {
    if (args.hasOwnProperty(prop)) {
      if (args[prop])
        frame0[0] |= flags[prop];
    }
  });

  buffers.push(frame0);

  if (args.maskingKey) {
    frame1[0] |= flags.mask; // set mask bit
    maskingKeyBuf = args.maskingKey instanceof Buffer ?
                      args.maskingKey :
                      Buffer.from(args.maskingKey);
  }

  if (args.payload) {
    payloadBuf = args.payload instanceof Buffer ?
                  args.payload :
                  Buffer.from(args.payload);

    extPayloadLengthBuf = makePayloadLengthBuf(frame1, 0, payloadBuf.length);
  }

  buffers.push(frame1);

  if (extPayloadLengthBuf)
    buffers.push(extPayloadLengthBuf);

  if (maskingKeyBuf)
    buffers.push(maskingKeyBuf);

  if (payloadBuf) {
    if (maskingKeyBuf)
      mask(payloadBuf, maskingKeyBuf);

    buffers.push(payloadBuf);
  }

  return Buffer.concat(buffers);
}

function initialPayloadLength(ctx) {
  return ctx.buffer[1] & flags.payloadLength;
}

function payloadLengthByteSize(ctx) {
  const iLen = initialPayloadLength(ctx);

  switch (iLen) {
    case 127:
      return 8;
    case 126:
      return 2;
    default:
      return 0;
  }
}

function maskingKeyOffset(ctx) {
  return minOffset + payloadLengthByteSize(ctx);
}

function payloadOffset(ctx) {
  return ctx.mask ? maskingKeyOffset(ctx) + maskingKeyLength :
                     minOffset + payloadLengthByteSize(ctx);
}

function tmpPayloadLength(ctx) {
  return ctx.buffer.length - payloadOffset(ctx);
}

function mask(payload, maskingKey, ctx) {
  for (let i = 0; i < payload.length; i++)
    payload[i] = payload[i] ^ maskingKey[i % 4];
  if (ctx) setMasked(ctx, true);
}

function unMask(payload, maskingKey, ctx) {
  mask(payload, maskingKey);
  if (ctx) setMasked(ctx, false);
}

function setMaskBit(ctx, val) {
  if (val) {
    ctx.buffer[1] |= flags.mask;
  }
  else {
    ctx.buffer[1] &= (~flags.mask);
  }
}

module.exports = {
  validate: validate,
  setPrivates: setPrivates,
  setMasked: setMasked,
  isMasked: isMasked,
  getBuffer: getBuffer,
  setBuffer: setBuffer,
  makeFrameBuffer: makeFrameBuffer,
  initialPayloadLength: initialPayloadLength,
  payloadLengthByteSize: payloadLengthByteSize,
  maskingKeyOffset: maskingKeyOffset,
  payloadOffset: payloadOffset,
  tmpPayloadLength: tmpPayloadLength,
  makePayloadLengthBuf: makePayloadLengthBuf,
  mask: mask,
  unMask: unMask,
  setMaskBit: setMaskBit,
};

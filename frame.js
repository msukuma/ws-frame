const {
  flags,
  minOffset,
  maskingKeyLength,
} = require('./constants');

const {
  validate,
  setPrivates,
  setMasked,
  isMasked,
  getBuffer,
  setBuffer,
  makeFrameBuffer,
  initialPayloadLength,
  tmpPayloadLength,
  payloadOffset,
  maskingKeyOffset,
  mask,
  unMask,
  makePayloadLengthBuf,
  setMaskBit,
  unMasked,
} = require('./private');

const { Uint64BE } = require('int64-buffer');
const { validations } = require('./validations');
const { defineFrameOGetterSetters } = require('./helpers');

class Frame {
  constructor(args) {
    validate(args);

    const buffer = args instanceof Buffer ? args : makeFrameBuffer(args);
    setPrivates(
      this,
      {
        buffer: buffer,
        masked: buffer[1] & flags.mask ? true : false,
      }
    );
  }

  get buffer() {
    return getBuffer(this);
  }

  get mask() {
    return this.buffer[1] & flags.mask ? 1 : 0;
  }

  get payloadLength() {
    const iLen = initialPayloadLength(this);

    switch (iLen) {
      case 127:
        return new Uint64BE(this.buffer.slice(
          minOffset,
          minOffset + 8)
        ).toNumber();
      case 126:
        return this.buffer.readUInt16BE(minOffset);
      default:
        return iLen;
    }
  }

  get maskingKey() {
    if (!this.mask)
      return null;

    const offset = maskingKeyOffset(this);

    return this.buffer.slice(
      offset,
      offset + maskingKeyLength
    );
  }

  set maskingKey(val) {
    validations.maskingKey({ maskingKey: val });

    const payload = this.payload;
    const newMaskingKey = val instanceof Buffer ?
                              val :
                              Buffer.from(val);

    if (this.mask) {
      newMaskingKey.copy(
        this.buffer,
        maskingKeyOffset(this)
      );

      if (payload)
        mask(payload, newMaskingKey, this);

    }
    else {
      const buffers = [
        this.buffer.slice(0, maskingKeyOffset(this)),
        newMaskingKey,
      ];

      if (payload)
        buffers.push(payload);

      setBuffer(this, Buffer.concat(buffers));
    }

    setMaskBit(this, 1);
  }

  removeMaskingKey() {
    const maskingKey = this.maskingKey;

    if (maskingKey) {
      const buffer = this.buffer;

      setBuffer(
        this,
        Buffer.concat([
          buffer.slice(0, maskingKeyOffset(this)),
          buffer.slice(payloadOffset(this)),
        ])
      );

      setMaskBit(this, 0);

      if (isMasked(this))
        unMask(this.payload, maskingKey, this);
    }

    return maskingKey;
  }

  get payload() {
    if (!this.payloadLength)
      return null;

    const _payload = this.buffer.slice(payloadOffset(this));

    if (this.mask && isMasked(this))
      unMask(_payload, this.maskingKey, this);

    return _payload;
  }

  set payload(val) {
    validations.payload({ payload: val });

    const buffers = [this.buffer.slice(0, 2)];
    const newPayloadBuf = val instanceof Buffer ? val : Buffer.from(val);
    const extPayloadLengthBuf = makePayloadLengthBuf(
      this.buffer,
      1,
      newPayloadBuf.length
    );

    if (extPayloadLengthBuf)
      buffers.push(extPayloadLengthBuf);

    if (this.mask) {
      mask(newPayloadBuf, this.maskingKey, this);
      buffers.push(this.maskingKey);
    }

    buffers.push(newPayloadBuf);
    setBuffer(this, Buffer.concat(buffers));
  }

  removePayload() {
    let buffers;
    let maskingKey;
    const payload = this.payload;

    if (payload) {
      buffers = [this.buffer.slice(0, 2)];
      makePayloadLengthBuf(this.buffer, 1, 0);

      maskingKey = this.maskingKey;
      if (maskingKey) {
        buffers.push(maskingKey);
        unMask(payload, maskingKey, this);
      }

      setBuffer(this, Buffer.concat(buffers));
    }

    return payload;
  }

  isValid() {
    try {
      validate(this.buffer);
    } catch (e) {
      return false;
    }

    return tmpPayloadLength(this) === this.payloadLength;
  }

  isComplete() {
    return tmpPayloadLength(this) >= this.payloadLength;
  }
}

defineFrameOGetterSetters(Frame.prototype);

module.exports = Frame;

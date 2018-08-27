const fin = 'fin';
const rsv1 = 'rsv1';
const rsv2 = 'rsv2';
const rsv3 = 'rsv3';
const opcode = 'opcode';
const mask = 'mask';
const payloadLength = 'payloadLength';
const maskingKey = 'maskingKey';
const payload = 'payload!';
const string = 'string';

const constants = {
  fin,
  rsv1,
  rsv2,
  rsv3,
  opcode,
  mask,
  payloadLength,
  maskingKey,
  payload,
  string,

  minFrameLength: 2, // fin to payloadLength
  maskingKeyLength: 4,
  minOffset: 2,
  uInt8Max: 125,
  uInt16Max: 65535,
  testFrameSize: 8,

  flags: {
    fin: 0x80,
    rsv1: 0x40,
    rsv2: 0x20,
    rsv3: 0x10,
    opcode: 0xf,
    mask: 0x80,
    payloadLength: 0x7f,
  },

  bitProps: [
    fin,
    rsv1,
    rsv2,
    rsv3,
  ],

};

constants.frame0Props = constants.bitProps.concat([opcode]);

module.exports = constants;

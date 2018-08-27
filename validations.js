const {
  string,
  payload,
  maskingKey,
  bitProps,
  maskingKeyLength,
} = require('./constants');

const bitValidation = (prop) => (args) => {
  if (!args.hasOwnProperty(prop) || args[prop] !== 0 && args[prop] !== 1)
    throw new TypeError(`args.${prop} must be 0 or 1`);
};

const validateBufferable = (prop, buf) => {
  if (typeof buf !== string && !(buf instanceof Buffer))
    throw new TypeError(`args.${prop} must be a string or a buffer`);
};

const validations = {
  opcode: (args) => {
    if (args.opcode < 0 || args.opcode > 15)
      throw new Error(`args.opcode must be within range 0...15 inclusive`);
  },

  payload: (args) => {
    validateBufferable(payload, args.payload);
  },

  maskingKey: (args) => {
    validateBufferable(maskingKey, args.maskingKey);

    if (Buffer.byteLength(args.maskingKey) !== maskingKeyLength)
      throw new Error('byte length of args.maskingKey must = 4');
  },
};

bitProps.forEach(prop => validations[prop] = bitValidation(prop));

module.exports.validations = validations;

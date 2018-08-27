const {
  opcode,
  flags,
  frame0Props,
} = require('./constants');

const { validations } =  require('./validations');

function clear(val, prop) {
  return val & (~flags[prop]);
}

function bitPropGetter(prop) {
  return function () {
    return this.buffer[0] & flags[prop] ? 1 : 0;
  };
}

function bitPropsetter(prop, i) {
  return function (val) {
    validations[prop]({ [prop]: val });

    if (val === 0)
      this.buffer[0] = clear(this.buffer[0], prop);
    else
      this.buffer[0] = clear(this.buffer[0], prop) | (prop === opcode ? val : val << (8 - 1 - i));
  };
}

module.exports = {
  clear,
  defineFrameOGetterSetters: function (obj) {
    frame0Props.forEach((key, i) => Object.defineProperty(
      obj,
      key,
      { get: bitPropGetter(key), set: bitPropsetter(key, i) }
    ));
  },
};

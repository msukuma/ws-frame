const {
  flags,
  frame0Props,
} = require('./constants');

const { validations } =  require('./validations');

function clear(val, prop) {
  return val & (~flags[prop]);
}

function bitPropGetter(prop) {
  return function () {
    const _prop = `_${prop}`;

    if (this.hasOwnProperty(_prop))
      return this[_prop];

    this[_prop] = this.buffer[0] & flags[prop] ? 1 : 0;
    return this[_prop];
  };
}

function bitPropsetter(prop) {
  return function (val) {
    const _prop = `_${prop}`;
    validations[prop]({ [prop]: val });

    if (val !== this[prop]) {
      if (val === 0) {
        this.buffer[0] = clear(this.buffer[0], prop);
        this[_prop] = 0;
      }
      else {
        this.buffer[0] = clear(this.buffer[0], prop) | flags[prop];
        this[_prop] = 1;
      }
    }
  };
}

exports.clear = clear;

exports.defineFrameOGetterSetters = function (obj) {
  frame0Props.forEach(key => Object.defineProperty(
    obj,
    key,
    { get: bitPropGetter(key), set: bitPropsetter(key) }
  ));
};

const {
  frame0Props,
  flags,
  uInt8Max,
  uInt16Max,
  testFrameSize,
  payload,
} = require('../constants');

const {
  itExists,
  completeFrame,
  incompleteFrame,
  payloadLessFrame,
  makePayload,
 } = require('./helpers');

const {
  mask,
  unMask,
} = require('../private');

const assert = require('assert');
const { Uint64BE } = require('int64-buffer');
const Frame = require('../frame');
const payloadBuf = Buffer.from(payload);

describe('Frame', function () {
  it('exists', () => assert(Frame instanceof Function));

  describe('validations', () => {
    it('validates argument is a buffer or a plain object', () => {
      assert.throws(
        () => new Frame(),
        /buffer.+object$/
      );
    });

    describe('when argument is a buffer', () => {
      it('validates buffer is at least 2 bytes long', () => {
        assert.throws(
          () => new Frame(Buffer.allocUnsafe(1)),
          /2 bytes/
        );
      });
    });

    describe('when argument is a plain object', () => {
      frame0Props.forEach(key => {
        describe(`args.${key}`, () => {
          it(`if passed, validates args.${key} is a number`, () => {
            assert.throws(
              () => new Frame({ [key]: '20' }),
              /must be/
            );
          });

          it(`if passed, validates args.${key} range`, () => {

            assert.throws(
              () => new Frame({ payload:  payload, [key]: -1 }),
              new RegExp(`${key} must be`)
            );
          });
        });
      });

      describe('args.maskingKey', () => {
        it('if passed, validates args.maskingKey is bufferable', () => {
          assert.throws(
            () => new Frame({ maskingKey: 1 }),
            /string or a buffer/
          );
        });

        it('if passed, validates args.maskingKey length', () => {
          assert.throws(
            () => new Frame({ maskingKey: '1' }),
            /must = 4/
          );
        });
      });

      describe('args.payload', () => {
        it('if passed, validates args.payload is bufferable', () => {
          assert.throws(
            () => new Frame({ payload: 1 }),
            /string or a buffer/
          );
        });
      });
    });
  });

  describe('properties', () => {
    let frame;

    describe('buffer', () => {
      before(() => frame = completeFrame(0));

      itExists('buffer');

      it('returns the frame object as a buffer',
        () => assert(frame.buffer instanceof Buffer));
    });

    frame0Props.forEach((prop, i) => {
      describe(prop, () => {

        before(() => {
          const args = {};
          frame0Props.forEach((p, i) => {
            if (p !== prop)
              args[p] = i % 2;
          });

          frame = new Frame(args);
        });

        itExists(prop);
        it('defaults to 0', () => assert(frame[prop] === 0));

        describe('getter', () => {
          it('returns a number', () => assert(typeof frame[prop] === 'number'));
        });

        describe('setter', () => {
          it('validates input', () => {
            assert.throws(
              () => frame[prop] = -1,
              /must be.*\d/
            );
          });
          it('sets prop to equal input', () => {
            frame[prop] = 1;
            assert(frame[prop] === 1);
          });
          it('does not affect other metadata', () => {
            frame[prop] = 0;
            frame0Props.forEach((p, i) => {
              if (p !== prop)
              assert(frame[p] === i % 2);
            });
          });
        });
      });
    });

    describe('mask', () => {
      before(() => frame = new Frame({}));

      itExists('mask');
      it('defaults to 0', () => assert(frame.mask === 0));

      describe('getter', () => {
        it('returns a number', () => assert(typeof frame.mask === 'number'));
      });
    });

    describe('payloadLength', () => {
      let length;
      before(() => {
        frame = completeFrame(0);
        length = frame.payloadLength;
      });

      itExists('payloadLength');

      describe('getter', () => {
        it('returns a number', () =>
          assert(typeof frame.payloadLength === 'number'));

        describe(`when payloadLength is <= ${uInt8Max}`, () => {
          it('returns 7 bit value starting at frame[1]', () => {
            assert(length === (frame.buffer[1] & flags.payloadLength));
          });
        });

        describe(`when ${uInt8Max} < payloadLength <= ${uInt16Max}`, () => {
          it('returns 16 bit value starting at frame[2]', () => {
            frame = completeFrame(0, uInt16Max);
            length = frame.payloadLength;

            assert(length === (frame.buffer.readUInt16BE(2)));
          });
        });

        describe(`when payloadLength > ${uInt16Max}`, () => {
          it('returns 64ish bit value starting at frame[2]', () => {
            frame = completeFrame(0, uInt16Max + 1);
            length = frame.payloadLength;

            assert(length === new Uint64BE(frame.buffer.slice(2, 10)).toNumber());
          });
        });

        describe('when input is a buffer representing a frame', () => {
          it('returns the real payload length regardless if the frame is complete or not', () => {
            const size = uInt16Max + 1;
            const _incompleteFrame = incompleteFrame(size);
            assert(_incompleteFrame.payloadLength === size);
          });
        });

        describe('when input is an object with args to construct a frame', () => {
          it(`returns the payload length of a frame that's comsplete`, () => {
            frame = completeFrame(0);
            assert(frame.payloadLength === testFrameSize);
          });
        });
      });
    });

    describe('maskingKey', () => {
      before(() => frame = completeFrame(1));

      itExists('maskingKey');

      describe('getter', () => {
        it('if mask is set, returns a buffer', () =>
          assert(frame.maskingKey instanceof Buffer));

        it('returns null if mask is not set', () => {
          const maskLessFrame = completeFrame(0);
          assert(maskLessFrame.maskingKey === null);
        });
      });

      describe('setter', () => {
        it('validates input is a string or buffer', () => {
          assert.throws(
            () => frame.maskingKey = 3,
            /string or a buffer/
          );
        });

        it('validates input is 4 bytes long', () => {
          assert.throws(
            () => frame.maskingKey = 'invalid masking key',
            /must = 4/
          );
        });

        it('replaces the existing masking key', () => {
          const maskingKeyBuf = Buffer.allocUnsafe(4);
          frame.maskingKey = maskingKeyBuf;

          assert(frame.maskingKey.compare(maskingKeyBuf) === 0);
        });

        it('sets the mask bit to 1', () => assert(frame.mask === 1));

        it('adds a masking key to frame if none existed before', () => {
          const maskLessFrame = completeFrame(0);
          const payload = maskLessFrame.payload;
          const maskingKey = Buffer.allocUnsafe(4);

          maskLessFrame.maskingKey = maskingKey;

          assert(maskLessFrame.maskingKey.compare(maskingKey) === 0);
          assert(maskLessFrame.payload.compare(payload) === 0);

        });
      });
    });

    describe('payload', () => {
      let _payloadLessFrame;
      let newLoad;

      before(() => {
        _payloadLessFrame = payloadLessFrame();
        frame = completeFrame(1);
      });

      itExists('payload');

      describe('getter', () => {
        it('returns null if payload was not set',
          () => assert(_payloadLessFrame.payload === null));

        it('returns a buffer if payload exists',
          () => assert(frame.payload instanceof Buffer));

        it('return an unmaked payload', () => {
          assert(frame.payload.compare(payloadBuf) === 0);
        });
      });

      describe('setter', () => {
        beforeEach(() =>
          newLoad = Buffer.from('this should change the payloadLength'));

        it('validates input is a string or buffer', () => {
          assert.throws(
            () => frame.payload = 3,
            /string or a buffer/
          );
        });

        it('sets the payload if none existed', () => {
          _payloadLessFrame.payload = newLoad;

          assert(_payloadLessFrame.payload.compare(newLoad) === 0);
        });

        it('updates the payloadLength',
          () => assert(_payloadLessFrame.payloadLength === newLoad.length));

        it('replaces the existing payload', () => {
          const newLoadCopy = Buffer.allocUnsafe(newLoad.length);
          newLoad.copy(newLoadCopy);
          frame.payload = newLoad;
          assert(frame.payload.compare(newLoadCopy) === 0);
        });

        it('masks the payload if mask is set', () => {
          frame.payload = newLoad;
          assert(frame.payload.compare(newLoad) !== 0);
        });
      });
    });

    describe('methods', () => {
      let frame;
      let b4;
      let after;

      before(() => frame = completeFrame(1));

      describe('removeMaskingKey', () => {
        before(() => b4 = frame.maskingKey);

        it('is defined',
          () => assert(frame.removeMaskingKey instanceof Function));

        it('removes the frame\'s maskingKey if it exists', () => {
          after = frame.removeMaskingKey();
          assert(frame.maskingKey === null);
        });

        it('returns a buffer', () => assert(after instanceof Buffer));

        it('returns the frame\'s maskingKey if it exists', () => {
          assert(after.compare(b4) === 0);
        });

        it('returns null if there is no maskingKey', () => {
          assert(frame.removeMaskingKey() === null);
        });

        it('sets mask bit to 0', () => assert(frame.mask === 0));

        it('unmasks the payload',
          () => assert(frame.payload.compare(payloadBuf) === 0));

      });

      describe('removePayload', () => {
        before(() => {
          frame = completeFrame(1, Math.pow(testFrameSize, 3));
          b4 = frame.payload;
        });

        it('is defined',
          () => assert(frame.removePayload instanceof Function));

        it('removes the frame\'s payload if it exists', () => {
          after = frame.removePayload();
          assert(frame.payload === null);
        });

        it('returns a buffer', () => assert(after instanceof Buffer));

        it('returns the frame\'s unmasked payload if it exists', () => {
          unMask(b4, frame.maskingKey);
          assert(after.compare(b4) === 0);
        });

        it('returns null if there is no payload', () => {
          assert(frame.removePayload() === null);
        });

        it('sets payloadLength bits to 0',
          () => assert(frame.payloadLength === 0));
      });
    });
  });
});

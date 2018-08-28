ws-frame
==========
A class used to represent a websocket frame.

Usage
------

```js
// server.js
const net = require('net');
const Frame = require('ws-frame');
const server = new net.Server();

server.on('connection', socket => {
  socket.on('data', buffer => {
    let payload;
    const frame = new Frame(buffer);

    if(!frame.mask){
        ... // bad request code
    } else if(frame.fin) {
      const payload = frame.payload;
      console.log(payload.toString());
    }
  })

})

server.listen(4000);
```

```js
// client.js
const net = require('net');
const socket = new net.Socket();
const MASKING_KEY = Buffer.From('some masking key');
let mFrame;

socket.connect({ port: 4000 });

socket.on('data', buf => {
  let message;
  const frame = new Frame(buf);

  if(frame.opcode) {
    mFrame = frame;
  } else {
    mFrame.concat(frame.payload)
  }

  if(frame.fin){
    message = mFrame.payload.toString();
    ... // do something with message
    if(frame.opcode === PING){
      mFrame.opcode = PONG;
      mFrame.payload = Buffer.from('pong message?');
      mFrame.maskingKey = MASKING_KEY;
    } else {
      mFrame = new Frame({
        maskingKey: MASKING_KEY,
        payload: appData
      });
    }
    socket.write(mFrame.toBuffer());
  }
})


```
Class: Frame
=============
new Frame(options|Buffer)
------------
The Frame constructor accepts an options object(plain object) or a Buffer.
* options
  - `fin`: 0 or 1
  - `rsv1`: 0 or 1
  - `rsv2`: 0 or 1
  - `rsv3`: 0 or 1
  - `mask`: 0 or 1
  - `opcode`: 0 ... 15 inclusively
  - `maskingKey`: String or Buffer
  - `payload`: String or Buffer
constrictor accepts a plain object or buffer

Frame Properties
--------------------

Properties| Setter accepts | Getter returns
----------|----------------|---------------
`fin`| Number - 0 or 1| Number - 0 or 1
`rsv1`| Number - 0 or 1| Number - 0 or 1
`rsv2`| Number - 0 or 1| Number - 0 or 1
`rsv3`| Number - 0 or 1| Number - 0 or 1
`mask`| Number - 0 or 1| Number - 0 or 1
`opcode`| Number - 0 or 15| Number - 0 or 15
`payloadLength`| N/A| Number
`maskingKey`|String or Buffer| Buffer
`payload`|String or Buffer| Buffer

Frame Instance Methods
----------------------
`removePayload()`: removes a frame's payload.

`removeMaskingKey()`: removes a frame's maskingKey and unmasks its payload if it was masked.

`concat(Buffer)`: appends a buffer to a frame's payload.

`toBuffer()`: returns a buffer representation of a frame.

`isValid()`: returns true if a frame is valid and false otherwise.

`toString()`: returns a string representation of a frame.

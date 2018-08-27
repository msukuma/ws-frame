ws-frame
==========
A class used to represent a websocket frame.

Usage
------

```JS
const net = require('net');
const Frame = require('ws-frame')
const server = new net.Server()

server.on('connection', socket => {
  socket.on('data', buffer => {
    let payload;
    const frame = new Frame(buffer);

    if(!frame.mask){
        ... // bad request code
    } else if(frame.complete()) {
      const payload = frame.payload;
      console.log(payload.toString())
    }
  })

})
```

** *Still in development ** 

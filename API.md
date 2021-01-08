Webcast.js API
--------------

`webcast.js` involves several cutting-edge technologies and, thus, require a fairly modern browser.
It takes advantage of the following Javascript APIs:

* [WebSocket API](http://www.w3.org/TR/2011/WD-websockets-20110929/): This is the transport layer. It is readily available in most modern browsers.
* [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder): This is the API used to encode data before sending it to liquidsoap.

### The API

The library contains a single classes:

* `Webcast.Socket`: a specialized `WebSockets` that implements the `webcast` protocol using an instance of `MediaRecorder`.

### How to use?

Here's a simple use of the library:

```
var mediaRecorder = (...);

var webcast = new Webcast.Socket({
  mediaRecorder: mediaRecorder,
  url: "ws://localhost:8080/mount",
  info: { ... }
});

webcast.sendMetadata({
  title:  "My Awesome Stream",
  artist: "The Dude"
});

//... Later ...
webcast.close(function () {
  console.log("connection closed!");
});

```

You can also look at the [example client code](https://github.com/webcast/webcaster/)
for a more detailed use of the library.

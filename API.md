Webcast.js API
--------------

The `webcast.js` involves several cutting-edge technologies and, thus, require a fairly modern browser. 
Here's a quick summary of the technologies required:

* [WebSocket API](http://www.w3.org/TR/2011/WD-websockets-20110929/): This is the transport layer. It is readily available in most modern browsers.
* [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html): This is the API used to manipulate audio and video data inside the browser. It is currently fully implemented in Chrome and only partially in Firefox Nightly.
* [asm.js](http://asmjs.org/): This is the techonology used to optimize the mp3 encoder. It is currently only supported by Firefox.

All in all, the protocol will be fully usable with [Firefox Nightly](http://nightly.mozilla.org/) once they finish implementing the Web Audio API 
and in Chrome once they fully support `asm.js`.

### The API

The library contains several classes:

* `Webcast.Encoder.Raw`: encoder returning raw s8 samples.
* `Webcast.Encoder.Mp3`: encoder returning mp3 data. Requires [libshine.js](https://github.com/savonet/shine/tree/master/js).
* `Webcast.Encoder.Resample`: a wrapper to resample encoder's input. Requires [libsamplerate.js](https://github.com/savonet/libsamplerate-js).
* `Webcast.Encoder.Asynchronous`: a wrapper to encode in a [Web Worker](http://www.w3.org/TR/workers/)
* `Webcast.Socket`: a simple wrapper around `WebSockets` that implements the `webcast` protocol.
* `Webcast.Node`: a wrapper to create a `webcast` node, in-par with the Web Audio API.

### How to use?

Here's a simple use of the library:

```
var source = (...);

var encoder = new Webcast.Encoder.Mp3({
  channels: 2,
  samplerate: 44100,
  bitrate: 128
});

if (inputSampleRate !== 44100) {
  encoder = new Webcast.Encoder.Resample({
    encoder:    encoder,
    samplerate: inputSampleRate 
  });
}

if (useWorker) {
  encoder = new Webcast.Encoder.Asynchronous({
    encoder: encoder,
    scripts: [(...], // full path to required scripts for the worker.
                     // usually includes requires encoders and webcast.js 
  });
}

var webcast = new Webcast.Node({
  url: "ws://localhost:8080/mount",
  encoder: encoder,
  context: audioContext,
  options: options
});

source.connect(webcast);
webcast.connect(audioContext.destination);

webcast.sendMetadata({
  title:  "My Awesome Stream",
  artist: "The Dude"
});

```

You can also look at the [example client's code](https://github.com/webcast/webcast.js/blob/master/examples/client/client.js)
for a more detailed use of the library.

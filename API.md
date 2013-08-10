Webcast.js API
--------------

The library contains several classes:

* `Webcast.Encoder.Raw`: encoder returning raw s8 samples.
* `Webcast.Encoder.Mp3`: encoder returning mp3 data. Requires [libshine.js](https://github.com/savonet/shine/tree/master/js).
* `Webcast.Encoder.Resample`: a wrapper to resample encoder's input. Requires [libsamplerate.js](https://github.com/savonet/libsamplerate-js).
* `Webcast.Encoder.Asynchronous`: a wrapper to encode in a [Web Worker](http://www.w3.org/TR/workers/)
* `Webcast.Socket`: a simple wrapper around `WebSockets` that implements the `webcast` protocol.
* `Webcast.Node`: a wrapper to create a `webcast` node, in-par with the Web Audio API.

The demonstration client, discussed in the previous secion, contains a complete example use of this API.
Here's the highlight of its code:

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

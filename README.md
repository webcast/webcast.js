Webcast
=======

This file and its corresponding repository documents the webcast protocol for streaming audio and video data using
[websockets](http://en.wikipedia.org/wiki/WebSocket).

Documentation
-------------

<table>
  <tr><td><img src="https://rawgithub.com/savonet/webcast/master/misc/webcast.svg" alt="Webcast Flowchart" title="Webcast Flowchart"/></td></tr>
  <tr><td>The Webcast Flowchart</td></tr>
</table>

### Description

The webcast protocol is used to send multimedia data to a streaming server using websockets. It is designed to be implemented
in browsers, thus providing a readily available browser client to stream local files and live media (webcam video, microphone audio).

The protocol involves several cutting-edge technologies and, thus, require a fairly modern browser. However, in the
near future, it will provide a solid basis for browser-side streaming. 

Here's a quick summary of the technologies required for the protocol and their limitations:
* [Websocket API](http://www.w3.org/TR/2011/WD-websockets-20110929/): This is the transport layer. It is readily available in most modern browsers.
* [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html): This is the API used to manipulate audio and video data inside the browser. It is currently fully implemented in Chrome and only partially in Firefox Nightly.
* [asm.js](http://asmjs.org/): This is the techonology used to optimize the mp3 encoders. It is currently only supported by Firefox.

All in all, the protocol will be fully usable with [Firefox Nightly](http://nightly.mozilla.org/) once they finish implementing the Web Audio API 
and in Chrome once they fully support `asm.js`.

### How to test?

#### Client

The `examples/client/` directory of this repository contains a client examples, sending mp3 encoded data, using 
[lame](https://github.com/akrennmair/libmp3lame-js) and [shine](https://github.com/savonet/shine/tree/master/js)
and also sending raw PCM data. 

You can start the client by executing `make` in the repository. You will need a functional `python` binary 
with the `SimpleHTTPServer` module.

Once started, you can point your browser to [http://localhost:8000/](http://localhost:8000/).

#### Server

The `examples/server/` directory contains a demo server, written in [NodeJS](http://nodejs.org/). In order to run it, you
will need a functional node install. Once this is done, you can execute `npm install` in the `server/` directory
and then `cake run` and you should be good to go!

Alternatively, a fully functional implementation of the protocol is available in
[liquidsoap](https://github.com/savonet/liquidsoap). To test it, you can simply run liquidsoap with the following
command line:
```
liquidsoap 'output.ao(fallible=true,audio_to_stereo(input.harbor("mount",port=8080)))'
```


### Webcast API

We also provide a high-level Javascript API for the protocol. It is written in `coffee-script` and located
at `src/webcast.coffee`. If you do not like caffeine, you can also use the compiled version, located at `lib/webcast.js`.

The API contains several classes:

* `Webcast.Encoder.{Raw, Lame, Shine}`: the set of currently available encoders
* `Webcast.Encoder.Worker`: a wrapper to encode in a [Web Worker](http://www.w3.org/TR/workers/)
* `Webcast.Socket`: A simple wrapper around `Websockets` that implements the `webcast` protocol.
* `Webcast.Node`: A wrapper to create a `webcast` node, in-par with the Web Audio API.

The demonstration client, discussed in the previous secion, contains a complete example use of this API.
Here's the highlight of its code:

```
var source = (...);

var encoder = new Webcast.Encoder.Lame({
  channels: 2,
  samplerate: 44100,
  bitrate: 128
});

var webcast = new Webcast.Node({
  uri: "ws://localhost:8080/mount",
  encoder: encoder,
  context: audioContext,
  options: options
});

source.connect(webcast);
webcast.connect(audioContext.destination);

```

### Protocol Specifications

**This section is subject to changes**

The `webcast` protocol aims at streaming binary data and textual metadata through a websocket. 

A websocket for the `webcast` protocol MUST be initiated by passing the second argument as `"websocket"`:
```
var websocket = new WebSocket("ws://localhost:8080/mount", "webcast");
```

In accordance with the [websocket protocol documentation](http://tools.ietf.org/html/rfc6455), an opened
`webcast` websocket receives two types of frames:
* Binary frames
* Text frames

Binary frames contain transmitted data and are passed directly to the underlying process, most likely a
multimedia decoder.

Text frames MUST contain JSON-encoded data, with the following top-level structure:
```
{ type: "frame-type",
  data: frameData }
```
Where the `data` field is OPTIONAL and `frameData` can be any type of JSON-encoded data.

Any implementation SHOULD raise an error upon receiving text frames that do not follow this structure. 

Any implementation SHOULD discard without raising an error text frames that follow this structure
but contain a `type` that is not defined below. 

The following text frames are currently documented and MUST be accepted by any implementation.

#### HELLO

The first frame sent to a `webcast` websocket MUST be a `hello` frame. Any implementation MUST
raise an error if the first frame received on a `webcast` websocket is not a `hello` frame.

The type of this frame MUST be `"hello"` and its data MUST be an object that MUST contain a `mime` key.

The `hello` frame MAY contain other information but the structure of this information is not documented yet.

Here is an example of a `hello` frame of a `mp3` stream:
```
{
  type: "hello",
  data: {
    mime:  "audio/mpeg",
    audio: {
      channels: 2,
      samplerate: 44100,
      bitrate: 128,
      encoder: "libmp3lame"
    }
  }
}
```

#### METADATA

`metadata` frames are used to transmit punctual metadata information. They are OPTIONAL as some
binary format such as `ogg/vorbis` are capable of embedding their own metadata information.

The type of a `medatada` frame MUST be `"metadata"` and its data MUST be a mapping of metadata keys 
and values.

Here is an example of a `metadata` frame:
```
{
  type: "metadata",
  data: {
    title: "My Awesome track",
    artist: "Some obscur artist you never heard of before"
  }
}
```

Webcast
=======

This file and its corresponding repository documents the webcast protocol for streaming audio and video data using
[websockets](http://en.wikipedia.org/wiki/WebSocket).

Documentation
-------------

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
    mount: "/mount",
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

## Webcast API

We also provide a high-level Javascript API for the protocol. It is written in `coffee-script` and located
at `src/webcast.coffee`. If you do not like caffeine, you can also use the compiled version, located at `lib/webcast.js`.

The API contains several classes:

* `Webcast.Encoder.{Raw, Lame, Shine}`: the set of currently available encoders
* `Webcast.Socket`: A simple wrapper around `Websockets` that implements the `webcast` protocol.
* `Webcast.Node`: A wrapper to create a `webcast` node, in-par with the Web Audio API.

The demonstration client discussed in the next secion, contains a complete example. Here's the highlight of its code:

To stream from a `<audio>` element:
```
var audioElement = ...; // Find or create the <audio> element.
var source = audioContext.createMediaElementSource(audioElement);

var encoder = new Webcast.Encoder.Lame({
  channels: 2,
  samplerate: 44100,
  bitrate: 128
});

var webcast = new Webcast.Node({
  uri: "ws://localhost:8080/mount",
  encoder: encoder,
  context: audioContext,
  source: source
});

```

To stream from a Media Stream element:
```
navigator.getUserMedia({audio:true, video:false}, function (stream) {
  var source = audioContext.createMediaStreamSource(stream);

  var encoder = new Webcast.Encoder.Lame({
    channels: 2,
    samplerate: 44100,
    bitrate: 128
  });

  var webcast = new Webcast.Node({
    uri: "ws://localhost:8080/mount",
    encoder: encoder,
    context: audioContext,
    source: source
  });
```

How to test?
------------

#### Client

The `examples/client/` directory of this repository contains a client examples, sending mp3 encoded data, using 
[lame](https://github.com/akrennmair/libmp3lame-js) and [shine](https://github.com/savonet/shine/tree/master/js)
and also sending raw PCM data. 

You can start the client by executing `make` in the repository. You will need a functional `python` binary 
with the `SimpleHTTPServer` module.

Once started, you can point your browser to [http://localhost:8000/](http://localhost:8000/).

#### Server

The `server/` directory contains a demo server, written in [NodeJS](http://nodejs.org/). In order to run it, you
will need a functional node install. Once this is done, you can execute `npm install` in the `server/` directory
and then `cake run` and you should be good to go!

Alternatively, a fully functional implementation of the protocol is available in
[liquidsoap](https://github.com/savonet/liquidsoap). To test it, you can simply run liquidsoap with the following
command line:
```
liquidsoap 'output.ao(fallible=true,input.harbor("mount",port=8080))'
```

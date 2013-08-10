### Webcast Protocol Specifications

The `webcast` protocol is defined to stream binary multimedia data and text metadata through a websocket. 

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

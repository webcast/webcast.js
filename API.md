Webcast.js API
--------------

`webcast.js` implements the client side of the [webcast protocol](SPECS.md), versions 1 and 2. It sends the output of
a [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) to a server over a
[WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

It is distributed as an ES module:

```js
import { Socket } from "@webcast.js/socket"
```

### `new Socket(options)`

Opens a connection and streams the recorder's data to it.

| Option          | Type                          | Description                                                                                       |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `mediaRecorder` | `MediaRecorder`               | The recorder to stream. Required.                                                                 |
| `url`           | `string`                      | The `ws://` or `wss://` URL of the mount. Credentials in the URL are sent in the `hello` message. |
| `info`          | `HelloInfo`                   | Extra members of the `hello` message: `audio`, `video`, `name`, `description`, `genre`, `url`.    |
| `protocols`     | `Protocol[]`                  | The subprotocols to offer. Defaults to `["webcast.v2", "webcast"]`.                               |
| `onOpen`        | `(event: Event) => void`      | Called when the connection opens, before the `hello` message is sent.                             |
| `onReady`       | `() => void`                  | Called when the server accepts the stream. In v1, this is right after `hello` is sent.            |
| `onError`       | `(event: Event) => void`      | Called on a connection error.                                                                     |
| `onClose`       | `(event: CloseEvent) => void` | Called when the connection closes. `event.code` and `event.reason` tell why.                      |

The socket takes over the recorder's `ondataavailable` and `onstop` handlers:

- Data recorded before the server is ready is queued, so the recorder can be started right away.
- Stopping the recorder closes the connection.
- When the connection closes, the recorder is stopped.

When both versions are offered and the handshake fails, the socket retries once with `webcast` alone, since some v1
servers only accept that exact subprotocol.

### Methods and properties

- `sendMetadata(data: Record<string, string>)`: sends a `metadata` message. Metadata sent before the server is ready
  is queued along with the media.
- `close()`: closes the connection with code `1000`.
- `isConnected()`: whether the WebSocket is open.
- `isReady()`: whether the server accepted the stream.
- `bufferedAmount`: the number of bytes queued on the WebSocket and not yet sent. A value that keeps growing means the
  network cannot keep up with the encoder.
- `socket`: the underlying `WebSocket`.

### Example

```js
import { Socket } from "@webcast.js/socket"

const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })

const webcast = new Socket({
  mediaRecorder,
  url: "ws://source:hackme@localhost:8080/mount",
  info: { name: "My Radio", audio: { channels: 2, bitrate: 128 } },
  onClose: ({ code, reason }) => console.log(`Closed: ${code} ${reason}`),
})

mediaRecorder.start(1000)

webcast.sendMetadata({
  title: "My Awesome Stream",
  artist: "The Dude",
})
```

See [webcaster](https://github.com/webcast/webcaster/) for a complete client.

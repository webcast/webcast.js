# Webcast Protocol Specification

The webcast protocol carries a live media stream and its metadata from a source client to a streaming server over a
[WebSocket](https://www.rfc-editor.org/rfc/rfc6455) connection. It is designed so that a web browser can act as the
source client, encoding with the [MediaRecorder API](https://www.w3.org/TR/mediastream-recording/).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14)
([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and
only when, they appear in all capitals, as shown here.

## 1. Terminology

- **Client**: the endpoint that sends media. Usually a browser.
- **Server**: the endpoint that receives media, for instance [Liquidsoap](https://www.liquidsoap.info/)'s `harbor`.
- **Message**: a complete WebSocket message, text or binary. A message may be fragmented into several WebSocket frames;
  this specification only deals with messages.
- **Mount**: the resource on the server that the client streams to, identified by the path of the connection URL.

## 2. Connection

The client connects to a `ws://` or `wss://` URL. The path of the URL identifies the mount.

The client MUST offer the `webcast` subprotocol in the `Sec-WebSocket-Protocol` header of the opening handshake, and
the server MUST select it. If the server does not select it, the client MUST fail the connection, as described in
[RFC 6455, Section 4.1](https://www.rfc-editor.org/rfc/rfc6455#section-4.1).

## 3. Messages

### 3.1 Text messages

Every text message MUST be a JSON object ([RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)) with the following
members:

- `type` (string, REQUIRED): the message type.
- `data` (any JSON value, OPTIONAL): the message payload. Each message type defines whether `data` is required and
  what it contains.

A server that receives a text message that is not a JSON object with a string `type` member MUST close the connection
with code `4400`.

An endpoint that receives a well-formed text message whose `type` it does not know MUST ignore it, so that new message
types can be added without breaking existing implementations.

### 3.2 Binary messages

Binary messages carry media data. They are sent by the client only. See [Section 5](#5-media-stream).

## 4. Message types

### 4.1 `hello`

Direction: client to server.

The `hello` message opens the session. The client MUST send exactly one `hello` message, and it MUST be the first
message it sends.

The server MUST close the connection with code `4400` if the first message it receives is not a valid `hello` message,
or if it receives a second `hello` message.

The `data` member is REQUIRED and MUST be an object with the following members:

- `mime` (string, REQUIRED): the MIME type of the media stream, including codec parameters where known, for instance
  `audio/webm;codecs=opus`.
- `user` (string, OPTIONAL): the user name to authenticate with.
- `password` (string, OPTIONAL): the password to authenticate with.
- `audio` (object, OPTIONAL): a description of the audio track, with the following OPTIONAL members:
  - `channels` (integer): the number of channels.
  - `samplerate` (integer): the sample rate, in Hz.
  - `bitrate` (number): the target bitrate, in kbit/s.
  - `encoder` (string): the name of the encoder.
- `video` (object, OPTIONAL): a description of the video track, with the following OPTIONAL members:
  - `width` (integer): the width, in pixels.
  - `height` (integer): the height, in pixels.
  - `framerate` (number): the frame rate, in frames per second.
  - `bitrate` (number): the target bitrate, in kbit/s.
  - `encoder` (string): the name of the encoder.
- `name` (string, OPTIONAL): the name of the stream.
- `description` (string, OPTIONAL): a description of the stream.
- `genre` (string, OPTIONAL): the genre of the stream.
- `url` (string, OPTIONAL): a web page about the stream.

The `data` object MAY contain other members. A server MUST ignore the members it does not know.

The `audio` and `video` members are informational. The media stream itself is authoritative, and a server MUST NOT
fail to decode a stream because these members are missing or disagree with it.

A server MAY require `user` and `password`. It MUST close the connection with code `4401` if they are required but
missing, or if they are invalid. A server MAY close the connection with code `4404` if the mount does not exist, with
code `4409` if the mount is already in use, and with code `4415` if it does not support the MIME type.

The server MUST NOT process any media data before the client is authenticated.

Example:

```json
{
  "type": "hello",
  "data": {
    "mime": "audio/webm;codecs=opus",
    "user": "source",
    "password": "hackme",
    "audio": {
      "channels": 2,
      "samplerate": 48000,
      "bitrate": 128,
      "encoder": "opus"
    },
    "name": "My Radio"
  }
}
```

### 4.2 `metadata`

Direction: client to server.

The `metadata` message carries metadata about the media, typically the current track. Sending it is OPTIONAL: some
formats, such as Ogg, carry their own metadata inside the media stream.

The `data` member is REQUIRED and MUST be an object mapping metadata keys to values. Keys SHOULD be lowercase, and
SHOULD use the names defined by [Vorbis comments](https://www.xiph.org/vorbis/doc/v-comment.html) where one exists,
such as `title`, `artist` and `album`.

Values SHOULD be strings. A server MAY ignore entries whose value is not a string, but MUST NOT close the connection
because of them.

The metadata applies to the media that follows it: it takes effect at the position, in the media stream, of the binary
messages received after it. Since encoders and containers buffer data, this position is approximate.

Example:

```json
{
  "type": "metadata",
  "data": {
    "title": "My Awesome Track",
    "artist": "Some obscure artist you never heard of before"
  }
}
```

## 5. Media stream

The payloads of all binary messages, concatenated in the order they are received, form a single byte stream of the
MIME type declared in the `hello` message.

- Message boundaries carry no meaning. The server MUST NOT assume that a message contains whole frames, packets or
  container units.
- The stream MUST be sent from its beginning: its first bytes are the container header or initialization segment. A
  client that restarts its encoder MUST open a new connection.
- The client MUST send binary messages in the order the encoder produced them.
- The client MUST NOT send binary messages before the `hello` message.

## 6. Closing and errors

Either endpoint MAY close the connection at any time. A client that stops streaming SHOULD close the connection with
code `1000`.

A server that closes the connection because of an error SHOULD use one of the following codes, with a human-readable
reason:

| Code   | Meaning                                                                                     |
| ------ | ------------------------------------------------------------------------------------------- |
| `4400` | Protocol error: malformed text message, invalid or repeated `hello`, or unexpected message. |
| `4401` | Authentication required or failed.                                                          |
| `4404` | Unknown mount.                                                                              |
| `4409` | Mount already in use.                                                                       |
| `4415` | Unsupported MIME type.                                                                      |
| `1011` | Internal server error.                                                                      |

A client SHOULD report the close code and reason to the user.

Both endpoints MUST answer Ping frames with Pong frames, as required by
[RFC 6455, Section 5.5.2](https://www.rfc-editor.org/rfc/rfc6455#section-5.5.2).

## 7. Flow control

The connection has no flow control besides TCP's. When the network cannot keep up with the encoder, data accumulates on
the client. A browser client SHOULD monitor the `bufferedAmount` of its WebSocket and SHOULD close the connection, and
possibly open a new one, when it grows past a bound, rather than let latency grow without limit.

## 8. Security considerations

The `hello` message carries the password in clear text. Clients SHOULD use `wss://` when they send credentials.

Browsers do not let scripts set headers on a WebSocket handshake, and their handling of credentials in the URL varies.
Credentials are therefore carried in the `hello` message. A browser client that is given a URL with credentials in it
SHOULD remove them from the URL and send them in the `hello` message instead.

Any web page can open a WebSocket connection to any server, including one on the user's local network. A server SHOULD
require credentials, and MAY restrict the `Origin` header values it accepts.

Webcast =
  Encoder: {}

class Webcast.Encoder.Raw
  constructor: ({@channels, @samplerate}) ->
    @mime = "audio/x-raw,format=S8,channels=#{@channels},layout=interleaved,rate=#{@samplerate}"
    @info =
      audio:
        channels: @channels
        samplerate: @samplerate
        encoder: "RAW u8 encoder"

  toString: -> """
    (new Webcast.Encoder.Raw({
      channels: #{@channels}, 
      samplerate: #{@samplerate}
     }))
               """

  close: (fn) ->
    fn new Uint8Array

  encode: (data, fn) ->
    channels = data.length
    samples  = data[0].length
    buf = new Int8Array channels*samples
    for chan in [0..channels-1]
      for i in [0..samples-1]
        buf[channels*i + chan] = data[chan][i]*127

    fn buf

class Webcast.Encoder.Mp3
  mime: "audio/mpeg"

  constructor: ({@samplerate, @bitrate, @channels}) ->
    @shine = new Shine
      samplerate: @samplerate
      bitrate:    @bitrate
      channels:   @channels
      mode:       if @channels == 1 then Shine.MONO else Shine.JOINT_STEREO

    @info =
      audio:
        channels: @channels
        samplerate: @samplerate
        bitrate: @bitrate
        encoder: "libshine"

    this

  toString: -> """
    (new Webcast.Encoder.Mp3({
      bitrate: #{@bitrate},
      channels: #{@channels},
      samplerate: #{@samplerate}
     }))
               """

  close: (fn) ->
    fn @shine.close()

  encode: (data, fn) ->
    fn @shine.encode(data)

class Webcast.Encoder.Resample
  constructor: ({@encoder, @samplerate, @type}) ->
    @mime       = @encoder.mime
    @info       = @encoder.info
    @channels   = @encoder.channels
    @ratio      = parseFloat(@encoder.samplerate) / parseFloat(@samplerate)
    @type       = @type || Samplerate.FASTEST
    @resamplers = []
    @remaining  = []

    for i in [0..@channels-1]
      @resamplers[i] = new Samplerate
        type: @type

      @remaining[i] = new Float32Array

  toString: -> """
    (new Webcast.Encoder.Resample({
      encoder: #{@encoder.toString()},
      samplerate: #{@samplerate},
      type: #{@type}
     }))
               """

  close: (fn) ->
    for i in [0..buffer.length-1]
      {data} = @resamplers[i].process
        data: @remaining[i]
        ratio: @ratio
        last: true

    @samplerate.close()

    @encoder.close data, fn

  encode: (buffer, fn) ->
    concat = (a,b) ->
      if typeof b == "undefined"
        return a

      ret = new Float32Array a.length+b.length
      ret.set a
      ret.subarray(a.length).set b
      ret

    for i in [0..buffer.length-1]
      buffer[i] = concat @remaining[i], buffer[i]
      {data, used} = @resamplers[i].process
        data:  buffer[i]
        ratio: @ratio

      @remaining[i] = buffer[i].subarray used
      buffer[i] = data

    @encoder.encode buffer, fn

class Webcast.Encoder.Asynchronous
  constructor: ({@encoder, scripts}) ->
    @mime     = @encoder.mime
    @info     = @encoder.info
    @channels = @encoder.channels
    @pending  = []

    @scripts = []
    for script in scripts
      @scripts.push "'#{script}'"

    script = """
      var window;
      importScripts(#{@scripts.join()});
      var encoder = #{@encoder.toString()};
      self.onmessage = function (e) {
        var type = e.data.type;
        var data = e.data.data;
        if (type === "buffer") {
          encoder.encode(data, function (encoded) {
            postMessage(encoded);
          });
          return;
        }
        if (type === "close") {
          encoder.close(function (buffer) {
            postMessage({close:true, buffer:buffer});
            self.close();
          });
          return;
        }
      };
             """

    blob = new Blob [script], type: "text/javascript"
    @worker = new Worker URL.createObjectURL(blob)

    @worker.onmessage = ({data}) =>
      @pending.push data

  toString: -> """
    (new Webcast.Encoder.Asynchronous({
      encoder: #{@encoder.toString()},
      scripts: [#{@scripts.join()}]
    }))
               """

  close: (fn) ->
    @worker.onmessage = ({data}) =>
      if !data.close
        @pending.push data
        return

      @pending.push data.buffer

      len = 0
      for chunk in @pending
        len += chunk.length

      ret = new Uint8Array len
      offset = 0
      for chunk in @pending
        ret.set chunk, offset
        offset += chunk.length

      fn ret

    @worker.postMessage
      type: "close"


  encode: (buffer, fn) ->
    @worker.postMessage
      type: "buffer"
      data: buffer

    fn @pending.shift()

Webcast.Socket = ({url, mime, info}) ->
  socket = new WebSocket url, "webcast"

  socket.mime = mime
  socket.info = info

  hello =
    mime: mime

  for key, value of info
    hello[key] = value

  send = socket.send
  socket.send = null

  socket.addEventListener "open", ->
    send.call socket, JSON.stringify(
      type: "hello"
      data: hello
    )

  # This method takes ArrayBuffer or any TypedArray

  socket.sendData = (data) ->
    return unless socket.isOpen()

    return unless data and data.length > 0

    unless data instanceof ArrayBuffer
      data = data.buffer.slice data.byteOffset, data.length*data.BYTES_PER_ELEMENT

    send.call socket, data

  socket.sendMetadata = (metadata) ->
    return unless socket.isOpen()

    send.call socket, JSON.stringify(
      type: "metadata"
      data: metadata
    )

  socket.isOpen = ->
    socket.readyState == WebSocket.OPEN

  socket

Webcast.Node = ({url, @encoder, context, options}) ->
  @socket = new Webcast.Socket
    url:  url
    mime: @encoder.mime
    info: @encoder.info

  @options =
    passThrough: false
    bufferSize: 4096

  for key, value of options
    @options[key] = value

  node = context.createScriptProcessor @options.bufferSize, @encoder.channels, @encoder.channels

  node.webcast = this

  node.onaudioprocess = (buf) =>
    audio = []
    for channel in [0..@encoder.channels-1]
      channelData = buf.inputBuffer.getChannelData channel
      audio[channel] = channelData

      if @options.passThrough
        # Copy data to output buffer
        buf.outputBuffer.getChannelData(channel).set channelData

    @encoder.encode audio, (data) =>
      @socket.sendData(data) if data?

  node.close = =>
    @encoder.close (data) =>
      @socket.sendData data
      @socket.close()

  node.sendMetadata = (metadata) =>
    @socket.sendMetadata metadata

  node

if typeof window != "undefined"
  window.Webcast = Webcast

if typeof self != "undefined"
  self.Webcast = Webcast

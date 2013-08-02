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

  encode: (data, fn) ->
    fn @shine.encode(data)

class Webcast.Encoder.Resample
  constructor: ({@encoder, @ratio, @type}) ->
    @mime       = @encoder.mime
    @info       = @encoder.info
    @channels   = @encoder.channels
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
      ratio: #{@ratio},
      type: #{@type}
     }))
               """

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

# This will only work in the browser!
if typeof Worker != "undefined"
  origWorker = Worker

class Webcast.Encoder.Worker
  constructor: ({@encoder, @scripts}) ->
    @mime     = @encoder.mime
    @info     = @encoder.info
    @channels = @encoder.channels
    @pending  = []

    imported = []
    for script in @scripts
      imported.push "'#{script}'"

    script = """
      var window;
      importScripts(#{imported.join()});
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
      };
             """

    blob = new Blob [script], type: "text/javascript"
    @worker = new origWorker URL.createObjectURL(blob)

    @worker.onmessage = ({data}) =>
      @pending.push data

  encode: (buffer, fn) ->
    @worker?.postMessage
      type: "buffer"
      data: buffer

    fn @pending.shift()

class Webcast.Socket
  constructor: ({uri, mime, info}) ->
    @socket = new WebSocket uri, "webcast"

    @hello =
      mime: mime

    for key, value of info
      @hello[key] = value

    @socket.onopen = =>
      @socket.send JSON.stringify(
        type: "hello"
        data: @hello
      )

    this

  # This method takes ArrayBuffer or any TypedArray

  sendData: (data) ->
    return unless @isOpen()

    return unless data.length > 0

    unless data instanceof ArrayBuffer
      data = data.buffer.slice data.byteOffset, data.length*data.BYTES_PER_ELEMENT

    @socket.send data

  sendMetadata: (metadata) ->
    return unless @isOpen()

    @socket.send JSON.stringify(
      type: "metadata"
      data: metadata
    )

  isOpen: ->
    @socket.readyState == WebSocket.OPEN

  close: ->
    @socket.close()

  Webcast.Node = ({uri, @encoder, context, options}) ->
    @socket = new Webcast.Socket
      uri:  uri
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
      @socket.close()

    node.sendMetadata = (metadata) =>
      @socket.sendMetadata metadata

    node

if typeof window != "undefined"
  window.Webcast = Webcast

if typeof self != "undefined"
  self.Webcast = Webcast

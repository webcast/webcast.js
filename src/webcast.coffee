window.Webcast =
  Encoder: {}

class Webcast.Encoder.Raw
  constructor: ({@channels, @samplerate}) ->
    @mime = "audio/x-raw,format=S8,channels=#{@channels},layout=interleaved,rate=#{@samplerate}"
    @info =
      audio:
        channels: @channels
        samplerate: @samplerate
        encoder: "RAW u8 encoder"

  encode: (data) ->
    channels = data.length
    samples  = data[0].length
    buf = new Int8Array channels*samples
    for chan in [0..channels-1]
      for i in [0..samples-1]
        buf[channels*i + chan] = data[chan][i]*127

    buf

origLame = Lame

class Webcast.Encoder.Lame
  mime: "audio/mpeg"

  constructor: ({@samplerate, @bitrate, @channels}) ->
    @lame = origLame.init()
    origLame.set_bitrate @lame, @bitrate

    if @channels == 1
      origLame.set_mode @lame, origLame.MONO
    else
      origLame.set_mode @lame, origLame.JOINT_STEREO
    
    origLame.set_num_channels @lame, @channels
    origLame.set_out_samplerate @lame, @samplerate
    origLame.init_params @lame

    @info =
      audio:
        channels: @channels
        samplerate: @samplerate
        bitrate: @bitrate
        encoder: "libmp3lame"

    this

  encode: (data) ->
    chan_l = data[0]
    chan_r = data[1] || data[0]
    origLame.encode_buffer_ieee_float(@lame, chan_l, chan_r).data

origShine = Shine

class Webcast.Encoder.Shine
  mime: "audio/mpeg"

  constructor: ({@samplerate, @bitrate, @channels}) ->
    @shine = new origShine
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

  encode: (data) ->
    @shine.encode data

class Webcast.Socket
  constructor: ({@uri, @encoder}) ->
    @socket = new WebSocket @uri, "webcast"

    data =
      mime: @encoder.mime

    for key, value of @encoder.info
      data[key] = value

    @socket.onopen = =>
      @socket.send JSON.stringify(
        type: "hello"
        data: data
      )

    this

  # This method takes ArrayBuffer or any TypedArray

  sendData: (data) ->
    return unless data.length > 0

    unless data instanceof ArrayBuffer
      data = data.buffer.slice data.byteOffset, data.length*data.BYTES_PER_ELEMENT

    @socket.send data

  sendMetadata: (metadata) ->
    @socket.send JSON.stringify(
      type: "metadata"
      data: metadata
    )

  close: ->
    @socket.close()

class Webcast.Node
  constructor: ({@uri, @encoder, @context, @source}) ->
    @socket = new Webcast.Socket
      uri:     @uri
      encoder: @encoder

    @buflen = 4096

    @node = @context.createScriptProcessor @buflen, @encoder.channels, 2

    @node.onaudioprocess = (buf) =>
      audio = []
      for channel in [0..@encoder.channels-1]
        audio[channel] = buf.inputBuffer.getChannelData channel

      data = @encoder.encode audio
      @socket.sendData data

    @source.connect @node
    @node.connect @context.destination

    @numberOfInputs        = @node.numberOfInputs
    @numberOfOutputs       = @node.numberOfOutputs
    @channelCount          = @node.channelCount
    @channelCountMode      = @node.channelCountMode
    @channelInterpretation = @node.channelInterpretation

  connect: ->
    @node.connect.apply @node, arguments
    @numberOfOutputs = @node.numberOfOutputs

  disconnect: ->
    @node.disconnect.apply @node, arguments
    @numberOfOutputs = @node.numberOfOutputs

  close: ->
    @disconnect()
    @source.disconnect()
    @socket.close()

  sendMetadata: (metadata) ->
    @socket.sendMetadata metadata

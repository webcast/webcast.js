if typeof window != "undefined"
  AudioContext = window.webkitAudioContext || window.AudioContext

  AudioContext::createWebcastSource = (bufferSize, channels, passThrough) ->
    node = @createScriptProcessor bufferSize, channels, channels

    passThrough ||= false

    options =
      encoder: null
      socket: null
      passThrough: passThrough || false

    node.onaudioprocess = (buf) ->
      audio = []
      for channel in [0..buf.inputBuffer.numberOfChannels-1]
        channelData = buf.inputBuffer.getChannelData channel
        audio[channel] = channelData

        if options.passThrough
          buf.outputBuffer.getChannelData(channel).set channelData
        else
          buf.outputBuffer.getChannelData(channel).set (new Float32Array channelData.length)

      options.encoder?.encode audio, (data) ->
        options.socket?.sendData(data) if data?

    node.setPassThrough = (b) ->
      options.passThrough = b

    node.connectSocket = (encoder, url) ->
      options.encoder = encoder
      options.socket = new Webcast.Socket
        url:  url
        mime: options.encoder.mime
        info: options.encoder.info

    node.close = (cb) ->
      options.encoder.close (data) ->
        options.socket?.sendData data
        options.socket?.close()
        options.socket = options.encoder = null
        cb?()

    node.sendMetadata = (metadata) =>
      options.socket?.sendMetadata metadata

    node.isOpen = ->
      options?.socket.isOpen()

    node

if typeof window != "undefined"
  AudioContext = window.AudioContext || window.webkitAudioContext

  AudioContext::createWebcastSource = (bufferSize, channels, passThrough) ->
    context = this

    node = context.createScriptProcessor bufferSize, channels, channels

    passThrough ||= false

    options =
      recorderSource: null
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

      options.encoder?.encode? audio, (data) ->
        options.socket?.sendData(data) if data?

    node.setPassThrough = (b) ->
      options.passThrough = b

    node.connectSocket = (encoder, url) ->
      if encoder instanceof Webcast.Recorder
        options.recorderSource = context.createMediaStreamDestination()
        node.connect options.recorderSource
        encoder.start options.recoderSource.stream, (data) ->
          options.socket?.sendData(data) if data?

      options.encoder = encoder
      options.socket = new Webcast.Socket
        url:  url
        mime: options.encoder.mime
        info: options.encoder.info

    node.close = (cb) ->
      options.recorderSource?.disconnect()
      options.recorderSource = null

      fn = ->
        options.socket?.close()
        options.socket = options.encoder = null
        cb?()

      return fn() unless options.encoder?.close?

      options.encoder.close (data) ->
        options.socket?.sendData data
        fn()

    node.getSocket = ->
      options.socket

    node.sendMetadata = (metadata) =>
      options.socket?.sendMetadata metadata

    node.isOpen = ->
      options?.socket.isOpen()

    node

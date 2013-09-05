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
    data = data.slice 0, @channels
    fn @shine.encode(data)

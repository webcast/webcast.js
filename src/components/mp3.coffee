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

  close: (data, fn) ->
    rem = new Uint8Array

    if fn?
      rem = @shine.encode(data) if data?.length > 0
    else
      fn = data

    flushed = @shine.close()

    data = new Uint8Array(rem.length + flushed.length)
    data.set rem
    data.set flushed, rem.length

    fn data

  encode: (data, fn) ->
    data = data.slice 0, @channels
    fn @shine.encode(data)

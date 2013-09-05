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

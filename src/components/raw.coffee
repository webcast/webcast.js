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

  doEncode: (data) ->
    channels = data.length
    samples  = data[0].length
    buf = new Int8Array channels*samples
    for chan in [0..channels-1]
      for i in [0..samples-1]
        buf[channels*i + chan] = data[chan][i]*127
    buf

  close: (data, fn) ->
    ret = new Uint8Array

    if fn?
      ret = @doEncode data if data?.count > 0
    else
      fn = data

    fn ret

  encode: (data, fn) ->
    fn @doEncode(data)

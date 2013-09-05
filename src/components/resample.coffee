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
    for i in [0..@remaining.length-1]
      {data} = @resamplers[i].process
        data: @remaining[i]
        ratio: @ratio
        last: true

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

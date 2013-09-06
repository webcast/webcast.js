class Webcast.Recorder
  mime: "audio/ogg"

  constructor: ({@samplerate, @bitrate, @channels}) ->
    @info =
      audio:
        channels: @channels
        samplerate: @samplerate
        bitrate: @bitrate
        encoder: "MediaRecorder"

  start: (stream, cb) ->
    recorder = new MediaRecorder stream

    # TODO: setOptions!
    
    recorder.ondataavailable = (e) =>
      if recorder.state == "recording"
        blob = new Blob [e.data], @mime
        cb blob

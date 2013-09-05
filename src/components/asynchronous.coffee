class Webcast.Encoder.Asynchronous
  constructor: ({@encoder, scripts}) ->
    @mime     = @encoder.mime
    @info     = @encoder.info
    @channels = @encoder.channels
    @pending  = []

    @scripts = []
    for script in scripts
      @scripts.push "'#{script}'"

    script = """
      var window;
      importScripts(#{@scripts.join()});
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
        if (type === "close") {
          encoder.close(function (buffer) {
            postMessage({close:true, buffer:buffer});
            self.close();
          });
          return;
        }
      };
             """

    blob = new Blob [script], type: "text/javascript"
    @worker = new Worker URL.createObjectURL(blob)

    @worker.onmessage = ({data}) =>
      @pending.push data

  toString: -> """
    (new Webcast.Encoder.Asynchronous({
      encoder: #{@encoder.toString()},
      scripts: [#{@scripts.join()}]
    }))
               """

  close: (fn) ->
    @worker.onmessage = ({data}) =>
      if !data.close
        @pending.push data
        return

      @pending.push data.buffer

      len = 0
      for chunk in @pending
        len += chunk.length

      ret = new Uint8Array len
      offset = 0
      for chunk in @pending
        ret.set chunk, offset
        offset += chunk.length

      fn ret

    @worker.postMessage
      type: "close"

  encode: (buffer, fn) ->
    @worker.postMessage
      type: "buffer"
      data: buffer

    fn @pending.shift()

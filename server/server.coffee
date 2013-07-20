fs        = require "fs"
http      = require "http"
websocket = require "websocket"
port      = 8080

server = http.createServer (req, res) ->
  console.log "#{new Date} -- Received request for #{req.url}"
  res.writeHead 404
  res.end()

server.listen port, ->
  console.log "#{new Date} -- Server ready on port #{port}"

wsServer = new websocket.server
  httpServer            : server
  autoAcceptConnections : false

wsServer.on "request", (req) ->
  fd = null

  console.log "#{new Date} -- Connection from #{req.origin}"

  connection = req.accept "webcast", req.origin
  console.log "#{new Date} -- Connection accepted"

  connection.on "message", (msg) ->
    # Pre-parse all utf8 messages
    if msg.type == "utf8"
      msg.utf8Data = JSON.parse msg.utf8Data

    # First, process hello message
    unless connection.hello?
      if msg.type != "utf8" or msg.utf8Data.type != "hello"
        console.log "#{new Date} -- Error: first message not hello!"
        return connection.close()

      connection.hello = msg.utf8Data.data
      console.log "#{new Date} -- Mount point: #{connection.hello.mount}."
      console.log "#{new Date} -- MIME type: #{connection.hello.mime}."
      console.log "#{new Date} -- Audio channels: #{connection.hello.audio.channels}."
      if (connection.hello.mime == "audio/mpeg")
        console.log "#{new Date} -- Audio bitrate: #{connection.hello.audio.bitrate}."

      # We only support mp3 and raw PCM for now
      ext = if connection.hello.mime == "audio/mpeg" then "mp3" else "raw"
      fd = fs.openSync "websocket-test.#{ext}", "w"
      return

    switch msg.type
      when "utf8"
        switch msg.utf8Data.type
          when "metadata"
            console.log "#{new Date} -- Got new metadata: #{JSON.stringify(msg.utf8Data.data)}"
          else
            console.log "#{new Date} -- Invalid message"
      when "binary"
        console.log "#{new Date} -- Got #{msg.binaryData.length} bytes of binary data"
        fs.writeSync fd, msg.binaryData, 0, msg.binaryData.length
      else
        console.log "#{new Date} -- Invalid message"

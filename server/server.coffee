fs        = require "fs"
http      = require "http"
websocket = require "websocket"
port      = 8080

fd = fs.openSync "websocket-test.mp3", "w"

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
      return console.log "#{new Date} -- Audio channels: #{connection.hello.audio}, MIME type: #{connection.hello.mime}."

    switch msg.type
      when "utf8"
        switch msg.utf8Data.type
          when "metadata"
            console.log "#{new Date} -- Got new metadata: #{JSON.stringify(msg.utf8Data.data)}"
          when "private"
            console.log "#{new Date} -- Got private message: #{JSON.stringify(msg.utf8Data.data)}"
          else
            console.log "#{new Date} -- Invalid message"
      when "binary"
        console.log "#{new Date} -- Got #{msg.binaryData.length} bytes of binary data"
        fs.writeSync fd, msg.binaryData, 0, msg.binaryData.length
      else
        console.log "#{new Date} -- Invalid message"

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
  console.log "#{new Date} -- Connection from #{req.origin}"

  connection = request.accept "webcast", request.origin
  console.log "#{new Date} -- Connection accepted"

  connection.on "message", (msg) ->
    # TODO!

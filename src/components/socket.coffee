Webcast.Socket = ({url, mime, info}) ->
  parser = document.createElement "a"
  parser.href = url

  user     = parser.username
  password = parser.password

  parser.username = parser.password = ""
  url = parser.href

  socket = new WebSocket url, "webcast"

  socket.mime = mime
  socket.info = info

  hello =
    mime: mime

  if user? && user != ""
    hello.user = socket.user = user

  if password? && password != ""
    hello.password = socket.password = password

  for key, value of info
    hello[key] = value

  send = socket.send
  socket.send = null

  socket.addEventListener "open", ->
    send.call socket, JSON.stringify(
      type: "hello"
      data: hello
    )

  # This method takes ArrayBuffer or any TypedArray

  socket.sendData = (data) ->
    return unless socket.isOpen()

    return unless data and data.length > 0

    unless data instanceof ArrayBuffer
      data = data.buffer.slice data.byteOffset, data.length*data.BYTES_PER_ELEMENT

    send.call socket, data

  socket.sendMetadata = (metadata) ->
    return unless socket.isOpen()

    send.call socket, JSON.stringify(
      type: "metadata"
      data: metadata
    )

  socket.isOpen = ->
    socket.readyState == WebSocket.OPEN

  socket

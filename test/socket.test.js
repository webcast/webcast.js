import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { Socket } from "../dist/webcast.js"

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances = []

  constructor(url, protocols) {
    Object.assign(this, { url, protocols, readyState: 0, protocol: "", bufferedAmount: 0, sent: [], closeCode: null })
    FakeWebSocket.instances.push(this)
  }

  send(data) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error("send on a socket that is not open")
    this.sent.push(data)
  }

  close(code, reason = "") {
    this.closeCode = code
    this.serverClose(code, reason)
  }

  serverOpen(protocol = "webcast") {
    this.readyState = FakeWebSocket.OPEN
    this.protocol = protocol
    this.onopen?.({})
  }

  serverClose(code, reason) {
    if (this.readyState === FakeWebSocket.CLOSED) return
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }
}

globalThis.WebSocket = FakeWebSocket

const fakeRecorder = () => ({
  mimeType: "audio/webm;codecs=opus",
  state: "recording",
  stop() {
    this.state = "inactive"
    this.onstop?.()
  },
  record(text) {
    this.ondataavailable({ data: new Blob([text]) })
  },
})

const decode = message => (typeof message === "string" ? JSON.parse(message) : message)

const sentTexts = socket => Promise.all(socket.sent.map(m => (typeof m === "string" ? m : m.text())))

beforeEach(() => {
  FakeWebSocket.instances = []
})

test("hello is sent first, then data recorded before the connection opened, in order", async () => {
  const mediaRecorder = fakeRecorder()
  let opened = 0
  const webcast = new Socket({
    mediaRecorder,
    url: "ws://source:hackme@localhost:8080/mount",
    info: { name: "Radio" },
    onOpen: () => opened++,
  })
  const [ws] = FakeWebSocket.instances
  assert.equal(ws.url, "ws://localhost:8080/mount")
  assert.equal(ws.protocols, "webcast")

  mediaRecorder.record("header")
  webcast.sendMetadata({ title: "Song" })
  assert.equal(ws.sent.length, 0)

  ws.serverOpen()
  mediaRecorder.record("body")

  assert.equal(opened, 1)
  assert.deepEqual(decode(ws.sent[0]), {
    type: "hello",
    data: { mime: "audio/webm;codecs=opus", user: "source", password: "hackme", name: "Radio" },
  })
  assert.deepEqual((await sentTexts(ws)).slice(1), [
    "header",
    JSON.stringify({ type: "metadata", data: { title: "Song" } }),
    "body",
  ])
})

test("a connection without the webcast subprotocol is closed with 4400", () => {
  const mediaRecorder = fakeRecorder()
  const closes = []
  let opened = 0
  new Socket({ mediaRecorder, url: "ws://localhost/mount", onOpen: () => opened++, onClose: e => closes.push(e) })
  mediaRecorder.record("header")
  const [ws] = FakeWebSocket.instances
  ws.serverOpen("")
  assert.equal(ws.sent.length, 0)
  assert.equal(opened, 0)
  assert.equal(closes[0].code, 4400)
  assert.equal(mediaRecorder.state, "inactive")
})

test("a server close stops the recorder and reports the reason", () => {
  const mediaRecorder = fakeRecorder()
  const closes = []
  new Socket({ mediaRecorder, url: "ws://localhost/mount", onClose: e => closes.push(e) })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen()
  ws.serverClose(4401, "Authentication failed.")
  assert.equal(mediaRecorder.state, "inactive")
  assert.deepEqual(closes, [{ code: 4401, reason: "Authentication failed." }])
})

test("stopping the recorder closes the connection", () => {
  const mediaRecorder = fakeRecorder()
  new Socket({ mediaRecorder, url: "ws://localhost/mount" })
  mediaRecorder.stop()
  assert.equal(FakeWebSocket.instances[0].closeCode, 1000)
})

test("bufferedAmount counts data queued until the connection opens", () => {
  const mediaRecorder = fakeRecorder()
  const webcast = new Socket({ mediaRecorder, url: "ws://localhost/mount" })
  mediaRecorder.record("12345")
  webcast.sendMetadata({ title: "é" })
  const metadata = new TextEncoder().encode(JSON.stringify({ type: "metadata", data: { title: "é" } })).length
  assert.equal(webcast.bufferedAmount, 5 + metadata)
})

test("percent-encoded credentials are decoded", () => {
  new Socket({ mediaRecorder: fakeRecorder(), url: "ws://so%40urce:pa%3Ass@localhost/mount" })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen()
  const { data } = decode(ws.sent[0])
  assert.equal(data.user, "so@urce")
  assert.equal(data.password, "pa:ss")
})

test("credentials that are not valid escapes are kept as typed", () => {
  new Socket({ mediaRecorder: fakeRecorder(), url: "ws://source:100%free@localhost/mount" })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen()
  assert.equal(decode(ws.sent[0]).data.password, "100%free")
})

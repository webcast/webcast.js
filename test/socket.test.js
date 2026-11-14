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

  close(code) {
    this.closeCode = code
    this.serverClose(code, "")
  }

  serverOpen(protocol) {
    this.readyState = FakeWebSocket.OPEN
    this.protocol = protocol
    this.onopen?.({})
  }

  serverSend(text) {
    this.onmessage?.({ data: text })
  }

  serverClose(code, reason) {
    if (this.readyState === FakeWebSocket.CLOSED) return
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code, reason })
  }

  serverFail() {
    this.readyState = FakeWebSocket.CLOSED
    this.onerror?.({})
    this.onclose?.({ code: 1006, reason: "" })
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

test("v2 queues media and metadata until ready, then flushes them in order", async () => {
  const mediaRecorder = fakeRecorder()
  let ready = 0
  const webcast = new Socket({
    mediaRecorder,
    url: "ws://source:hackme@localhost:8080/mount",
    info: { name: "Radio" },
    onReady: () => ready++,
  })
  const [ws] = FakeWebSocket.instances
  assert.equal(ws.url, "ws://localhost:8080/mount")
  assert.deepEqual(ws.protocols, ["webcast.v2", "webcast"])

  mediaRecorder.record("header")
  ws.serverOpen("webcast.v2")
  webcast.sendMetadata({ title: "Song" })
  mediaRecorder.record("body")

  assert.equal(ws.sent.length, 1)
  assert.deepEqual(decode(ws.sent[0]), {
    type: "hello",
    data: { mime: "audio/webm;codecs=opus", user: "source", password: "hackme", name: "Radio" },
  })
  assert.equal(webcast.isReady(), false)

  ws.serverSend(JSON.stringify({ type: "ready" }))
  assert.equal(ready, 1)
  assert.deepEqual((await sentTexts(ws)).slice(1), [
    "header",
    JSON.stringify({ type: "metadata", data: { title: "Song" } }),
    "body",
  ])

  mediaRecorder.record("more")
  assert.equal(await ws.sent.at(-1).text(), "more")
})

test("v2 ignores unknown and malformed server messages", () => {
  const webcast = new Socket({ mediaRecorder: fakeRecorder(), url: "ws://localhost/mount" })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen("webcast.v2")
  ws.serverSend("not json")
  ws.serverSend(JSON.stringify({ type: "unknown" }))
  assert.equal(webcast.isReady(), false)
})

test("v1 is ready as soon as hello is sent", async () => {
  const mediaRecorder = fakeRecorder()
  const webcast = new Socket({ mediaRecorder, url: "ws://localhost/mount" })
  const [ws] = FakeWebSocket.instances
  mediaRecorder.record("header")
  ws.serverOpen("webcast")
  assert.equal(webcast.isReady(), true)
  // A v1 server has no ready message: one sent anyway is not a protocol event.
  ws.serverSend(JSON.stringify({ type: "ready" }))
  assert.deepEqual((await sentTexts(ws)).slice(1), ["header"])
})

test("a failed handshake is retried once with v1 alone, without reporting an error", () => {
  let errors = 0
  new Socket({ mediaRecorder: fakeRecorder(), url: "ws://localhost/mount", onError: () => errors++ })
  FakeWebSocket.instances[0].serverFail()
  assert.equal(FakeWebSocket.instances.length, 2)
  assert.deepEqual(FakeWebSocket.instances[1].protocols, ["webcast"])
  assert.equal(errors, 0)

  FakeWebSocket.instances[1].serverFail()
  assert.equal(FakeWebSocket.instances.length, 2)
  assert.equal(errors, 1)
})

test("a server close stops the recorder and reports the reason", () => {
  const mediaRecorder = fakeRecorder()
  const closes = []
  new Socket({ mediaRecorder, url: "ws://localhost/mount", onClose: e => closes.push(e) })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen("webcast.v2")
  ws.serverClose(4401, "Authentication failed.")
  assert.equal(mediaRecorder.state, "inactive")
  assert.deepEqual(closes, [{ code: 4401, reason: "Authentication failed." }])
  assert.equal(FakeWebSocket.instances.length, 1)
})

test("stopping the recorder closes the connection without retrying", () => {
  const mediaRecorder = fakeRecorder()
  new Socket({ mediaRecorder, url: "ws://localhost/mount" })
  mediaRecorder.stop()
  assert.equal(FakeWebSocket.instances[0].closeCode, 1000)
  assert.equal(FakeWebSocket.instances.length, 1)
})

test("percent-encoded credentials are decoded", () => {
  const mediaRecorder = fakeRecorder()
  new Socket({ mediaRecorder, url: "ws://so%40urce:pa%3Ass@localhost/mount" })
  const [ws] = FakeWebSocket.instances
  ws.serverOpen("webcast")
  const { data } = decode(ws.sent[0])
  assert.equal(data.user, "so@urce")
  assert.equal(data.password, "pa:ss")
})

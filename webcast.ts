export const version = "1.0.1"

export class Webcast {
  socket: WebSocket

  constructor({
    mediaRecorder,
    url: rawUrl,
    info,
  }: {
    mediaRecorder: MediaRecorder
    url: string
    info: Record<string, unknown>
  }) {
    const parser = document.createElement("a")
    parser.href = rawUrl

    const user = parser.username
    const password = parser.password

    parser.username = parser.password = ""
    const url = parser.href

    this.socket = new WebSocket(url, "webcast")

    const hello = {
      mime: mediaRecorder.mimeType,
      ...(user ? { user } : {}),
      ...(password ? { password } : {}),
      ...info,
    }

    this.socket.addEventListener("open", () =>
      this.socket.send(
        JSON.stringify({
          type: "hello",
          data: hello,
        })
      )
    )

    mediaRecorder.ondataavailable = async (e: BlobEvent) => {
      const data = await e.data.arrayBuffer()

      if (this.isConnected()) {
        this.socket.send(data)
      }
    }

    mediaRecorder.onstop = (e: Event) => {
      if (this.isConnected()) {
        this.socket.close()
      }
    }
  }

  isConnected() {
    return this.socket.readyState === WebSocket.OPEN
  }

  sendMetadata(data: Record<string, unknown>) {
    this.socket.send(
      JSON.stringify({
        type: "metadata",
        data,
      })
    )
  }
}

export default Webcast

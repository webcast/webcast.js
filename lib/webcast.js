class Socket {
  constructor ({mediaRecorder, url: rawUrl, info}) {
    const parser = document.createElement("a");
    parser.href = rawUrl;

    const user = parser.username;
    const password = parser.password;

    parser.username = parser.password = ""
    const url =  parser.href;

    this.socket = new WebSocket(url, "webcast");

    const hello = {
      mime: mediaRecorder.mimeType,
      ...(user ? { user } : {}),
      ...(password ? { password } : {}),
      ...info
    }; 

    this.socket.addEventListener("open", () =>
      this.socket.send(JSON.stringify({
        type: "hello",
        data: hello
      }))
    );

    mediaRecorder.ondataavailable = async e =>
      this.socket.send(await e.data.arrayBuffer());

    mediaRecorder.onstop = async e => {
      if (e.data) {
        this.socket.send(await e.data.arrayBuffer());
      }
      this.socket.close();
    };
  }

  sendMetadata(data) {
    this.socket.send(JSON.stringify({
      type: "metadata",
      data
    }));
  }
};

window.Webcast = {
  version: '1.0.0',
  Socket
};

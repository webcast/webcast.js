class Socket {
  constructor ({mediaRecorder, url: rawUrl, info, onopen = (_) => {}, onerror = (_) => {}}) {
    const parser = document.createElement("a");
    parser.href = rawUrl;

    const user = parser.username;
    const password = parser.password;

    parser.username = parser.password = ""
    const url =  parser.href;

    this.socket = new WebSocket(url, "webcast");
    this.socket.onerror = onerror;

    const hello = {
      mime: mediaRecorder.mimeType,
      ...(user ? { user } : {}),
      ...(password ? { password } : {}),
      ...info
    }; 

    this.socket.onopen = (event) => {
      onopen(event);
      this.socket.send(JSON.stringify({
        type: "hello",
        data: hello
      }))
    };

    mediaRecorder.ondataavailable = e => this._sendData(e);

    mediaRecorder.onstop = async e => {
      if (e.data) {
        await this._sendData(e);
      }

      if (this.isConnected()) {
        this.socket.close();
      }
    };
  }

  isConnected() {
    return this.socket.readyState === WebSocket.OPEN;
  }

  async _sendData(e) {
    const data = await e.data.arrayBuffer();

    if (this.isConnected()) {
      this.socket.send(data);
    }
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

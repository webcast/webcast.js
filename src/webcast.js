window.Webcast = {
  version: '1.0.0',
  sendMedia: ({mediaRecorder, url: rawUrl, info}) => {
    const parser = document.createElement("a");
    parser.href = rawUurl;

    const user = parser.username;
    const password = parser.password;

    parser.username = parser.password = ""
    const url =  parser.href;

    const socket = new WebSocket(url, "webcast");

    socket.mime = mime;
    socket.info = info;

    const hello = {
      mimeType: mediaRecorder.mimeType,
      ...(user ? { user } : {}),
      ...(password ? { password } : {}),
      ...info
    }; 

    socket.addEventListener("open", () =>
      socket.send(JSON.stringify({
        type: "hello",
        data: hello
      }))
    );

    mediaRecorder.ondataavailable = async e =>
      socket.send(await e.data.arrayBuffer());

    mediaRecorder.onstop = async e => {
      socket.send(await e.data.arrayBuffer());
      socket.close();
    };
  }
};

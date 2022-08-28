const ensureInput = (value: unknown): HTMLInputElement => {
  if (!(value instanceof HTMLInputElement)) throw "Invalid HTML element!"

  return value
}

const ensureVideo = (value: unknown): HTMLVideoElement => {
  if (!(value instanceof HTMLVideoElement)) throw "Invalid HTML element!"

  return value
}

async function play() {
  // Get video stream
  const webcam = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  })

  // Display video
  const video = ensureVideo(document.querySelector("video"))
  video.srcObject = webcam

  // Recorder
  const mediaRecorder = new MediaRecorder(webcam, {
    mimeType: "video/webm",
    videoBitsPerSecond: 3000000,
  })

  const user = ensureInput(document.querySelector("#user")).value
  const password = ensureInput(document.querySelector("#password")).value
  const server = ensureInput(document.querySelector("#server")).value
  const port = ensureInput(document.querySelector("#port")).value
  const mount = ensureInput(document.querySelector("#mount")).value

  const url = `ws://${user}:${password}@${server}:${port}/${mount}`

  const ws = new window.Webcast.Socket({
    mediaRecorder,
    url: url,
    info: {},
  })

  // Start recording
  mediaRecorder.start(1000 / 20) // 20 fps

  function stop() {
    mediaRecorder.stop()
    webcam.getTracks().forEach(track => track.stop())
    video.srcObject = null
  }

  ensureInput(document.querySelector("#stop")).addEventListener("click", stop)
}

window.onload = function () {
  ensureInput(document.querySelector("#start")).addEventListener("click", play)
}

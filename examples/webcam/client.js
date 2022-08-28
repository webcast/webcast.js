async function play() {
  // Get video stream
  const webcam = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  // Display video
  video = document.querySelector("video");
  video.srcObject = webcam;

  // Recorder
  const mediaRecorder = new MediaRecorder(webcam, {
    mimeType: 'video/webm',
    videoBitsPerSecond: 3000000
  });

  url = "ws://"
    + document.querySelector('#user').value
    + ":"
    + document.querySelector('#password').value
    + "@"
    + document.querySelector('#server').value
    + ":"
    + document.querySelector('#port').value
    + "/"
    + document.querySelector('#mount').value;

  const ws = new Webcast.Socket({
    mediaRecorder,
    url: url,
    info: {}
  })

  // Start recording
  mediaRecorder.start(1000/20); // 20 fps

  function stop() {
    mediaRecorder.stop();
    webcam.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  document.querySelector('#stop').addEventListener('click', stop);
}

window.onload = function() {
  document.querySelector('#start').addEventListener('click', play);
}

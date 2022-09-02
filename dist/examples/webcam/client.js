"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const ensureInput = (value) => {
    if (!(value instanceof HTMLInputElement))
        throw "Invalid HTML element!";
    return value;
};
const ensureVideo = (value) => {
    if (!(value instanceof HTMLVideoElement))
        throw "Invalid HTML element!";
    return value;
};
function play() {
    return __awaiter(this, void 0, void 0, function* () {
        // Get video stream
        const webcam = yield navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        // Display video
        const video = ensureVideo(document.querySelector("video"));
        video.srcObject = webcam;
        // Recorder
        const mediaRecorder = new MediaRecorder(webcam, {
            mimeType: "video/webm",
            videoBitsPerSecond: 3000000,
        });
        const user = ensureInput(document.querySelector("#user")).value;
        const password = ensureInput(document.querySelector("#password")).value;
        const server = ensureInput(document.querySelector("#server")).value;
        const port = ensureInput(document.querySelector("#port")).value;
        const mount = ensureInput(document.querySelector("#mount")).value;
        const url = `ws://${user}:${password}@${server}:${port}/${mount}`;
        const ws = new window.Webcast.Socket({
            mediaRecorder,
            url: url,
            info: {},
        });
        // Start recording
        mediaRecorder.start(1000 / 20); // 20 fps
        function stop() {
            mediaRecorder.stop();
            webcam.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        ensureInput(document.querySelector("#stop")).addEventListener("click", stop);
    });
}
window.onload = function () {
    ensureInput(document.querySelector("#start")).addEventListener("click", play);
};

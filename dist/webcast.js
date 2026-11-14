export const version = "2.0.0";
// A literal "%" in a password is not a valid escape: keep it as typed.
const decode = (value) => {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
};
const extractCredentials = (rawUrl) => {
    // Relative URLs resolve against the page, as with the WebSocket constructor.
    const url = new URL(rawUrl, globalThis.location?.href);
    const user = decode(url.username);
    const password = decode(url.password);
    url.username = url.password = "";
    return { url: url.href, user, password };
};
export class Socket {
    constructor(options) {
        this.open = false;
        this.closing = false;
        this.pending = [];
        this.options = options;
        const { mediaRecorder, url: rawUrl } = options;
        const { url, user, password } = extractCredentials(rawUrl);
        mediaRecorder.ondataavailable = ({ data }) => {
            if (data.size > 0)
                this.send(data);
        };
        mediaRecorder.onstop = () => this.close();
        const socket = new WebSocket(url, "webcast");
        socket.onopen = event => {
            if (socket.protocol !== "webcast") {
                socket.close(4400, "The server did not select the webcast subprotocol.");
                return;
            }
            socket.send(this.hello({ user, password }));
            this.open = true;
            for (const data of this.pending)
                socket.send(data);
            this.pending = [];
            this.options.onOpen?.(event);
        };
        socket.onerror = event => this.options.onError?.(event);
        socket.onclose = event => {
            this.open = false;
            this.pending = [];
            if (mediaRecorder.state !== "inactive") {
                this.closing = true;
                mediaRecorder.stop();
            }
            this.options.onClose?.(event);
        };
        this.socket = socket;
    }
    // Built at open time: a recorder created without a mimeType only reports one once started.
    hello({ user, password }) {
        const data = {
            mime: this.options.mediaRecorder.mimeType,
            ...(user ? { user } : {}),
            ...(password ? { password } : {}),
            ...this.options.info,
        };
        return JSON.stringify({ type: "hello", data });
    }
    // Media recorded before the connection opens is queued: its first chunk holds the container header.
    send(data) {
        if (this.open)
            this.socket.send(data);
        else if (!this.closing)
            this.pending.push(data);
    }
    isConnected() {
        return this.socket.readyState === WebSocket.OPEN;
    }
    /** Bytes not sent yet, including data queued until the connection opens. */
    get bufferedAmount() {
        const pending = this.pending.reduce((total, data) => total + (typeof data === "string" ? new TextEncoder().encode(data).length : data.size), 0);
        return this.socket.bufferedAmount + pending;
    }
    sendMetadata(data) {
        this.send(JSON.stringify({ type: "metadata", data }));
    }
    close() {
        this.closing = true;
        this.socket.close(1000);
    }
}

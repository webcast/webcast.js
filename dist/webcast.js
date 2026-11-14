export const version = "2.0.0";
const extractCredentials = (rawUrl) => {
    const url = new URL(rawUrl);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    url.username = url.password = "";
    return { url: url.href, user, password };
};
export class Socket {
    constructor(options) {
        this.ready = false;
        this.closing = false;
        this.pending = [];
        this.options = options;
        const { mediaRecorder, url: rawUrl, protocols = ["webcast.v2", "webcast"] } = options;
        const { url, user, password } = extractCredentials(rawUrl);
        mediaRecorder.ondataavailable = ({ data }) => {
            if (data.size > 0)
                this.send(data);
        };
        mediaRecorder.onstop = () => this.close();
        this.socket = this.connect(url, protocols, { user, password });
    }
    connect(url, protocols, credentials) {
        const socket = new WebSocket(url, protocols);
        let opened = false;
        // Some v1 servers reject a list of subprotocols: retry with v1 alone.
        const fallback = protocols.length > 1 && protocols.includes("webcast");
        socket.onopen = event => {
            opened = true;
            this.options.onOpen?.(event);
            socket.send(this.hello(credentials));
            if (socket.protocol !== "webcast.v2")
                this.setReady();
        };
        socket.onmessage = ({ data }) => {
            if (socket.protocol !== "webcast.v2" || typeof data !== "string")
                return;
            try {
                if (JSON.parse(data)?.type === "ready")
                    this.setReady();
            }
            catch {
                // Malformed server messages are ignored, like unknown ones.
            }
        };
        socket.onerror = event => {
            if (opened || this.closing || !fallback)
                this.options.onError?.(event);
        };
        socket.onclose = event => {
            if (!opened && !this.closing && fallback) {
                this.socket = this.connect(url, ["webcast"], credentials);
                return;
            }
            this.ready = false;
            this.pending = [];
            if (this.options.mediaRecorder.state !== "inactive") {
                this.closing = true;
                this.options.mediaRecorder.stop();
            }
            this.options.onClose?.(event);
        };
        return socket;
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
    setReady() {
        if (this.ready)
            return;
        this.ready = true;
        for (const data of this.pending)
            this.socket.send(data);
        this.pending = [];
        this.options.onReady?.();
    }
    // Media recorded before the server is ready is queued: its first chunk holds the container header.
    send(data) {
        if (this.ready)
            this.socket.send(data);
        else if (!this.closing)
            this.pending.push(data);
    }
    isConnected() {
        return this.socket.readyState === WebSocket.OPEN;
    }
    isReady() {
        return this.ready;
    }
    get bufferedAmount() {
        return this.socket.bufferedAmount;
    }
    sendMetadata(data) {
        this.send(JSON.stringify({ type: "metadata", data }));
    }
    close() {
        this.closing = true;
        this.socket.close(1000);
    }
}

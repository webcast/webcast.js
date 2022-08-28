export declare const version = "1.0.1";
export declare class Webcast {
    socket: WebSocket;
    constructor({ mediaRecorder, url: rawUrl, info, }: {
        mediaRecorder: MediaRecorder;
        url: string;
        info: Record<string, unknown>;
    });
    isConnected(): boolean;
    sendMetadata(data: Record<string, unknown>): void;
}
export default Webcast;

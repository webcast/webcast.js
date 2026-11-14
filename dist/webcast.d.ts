export declare const version = "2.0.0";
export type HelloInfo = {
    audio?: {
        channels?: number;
        samplerate?: number;
        bitrate?: number;
        encoder?: string;
    };
    video?: {
        width?: number;
        height?: number;
        framerate?: number;
        bitrate?: number;
        encoder?: string;
    };
    name?: string;
    description?: string;
    genre?: string;
    url?: string;
    [key: string]: unknown;
};
export type Metadata = Record<string, string>;
export type SocketOptions = {
    mediaRecorder: MediaRecorder;
    url: string;
    info?: HelloInfo;
    onOpen?: (event: Event) => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
};
export declare class Socket {
    readonly socket: WebSocket;
    private options;
    private open;
    private closing;
    private pending;
    constructor(options: SocketOptions);
    private hello;
    private send;
    isConnected(): boolean;
    /** Bytes not sent yet, including data queued until the connection opens. */
    get bufferedAmount(): number;
    sendMetadata(data: Metadata): void;
    close(): void;
}

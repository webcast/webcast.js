export declare const version = "2.0.0";
export type Protocol = "webcast.v2" | "webcast";
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
    protocols?: Protocol[];
    onOpen?: (event: Event) => void;
    onReady?: () => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
};
export declare class Socket {
    socket: WebSocket;
    private options;
    private ready;
    private closing;
    private pending;
    constructor(options: SocketOptions);
    private connect;
    private hello;
    private setReady;
    private send;
    isConnected(): boolean;
    isReady(): boolean;
    get bufferedAmount(): number;
    sendMetadata(data: Metadata): void;
    close(): void;
}

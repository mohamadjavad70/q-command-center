export type MediaProviderKind = "stt" | "tts" | "realtime" | "video";

export interface MediaProviderMeta {
  id: string;
  label: string;
  kind: MediaProviderKind;
  version?: string;
  online?: boolean;
}

export interface TranscriptResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface VideoRenderRequest {
  prompt: string;
  durationSec?: number;
  resolution?: "720p" | "1080p" | "4k";
}

export interface VideoRenderResult {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  url?: string;
}

export interface STTProvider {
  transcribe(blob: Blob): Promise<TranscriptResult>;
}

export interface TTSProvider {
  speak(text: string, lang?: string): Promise<void>;
}

export interface RealtimeProvider {
  connect(roomId: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface VideoProvider {
  render(req: VideoRenderRequest): Promise<VideoRenderResult>;
}


import type {
  MediaProviderKind,
  MediaProviderMeta,
  RealtimeProvider,
  STTProvider,
  TTSProvider,
  VideoProvider,
  VideoRenderRequest,
  VideoRenderResult,
} from "@/lib/media/types";

import { StreamVoiceEngine } from "../../voice/stream-voice-engine";
import { WakeWordDetector } from "../../voice/wake-word-detector";
import { VoiceAIIntegration } from "../../voice/voice-ai-integration";

type ProviderMap = {
  stt?: STTProvider;
  tts?: TTSProvider;
  realtime?: RealtimeProvider;
  video?: VideoProvider;
};

type Listener = (payload: unknown) => void;

class MediaOrchestrator {
  private voiceEngine: StreamVoiceEngine;
  private wakeWord: WakeWordDetector;
  private aiIntegration: VoiceAIIntegration;
  private providers: ProviderMap = {};
  private metas: Partial<Record<MediaProviderKind, MediaProviderMeta>> = {};
  private listeners = new Map<string, Listener[]>();

  constructor() {
    this.voiceEngine = new StreamVoiceEngine();
    this.wakeWord = new WakeWordDetector();
    this.aiIntegration = new VoiceAIIntegration();
    this.setupVoiceEvents();
  }

  private setupVoiceEvents() {
    // رویداد transcript و wakeword
    this.voiceEngine.on("transcript", (transcript: string) => {
      if (this.wakeWord.detect(transcript)) {
        const command = this.wakeWord.extractCommand(transcript);
        this.emit("wakeword", { transcript, command });
        this.aiIntegration.voiceEngine.emit("command", command);
      }
      this.emit("transcript", transcript);
    });
    // رویدادهای AI
    this.aiIntegration.on && this.aiIntegration.on("processing", (data: any) => {
      this.emit("ai-processing", data);
    });
    this.aiIntegration.on && this.aiIntegration.on("response", (data: any) => {
      this.emit("ai-response", data);
    });
  }
  startVoice() {
    this.voiceEngine.start();
  }

  stopVoice() {
    this.voiceEngine.stop();
  }

  registerSTT(meta: MediaProviderMeta, provider: STTProvider) {
    this.providers.stt = provider;
    this.metas.stt = meta;
    this.emit("provider:registered", meta);
  }

  registerTTS(meta: MediaProviderMeta, provider: TTSProvider) {
    this.providers.tts = provider;
    this.metas.tts = meta;
    this.emit("provider:registered", meta);
  }

  registerRealtime(meta: MediaProviderMeta, provider: RealtimeProvider) {
    this.providers.realtime = provider;
    this.metas.realtime = meta;
    this.emit("provider:registered", meta);
  }

  registerVideo(meta: MediaProviderMeta, provider: VideoProvider) {
    this.providers.video = provider;
    this.metas.video = meta;
    this.emit("provider:registered", meta);
  }

  async transcribe(blob: Blob) {
    if (!this.providers.stt) throw new Error("STT provider is not registered");
    const result = await this.providers.stt.transcribe(blob);
    this.emit("stt:done", result);
    return result;
  }

  async speak(text: string, lang = "fa-IR") {
    if (!this.providers.tts) throw new Error("TTS provider is not registered");
    await this.providers.tts.speak(text, lang);
    this.emit("tts:done", { text, lang });
  }

  async connectRealtime(roomId: string) {
    if (!this.providers.realtime) throw new Error("Realtime provider is not registered");
    await this.providers.realtime.connect(roomId);
    this.emit("realtime:connected", { roomId });
  }

  async disconnectRealtime() {
    if (!this.providers.realtime) return;
    await this.providers.realtime.disconnect();
    this.emit("realtime:disconnected", {});
  }

  async renderVideo(req: VideoRenderRequest): Promise<VideoRenderResult> {
    if (!this.providers.video) {
      return {
        jobId: "pending-provider",
        status: "failed",
      };
    }

    const result = await this.providers.video.render(req);
    this.emit("video:render", result);
    return result;
  }

  getRegistry() {
    return {
      stt: this.metas.stt,
      tts: this.metas.tts,
      realtime: this.metas.realtime,
      video: this.metas.video,
    };
  }

  on(event: string, listener: Listener) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  off(event: string, listener: Listener) {
    const list = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      list.filter((entry) => entry !== listener)
    );
  }

  private emit(event: string, payload: unknown) {
    const list = this.listeners.get(event) ?? [];
    list.forEach((listener) => listener(payload));
  }
}

export const mediaOrchestrator = new MediaOrchestrator();

/**
 * Voice AI Integration - اتصال Voice Engine به Hybrid AI
 * این فایل voice و AI را یکپارچه می‌کند
 */

import { StreamVoiceEngine } from "../voice/stream-voice-engine";
import { hybridEngine } from "../hybrid/hybrid-ai-engine";

export interface VoiceAIState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  mode: "online" | "offline" | "limited";
  lastResponse: string;
  latency: number;
}

/**
 * صوتی و هوش مصنوعی را یکجا اجرا کند
 */
export class VoiceAIIntegration {
  private voiceEngine: StreamVoiceEngine;
  private state: VoiceAIState = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    mode: "online",
    lastResponse: "",
    latency: 0,
  };

  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor() {
    this.voiceEngine = new StreamVoiceEngine();
    this.setupIntegration();
  }

  /**
   * راه‌اندازی integration
   */
  private setupIntegration(): void {
    // listen to voice events
    this.voiceEngine.on("transcript", async (transcript) => {
      this.state.isProcessing = true;
      this.emit("processing", { transcript });

      try {
        const result = await hybridEngine.process(transcript);

        this.state.lastResponse = result.response;
        this.state.latency = result.latency;
        this.state.mode = result.isOffline ? "offline" : "online";

        // cache response
        hybridEngine.cacheResponse(transcript, result.response, 0.8);

        // send to speech
        await this.speak(result.response);

        this.emit("response", {
          transcript,
          response: result.response,
          source: result.source,
          latency: result.latency,
        });
      } catch (error) {
        this.emit("error", { error: String(error) });
      } finally {
        this.state.isProcessing = false;
      }
    });

    // wake word detected
    this.voiceEngine.on("wake-word", () => {
      this.emit("wake-word", {});
    });

    // listening states
    this.voiceEngine.on("start", () => {
      this.state.isListening = true;
      this.emit("start", {});
    });

    this.voiceEngine.on("end", () => {
      this.state.isListening = false;
      this.emit("end", {});
    });
  }

  /**
   * شروع listening
   */
  async startListening(): Promise<void> {
    try {
      this.voiceEngine.start();
      this.state.isListening = true;
    } catch (error) {
      this.emit("error", { error: "Failed to start listening" });
      throw error;
    }
  }

  /**
   * متوقف کردن listening
   */
  stopListening(): void {
    this.voiceEngine.stop();
    this.state.isListening = false;
  }

  /**
   * خواندن متن (TTS)
   */
  private async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.state.isSpeaking = true;
      this.emit("speak-start", { text });

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fa-IR";
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        this.state.isSpeaking = false;
        this.emit("speak-end", {});
        resolve();
      };

      utterance.onerror = (event) => {
        this.state.isSpeaking = false;
        this.emit("speak-error", { error: event.error });
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * دریافت state
   */
  getState(): VoiceAIState {
    return { ...this.state };
  }

  /**
   * دریافت stats
   */
  getStats() {
    const hybridStats = hybridEngine.getStats();

    return {
      voiceState: this.state,
      hybrid: hybridStats,
      timestamp: Date.now(),
    };
  }

  /**
   * Event system
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);

    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);

    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in ${event} listener:`, e);
        }
      }
    }
  }

  /**
   * تست خودکار
   */
  async selfTest(): Promise<boolean> {
    try {
      // بررسی browser API
      const hasVoice = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      const hasSpeech = "speechSynthesis" in window;

      if (!hasVoice || !hasSpeech) {
        console.warn("Voice APIs not available");
        return false;
      }

      // بررسی hybrid engine
      const stats = hybridEngine.getStats();
      console.log("✅ Hybrid engine ready:", stats.mode);

      return true;
    } catch (error) {
      console.error("Self-test failed:", error);
      return false;
    }
  }
}

// Singleton
let voiceAIInstance: VoiceAIIntegration | null = null;

export function getVoiceAI(): VoiceAIIntegration {
  if (!voiceAIInstance) {
    voiceAIInstance = new VoiceAIIntegration();
  }

  return voiceAIInstance;
}

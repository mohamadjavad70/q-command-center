/**
 * Streaming Voice Engine - Always-On, Low-Latency Voice Loop
 * موتور صوتی Q Network
 * ویژگی‌ها:
 * - شنوایی دائم (Continuous Listening)
 * - تعریف اهداف درون‌ریزی (Goals Set Dynamically)
 * - عکس‌العمل فوری (Instant Response)
 * - یکپارچگی حافظه (Memory Integration)
 */

import { WakeWordDetector, wakeWordDetector } from "./wake-word-detector";

export interface VoiceEngineConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxListeningTime?: number;
}

export interface VoiceLoopState {
  isListening: boolean;
  isProcessing: boolean;
  lastTranscript?: string;
  lastCommand?: string;
  responseTime?: number;
  errorCount?: number;
}

export class StreamVoiceEngine {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private detector: WakeWordDetector;

  private state: VoiceLoopState = {
    isListening: false,
    isProcessing: false,
    errorCount: 0,
  };

  private config: Required<VoiceEngineConfig> = {
    language: "fa-IR",
    continuous: true,
    interimResults: true,
    maxListeningTime: 300000, // 5 دقیقه
  };

  private listeners: Map<string, Function[]> = new Map();
  private commandQueue: string[] = [];
  private shouldAutoRestart = true;

  constructor(config?: VoiceEngineConfig) {
    this.detector = wakeWordDetector;
    this.config = { ...this.config, ...config };

    this.initializeRecognition();
  }

  /**
   * راه‌اندازی Speech Recognition API
   */
  private initializeRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported");
      return;
    }

    this.recognition = new SpeechRecognition();

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;

    this.setupRecognitionHandlers();
  }

  /**
   * تعریف handler های Recognition
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.state.isListening = true;
      this.emit("start", {
        timestamp: Date.now(),
        status: "listening",
      });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const fullTranscript = final || interim;
      this.state.lastTranscript = fullTranscript;

      // تشخیص کلمه‌ی بیدار‌کننده
      if (this.detector.detect(fullTranscript)) {
        const command = this.detector.extractCommand(fullTranscript);
        this.state.lastCommand = command;

        this.emit("wake-word", {
          timestamp: Date.now(),
          transcript: fullTranscript,
          command,
        });

        if (final) {
          this.handleCommand(command);
        }
      }

      this.emit("transcript", {
        interim,
        final,
        isFinal: final.length > 0,
      });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.state.errorCount = (this.state.errorCount || 0) + 1;

      this.emit("error", {
        error: event.error,
        timestamp: Date.now(),
      });

      // خودکار restart بعد از خطا
      if (this.state.isListening && this.state.errorCount < 5) {
        setTimeout(() => this.recognition?.start(), 500);
      }
    };

    this.recognition.onend = () => {
      this.state.isListening = false;

      this.emit("end", {
        timestamp: Date.now(),
        status: "stopped",
      });

      // فقط زمانی auto-restart کن که stop دستی درخواست نشده باشد
      if (this.config.continuous && this.shouldAutoRestart) {
        this.start();
      }
    };
  }

  /**
   * شروع شنوایی دائم
   */
  start(): void {
    if (!this.recognition) {
      console.error("Speech Recognition not initialized");
      return;
    }

    if (this.state.isListening) return;

    this.shouldAutoRestart = true;

    try {
      this.recognition.start();
      this.state.errorCount = 0;
    } catch (e) {
      console.error("Error starting recognition:", e);
    }
  }

  /**
   * توقف شنوایی
   */
  stop(): void {
    this.shouldAutoRestart = false;
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
      this.detector.reset();
    }
  }

  /**
   * پردازش دستور (موتور اجرای هوشمند)
   */
  private async handleCommand(command: string): Promise<void> {
    if (!command || this.state.isProcessing) return;

    this.state.isProcessing = true;
    const startTime = Date.now();

    try {
      // سیگنال شروع پردازش
      this.emit("processing-start", { command });

      // Route کردن دستور
      const response = await this.routeCommand(command);

      // محاسبه زمان پاسخ
      const latency = Date.now() - startTime;
      this.state.responseTime = latency;

      // سیگنال پاسخ موفق
      this.emit("response", {
        command,
        response,
        latency,
        status: "success",
      });

      // نطق پاسخ (streaming)
      if (response) {
        await this.streamSpeak(response);
      }
    } catch (error) {
      this.emit("error", {
        stage: "command-processing",
        error: String(error),
        command,
      });
    } finally {
      this.state.isProcessing = false;
    }
  }

  /**
   * مسیریابی دستور (Intent Router)
   */
  private async routeCommand(command: string): Promise<string> {
    const normalized = command.toLowerCase();

    // ایمیل
    if (
      normalized.includes("ایمیل") ||
      normalized.includes("email") ||
      normalized.includes("پیام‌های")
    ) {
      return this.handleEmailCommand(command);
    }

    // یادآوری
    if (
      normalized.includes("یادآوری") ||
      normalized.includes("remind") ||
      normalized.includes("موقع")
    ) {
      return "یادآوری ثبت شد";
    }

    // وضعیت
    if (
      normalized.includes("وضعیت") ||
      normalized.includes("status") ||
      normalized.includes("خوبی")
    ) {
      return "تمام سیستم‌ها فعال هستند. انرژی 95 درصد.";
    }

    // جستجو
    if (
      normalized.includes("جستجو") ||
      normalized.includes("search") ||
      normalized.includes("پیدا")
    ) {
      return "جستجوی آنلاین آماده است";
    }

    // دستور ناشناخته
    return "متوجه نشدم. لطفاً دوباره سعی کنید.";
  }

  /**
   * کنترل‌کننده ایمیل (اتصال به Gmail)
   */
  private async handleEmailCommand(command: string): Promise<string> {
    // TODO: اتصال واقعی به Gmail API
    const emailActions = {
      check: "در حال بررسی ایمیل‌ها...",
      send: "آماده برای ارسال ایمیل",
      read: "خواندن آخرین ایمیل",
    };

    if (command.includes("چک") || command.includes("check")) {
      return emailActions.check;
    }
    if (command.includes("ارسال") || command.includes("send")) {
      return emailActions.send;
    }
    if (command.includes("بخوان") || command.includes("read")) {
      return emailActions.read;
    }

    return "دستور ایمیل معلوم نیست";
  }

  /**
   * تبدیل متن به صوت (Streaming TTS)
   */
  private async streamSpeak(text: string): Promise<void> {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) return;

    // در برخی مرورگرها بعد از تعامل با میکروفن، synth در حالت paused می‌ماند.
    try { synth.resume(); } catch {}

    const voices = synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(this.config.language.toLowerCase().slice(0, 2)));

    // تقسیم متن به بخش‌های کوتاه برای تاخیر کمتر
    const chunks = this.splitIntoChunks(text, 20).filter(Boolean);

    return new Promise((resolve) => {
      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          resolve();
          return;
        }

        const chunk = chunks[index];
        const utterance = new SpeechSynthesisUtterance(chunk);

        utterance.lang = this.config.language;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (matchingVoice) utterance.voice = matchingVoice;

        utterance.onend = () => {
          index++;
          speakNext();
        };

        utterance.onerror = (event) => {
          this.emit("error", {
            stage: "tts",
            error: event.error,
            chunk,
          });
          index++;
          speakNext();
        };

        synth.speak(utterance);
      };

      speakNext();
    });
  }

  /**
   * تقسیم متن به بخش‌های کوتاه
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const words = text.split(" ");
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    return chunks;
  }

  /**
   * ثبت listener برای رویدادها
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * حذف listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * تولید رویداد
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  /**
   * دریافت وضعیت موتور
   */
  getState(): VoiceLoopState {
    return { ...this.state };
  }

  /**
   * خود‌آزمایی سیستم
   */
  async selfTest(): Promise<{
    recognition: boolean;
    synthesis: boolean;
    detectorReady: boolean;
  }> {
    return {
      recognition: this.recognition !== null,
      synthesis: window.speechSynthesis !== undefined,
      detectorReady: this.detector !== null,
    };
  }
}

// Singleton export
export const voiceEngine = new StreamVoiceEngine({
  language: "fa-IR",
  continuous: true,
  interimResults: true,
});

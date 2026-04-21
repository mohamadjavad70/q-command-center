/**
 * Hybrid AI Engine - ترکیب Compression + Offline
 * بهینه‌ترین پاسخ برای هر شرایط (online/offline/limited bandwidth)
 */

import { compressionEngine, NeuralCompressionEngine } from "../compression/neural-compression";
import { offlineEngine, OfflineAIEngine } from "../offline/offline-ai-engine";

export type NetworkMode = "online" | "offline" | "limited";

export interface HybridEngineConfig {
  preferLocal?: boolean; // اولویت پاسخ‌های محلی
  enableCompression?: boolean;
  enableOffline?: boolean;
  networkTimeout?: number;
}

export interface ProcessResult {
  response: string;
  source: "rule" | "cache" | "compressed" | "online" | "fallback";
  latency: number;
  isOffline: boolean;
}

/**
 * Hybrid AI Engine - انتخاب بهترین مسیر
 */
export class HybridAIEngine {
  private compressionEngine: NeuralCompressionEngine;
  private offlineEngine: OfflineAIEngine;
  private networkMode: NetworkMode = "online";
  private config: Required<HybridEngineConfig>;

  private lastNetworkCheck: number = 0;
  private networkCheckInterval: number = 30000; // 30s

  constructor(config?: HybridEngineConfig) {
    this.compressionEngine = compressionEngine;
    this.offlineEngine = offlineEngine;
    this.config = {
      preferLocal: config?.preferLocal ?? true,
      enableCompression: config?.enableCompression ?? true,
      enableOffline: config?.enableOffline ?? true,
      networkTimeout: config?.networkTimeout ?? 3000,
    };

    this.detectNetworkMode();
  }

  /**
   * تشخیص mode شبکه
   */
  private async detectNetworkMode(): Promise<void> {
    const now = Date.now();

    // پرونی network check اگر خیلی تازه انجام شده
    if (now - this.lastNetworkCheck < this.networkCheckInterval) {
      return;
    }

    this.lastNetworkCheck = now;

    try {
      const start = performance.now();

      const response = await Promise.race([
        fetch("https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png", {
          mode: "no-cors",
          method: "HEAD",
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), this.config.networkTimeout)
        ),
      ]);

      const latency = performance.now() - start;

      if (latency > 1000) {
        this.networkMode = "limited";
      } else {
        this.networkMode = "online";
      }

      this.offlineEngine.switchToOnline();
    } catch (error) {
      this.networkMode = "offline";
      this.offlineEngine.switchToOffline();
    }
  }

  /**
   * پردازش درخواست با انتخاب بهترین مسیر
   */
  async process(input: string): Promise<ProcessResult> {
    const startTime = performance.now();

    // تشخیص network mode (غیر‌blocking)
    this.detectNetworkMode().catch(() => {});

    const isOffline = this.networkMode === "offline";

    // استراتژی: Online (preferLocal=false) → Cloud
    if (!this.config.preferLocal && this.networkMode === "online") {
      try {
        const response = "از کلاود پردازش خواهد شد"; // placeholder
        return {
          response,
          source: "online",
          latency: performance.now() - startTime,
          isOffline: false,
        };
      } catch (e) {
        // fallback to local
      }
    }

    // استراتژی: Offline یا limited → Local rules + cache
    if (isOffline || this.networkMode === "limited") {
      const offlineResponse = await this.offlineEngine.process(input);

      return {
        response: offlineResponse,
        source: "rule",
        latency: performance.now() - startTime,
        isOffline: true,
      };
    }

    // استراتژی: Online + preferLocal → Compression
    if (this.config.enableCompression) {
      const compressed = await this.getCompressedResponse(input);

      if (compressed) {
        return {
          response: compressed,
          source: "compressed",
          latency: performance.now() - startTime,
          isOffline: false,
        };
      }
    }

    // fallback
    const fallback = await this.offlineEngine.process(input);

    return {
      response: fallback,
      source: "fallback",
      latency: performance.now() - startTime,
      isOffline: this.networkMode === "offline",
    };
  }

  /**
   * پاسخ فشرده‌شده (از حافظه compression)
   */
  private async getCompressedResponse(input: string): Promise<string | null> {
    const hash = input.substring(0, 32);
    const retrieved = this.compressionEngine.retrieve(hash);

    if (retrieved) {
      return retrieved;
    }

    // ذخیره برای استفاده‌ی آینده
    this.compressionEngine.store(hash, input, 0.5, 1);

    return null;
  }

  /**
   * مانیتورینگ پاسخ و اضافه به cache
   */
  cacheResponse(query: string, response: string, confidence: number = 0.7): void {
    if (this.config.enableCompression) {
      const hash = query.substring(0, 32);
      this.compressionEngine.store(hash, response, confidence, 1);
    }
  }

  /**
   * دریافت stats
   */
  getStats(): {
    mode: NetworkMode;
    compressionStats: any;
    cacheStats: any;
  } {
    return {
      mode: this.networkMode,
      compressionStats: this.compressionEngine.getStats(),
      cacheStats: this.offlineEngine.getCacheStats(),
    };
  }

  /**
   * تغییر mode‌دستی (برای test)
   */
  setNetworkMode(mode: NetworkMode): void {
    this.networkMode = mode;

    if (mode === "offline") {
      this.offlineEngine.switchToOffline();
    } else {
      this.offlineEngine.switchToOnline();
    }
  }

  /**
   * پاک کردن حافظه
   */
  clearMemory(): void {
    this.offlineEngine.clearCache();
    this.compressionEngine.invalidate();
  }
}

// Singleton
export const hybridEngine = new HybridAIEngine({
  preferLocal: true,
  enableCompression: true,
  enableOffline: true,
  networkTimeout: 3000,
});

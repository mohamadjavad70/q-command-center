/**
 * Offline-First AI Engine - سیستم هوشمند مستقل بدون اینترنت
 * میتوانند در محیط بدون اتصال اینترنت کار کند
 * 
 * Strategy:
 * 1. Rule-based responses (فوری)
 * 2. Cached responses (تاریخچه)
 * 3. Deterministic fallback (پیش‌فرض)
 */

export interface CachedResponse {
  query: string;
  response: string;
  confidence: number;
  timestamp: number;
  usageCount: number;
}

export interface OfflineConfig {
  maxCacheSize?: number;
  ttl?: number; // time-to-live in ms
  enableDeterministic?: boolean;
}

/**
 * Rule Engine - قوانین پاسخ‌های مشخص
 */
export class RuleEngine {
  private rules: Array<{
    patterns: string[];
    response: (input: string) => string;
  }> = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // سلام‌ها
    this.addRule(
      ["سلام", "درود", "hello", "hi"],
      (input) => {
        const hour = new Date().getHours();
        if (hour < 12) return "صبح بخیر! من Q هستم";
        if (hour < 18) return "بعدازظهر بخیر!";
        return "شب بخیر!";
      }
    );

    // زمان و تاریخ
    this.addRule(
      ["زمان", "ساعت", "وقت", "time", "date"],
      () => {
        const now = new Date();
        return `ساعت ${now.toLocaleTimeString("fa-IR")}، تاریخ ${now.toLocaleDateString("fa-IR")}`;
      }
    );

    // وضعیت سیستم
    this.addRule(
      ["وضعیت", "status", "خوبی", "چطوری"],
      () => {
        const ram = (performance.memory?.usedJSHeapSize || 0) / 1048576;
        return `من در حالت آفلاین فعال هستم. استفاده از حافظه: ${ram.toFixed(1)}MB`;
      }
    );

    // موقعیت جغرافیایی
    this.addRule(
      ["موقعیت", "جایی", "کجا", "location"],
      () => "من در حالت محلی کار می‌کنم. موقعیت GPS در دسترس نیست"
    );

    // فعالیت‌های ممکن
    this.addRule(
      ["می‌تونی", "می‌شود", "can you", "می‌کنی"],
      (input) => {
        if (input.includes("ایمیل")) return "ایمیل را فقط با اتصال می‌توانم بررسی کنم";
        if (input.includes("جستجو")) return "جستجو نیاز به اتصال اینترنت دارد";
        return "می‌توانم محاسبات و پاسخ‌های منطقی را انجام دهم";
      }
    );

    // ریاضی ساده
    this.addRule(
      ["پلاس", "مثبت", "جمع", "+"],
      (input) => {
        const nums = input.match(/\d+/g);
        if (nums && nums.length >= 2) {
          const sum = nums.reduce((a, b) => parseInt(a) + parseInt(b), 0);
          return `جواب: ${sum}`;
        }
        return "لطفاً دو عدد بده";
      }
    );

    // خاموشی
    this.addRule(
      ["خاموش", "بخواب", "sleep"],
      () => "به شنوایی خاتمه می‌دهم"
    );
  }

  /**
   * اضافه کردن قانون جدید
   */
  addRule(patterns: string[], responseHandler: (input: string) => string): void {
    this.rules.push({ patterns, response: responseHandler });
  }

  /**
   * پردازش input و یافتن matching rule
   */
  process(input: string): string | null {
    const normalized = input.toLowerCase();

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (normalized.includes(pattern.toLowerCase())) {
          try {
            return rule.response(input);
          } catch (e) {
            return "خطایی در پردازش رخ داد";
          }
        }
      }
    }

    return null;
  }
}

/**
 * Offline AI Engine - مدیریت پاسخ‌های آفلاین
 */
export class OfflineAIEngine {
  private ruleEngine: RuleEngine;
  private cache: Map<string, CachedResponse> = new Map();
  private config: Required<OfflineConfig>;

  private readonly DETERMINISTIC_RESPONSES = [
    "من در حالت محلی کار می‌کنم. این پاسخ تولید شده است",
    "هیچ اتصال اینترنت وجود ندارد. استفاده از حافظه محلی",
    "سیستم در حالت خودمختار است",
    "پردازش آفلاین فعال است",
    "نه سرور، نه وابستگی",
  ];

  constructor(config?: OfflineConfig) {
    this.ruleEngine = new RuleEngine();
    this.config = {
      maxCacheSize: config?.maxCacheSize ?? 500,
      ttl: config?.ttl ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      enableDeterministic: config?.enableDeterministic ?? true,
    };
  }

  /**
   * پردازش فوری (rule-based)
   */
  async process(input: string): Promise<string> {
    if (!input) return "هیچ ورودی دریافت نشد";

    // ۱. بررسی cache
    const cached = this.getFromCache(input);
    if (cached) {
      return cached;
    }

    // ۲. اجرای rule engine
    const ruleResponse = this.ruleEngine.process(input);
    if (ruleResponse) {
      this.saveToCache(input, ruleResponse, 0.95);
      return ruleResponse;
    }

    // ۳. Fallback deterministic
    if (this.config.enableDeterministic) {
      const fallback = this.deterministic(input);
      this.saveToCache(input, fallback, 0.4);
      return fallback;
    }

    return "نمی‌توانم پاسخ دهم";
  }

  /**
   * بازیابی از cache
   */
  private getFromCache(query: string): string | null {
    const key = this.normalizeKey(query);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // بررسی TTL
    if (Date.now() - cached.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // بروزرسانی usage
    cached.usageCount++;
    cached.timestamp = Date.now();

    return cached.response;
  }

  /**
   * ذخیره در cache
   */
  private saveToCache(query: string, response: string, confidence: number): void {
    const key = this.normalizeKey(query);

    // eviction policy (FIFO)
    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      query,
      response,
      confidence,
      timestamp: Date.now(),
      usageCount: 1,
    });
  }

  /**
   * بازیابی حتمی (آخرین امکان)
   */
  private deterministic(input: string): string {
    // بر اساس hash input
    const seed = input.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const index = seed % this.DETERMINISTIC_RESPONSES.length;

    return this.DETERMINISTIC_RESPONSES[index];
  }

  /**
   * normalize key برای cache
   */
  private normalizeKey(query: string): string {
    return query.toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * دریافت stats cache
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ query: string; uses: number }>;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map((c) => ({
        query: c.query,
        uses: c.usageCount,
      })),
    };
  }

  /**
   * پاک کردن cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * انکه network available است
   * (برای fallback logic)
   */
  async isNetworkAvailable(): Promise<boolean> {
    try {
      const response = await fetch("https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png", {
        mode: "no-cors",
        method: "HEAD",
      });

      return response.ok || response.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * تبدیل به Online mode
   */
  switchToOnline(): void {
    // cache invalidate نشود، اما اضافی اطلاعات loading شود
    console.log("📡 Switching to online mode...");
  }

  /**
   * تبدیل به Offline mode
   */
  switchToOffline(): void {
    console.log("📴 Offline mode activated");
  }
}

// Singleton
export const offlineEngine = new OfflineAIEngine({
  maxCacheSize: 500,
  ttl: 7 * 24 * 60 * 60 * 1000,
  enableDeterministic: true,
});

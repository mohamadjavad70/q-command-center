/**
 * Wake Word Detector - Local, Fast, Reliable
 * فعال‌کننده صوتی سیستم Q Network
 * استفاده: تشخیص کلمه‌ی "کیو" برای فعال‌سازی دستور
 */

export class WakeWordDetector {
  private buffer: string[] = [];
  private readonly wakeWords = ["کیو", "q"];
  private readonly maxBufferSize = 10;
  private readonly minConfidence = 0.7;

  /**
   * تشخیص کلمه‌ی بیدار‌کننده
   */
  detect(transcript: string): boolean {
    if (!transcript || transcript.length < 1) return false;

    const normalized = this.normalize(transcript);
    this.buffer.push(normalized);

    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    const combined = this.buffer.join(" ");

    // تشخیص مستقیم
    for (const wakeWord of this.wakeWords) {
      if (combined.includes(wakeWord)) {
        return true;
      }
    }

    return false;
  }

  /**
   * استخراج دستور بعد از کلمه‌ی بیدار‌کننده
   */
  extractCommand(transcript: string): string {
    let text = this.normalize(transcript);

    for (const wakeWord of this.wakeWords) {
      const index = text.indexOf(wakeWord);
      if (index !== -1) {
        text = text.substring(index + wakeWord.length);
        break;
      }
    }

    return text.trim();
  }

  /**
   * نرمال‌سازی متن (فارسی + انگلیسی)
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // بدون صفر‌ عرض
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * صفرسازی buffer
   */
  reset(): void {
    this.buffer = [];
  }

  /**
   * وضعیت فعلی detector
   */
  getState(): {
    bufferSize: number;
    lastTranscripts: string[];
  } {
    return {
      bufferSize: this.buffer.length,
      lastTranscripts: [...this.buffer],
    };
  }
}

export const wakeWordDetector = new WakeWordDetector();

/**
 * Voice-Gmail Bridge - Direct Voice Commands to Gmail Actions
 * اتصال دستورات صوتی به اقدامات Gmail
 * دستورات مثال:
 * - "کیو ایمیل‌هام بخوان"
 * - "کیو ایمیل برای علی بفرست"
 * - "کیو اسپم‌ها حذف کن"
 */

import { gmail } from "../integrations/gmail";
import { voiceEngine } from "./stream-voice-engine";

export interface GmailVoiceCommand {
  action: "read" | "send" | "mark-read" | "delete" | "check" | "list";
  recipient?: string;
  subject?: string;
  body?: string;
  count?: number;
}

export class VoiceGmailBridge {
  private voicePatterns = {
    read: /بخوان|خوندن|پیام|ایمیل/,
    send: /بفرست|ارسال|نوشتن/,
    delete: /حذف|پاک/,
    mark: /خوندن|خوندم|بخونی/,
    check: /چک|بررسی|تازه|جدید/,
    list: /لیست|تمام|همه/,
  };

  /**
   * تجزیه دستور صوتی
   */
  parseVoiceCommand(transcript: string): GmailVoiceCommand | null {
    const normalized = transcript.toLowerCase();

    // "ایمیل‌ها چک کن"
    if (normalized.match(/ایمیل.*چک|بررسی.*ایمیل/)) {
      return {
        action: "check",
        count: 10,
      };
    }

    // "آخرین ایمیل‌ام بخوان"
    if (normalized.match(/ایمیل.*بخوان|پیام.*خوندن/)) {
      return {
        action: "read",
        count: 1,
      };
    }

    // "ایمیل برای علی بفرست: سلام"
    if (normalized.match(/برای.*بفرست|ایمیل.*فرست/)) {
      const recipientMatch = normalized.match(/برای\s+(\S+)/);
      const recipient = recipientMatch ? recipientMatch[1] : null;

      return {
        action: "send",
        recipient: recipient || "unknown",
        body: "پیام صوتی",
      };
    }

    // "اسپم‌ها حذف کن"
    if (normalized.match(/اسپم|جنک.*حذف|پاک/)) {
      return {
        action: "delete",
        count: undefined,
      };
    }

    return null;
  }

  /**
   * اجرای دستور Gmail
   */
  async executeCommand(command: GmailVoiceCommand): Promise<string> {
    try {
      switch (command.action) {
        case "check":
          return await this.handleCheck(command.count);

        case "read":
          return await this.handleRead(command.count);

        case "send":
          return await this.handleSend(command.recipient, command.body);

        case "delete":
          return await this.handleDelete();

        case "mark":
          return await this.handleMarkAsRead();

        case "list":
          return await this.handleList(command.count);

        default:
          return "دستور شناخته‌شده نیست";
      }
    } catch (error) {
      return `خطا: ${String(error)}`;
    }
  }

  /**
   * بررسی ایمیل‌های جدید
   */
  private async handleCheck(count: number = 10): Promise<string> {
    try {
      const emails = await gmail.listUnreadEmails(count);

      if (emails.length === 0) {
        return "ایمیل جدیدی نداری";
      }

      return `${emails.length} ایمیل جدید داری. دستور دیگر بده تا تفاصیل بگویم.`;
    } catch (error) {
      return "نتوانستم ایمیل‌ها را بررسی کنم";
    }
  }

  /**
   * خواندن آخرین ایمیل
   */
  private async handleRead(count: number = 1): Promise<string> {
    try {
      const emails = await gmail.listUnreadEmails(count);

      if (emails.length === 0) {
        return "ایمیل جدیدی برای خواندن نیست";
      }

      const email = emails[0];

      // ایمیل‌های طولانی را کوتاه کن
      const bodyPreview = email.body.substring(0, 200);

      const message = `
        فرستنده: ${email.from}
        موضوع: ${email.subject}
        پیام: ${bodyPreview}...
      `;

      return message.trim();
    } catch (error) {
      return "نتوانستم ایمیل را بخوانم";
    }
  }

  /**
   * ارسال ایمیل
   */
  private async handleSend(
    recipient: string | undefined,
    body: string = "پیام صوتی"
  ): Promise<string> {
    if (!recipient) {
      return "باید گیرنده را مشخص کنی";
    }

    try {
      await gmail.sendEmail(
        recipient,
        "پیام صوتی از Q",
        body
      );

      return `ایمیل برای ${recipient} فرستاده شد`;
    } catch (error) {
      return `خطا در ارسال ایمیل: ${String(error)}`;
    }
  }

  /**
   * حذف ایمیل‌های اسپم
   */
  private async handleDelete(): Promise<string> {
    // TODO: پیاده‌سازی واقعی حذف اسپم
    return "حذف اسپم تهیه می‌شود";
  }

  /**
   * علامت‌گذاری به‌عنوان خوانده‌شده
   */
  private async handleMarkAsRead(): Promise<string> {
    // TODO: پیاده‌سازی واقعی
    return "علامت‌گذاری تهیه می‌شود";
  }

  /**
   * لیست ایمیل‌ها
   */
  private async handleList(count: number = 5): Promise<string> {
    try {
      const emails = await gmail.listUnreadEmails(count);

      if (emails.length === 0) {
        return "ایمیل‌های جدیدی نداری";
      }

      const list = emails
        .slice(0, count)
        .map((e, i) => `${i + 1}. ${e.from}: ${e.subject}`)
        .join("\n");

      return `ایمیل‌های جدید:\n${list}`;
    } catch (error) {
      return "نتوانستم لیست ایمیل‌ها را دریافت کنم";
    }
  }
}

// Singleton
export const voiceGmailBridge = new VoiceGmailBridge();

/**
 * Hook for React - استفاده‌ی آسان
 */
export function useVoiceGmail() {
  return {
    parseCommand: (transcript: string) =>
      voiceGmailBridge.parseVoiceCommand(transcript),
    execute: (command: GmailVoiceCommand) =>
      voiceGmailBridge.executeCommand(command),
  };
}

/**
 * Integration with VoiceEngine
 * اتصال خودکار دستورات صوتی به Gmail
 */
export function setupVoiceGmailIntegration(): void {
  voiceEngine.on("response", async (data: any) => {
    const command = voiceGmailBridge.parseVoiceCommand(data.command);

    if (command) {
      console.log("📧 Gmail command detected:", command);
      const response = await voiceGmailBridge.executeCommand(command);
      console.log("📧 Gmail response:", response);
    }
  });
}

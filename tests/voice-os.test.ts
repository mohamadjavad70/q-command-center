/**
 * Voice OS Tests - Integration & Unit Tests
 * تست‌های کامل سیستم صوتی
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WakeWordDetector } from "./wake-word-detector";
import { StreamVoiceEngine } from "./stream-voice-engine";
import { voiceGmailBridge } from "./voice-gmail-bridge";

describe("WakeWordDetector", () => {
  let detector: WakeWordDetector;

  beforeEach(() => {
    detector = new WakeWordDetector();
  });

  afterEach(() => {
    detector.reset();
  });

  describe("detect", () => {
    it("should detect Persian wake word 'کیو'", () => {
      const result = detector.detect("سلام کیو چطوری");
      expect(result).toBe(true);
    });

    it("should detect English wake word 'q'", () => {
      const result = detector.detect("hello q how are you");
      expect(result).toBe(true);
    });

    it("should not detect when wake word is missing", () => {
      const result = detector.detect("سلام چطوری");
      expect(result).toBe(false);
    });

    it("should handle empty input", () => {
      const result = detector.detect("");
      expect(result).toBe(false);
    });

    it("should normalize text correctly", () => {
      const result1 = detector.detect("کیو");
      const result2 = detector.detect("  کیو  ");
      expect(result1).toBe(result2);
    });
  });

  describe("extractCommand", () => {
    it("should extract command after Persian wake word", () => {
      const cmd = detector.extractCommand("کیو ایمیل بخوان");
      expect(cmd).toContain("ایمیل");
      expect(cmd).toContain("بخوان");
    });

    it("should extract command after English wake word", () => {
      const cmd = detector.extractCommand("q read emails");
      expect(cmd).toContain("read");
    });

    it("should return empty string if only wake word", () => {
      const cmd = detector.extractCommand("کیو");
      expect(cmd).toBe("");
    });

    it("should handle multiple occurrences", () => {
      const cmd = detector.extractCommand("کیو کیو ایمیل");
      expect(cmd).toBeTruthy();
    });
  });

  describe("getState", () => {
    it("should return buffer state", () => {
      detector.detect("test");
      const state = detector.getState();

      expect(state.bufferSize).toBeGreaterThan(0);
      expect(state.lastTranscripts).toBeInstanceOf(Array);
    });

    it("should reset after reset()", () => {
      detector.detect("test");
      detector.reset();
      const state = detector.getState();

      expect(state.bufferSize).toBe(0);
    });
  });
});

describe("VoiceGmailBridge", () => {
  describe("parseVoiceCommand", () => {
    it("should parse email check command", () => {
      const cmd = voiceGmailBridge.parseVoiceCommand("ایمیل چک کن");
      expect(cmd?.action).toBe("check");
    });

    it("should parse read command", () => {
      const cmd = voiceGmailBridge.parseVoiceCommand("ایمیل‌ام بخوان");
      expect(cmd?.action).toBe("read");
    });

    it("should parse send command", () => {
      const cmd = voiceGmailBridge.parseVoiceCommand("برای علی ایمیل بفرست");
      expect(cmd?.action).toBe("send");
      expect(cmd?.recipient).toBe("علی");
    });

    it("should return null for unknown command", () => {
      const cmd = voiceGmailBridge.parseVoiceCommand("random text");
      expect(cmd).toBeNull();
    });
  });

  describe("executeCommand", () => {
    it("should return error message for missing recipient", async () => {
      const response = await voiceGmailBridge.executeCommand({
        action: "send",
      });
      expect(response).toContain("گیرنده");
    });

    it("should handle unsupported actions gracefully", async () => {
      const response = await voiceGmailBridge.executeCommand({
        action: "list" as any,
      });
      expect(response).toBeTruthy();
    });
  });
});

describe("StreamVoiceEngine", () => {
  let engine: StreamVoiceEngine;

  beforeEach(() => {
    engine = new StreamVoiceEngine({
      language: "fa-IR",
      continuous: true,
    });
  });

  afterEach(() => {
    engine.stop();
  });

  describe("selfTest", () => {
    it("should return test results", async () => {
      const test = await engine.selfTest();

      expect(test).toHaveProperty("recognition");
      expect(test).toHaveProperty("synthesis");
      expect(test).toHaveProperty("detectorReady");
    });
  });

  describe("getState", () => {
    it("should return current state", () => {
      const state = engine.getState();

      expect(state).toHaveProperty("isListening");
      expect(state).toHaveProperty("isProcessing");
      expect(typeof state.isListening).toBe("boolean");
    });
  });

  describe("event listeners", () => {
    it("should register and emit events", (done) => {
      const testData = { test: true };

      engine.on("test-event", (data) => {
        expect(data).toEqual(testData);
        done();
      });

      // Emit through private method (for testing)
      (engine as any).emit("test-event", testData);
    });

    it("should handle multiple listeners", (done) => {
      let count = 0;

      const increment = () => {
        count++;
        if (count === 2) done();
      };

      engine.on("multi", increment);
      engine.on("multi", increment);

      (engine as any).emit("multi");
    });
  });
});

describe("Integration: Voice Commands", () => {
  it("should handle full voice flow", async () => {
    const detector = new WakeWordDetector();

    // Simulate user saying: "کیو ایمیل بخوان"
    const transcript = "کیو ایمیل بخوان";

    const wakeWordDetected = detector.detect(transcript);
    expect(wakeWordDetected).toBe(true);

    const command = detector.extractCommand(transcript);
    expect(command).toContain("ایمیل");

    const gmailCmd = voiceGmailBridge.parseVoiceCommand(command);
    expect(gmailCmd?.action).toBe("read");
  });

  it("should handle command with sender info", () => {
    const detector = new WakeWordDetector();
    const transcript = "کیو برای علی ایمیل بفرست";

    const wakeWordDetected = detector.detect(transcript);
    expect(wakeWordDetected).toBe(true);

    const command = detector.extractCommand(transcript);
    const gmailCmd = voiceGmailBridge.parseVoiceCommand(command);

    expect(gmailCmd?.action).toBe("send");
    expect(gmailCmd?.recipient).toBe("علی");
  });
});

describe("Performance", () => {
  it("wake word detection should be fast", () => {
    const detector = new WakeWordDetector();
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      detector.detect("کیو ایمیل بخوان");
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // < 100ms for 1000 iterations
  });

  it("command parsing should be fast", () => {
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      voiceGmailBridge.parseVoiceCommand("کیو ایمیل چک کن");
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // < 50ms for 100 iterations
  });
});

/**
 * Q Voice OS - Main Integration
 * نقطه‌ی شروع سیستم صوتی Q Network
 * شامل: Wake Word + Streaming + Gmail Integration
 */

import React, { useEffect, useState } from "react";
import { voiceEngine } from "./voice/stream-voice-engine";
import { setupVoiceGmailIntegration } from "./voice/voice-gmail-bridge";
import VoiceOSWidget from "./components/VoiceOSWidget";

/**
 * Q Voice OS - صفحه‌ی اصلی سیستم صوتی
 */
export const QVoiceOS: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // راه‌اندازی کامل سیستم
    async function initialize() {
      console.log("🎙️ Initializing Q Voice OS...");

      // تست خود‌آزمایی
      const test = await voiceEngine.selfTest();
      console.log("✅ Self-test:", test);

      if (!test.recognition) {
        console.error("❌ Speech Recognition not available");
        addLog("خطا: Speech Recognition فعال نیست");
        return;
      }

      // اتصال Gmail Integration
      setupVoiceGmailIntegration();
      console.log("✅ Voice-Gmail integration setup");

      // رویدادهای debug
      voiceEngine.on("start", () => {
        addLog("🔴 شنوایی شروع شد");
      });

      voiceEngine.on("wake-word", (data) => {
        addLog(`🎤 کلمه‌ی بیدار‌کننده شناخته شد: "${data.command}"`);
      });

      voiceEngine.on("response", (data) => {
        addLog(`✅ پاسخ داده شد (${data.latency}ms)`);
      });

      voiceEngine.on("error", (data) => {
        addLog(`❌ خطا: ${data.error}`);
      });

      // شروع گوش‌دادن
      voiceEngine.start();
      addLog("🎙️ سیستم آماده است");

      setIsInitialized(true);
    }

    initialize();

    return () => {
      voiceEngine.stop();
    };
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev.slice(-9),
      `[${new Date().toLocaleTimeString("fa-IR")}] ${message}`,
    ]);
  };

  return (
    <div className="q-voice-os">
      <VoiceOSWidget autoStart={true} showIndicator={true} />

      {/* Debug Panel */}
      <div className="debug-panel" style={{ direction: "rtl" }}>
        <h3>📊 وضعیت سیستم</h3>
        <div className="status">
          <p>
            <strong>وضعیت راه‌اندازی:</strong>{" "}
            {isInitialized ? "✅ آماده" : "⏳ در حال..."}
          </p>
          <p>
            <strong>گوش‌دادن:</strong>{" "}
            {voiceEngine.getState().isListening ? "🔴 فعال" : "⚪ متوقف"}
          </p>
          <p>
            <strong>پردازش:</strong>{" "}
            {voiceEngine.getState().isProcessing ? "⚙️ در حال" : "✅ آماده"}
          </p>
        </div>

        <h4>سیاق‌های صوتی</h4>
        <div className="logs">
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              {log}
            </div>
          ))}
        </div>

        <style>{`
          .q-voice-os {
            position: relative;
            width: 100%;
            height: 100vh;
          }

          .debug-panel {
            position: fixed;
            bottom: 100px;
            left: 20px;
            width: 300px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.85);
            color: #00f2ff;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #00f2ff;
            font-family: monospace;
            font-size: 11px;
            z-index: 9998;
            overflow-y: auto;
          }

          .debug-panel h3,
          .debug-panel h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            text-transform: uppercase;
          }

          .debug-panel p {
            margin: 4px 0;
            font-size: 10px;
          }

          .debug-panel strong {
            color: #fff;
          }

          .logs {
            margin-top: 8px;
            border-top: 1px solid rgba(0, 242, 255, 0.3);
            padding-top: 8px;
            max-height: 200px;
            overflow-y: auto;
          }

          .log-entry {
            padding: 2px 0;
            font-size: 9px;
            color: #00f2ff;
            line-height: 1.2;
          }

          .log-entry:nth-child(even) {
            opacity: 0.7;
          }

          .status {
            background: rgba(0, 242, 255, 0.05);
            padding: 8px;
            border-radius: 4px;
            margin: 8px 0;
          }
        `}</style>
      </div>
    </div>
  );
};

export default QVoiceOS;

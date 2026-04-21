/**
 * VoiceOSWidget - React Component for Voice Control
 * محیط کنترل صوتی برای Q Network
 * استفاده‌ای ساده و مستقیم
 */

import React, { useEffect, useState } from "react";
import { voiceEngine, VoiceLoopState } from "./stream-voice-engine";

interface VoiceOSWidgetProps {
  autoStart?: boolean;
  showIndicator?: boolean;
  showTranscript?: boolean;
  onCommand?: (command: string) => void;
}

export const VoiceOSWidget: React.FC<VoiceOSWidgetProps> = ({
  autoStart = true,
  showIndicator = true,
  showTranscript = false,
  onCommand,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [state, setState] = useState<VoiceLoopState>(voiceEngine.getState());

  useEffect(() => {
    // Setup listeners
    voiceEngine.on("start", () => {
      setIsListening(true);
    });

    voiceEngine.on("end", () => {
      setIsListening(false);
    });

    voiceEngine.on("transcript", (data: any) => {
      if (data.isFinal) {
        setTranscript(data.final);
      }
    });

    voiceEngine.on("response", (data: any) => {
      setResponseTime(data.latency);
      onCommand?.(data.command);

      // Clear transcript بعد از پاسخ
      setTimeout(() => {
        setTranscript("");
        setResponseTime(null);
      }, 2000);
    });

    voiceEngine.on("error", (data: any) => {
      console.error("Voice error:", data);
    });

    // Self-test
    voiceEngine.selfTest().then((test) => {
      console.log("Voice Engine Test:", test);
      if (
        autoStart &&
        test.recognition &&
        test.synthesis &&
        test.detectorReady
      ) {
        voiceEngine.start();
      }
    });

    return () => {
      // Cleanup on unmount
      voiceEngine.stop();
    };
  }, [autoStart, onCommand]);

  return (
    <div className="voice-os-widget">
      {showIndicator && (
        <div className={`indicator ${isListening ? "active" : "idle"}`}>
          <div className="pulse" />
          <span>{isListening ? "گوش می‌دهم..." : "آماده"}</span>
        </div>
      )}

      {showTranscript && transcript && (
        <div className="transcript">
          <p>{transcript}</p>
          {responseTime && (
            <small>پاسخ: {responseTime}ms</small>
          )}
        </div>
      )}

      <style>{`
        .voice-os-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
        }

        .indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(0, 242, 255, 0.9);
          border-radius: 24px;
          color: #000;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 242, 255, 0.3);
          transition: all 0.3s ease;
        }

        .indicator.active {
          background: rgba(0, 242, 255, 1);
          box-shadow: 0 4px 20px rgba(0, 242, 255, 0.6);
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: #000;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .indicator.active .pulse {
          animation: pulse-active 0.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes pulse-active {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.4);
          }
        }

        .transcript {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          max-width: 200px;
          font-size: 12px;
          direction: rtl;
          text-align: right;
        }

        .transcript p {
          margin: 0;
          color: #333;
        }

        .transcript small {
          display: block;
          margin-top: 4px;
          color: #999;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};

export default VoiceOSWidget;

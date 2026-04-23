// src/pages/QVoiceCore.tsx
// Q Voice Core — minimal logo-first voice page

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type SupportedLang = "de-DE" | "fa-IR" | "en-US" | "tr-TR";

function detectLanguage(text: string): SupportedLang {
  if (/[آ-ی]/.test(text)) return "fa-IR";
  if (/[çğıİöşüÇĞİÖŞÜ]/.test(text)) return "tr-TR";
  if (/[äöüßÄÖÜ]/.test(text) || /\b(und|nicht|bitte|danke|hallo|ich|du|heute)\b/i.test(text)) {
    return "de-DE";
  }
  return "en-US";
}

function getSpeechStyle(lang: SupportedLang, emotion?: string) {
  if (emotion === "happy") return { rate: 0.98, pitch: 1.04 };
  if (emotion === "serious") return { rate: 0.9, pitch: 0.94 };
  if (emotion === "sad") return { rate: 0.88, pitch: 0.92 };
  if (lang === "fa-IR") return { rate: 0.9, pitch: 0.96 };
  if (lang === "tr-TR") return { rate: 0.93, pitch: 1.0 };
  return { rate: 0.92, pitch: 0.98 };
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: SupportedLang) {
  const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
  if (exact) return exact;
  const base = lang.split("-")[0].toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(base));
}

function getIdleLabel(lang: SupportedLang) {
  if (lang === "fa-IR") return "برای صحبت با Q لمس کنید";
  if (lang === "tr-TR") return "Q ile konuşmak için dokunun";
  if (lang === "en-US") return "Tap to speak with Q";
  return "Tippen, um mit Q zu sprechen";
}

function getInitialLanguage(): SupportedLang {
  if (typeof navigator === "undefined") return "de-DE";

  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => value.startsWith("fa"))) return "fa-IR";
  if (candidates.some((value) => value.startsWith("tr"))) return "tr-TR";
  if (candidates.some((value) => value.startsWith("en"))) return "en-US";
  return "de-DE";
}

export default function QVoiceCore() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [activeLanguage, setActiveLanguage] = useState<SupportedLang>(getInitialLanguage);
  const [isPowered, setIsPowered] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const isPoweredRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
    const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isPoweredRef.current = isPowered;
  }, [isPowered]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const addLog = (message: string) => {
    setLog((current) => [
      `${new Date().toLocaleTimeString("de-CH")} — ${message}`,
      ...current,
    ].slice(0, 5));
  };

  const startListeningRef = useRef<() => void>(() => {});

    const speak = useCallback(async (text: string, lang: SupportedLang, emotion?: string) => {
      setVoiceState("speaking");
      const style = getSpeechStyle(lang, emotion);
      const _apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
      const ttsEndpoints = [
        `${_apiBase}/api/tts`,
        "http://127.0.0.1:3001/api/tts",
        "http://localhost:3001/api/tts",
      ];
      let played = false;
      for (const url of ttsEndpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: "alloy", speed: style.rate }),
          });
          if (!res.ok) continue;
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          const audio = new Audio(objectUrl);
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(objectUrl); resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
            audio.play().catch(() => { URL.revokeObjectURL(objectUrl); resolve(); });
          });
          played = true;
          break;
        } catch { /* try next endpoint */ }
      }
      audioRef.current = null;
      if (!played) {
        setLog((c) => [`${new Date().toLocaleTimeString("de-CH")} — ⚠ TTS failed`, ...c].slice(0, 5));
      }
      setVoiceState("idle");
      if (isPoweredRef.current) {
        window.setTimeout(() => startListeningRef.current(), 120);
      }
    }, []);

  const requestChat = useCallback(async (payload: { message: string; clientLanguage: SupportedLang }) => {
    const _chatBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
    const endpoints = [
      `${_chatBase}/api/chat`,
      "http://127.0.0.1:3001/api/chat",
      "http://localhost:3001/api/chat",
    ];

    let lastError: Error | null = null;
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status} @ ${endpoint}`);
        const data = await res.json();
        addLog(`🌐 connected: ${endpoint}`);
        return data;
      } catch (error: any) {
        window.clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("All endpoints failed");
  }, []);

  const sendToBackend = useCallback(async (text: string) => {
    setVoiceState("thinking");
    addLog(`🎤 ${text.slice(0, 72)}`);

    try {
      const data = await requestChat({
        message: text,
        clientLanguage: activeLanguage,
      });
      const reply = data.text || data.reply || "OK";
      const replyLanguage = detectLanguage(reply);

      setActiveLanguage(replyLanguage);
      setResponse(reply);
      addLog(`🤖 ${reply.slice(0, 72)}`);
      speak(reply, replyLanguage, data.emotion);
    } catch (error: any) {
      const fallback = activeLanguage === "fa-IR"
        ? "ارتباط با سرور برقرار نشد. دوباره تلاش کنید."
        : activeLanguage === "tr-TR"
          ? "Sunucuya bağlanılamadı. Lütfen tekrar deneyin."
          : activeLanguage === "en-US"
            ? "The server is unavailable. Please try again."
            : "Verbindung zum Server fehlgeschlagen. Bitte erneut versuchen.";

      addLog(`⚠ ${error.message}`);
      setResponse(fallback);
      speak(fallback, activeLanguage, "serious");
    }
  }, [activeLanguage, requestChat, speak]);

  const startListening = useCallback(() => {
    if (!isPoweredRef.current) return;
    if (voiceStateRef.current === "listening" || voiceStateRef.current === "thinking" || voiceStateRef.current === "speaking") return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
        // MediaRecorder fallback — uses Whisper STT on backend
        setVoiceState("listening");
        setTranscript("");
        setResponse("");
        addLog(`🎙 recording (Whisper): ${activeLanguage}`);
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks, { type: mimeType });
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
              reader.readAsDataURL(blob);
            });
            setVoiceState("thinking");
            const langCode = activeLanguage.split("-")[0];
            const _trBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
            const transcribeEndpoints = [
              `${_trBase}/api/transcribe`,
              "http://127.0.0.1:3001/api/transcribe",
              "http://localhost:3001/api/transcribe",
            ];
            let transcriptText = "";
            for (const ep of transcribeEndpoints) {
              try {
                const r = await fetch(ep, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioBase64: base64, mimeType, language: langCode }),
                });
                if (!r.ok) continue;
                const d = await r.json();
                transcriptText = String(d.text ?? "").trim();
                if (transcriptText) break;
              } catch { /* try next */ }
            }
            if (transcriptText) {
              setTranscript(transcriptText);
              setActiveLanguage(detectLanguage(transcriptText));
              sendToBackend(transcriptText);
            } else {
              addLog("⚠ no speech detected");
              setVoiceState("idle");
            }
          };
          recorder.start();
          recognitionRef.current = recorder;
          // auto-stop after 8 s of recording
          window.setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
          }, 8000);
        }).catch((err) => {
          addLog(`⚠ mic: ${err.message}`);
          setVoiceState("idle");
        });
        return;
      }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = activeLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setVoiceState("listening");
      setTranscript("");
      setResponse("");
      addLog(`🟢 listening: ${activeLanguage}`);
    };

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      const transcriptLanguage = detectLanguage(text || "");
      if (text) {
        setTranscript(text);
        setActiveLanguage(transcriptLanguage);
        sendToBackend(text);
      }
    };

    recognition.onerror = (event: any) => {
      addLog(`⚠ ${event.error}`);
      setVoiceState("idle");
    };

    recognition.onend = () => {
      setVoiceState((current) => current === "listening" ? "idle" : current);
      if (isPoweredRef.current) {
        window.setTimeout(() => {
          if (voiceStateRef.current === "idle") startListeningRef.current();
        }, 220);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [activeLanguage, sendToBackend]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stop = useCallback(() => {
    setIsPowered(false);
    isPoweredRef.current = false;
      if (recognitionRef.current?.stop) recognitionRef.current.stop();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setVoiceState("idle");
    addLog("⏹ power off");
  }, []);

  const powerOn = useCallback(() => {
    setIsPowered(true);
    isPoweredRef.current = true;
    addLog("⚡ power on");
    window.setTimeout(() => startListeningRef.current(), 80);
  }, []);

  const togglePower = useCallback(() => {
    if (isPoweredRef.current) {
      stop();
      return;
    }
    powerOn();
  }, [powerOn, stop]);

  const handleLogoClick = () => {
    if (!isPowered) {
      powerOn();
      return;
    }
    if (voiceState === "thinking") return;
    if (voiceState === "speaking") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setVoiceState("idle");
      window.setTimeout(() => startListeningRef.current(), 120);
      return;
    }
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      setVoiceState("idle");
      return;
    }
    startListeningRef.current();
  };

  const statusText = !isPowered
    ? (activeLanguage === "fa-IR" ? "دکمه روشن را بزنید" : activeLanguage === "tr-TR" ? "Açma düğmesine basın" : activeLanguage === "en-US" ? "Turn power on" : "Power einschalten")
    : voiceState === "idle"
      ? getIdleLabel(activeLanguage)
    : voiceState === "listening"
      ? "Q is listening..."
      : voiceState === "thinking"
        ? "Q is thinking..."
        : "Q is speaking...";

  const pulseColor = voiceState === "listening"
    ? "rgba(220,38,38,0.55)"
    : voiceState === "thinking"
      ? "rgba(59,130,246,0.45)"
      : voiceState === "speaking"
        ? "rgba(16,185,129,0.45)"
        : "rgba(255,255,255,0.08)";

  const isActive = voiceState === "listening" || voiceState === "speaking";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#050505",
        color: "white",
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <rect width="20" height="20" rx="2" fill="#D52B1E" />
          <rect x="8.5" y="3" width="3" height="14" fill="white" />
          <rect x="3" y="8.5" width="14" height="3" fill="white" />
        </svg>
      </div>

      <button
        onClick={togglePower}
        style={{
          position: "absolute",
          top: 16,
          right: 18,
          border: `1px solid ${isPowered ? "rgba(16,185,129,0.65)" : "rgba(255,255,255,0.22)"}`,
          color: isPowered ? "#34d399" : "rgba(255,255,255,0.65)",
          background: "rgba(0,0,0,0.45)",
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 11,
          letterSpacing: "0.06em",
          cursor: "pointer",
          textTransform: "uppercase",
        }}
      >
        {isPowered ? "On" : "Off"}
      </button>

      <div
        style={{
          position: "relative",
          width: 300,
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: `${index * 18}px`,
              borderRadius: "50%",
              border: `1px solid ${pulseColor}`,
              opacity: isActive ? 0.9 - index * 0.2 : 0.18 - index * 0.04,
              transform: isActive ? `scale(${1 + index * 0.08})` : "scale(1)",
              transition: "transform 0.4s ease, opacity 0.4s ease, border-color 0.4s ease",
            }}
          />
        ))}

        <button
          onClick={handleLogoClick}
          disabled={voiceState === "thinking"}
          aria-label="Start Q voice"
          style={{
            width: 240,
            height: 240,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: voiceState === "thinking" ? "wait" : "pointer",
            transform: voiceState === "listening" ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.2s ease, filter 0.35s ease",
            filter: isActive
              ? `drop-shadow(0 0 28px ${pulseColor})`
              : "drop-shadow(0 0 18px rgba(255,255,255,0.12))",
          }}
        >
          <img
            src="/q-logo-mark.svg"
            alt="Q logo"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </button>
      </div>

      <div style={{ marginTop: 12, textAlign: "center", maxWidth: 420, padding: "0 20px" }}>
        <div style={{ fontSize: 13, letterSpacing: "0.08em", color: "rgba(255,255,255,0.44)" }}>
          {statusText}
        </div>
        {transcript && (
          <div
            style={{
              marginTop: 14,
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {transcript}
          </div>
        )}
        {response && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 18px",
              borderRadius: 18,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.78)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {response}
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: 420,
            maxWidth: "92vw",
          }}
        >
          {log.map((entry, index) => (
            <div
              key={index}
              style={{
                color: "rgba(255,255,255,0.18)",
                fontFamily: "monospace",
                fontSize: 10,
                lineHeight: 1.7,
                textAlign: "center",
              }}
            >
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

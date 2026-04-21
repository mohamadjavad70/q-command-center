import { useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

/**
 * VoiceCommand — Sovereign Voice FAB
 * Uses Web Speech API (free, browser-native) for STT/TTS.
 * Dispatches 'NOOR_COMMAND' CustomEvent for other components to listen to.
 */
export default function VoiceCommand() {
  const [active, setActive] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fa-IR";
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("مرورگر شما از تشخیص صدا پشتیبانی نمی‌کند.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setActive(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setLastTranscript(transcript);

      // Dispatch global event for other components
      window.dispatchEvent(new CustomEvent("NOOR_COMMAND", { detail: transcript }));

      // Voice confirmation
      speak(`فرمانده، دستور "${transcript}" دریافت شد.`);
    };

    recognition.onerror = () => {
      setActive(false);
      speak("خطا در تشخیص صدا. لطفاً دوباره تلاش کنید.");
    };

    recognition.onend = () => setActive(false);
    recognition.start();
  }, [speak]);

  return (
    <>
      <button
        onClick={startListening}
        className={`fixed bottom-8 right-8 z-[200] h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
          active
            ? "bg-primary scale-110 glow-gold"
            : "bg-card border border-primary/30 hover:border-primary/60 hover:scale-105"
        }`}
        title={active ? "در حال شنیدن..." : "فرمان صوتی"}
      >
        {active ? (
          <MicOff className="h-6 w-6 text-primary-foreground animate-pulse" />
        ) : (
          <Mic className="h-6 w-6 text-primary" />
        )}
      </button>

      {/* Transcript tooltip */}
      {lastTranscript && (
        <div className="fixed bottom-24 right-8 z-[200] max-w-[240px] bg-card border border-border rounded-lg px-3 py-2 text-[10px] text-muted-foreground font-mono shadow-lg">
          <span className="text-primary">آخرین فرمان:</span> {lastTranscript}
        </div>
      )}
    </>
  );
}

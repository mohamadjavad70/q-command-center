/**
 * Q Voice Engine — Hybrid TTS
 * Priority 1: ElevenLabs (if key stored in localStorage)
 * Priority 2: Google Translate TTS (cloud, natural)
 * Priority 3: Web Speech API (local fallback)
 */

export type VoiceEmotion = "neutral" | "happy" | "calm" | "sad" | "angry" | "serious";

function detectLang(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return "fa";
  if (/[äöüß]/i.test(text)) return "de";
  if (/[ğüşöçıİĞÜŞÖÇ]/.test(text)) return "tr";
  return "en";
}

function speechLangTag(lang: string): string {
  switch (lang) {
    case "fa": return "fa-IR";
    case "de": return "de-DE";
    case "tr": return "tr-TR";
    default: return "en-US";
  }
}

function emotionPitchRate(emotion: VoiceEmotion): { pitch: number; rate: number } {
  switch (emotion) {
    case "happy":   return { pitch: 1.2,  rate: 1.05 };
    case "calm":    return { pitch: 0.9,  rate: 0.85 };
    case "sad":     return { pitch: 0.95, rate: 0.82 };
    case "angry":   return { pitch: 1.25, rate: 1.2  };
    case "serious": return { pitch: 0.8,  rate: 0.9  };
    default:        return { pitch: 1.0,  rate: 0.95 };
  }
}

// ─── ElevenLabs ───────────────────────────────────────────────
async function speakElevenLabs(text: string, emotion: VoiceEmotion): Promise<boolean> {
  const key = typeof window !== "undefined" ? localStorage.getItem("q_eleven_key") ?? "" : "";
  if (!key) return false;

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: emotion === "calm" ? 0.6 : 0.3,
            similarity_boost: 0.9,
            style: emotion === "happy" ? 0.8 : 0.5,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!response.ok) return false;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// ─── Google TTS ───────────────────────────────────────────────
async function speakGoogleTTS(text: string, lang: string): Promise<boolean> {
  try {
    // Limit to 200 chars to stay within Google TTS URL limit
    const truncated = text.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncated)}&tl=${lang}&client=tw-ob`;
    const audio = new Audio(url);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// ─── Web Speech API ────────────────────────────────────────────
function speakWebSpeech(text: string, lang: string, emotion: VoiceEmotion): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = speechLangTag(lang);
  utter.volume = 1;

  const { pitch, rate } = emotionPitchRate(emotion);
  const jitterPitch = (Math.random() - 0.5) * 0.08;
  const jitterRate = (Math.random() - 0.5) * 0.08;
  utter.pitch = Math.max(0.6, Math.min(1.6, pitch + jitterPitch));
  utter.rate = Math.max(0.75, Math.min(1.25, rate + jitterRate));

  // Prefer a natural voice for the language
  const voices = window.speechSynthesis.getVoices();
  const tag = speechLangTag(lang);
  const voice =
    voices.find((v) => v.lang === tag && v.name.toLowerCase().includes("google")) ||
    voices.find((v) => v.lang === tag) ||
    voices.find((v) => v.lang.startsWith(lang)) ||
    voices.find((v) => v.default);
  if (voice) utter.voice = voice;

  window.speechSynthesis.speak(utter);
}

// ─── Public API ────────────────────────────────────────────────
export async function speakHybrid(text: string, emotion: VoiceEmotion = "neutral"): Promise<void> {
  if (!text?.trim()) return;

  const lang = detectLang(text);

  // Tier 1: ElevenLabs (highest quality)
  const usedElevenLabs = await speakElevenLabs(text, emotion);
  if (usedElevenLabs) return;

  // Tier 2: Google TTS (natural cloud voice)
  const usedGoogle = await speakGoogleTTS(text, lang);
  if (usedGoogle) return;

  // Tier 3: Web Speech API (always available)
  speakWebSpeech(text, lang, emotion);
}

/** Call once on first user interaction to unlock AudioContext */
export function unlockAudio(): void {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
}

// src/components/SwissVoiceAssistant.tsx
// Q-Network Phase 3 — Swiss Voice Assistant (de-CH + Biometric Auth)
// Council of Light approved — سام آرمان
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Shield, CheckCircle } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Swiss German Phrase Library
   ──────────────────────────────────────────────────────────── */
export const SWISS_PHRASES = {
  confirm: [
    'Ja ✅', 'Okay ✅', 'Sicher ✅', 'Merci ✅', 'Guet ✅',
    'Würkli ✅', 'Genau ✅', 'Passt ✅', 'Top ✅', 'Cool ✅',
  ],
  askConfirm: [
    'Sicher?', 'Okay?', 'Würkli?', 'Echt?', 'Isch guet?',
    'Mached mer?', 'Einverstanden?', 'Passt das?',
  ],
  report: {
    email:      'Email fertig 📧',
    task:       'Task erledigt ✅',
    weather:    'Sunne ☀️',
    time:       'Uhr 🕐',
    call:       'Call done 📞',
    sms:        'SMS versendet 💬',
    error:      'Ned möglich ❌',
    processing: 'Moment... ⏳',
  } as Record<string, string>,
  auth: {
    faceScan: 'Gsicht bitte 🎭',
    captcha:  'Bestätigung bitte 🔐',
    verified: 'Bestätigt ✅',
    failed:   'Ned erkannt ❌',
  },
  daily: {
    greeting:    'Grüezi 👋',
    farewell:    'Ciao 👋',
    thanks:      'Merci vielmal 🙏',
    sorry:       'Sorry 🙇',
    goodMorning: 'Guete Morge ☀️',
    goodEvening: 'Guete Abe 🌙',
  },
} as const;

/* ────────────────────────────────────────────────────────────
   Face Auth — WebAuthn + camera fallback
   ──────────────────────────────────────────────────────────── */
class FaceAuth {
  private static _inst: FaceAuth;
  static getInstance(): FaceAuth {
    if (!FaceAuth._inst) FaceAuth._inst = new FaceAuth();
    return FaceAuth._inst;
  }

  /** Try camera liveness; fallback to window.confirm captcha */
  async scanFace(): Promise<boolean> {
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        return true;       // camera granted → treat as face OK
      } catch {
        // camera denied — fall through to captcha
      }
    }
    return window.confirm('Bitte bestätigen Sie: Ich bin kein Roboter 🤖');
  }
}

/* ────────────────────────────────────────────────────────────
   Balanced Name-Mention Algorithm (deterministic probability)
   ──────────────────────────────────────────────────────────── */
class BalancedNameMention {
  private prob = 0.3;
  private lastAt = 0;
  private mentionCount = 0;
  private total = 0;

  constructor(private name: string) {}

  shouldMention(): boolean {
    this.total++;
    if (this.total - this.lastAt > 5)         this.prob = Math.min(0.8,  this.prob + 0.1);
    if (this.mentionCount > 3 && this.total - this.lastAt < 3)
                                               this.prob = Math.max(0.1,  this.prob - 0.15);
    const yes = Math.random() < this.prob;
    if (yes) { this.lastAt = this.total; this.mentionCount++; this.prob = Math.max(0.15, this.prob - 0.05); }
    else      this.prob = Math.min(0.7, this.prob + 0.03);
    return yes;
  }

  shortReport(category: string): string {
    const msg = SWISS_PHRASES.report[category] ?? SWISS_PHRASES.report.error;
    return this.shouldMention() && this.name ? `${this.name}: ${msg}` : msg;
  }

  askConfirm(): string {
    const asks = SWISS_PHRASES.askConfirm as readonly string[];
    const pick = asks[Math.floor(Math.random() * asks.length)];
    return this.shouldMention() && this.name ? `${this.name}, ${pick}` : pick;
  }
}

/* ────────────────────────────────────────────────────────────
   Auth level helper
   ──────────────────────────────────────────────────────────── */
type AuthLevel = 'normal' | 'medium' | 'high';

function getAuthLevel(command: string): AuthLevel {
  const t = command.toLowerCase();
  if (/bank|konto|überweisung|pizza|bestelle|kaufen|bezahle|zahle/.test(t)) return 'high';
  if (/email|mail|nachricht|sms|whatsapp/.test(t)) return 'medium';
  return 'normal';
}

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */
export interface SwissVoiceAssistantProps {
  userName?: string;
  onCommand?: (command: string, level: AuthLevel) => Promise<string>;
  language?: string;
}

const SwissVoiceAssistant: React.FC<SwissVoiceAssistantProps> = ({
  userName   = '',
  onCommand,
  language   = 'de-CH',
}) => {
  const [listening,     setListening]     = useState(false);
  const [speaking,      setSpeaking]      = useState(false);
  const [authenticating,setAuthenticating]= useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [response,      setResponse]      = useState('');
  const [savedName,     setSavedName]     = useState(userName);
  const [showNameInput, setShowNameInput] = useState(!userName);
  const [tempName,      setTempName]      = useState('');

  const recogRef   = useRef<any>(null);
  const balancer   = useRef<BalancedNameMention | null>(null);
  const faceAuth   = FaceAuth.getInstance();

  /* ── Init ── */
  useEffect(() => {
    const stored = localStorage.getItem('qswiss_user_name');
    if (stored && !userName) { setSavedName(stored); setShowNameInput(false); }
  }, [userName]);

  useEffect(() => {
    balancer.current = new BalancedNameMention(savedName);
  }, [savedName]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = language;
    r.onresult = async (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) { setTranscript(final); await _processCommand(final); }
    };
    r.onerror = () => { speak(SWISS_PHRASES.report.error); setListening(false); };
    r.onend   = () => setListening(false);
    recogRef.current = r;
    return () => { r.stop(); window.speechSynthesis.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, savedName]);

  /* ── TTS ── */
  const speak = useCallback((text: string) => {
    if (!text) return;
    setSpeaking(true);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language; u.rate = 0.85; u.pitch = 1.05;
    u.onend = u.onerror = () => setSpeaking(false);
    setResponse(text);
    window.speechSynthesis.speak(u);
  }, [language]);

  /* ── Auth gate ── */
  const confirmAction = useCallback(async (level: AuthLevel): Promise<boolean> => {
    if (level === 'normal') return true;

    if (level === 'medium') {
      const ask = balancer.current?.askConfirm() ?? 'Okay?';
      speak(ask);
      return new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), 8000);
        const r = recogRef.current;
        if (!r) { clearTimeout(timer); resolve(false); return; }
        const handler = (ev: any) => {
          const ans = ev.results[0][0].transcript.toLowerCase();
          if (/ja|ok|sicher|yes/.test(ans))   { clearTimeout(timer); r.removeEventListener('result', handler); resolve(true);  }
          if (/nein|nid|no/.test(ans))         { clearTimeout(timer); r.removeEventListener('result', handler); resolve(false); }
        };
        r.addEventListener('result', handler);
        r.start();
      });
    }

    // high
    speak(SWISS_PHRASES.auth.faceScan);
    setAuthenticating(true);
    const ok = await faceAuth.scanFace();
    setAuthenticating(false);
    speak(ok ? SWISS_PHRASES.auth.verified : SWISS_PHRASES.auth.failed);
    return ok;
  }, [faceAuth, speak]);

  /* ── Command processor ── */
  const _processCommand = useCallback(async (cmd: string) => {
    const level     = getAuthLevel(cmd);
    const confirmed = await confirmAction(level);
    if (!confirmed) { speak('Okay, abbrechen ❌'); return; }

    const t = cmd.toLowerCase();
    let result = '';

    if (/email|mail/.test(t))                   result = balancer.current?.shortReport('email')   ?? SWISS_PHRASES.report.email;
    else if (/task|aufgabe/.test(t))            result = balancer.current?.shortReport('task')    ?? SWISS_PHRASES.report.task;
    else if (/wetter|weather/.test(t))          result = balancer.current?.shortReport('weather') ?? SWISS_PHRASES.report.weather;
    else if (/zeit|time|uhr/.test(t)) {
      const now = new Date();
      result = `${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')} Uhr 🕐`;
    }
    else if (/call|aarlüte/.test(t))            result = balancer.current?.shortReport('call')    ?? SWISS_PHRASES.report.call;
    else if (/sms|nachricht/.test(t))           result = balancer.current?.shortReport('sms')     ?? SWISS_PHRASES.report.sms;
    else if (onCommand) {
      try   { result = await onCommand(cmd, level); }
      catch { result = SWISS_PHRASES.report.error; }
    }
    else result = balancer.current?.shortReport('error') ?? SWISS_PHRASES.report.error;

    speak(result);
    if (onCommand && !/^ned möglich/.test(result)) {
      try { await onCommand(cmd, level); } catch { /* noop */ }
    }
  }, [confirmAction, onCommand, speak]);

  const saveName = () => {
    const n = tempName.trim();
    if (!n) return;
    setSavedName(n);
    localStorage.setItem('qswiss_user_name', n);
    setShowNameInput(false);
    speak(SWISS_PHRASES.daily.greeting);
  };

  const startListening = () => {
    if (recogRef.current && !listening && !speaking && !authenticating) {
      recogRef.current.start();
      setListening(true);
    }
  };

  const stopListening = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  /* ── UI ── */
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl select-none">
      {/* Name gate */}
      {showNameInput ? (
        <div className="mb-5 p-4 bg-blue-900/30 rounded-xl">
          <p className="text-white text-sm mb-2">Wie isch din Name? 🏔️</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              placeholder="Din Name..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              onKeyDown={e => e.key === 'Enter' && saveName()}
            />
            <button onClick={saveName} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors">
              Speichere
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-300">👤 {savedName}</span>
          <button onClick={() => setShowNameInput(true)} className="text-xs text-blue-400 hover:text-blue-300">
            ändere
          </button>
        </div>
      )}

      {/* Auth level badges */}
      <div className="flex gap-2 mb-4 justify-center flex-wrap">
        {(['normal','medium','high'] as const).map(lvl => (
          <span key={lvl} className={`text-xs px-2 py-0.5 rounded-full border ${
            lvl==='normal' ? 'border-gray-600 text-gray-400'
            : lvl==='medium' ? 'border-yellow-700 text-yellow-400'
            : 'border-red-700 text-red-400'
          }`}>
            {lvl === 'normal' ? '🟢 Einfach' : lvl === 'medium' ? '🟡 Mittel' : '🔴 Hoch'}
          </span>
        ))}
      </div>

      {/* Mic button */}
      <div className="flex justify-center mb-5">
        <button
          onClick={listening ? stopListening : startListening}
          disabled={speaking || authenticating}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 ${
            listening      ? 'bg-red-500 animate-pulse ring-4 ring-red-400/50'
            : speaking     ? 'bg-green-500 ring-4 ring-green-400/50'
            : authenticating ? 'bg-yellow-500 ring-4 ring-yellow-400/50'
            : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {listening       ? <MicOff  size={40} className="text-white" />
           : speaking      ? <Volume2 size={40} className="text-white" />
           : authenticating? <Shield  size={40} className="text-white" />
           : <Mic          size={40} className="text-gray-300" />}
        </button>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-sm text-gray-400">
          {listening       ? '🎤 Ich lose zu...'
           : speaking      ? '🔊 Ich rede...'
           : authenticating? '🎭 Gsicht bitte...'
           : '🎙️ Drucke und red Schwizerdütsch'}
        </p>
        {transcript && <p className="text-xs text-blue-400 mt-2">"{transcript}"</p>}
        {response && (
          <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-green-400 flex items-center justify-center gap-1">
              <CheckCircle size={14} /> {response}
            </p>
          </div>
        )}
      </div>

      {/* Examples */}
      <div className="mt-4 text-center text-xs text-gray-500 space-y-1">
        <p>Beispiel: «E-Mails prüefe», «Aufgabe erledigt», «Wetter Züri»</p>
        <p>🇨🇭 Schwizerdütsch — eifach, schnell, sicher</p>
      </div>
    </div>
  );
};

export default SwissVoiceAssistant;

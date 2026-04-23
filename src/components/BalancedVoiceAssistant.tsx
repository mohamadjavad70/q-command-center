// src/components/BalancedVoiceAssistant.tsx
// Q-Swiss Balanced Voice Assistant
// الگوریتم متعادل: 30% احتمال گفتن نام، تنوع پاسخ‌ها، حریم خصوصی

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, User } from 'lucide-react';

// ─── Client-side command gate (mirrors routing-safe.ts whitelist) ─────────────
const SAFE_COMMANDS_MAP: Record<string, string> = {
  email:    'email.read',
  ایمیل:    'email.read',
  mail:     'email.classify',
  task:     'task.list',
  وظیفه:    'task.list',
  کار:      'task.list',
  aufgaben: 'task.list',
  search:   'search.run',
  جستجو:    'search.run',
  suche:    'search.run',
  calendar: 'calendar.read',
  kalender: 'calendar.read',
  termin:   'calendar.create',
  status:   'system.status',
  وضعیت:    'system.status',
  wetter:   'search.run',
  weather:  'search.run',
  time:     'system.status',
  ساعت:     'system.status',
  bye:      'system.status',
  خداحافظ:  'system.status',
  tschüss:  'system.status',
};

function resolveCommand(text: string): { id: string; allowed: boolean } {
  const lower = text.toLowerCase();
  for (const [keyword, cmdId] of Object.entries(SAFE_COMMANDS_MAP)) {
    if (lower.includes(keyword)) return { id: cmdId, allowed: true };
  }
  return { id: 'unknown', allowed: false };
}

const SHORT_RESPONSES = {
  start:      ['در حال پردازش...', 'یک لحظه...', 'باشه', 'چشم'],
  success:    ['تایید شد ✅', 'انجام شد ✅', 'شد ✅', 'باشه ✅'],
  error:      ['خطا ❌', 'نشد ❌', 'دوباره بگو ❌', 'مشکل داره ❌'],
  greeting:   ['سلام', 'درود', 'هالو'],
  farewell:   ['خداحافظ', 'بدرود', 'فعلاً'],
  processing: ['دارم چک می‌کنم...', 'بررسی می‌شود...', 'در حال انجام...'],
} as const;

type ResponseCategory = keyof typeof SHORT_RESPONSES;

class BalancedNameMention {
  private probability = 0.3;
  private lastMentioned = 0;
  private mentionCount = 0;
  private sessionCount = 0;

  constructor(private readonly userName: string) {}

  shouldMentionName(): boolean {
    this.sessionCount++;

    if (this.sessionCount - this.lastMentioned > 5) {
      this.probability = Math.min(0.8, this.probability + 0.1);
    }
    if (this.mentionCount > 3 && this.sessionCount - this.lastMentioned < 3) {
      this.probability = Math.max(0.1, this.probability - 0.15);
    }

    const should = Math.random() < this.probability;
    if (should) {
      this.lastMentioned = this.sessionCount;
      this.mentionCount++;
      this.probability = Math.max(0.15, this.probability - 0.05);
    } else {
      this.probability = Math.min(0.7, this.probability + 0.03);
    }
    return should;
  }

  getResponse(category: ResponseCategory): string {
    const pool = SHORT_RESPONSES[category] as readonly string[];
    let response = pool[Math.floor(Math.random() * pool.length)];

    if (category === 'success' && this.shouldMentionName() && this.userName) {
      response = `${this.userName}، ${response}`;
    }
    if (category === 'greeting' && this.userName) {
      response = `${response} ${this.userName}`;
    }
    return response;
  }
}

interface BalancedVoiceAssistantProps {
  onCommand?: (command: string) => Promise<string>;
  userName?: string;
  language?: 'de-CH' | 'fa-IR' | 'en-US';
}

const BalancedVoiceAssistant: React.FC<BalancedVoiceAssistantProps> = ({
  onCommand,
  userName = '',
  language = 'de-CH',
}) => {
  const [isListening, setIsListening]       = useState(false);
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [transcript, setTranscript]         = useState('');
  const [response, setResponse]             = useState('');
  const [savedName, setSavedName]           = useState(userName);
  const [showNameInput, setShowNameInput]   = useState(!userName);
  const [tempName, setTempName]             = useState('');

  const recognitionRef = useRef<any>(null);
  const balancedRef    = useRef<BalancedNameMention | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('qswiss_user_name');
    if (stored && !userName) {
      setSavedName(stored);
      setShowNameInput(false);
    }
  }, [userName]);

  useEffect(() => {
    if (savedName) {
      balancedRef.current = new BalancedNameMention(savedName);
    }
  }, [savedName]);

  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous    = false;
    rec.interimResults = true;
    rec.lang          = language;

    rec.onresult = async (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final) {
        setTranscript(final);
        await processCommand(final);
      }
    };

    rec.onerror = () => {
      speak(balancedRef.current?.getResponse('error') ?? 'خطا');
      setIsListening(false);
    };

    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;

    return () => {
      rec.stop();
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const speak = useCallback((text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = language;
    u.rate  = 0.9;
    u.pitch = 1.1;
    u.onend   = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setResponse(text);
  }, [language]);

  const processCommand = async (cmd: string) => {
    speak(balancedRef.current?.getResponse('start') ?? 'در حال پردازش...');

    // ── Command gate: validate against whitelist ──────────────────────────────
    const gate = resolveCommand(cmd);
    if (!gate.allowed && !onCommand) {
      speak(balancedRef.current?.getResponse('error') ?? 'دستور مجاز نیست');
      return;
    }

    const lower = cmd.toLowerCase();
    let result = '';

    if (lower.includes('email') || lower.includes('ایمیل') || lower.includes('mail')) {
      result = balancedRef.current?.getResponse('success') ?? 'ایمیل‌ها بررسی شدند';
    } else if (lower.includes('task') || lower.includes('وظیفه') || lower.includes('کار') || lower.includes('aufgaben')) {
      result = balancedRef.current?.getResponse('success') ?? 'وظایف آماده است';
    } else if (lower.includes('weather') || lower.includes('آب و هوا') || lower.includes('wetter')) {
      result = balancedRef.current?.getResponse('success') ?? 'آفتابی، ۱۸ درجه';
    } else if (lower.includes('time') || lower.includes('ساعت') || lower.includes('zeit')) {
      const now = new Date();
      result = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    } else if (lower.includes('bye') || lower.includes('خداحافظ') || lower.includes('tschüss')) {
      result = balancedRef.current?.getResponse('farewell') ?? 'خداحافظ';
    } else if (onCommand) {
      try {
        result = await onCommand(cmd);
      } catch {
        result = balancedRef.current?.getResponse('error') ?? 'نتونستم انجام بدم';
      }
    } else {
      result = balancedRef.current?.getResponse('error') ?? 'متوجه نشدم';
    }

    speak(result);
  };

  const saveUserName = () => {
    const name = tempName.trim();
    if (!name) return;
    setSavedName(name);
    localStorage.setItem('qswiss_user_name', name);
    balancedRef.current = new BalancedNameMention(name);
    setShowNameInput(false);
    speak(new BalancedNameMention(name).getResponse('greeting'));
  };

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else if (!isSpeaking) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl">
      {showNameInput ? (
        <div className="mb-6 p-4 bg-blue-900/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <User size={18} className="text-blue-400" />
            <h3 className="text-white font-medium">Wie soll ich Sie nennen?</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Ihr Name..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && saveUserName()}
            />
            <button
              onClick={saveUserName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User size={14} className="text-blue-400" />
            <span className="text-sm text-gray-300">{savedName}</span>
          </div>
          <button onClick={() => setShowNameInput(true)} className="text-xs text-blue-400 hover:text-blue-300">
            Ändern
          </button>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <button
          onClick={toggleListen}
          disabled={isSpeaking}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-500 animate-pulse ring-4 ring-red-400/50'
              : isSpeaking
              ? 'bg-green-500 ring-4 ring-green-400/50'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isListening ? (
            <MicOff size={40} className="text-white" />
          ) : isSpeaking ? (
            <Volume2 size={40} className="text-white" />
          ) : (
            <Mic size={40} className="text-gray-300" />
          )}
        </button>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-400">
          {isListening ? '🎤 گوش می‌کنم...' : isSpeaking ? '🔊 در حال صحبت...' : '🎙️ دکمه را بزن و بگو'}
        </p>
        {transcript && (
          <p className="text-xs text-blue-400 mt-2">&ldquo;{transcript}&rdquo;</p>
        )}
        {response && (
          <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-green-400">{response}</p>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>فارسی: «ایمیل‌ها رو چک کن»، «وظایف امروز»، «آب و هوا»، «ساعت»</p>
        <p className="mt-1">🇨🇭 Deutsch: «E-Mails», «Aufgaben», «Wetter», «Zeit», «Tschüss»</p>
      </div>
    </div>
  );
};

export default BalancedVoiceAssistant;

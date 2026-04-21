// src/pages/QSwissVoiceAgent.tsx
// Q-Swiss Voice Agent — دستیار صوتی هوشمند برای مردم سوئیس
// شورای نور: جابز (سادگی) + یونگ (اعتماد) + سام آرمان (اجرا)
// Swiss Minimal Principle: کم حرف می‌زند، زیاد انجام می‌دهد

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Mail, Calendar, CheckCircle, Clock, Shield,
  Sparkles, Play, Zap, X, ChevronRight, Lock, Globe,
} from 'lucide-react';
import BalancedVoiceAssistant from '../components/BalancedVoiceAssistant';
import SwissVoiceAssistant from '../components/SwissVoiceAssistant';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Email {
  id: string;
  from: string;
  subject: string;
  isPersonal: boolean;
  isSpam: boolean;
  needsReply: boolean;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

type ResponseMode = 'silent' | 'minimal' | 'humanized';

// ─── Response Policy (Swiss Minimal Voice Personality) ───────────────────────
// 50% silent execution | 40% minimal response | 10% humanized

const MINIMAL_RESPONSES: Record<string, string> = {
  email:    'Verarbeitung',
  reply:    'Genehmigt',
  spam:     'Blockiert',
  calendar: 'Geladen',
  complete: 'Erledigt',
  summary:  'Bereit',
  default:  'Verarbeitung',
};

const HUMANIZED_RESPONSES: Record<string, string> = {
  email:    'Ihre E-Mails werden analysiert.',
  reply:    'Automatische Antworten wurden gesendet.',
  spam:     'Spam erkannt und blockiert.',
  calendar: 'Ihr Tagesplan ist geladen.',
  complete: 'Aufgabe als erledigt markiert.',
  summary:  'Zusammenfassung ist bereit.',
  default:  'Ich habe den Befehl empfangen.',
};

function pickResponseMode(): ResponseMode {
  const r = Math.random();
  if (r < 0.5) return 'silent';
  if (r < 0.9) return 'minimal';
  return 'humanized';
}

function getResponse(key: string, mode: ResponseMode, name?: string): string | null {
  if (mode === 'silent') return null;
  const map = mode === 'humanized' ? HUMANIZED_RESPONSES : MINIMAL_RESPONSES;
  const base = map[key] ?? map.default;
  if (mode === 'humanized' && name && Math.random() < 0.3) return `${base} ${name}.`;
  return base;
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const MOCK_EMAILS: Email[] = [
  { id: '1', from: 'info@swissbank.ch',    subject: 'Kontoauszug April',          isPersonal: false, isSpam: false, needsReply: false },
  { id: '2', from: 'lisa@familie.ch',      subject: 'Wanderung am Samstag 🏔️',   isPersonal: true,  isSpam: false, needsReply: true  },
  { id: '3', from: 'noreply@linkedin.com', subject: 'Job-Alert: Software Engineer', isPersonal: false, isSpam: false, needsReply: false },
  { id: '4', from: 'security@paypal-fake.com', subject: '⚠️ Ihr Konto wurde gesperrt', isPersonal: false, isSpam: true, needsReply: false },
  { id: '5', from: 'thomas@arbeit.ch',     subject: 'Meeting morgen 10:00',        isPersonal: true,  isSpam: false, needsReply: true  },
];

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Wanderung mit Lisa planen', completed: false, priority: 'high'   },
  { id: '2', title: 'Versicherung wechseln',     completed: false, priority: 'medium' },
  { id: '3', title: 'Steuererklärung vorbereiten', completed: false, priority: 'high' },
];

const COMMANDS = [
  { label: '"Q, E-Mails prüfen"',         icon: <Mail size={12} />,      key: 'email'    },
  { label: '"Q, Auto-Antworten senden"',  icon: <CheckCircle size={12} />, key: 'reply'   },
  { label: '"Q, Termine heute"',          icon: <Calendar size={12} />,  key: 'calendar' },
  { label: '"Q, Zusammenfassung"',        icon: <Sparkles size={12} />,  key: 'summary'  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const QSwissVoiceAgent: React.FC = () => {
  const [phase, setPhase]           = useState<'gate' | 'auth' | 'voice'>('gate');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLog, setVoiceLog]     = useState<{ text: string; ts: string }[]>([]);
  const [emails, setEmails]         = useState<Email[]>(MOCK_EMAILS);
  const [tasks, setTasks]           = useState<Task[]>(MOCK_TASKS);
  const [savedMins, setSavedMins]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pulseGlow, setPulseGlow]   = useState(false);
  const [waveActive, setWaveActive] = useState(false);

  const recognRef = useRef<SpeechRecognition | null>(null);

  // Q logo pulse every 4s when idle
  useEffect(() => {
    const id = setInterval(() => setPulseGlow(p => !p), 4000);
    return () => clearInterval(id);
  }, []);

  // ── Speech Recognition setup ──
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recog: SpeechRecognition = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'de-CH';

    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) handleVoiceCommand(final);
    };
    recog.onend = () => setIsListening(false);
    recognRef.current = recog;
  }, [emails, tasks]);

  // ── TTS ──
  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-CH';
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  }, []);

  // ── Log helper ──
  const addLog = (text: string) => {
    const ts = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setVoiceLog(p => [{ text, ts }, ...p].slice(0, 8));
  };

  // ── Voice Command Processor ──
  const handleVoiceCommand = useCallback(async (cmd: string) => {
    const c = cmd.toLowerCase();
    setIsProcessing(true);
    setWaveActive(true);

    const mode = pickResponseMode();
    let key = 'default';
    let saved = 0;

    if (c.includes('email') || c.includes('e-mail') || c.includes('mail') || c.includes('ایمیل')) {
      key = 'email';
      const personal = emails.filter(e => e.isPersonal && !e.isSpam).length;
      const spam     = emails.filter(e => e.isSpam).length;
      addLog(`📧 ${personal} persönliche E-Mails | ${spam} Spam blockiert`);
      saved = 5;
    } else if (c.includes('antwort') || c.includes('reply') || c.includes('auto')) {
      key = 'reply';
      const pending = emails.filter(e => e.needsReply);
      setEmails(p => p.map(e => ({ ...e, needsReply: false })));
      addLog(`✅ ${pending.length} Auto-Antworten gesendet`);
      saved = pending.length * 3;
    } else if (c.includes('spam') || c.includes('block')) {
      key = 'spam';
      const spamCount = emails.filter(e => e.isSpam).length;
      addLog(`🚫 ${spamCount} Spam E-Mails blockiert`);
      saved = spamCount * 2;
    } else if (c.includes('termin') || c.includes('kalender') || c.includes('calendar') || c.includes('plan')) {
      key = 'calendar';
      const open = tasks.filter(t => !t.completed);
      const high = open.filter(t => t.priority === 'high').length;
      addLog(`📅 ${open.length} Aufgaben offen (${high} dringend)`);
    } else if (c.includes('erledigt') || c.includes('done') || c.includes('complete')) {
      key = 'complete';
      const first = tasks.find(t => !t.completed);
      if (first) {
        setTasks(p => p.map(t => t.id === first.id ? { ...t, completed: true } : t));
        addLog(`✅ "${first.title}" erledigt`);
        saved = 10;
      }
    } else if (c.includes('zusammenfassung') || c.includes('summary') || c.includes('bericht')) {
      key = 'summary';
      const done = tasks.filter(t => t.completed).length;
      const h = Math.floor(savedMins / 60), m = savedMins % 60;
      addLog(`📊 ${done} Aufgaben erledigt | ${h > 0 ? h + 'h ' : ''}${m}min gespart`);
    } else {
      addLog(`🎤 "${cmd.slice(0, 50)}${cmd.length > 50 ? '…' : ''}"`);
    }

    if (saved > 0) setSavedMins(p => p + saved);

    const reply = getResponse(key, mode);
    if (reply) {
      addLog(`🔊 "${reply}"`);
      speak(reply);
    }

    await new Promise(r => setTimeout(r, 600));
    setIsProcessing(false);
    setWaveActive(false);
    setTranscript('');
  }, [emails, tasks, savedMins, speak]);

  // ── Demo command trigger ──
  const runDemo = (key: string) => {
    const demos: Record<string, string> = {
      email:    'E-Mails prüfen',
      reply:    'Antworte automatisch',
      spam:     'Spam blockieren',
      calendar: 'Was ist heute geplant',
      summary:  'Zusammenfassung bitte',
    };
    handleVoiceCommand(demos[key] ?? 'summary');
  };

  const toggleListen = () => {
    if (!recognRef.current) { alert('Speech API not supported in this browser.'); return; }
    if (isListening) { recognRef.current.stop(); setIsListening(false); }
    else             { recognRef.current.start(); setIsListening(true); }
  };

  const timeSavedLabel = savedMins >= 60
    ? `${Math.floor(savedMins / 60)}h ${savedMins % 60}m`
    : `${savedMins}m`;

  // ═══════════ PHASE: GATE ═══════════
  if (phase === 'gate') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#000', fontFamily: "'Inter', system-ui" }}>
        {/* Q Logo */}
        <div className="relative flex items-center justify-center mb-12" style={{ width: 160, height: 160 }}>
          {/* Outer glow rings */}
          <div className="absolute inset-0 rounded-full transition-all duration-[2s]"
            style={{ boxShadow: pulseGlow ? '0 0 60px 20px rgba(220,38,38,0.12)' : '0 0 30px 8px rgba(220,38,38,0.06)' }} />
          <div className="absolute inset-4 rounded-full animate-spin"
            style={{ animationDuration: '12s', border: '1px solid rgba(255,255,255,0.04)' }} />
          {/* Core button */}
          <button
            onClick={() => { setPulseGlow(true); setTimeout(() => setPhase('auth'), 600); }}
            className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'radial-gradient(circle at 40% 35%, #2a2a2a, #0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' }}
          >
            <span className="text-white font-black" style={{ fontSize: 52, letterSpacing: -2, lineHeight: 1, textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>Q</span>
          </button>
        </div>

        <p className="text-white/30 text-xs tracking-[0.3em] uppercase mb-1">Q-Swiss</p>
        <p className="text-white/15 text-[10px] tracking-[0.2em] uppercase mb-16">Voice Agent</p>

        <button
          onClick={() => setPhase('auth')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs text-white/50 hover:text-white/80 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <Play size={11} /> Aktivieren
        </button>

        <p className="absolute bottom-6 text-white/15 text-[9px] tracking-widest">
          QMETARAM · SWISS EDITION · 2026
        </p>
      </div>
    );
  }

  // ═══════════ PHASE: AUTH ═══════════
  if (phase === 'auth') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#050505', fontFamily: "'Inter', system-ui" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#dc2626' }}>
              <span className="text-white font-black text-2xl">Q</span>
            </div>
            <h2 className="text-white font-semibold text-lg">Verbinden Sie sich</h2>
            <p className="text-white/40 text-xs mt-1">Ihre Daten bleiben auf Ihrem Gerät</p>
          </div>

          <div className="space-y-2 mb-4">
            {[
              { icon: '🔵', label: 'Mit Google verbinden',  sub: 'Gmail + Calendar' },
              { icon: '🍎', label: 'Mit Apple verbinden',   sub: 'iCloud Mail' },
              { icon: '🤖', label: 'Mit Android verbinden', sub: 'Google Messages' },
            ].map(opt => (
              <button key={opt.label}
                onClick={() => setPhase('voice')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl">{opt.icon}</span>
                <div className="flex-1">
                  <div className="text-white/90 text-sm font-medium">{opt.label}</div>
                  <div className="text-white/30 text-[10px]">{opt.sub}</div>
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </button>
            ))}
          </div>

          <button onClick={() => setPhase('voice')}
            className="w-full py-2.5 text-xs text-white/30 hover:text-white/50 transition-colors">
            Als Gast fortfahren (Demo)
          </button>

          <div className="flex items-center justify-center gap-4 mt-6 text-[9px] text-white/20">
            <span className="flex items-center gap-1"><Lock size={8} /> DSGVO-konform</span>
            <span className="flex items-center gap-1"><Shield size={8} /> No Cloud Storage</span>
            <span className="flex items-center gap-1"><Globe size={8} /> Swiss Privacy</span>
          </div>
        </div>

        <button onClick={() => setPhase('gate')}
          className="absolute top-4 left-4 p-2 text-white/20 hover:text-white/50">
          <X size={16} />
        </button>
      </div>
    );
  }

  // ═══════════ PHASE: VOICE ═══════════
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050505', fontFamily: "'Inter', system-ui" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#dc2626' }}>
            <span className="text-white font-black text-base">Q</span>
          </div>
          <div>
            <div className="text-white/80 text-xs font-semibold">Q-Swiss Voice</div>
            <div className="text-white/25 text-[9px]">🇨🇭 Swiss Minimal Mode</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedMins > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
              <Zap size={9} /> {timeSavedLabel} gespart
            </div>
          )}
          <div className="flex items-center gap-1 text-[9px] text-white/25">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>
      </header>

      {/* Voice Orb */}
      <div className="flex flex-col items-center justify-center py-10">
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          {/* Wave rings (active) */}
          {waveActive && [0, 1, 2].map(i => (
            <div key={i} className="absolute inset-0 rounded-full animate-ping"
              style={{ border: '1px solid rgba(220,38,38,0.3)', animationDuration: `${1 + i * 0.4}s`, animationDelay: `${i * 0.2}s`, opacity: 1 - i * 0.3 }} />
          ))}
          {/* Mic button */}
          <button
            onClick={toggleListen}
            className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: isListening
                ? 'radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)'
                : 'radial-gradient(circle at 40% 35%, #2a2a2a, #111)',
              border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: isListening
                ? '0 0 40px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,100,100,0.2)'
                : '0 0 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
            {isListening
              ? <MicOff size={28} className="text-white" />
              : <Mic    size={28} className="text-white/70" />
            }
          </button>
        </div>

        <p className="text-white/30 text-xs mt-4 tracking-wider">
          {isListening ? '🔴 Hört zu…' : 'Tippen zum Aktivieren'}
        </p>

        {/* Transcript */}
        {transcript && (
          <div className="mt-3 px-4 py-2 rounded-full text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
            "{transcript}"
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex gap-1.5 mt-3 items-center">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-red-500 animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }} />
            ))}
            <span className="text-white/30 text-[10px] ml-1">Verarbeitung…</span>
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="px-5 mb-5">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">Schnellbefehle</p>
        <div className="grid grid-cols-2 gap-2">
          {COMMANDS.map(cmd => (
            <button key={cmd.key} onClick={() => runDemo(cmd.key)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-white/40">{cmd.icon}</span>
              <span className="text-white/50 text-[10px]">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Log */}
      <div className="flex-1 px-5 pb-5">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">Protokoll</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {voiceLog.length === 0 ? (
            <div className="py-8 text-center text-white/15 text-xs">
              Noch keine Aktionen — Sagen Sie "Q, E-Mails prüfen"
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {voiceLog.map((log, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-white/60 text-xs">{log.text}</span>
                  <span className="text-white/20 text-[9px] font-mono flex-shrink-0 ml-3">{log.ts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Balanced Voice Assistant — متعادل و هوشمند */}
      <div className="px-5 mb-4">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">KI-Assistent (Balanced)</p>
        <BalancedVoiceAssistant
          language="de-CH"
          onCommand={async (cmd) => {
            await handleVoiceCommand(cmd);
            return 'Erledigt';
          }}
        />
      </div>

      {/* Swiss Voice Assistant — Phase 3 (Swiss phrases + biometric auth) */}
      <div className="px-5 mb-4">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">Swiss Voice (Phase 3)</p>
        <SwissVoiceAssistant
          language="de-CH"
          onCommand={async (cmd, level) => {
            await handleVoiceCommand(cmd);
            return level === 'high' ? 'Bestätigt & ausgeführt ✅' : 'Erledigt ✅';
          }}
        />
      </div>

      {/* Stats Footer */}
      <div className="px-5 pb-6 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'E-Mails', value: emails.filter(e => !e.isSpam).length, icon: <Mail size={12}/>, color: '#60a5fa' },
          { label: 'Spam blockiert', value: emails.filter(e => e.isSpam).length, icon: <Shield size={12}/>, color: '#f87171' },
          { label: 'Aufgaben', value: tasks.filter(t => !t.completed).length, icon: <Calendar size={12}/>, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
            <div className="font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
            <div className="text-white/25 text-[9px]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="px-5 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3 text-[9px] text-white/15">
          <span>🔒 Lokal</span>
          <span>⚡ Offline</span>
          <span>🇨🇭 Swiss</span>
        </div>
        <button onClick={() => setPhase('gate')} className="text-white/15 text-[9px] hover:text-white/30 transition-colors">
          <Clock size={11} className="inline mr-1" />
          <span>{timeSavedLabel} heute gespart</span>
        </button>
      </div>
    </div>
  );
};

export default QSwissVoiceAgent;

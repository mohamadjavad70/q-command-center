// src/pages/QSwissVoiceAgent.tsx
// Q-Swiss Voice Agent — دستیار صوتی هوشمند برای مردم سوئیس
// شورای نور: جابز (سادگی) + یونگ (اعتماد) + سام آرمان (اجرا)
// Swiss Minimal Principle: کم حرف می‌زند، زیاد انجام می‌دهد

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail, Calendar, CheckCircle, Clock, Shield,
  Sparkles, Play, Zap, X, ChevronRight, Lock, Globe, Power,
} from 'lucide-react';

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
type VoiceEngine = 'realtime' | 'pipeline';
type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

type RealtimeSessionPayload = {
  client_secret?: { value?: string };
  endpoint?: string;
};

function isAuthErrorReason(reason: string): boolean {
  return /\b401\b|invalid_api_key|incorrect api key|unauthorized|authentication/i.test(reason);
}

const Q_REALTIME_INSTRUCTIONS = [
  'You are Q Swiss Voice.',
  'Speak short, precise, and calm.',
  'Use German by default unless the user clearly switches language.',
  'Allow barge-in and keep responses natural.',
].join(' ');

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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(true);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('pipeline');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [voiceLog, setVoiceLog]     = useState<{ text: string; ts: string }[]>([]);
  const [emails, setEmails]         = useState<Email[]>(MOCK_EMAILS);
  const [tasks, setTasks]           = useState<Task[]>(MOCK_TASKS);
  const [savedMins, setSavedMins]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pulseGlow, setPulseGlow]   = useState(false);
  const [waveActive, setWaveActive] = useState(false);

  const recognRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDataChannelRef = useRef<RTCDataChannel | null>(null);
  const realtimeLocalStreamRef = useRef<MediaStream | null>(null);
  const realtimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<VoiceEngine>('pipeline');
  const isVoiceEnabledRef = useRef(false);
  const realtimeRetryCountRef = useRef(0);
  const realtimeReconnectTimerRef = useRef<number | null>(null);
  const realtimeHeartbeatRef = useRef<number | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const realtimeManualStopRef = useRef(false);

  // Q logo pulse every 4s when idle
  useEffect(() => {
    const id = setInterval(() => setPulseGlow(p => !p), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    engineRef.current = voiceEngine;
  }, [voiceEngine]);

  useEffect(() => {
    isVoiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);

  // ── Speech Recognition setup ──
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupportsSpeechRecognition(false);
      return;
    }

    setSupportsSpeechRecognition(true);

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

    recog.onerror = () => {
      setIsListening(false);
      if (isVoiceEnabled && engineRef.current === 'pipeline') addLog('⚠ Speech recognition temporary error');
    };

    recog.onend = () => {
      setIsListening(false);
      if (isVoiceEnabled && supportsSpeechRecognition && engineRef.current === 'pipeline') {
        setTimeout(() => {
          try { recog.start(); setIsListening(true); } catch {}
        }, 220);
      }
    };

    recognRef.current = recog;
    return () => {
      try { recog.stop(); } catch {}
    };
  }, [isVoiceEnabled, supportsSpeechRecognition, emails, tasks]);

  // ── TTS ──
  const speak = useCallback(async (text: string) => {
    if (!text) return;
    const urls = ['http://127.0.0.1:3001/api/tts', 'http://localhost:3001/api/tts', '/api/tts'];
    let ok = false;
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'alloy', speed: 1.0 }),
        });
        if (!r.ok) continue;
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        ttsAudioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(objectUrl); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
          audio.play().catch(() => { URL.revokeObjectURL(objectUrl); resolve(); });
        });
        ok = true;
        break;
      } catch {
        // try next endpoint
      }
    }
    ttsAudioRef.current = null;
    if (!ok) addLog('🔇 TTS endpoint failed');
  }, []);

  // ── Log helper ──
  const addLog = useCallback((text: string) => {
    const ts = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setVoiceLog(p => [{ text, ts }, ...p].slice(0, 8));
  }, []);

  const apiPost = useCallback(async (path: string, body: Record<string, unknown>) => {
    const _base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
    const urls = [`${_base}${path}`, `http://127.0.0.1:3001${path}`, `http://localhost:3001${path}`];
    let lastError: unknown = new Error('No endpoint reachable');
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
        return r;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }, []);

  const uploadAndTranscribe = useCallback(async (blob: Blob) => {
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    const audioBase64 = btoa(bin);

    const res = await apiPost('/api/transcribe', {
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      language: 'de',
    });

    const data = await res.json();
    return String(data.text || '').trim();
  }, [apiPost]);

  const startFallbackRecording = useCallback(async () => {
    if (isFallbackRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsFallbackRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;

        if (blob.size < 600) {
          if (isVoiceEnabled) addLog('⚠ Audio war zu kurz');
          return;
        }

        setIsProcessing(true);
        setWaveActive(true);
        try {
          const text = await uploadAndTranscribe(blob);
          if (text) {
            setTranscript(text);
            await handleVoiceCommand(text);
          } else {
            addLog('⚠ Keine Sprache erkannt');
          }
        } catch {
          addLog('⚠ STT Verbindung fehlgeschlagen');
        } finally {
          setIsProcessing(false);
          setWaveActive(false);
        }
      };

      recorder.start();
      setIsFallbackRecording(true);
      addLog('🎙 Aufnahme gestartet');
    } catch {
      addLog('⚠ Mikrofonzugriff verweigert');
    }
  }, [isFallbackRecording, isVoiceEnabled, uploadAndTranscribe]);

  const stopFallbackRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    addLog('⏹ Aufnahme gestoppt');
  }, []);

  const clearRealtimeTimers = useCallback(() => {
    if (realtimeReconnectTimerRef.current) {
      window.clearTimeout(realtimeReconnectTimerRef.current);
      realtimeReconnectTimerRef.current = null;
    }
    if (realtimeHeartbeatRef.current) {
      window.clearInterval(realtimeHeartbeatRef.current);
      realtimeHeartbeatRef.current = null;
    }
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
      realtimeRefreshTimerRef.current = null;
    }
  }, []);

  const stopPipelineVoice = useCallback(() => {
    try { recognRef.current?.stop(); } catch {}
    setIsListening(false);
    if (isFallbackRecording) stopFallbackRecording();
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
  }, [isFallbackRecording, stopFallbackRecording]);

  const stopRealtimeSession = useCallback((nextStatus: RealtimeStatus = 'idle') => {
    clearRealtimeTimers();
    setRealtimeStatus(nextStatus);
    setWaveActive(false);

    try { realtimeDataChannelRef.current?.close(); } catch {}
    realtimeDataChannelRef.current = null;

    if (realtimePcRef.current) {
      try {
        realtimePcRef.current.getSenders().forEach((sender) => sender.track?.stop());
        realtimePcRef.current.close();
      } catch {}
      realtimePcRef.current = null;
    }

    if (realtimeLocalStreamRef.current) {
      realtimeLocalStreamRef.current.getTracks().forEach((track) => track.stop());
      realtimeLocalStreamRef.current = null;
    }

    if (realtimeAudioRef.current) {
      realtimeAudioRef.current.pause();
      realtimeAudioRef.current.srcObject = null;
      realtimeAudioRef.current = null;
    }
  }, [clearRealtimeTimers]);

  const fetchRealtimeSession = useCallback(async () => {
    const tokenEndpoints = [
      'http://127.0.0.1:3001/api/realtime/session',
      'http://localhost:3001/api/realtime/session',
      '/api/realtime/session',
    ];

    let lastError: Error | null = null;
    for (const url of tokenEndpoints) {
      try {
        const response = await fetch(url);
        const data = await response.json().catch(() => ({})) as RealtimeSessionPayload & { error?: { message?: string } | string };
        if (!response.ok) {
          const message = typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || `Realtime session failed (${response.status})`;
          throw new Error(message);
        }
        if (!data?.client_secret?.value || !data?.endpoint) {
          throw new Error('Realtime session incomplete');
        }
        return {
          session: data,
          endpointUsed: url,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error('Realtime session unavailable');
  }, []);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }
    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      if (!isVoiceEnabledRef.current || engineRef.current !== 'realtime') return;
      addLog('♻ Realtime Session wird erneuert');
      realtimeManualStopRef.current = false;
      void startRealtimeSession(true);
    }, 4 * 60 * 1000);
  }, [addLog]);

  const scheduleReconnect = useCallback((reason: string) => {
    if (!isVoiceEnabledRef.current || realtimeManualStopRef.current) return;
    if (realtimeReconnectTimerRef.current) return;

    if (isAuthErrorReason(reason)) {
      stopRealtimeSession('failed');
      setVoiceEngine('pipeline');
      addLog('🔐 OpenAI Auth fehlgeschlagen · Pipeline-Fallback aktiv');
      if (supportsSpeechRecognition && recognRef.current) {
        try { recognRef.current.start(); setIsListening(true); } catch {}
      }
      return;
    }

    const nextRetry = realtimeRetryCountRef.current + 1;
    if (nextRetry > 5) {
      stopRealtimeSession('failed');
      addLog(`⛔ Realtime dauerhaft fehlgeschlagen: ${reason}`);
      setVoiceEngine('pipeline');
      if (supportsSpeechRecognition && recognRef.current) {
        try { recognRef.current.start(); setIsListening(true); } catch {}
      }
      return;
    }

    realtimeRetryCountRef.current = nextRetry;
    const delay = Math.min(4000, 500 * nextRetry);
    setRealtimeStatus('reconnecting');
    addLog(`🔁 Reconnect ${nextRetry}/5 in ${delay}ms`);
    realtimeReconnectTimerRef.current = window.setTimeout(() => {
      realtimeReconnectTimerRef.current = null;
      realtimeManualStopRef.current = false;
      void startRealtimeSession(true);
    }, delay);
  }, [addLog, stopRealtimeSession, supportsSpeechRecognition]);

  const startRealtimeSession = useCallback(async (isRecovery = false) => {
    if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC unsupported');
    }

    setVoiceEngine('realtime');
    setRealtimeStatus(isRecovery ? 'reconnecting' : 'connecting');
    setWaveActive(true);
    if (!isRecovery) addLog('🧬 Realtime Voice verbindet…');
    clearRealtimeTimers();
    stopPipelineVoice();
    stopRealtimeSession(isRecovery ? 'reconnecting' : 'connecting');

    try {
      const { session, endpointUsed } = await fetchRealtimeSession();
      const ephemeralKey = session.client_secret?.value;
      const realtimeEndpoint = session.endpoint;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      const audio = new Audio();
      audio.autoplay = true;
      audio.playsInline = true;

      realtimePcRef.current = pc;
      realtimeAudioRef.current = audio;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          audio.srcObject = remoteStream;
          audio.play().catch(() => {
            document.addEventListener('click', () => {
              audio.play().catch(() => undefined);
            }, { once: true });
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setRealtimeStatus('connected');
          realtimeRetryCountRef.current = 0;
          addLog(`✅ Voice OS live via ${endpointUsed}`);
          scheduleRealtimeRefresh();
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          scheduleReconnect(`state=${pc.connectionState}`);
        } else if (pc.connectionState === 'closed' && !realtimeManualStopRef.current) {
          scheduleReconnect('state=closed');
        }
      };

      const dataChannel = pc.createDataChannel('oai-events');
      realtimeDataChannelRef.current = dataChannel;
      dataChannel.onopen = () => {
        addLog('🧠 Q Identity geladen');
        dataChannel.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: Q_REALTIME_INSTRUCTIONS,
            turn_detection: { type: 'server_vad' },
          },
        }));
      };
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'input_audio_buffer.speech_started') {
            addLog('🎙 Nutzer spricht');
          }
          if (data.type === 'response.done') {
            setIsProcessing(false);
          }
          if (data.type === 'response.created') {
            setIsProcessing(true);
          }
          if (data.type === 'error') {
            addLog(`⚠ ${data.error?.message ?? 'Realtime Fehler'}`);
            scheduleReconnect(data.error?.message ?? 'realtime_error');
          }
        } catch {
          // ignore non-json frames
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      realtimeLocalStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(realtimeEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp ?? '',
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        throw new Error(answerSdp || `Realtime SDP failed (${sdpResponse.status})`);
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      if (realtimeHeartbeatRef.current) {
        window.clearInterval(realtimeHeartbeatRef.current);
      }
      realtimeHeartbeatRef.current = window.setInterval(() => {
        const state = realtimePcRef.current?.connectionState;
        if (!isVoiceEnabledRef.current || engineRef.current !== 'realtime') return;
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          scheduleReconnect(`heartbeat:${state}`);
        }
      }, 3000);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'realtime_start_failed';
      if (isAuthErrorReason(reason)) {
        stopRealtimeSession('failed');
        setVoiceEngine('pipeline');
        addLog('🔐 OpenAI Auth fehlgeschlagen · Realtime deaktiviert');
        if (supportsSpeechRecognition && recognRef.current) {
          try { recognRef.current.start(); setIsListening(true); } catch {}
        }
      } else {
        stopRealtimeSession('reconnecting');
        if (isVoiceEnabledRef.current) {
          scheduleReconnect(reason);
        } else {
          setVoiceEngine('pipeline');
          setRealtimeStatus('failed');
        }
      }
      throw error;
    }
  }, [addLog, clearRealtimeTimers, fetchRealtimeSession, scheduleReconnect, scheduleRealtimeRefresh, stopPipelineVoice, stopRealtimeSession, supportsSpeechRecognition]);

  useEffect(() => () => {
    realtimeManualStopRef.current = true;
    stopRealtimeSession('idle');
  }, [stopRealtimeSession]);

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

    try {
      const res = await apiPost('/api/chat', { message: cmd });
      const data = await res.json();
      if (data.text) {
        addLog(`🤖 "${data.text.slice(0, 60)}${data.text.length > 60 ? '…' : ''}"`);
        speak(data.text);
      }
    } catch {
      const fallback = getResponse(key, mode);
      if (fallback) { addLog(`🔊 "${fallback}"`); speak(fallback); }
    }

    await new Promise(r => setTimeout(r, 320));
    setIsProcessing(false);
    setWaveActive(false);
    setTranscript('');
  }, [apiPost, emails, tasks, savedMins, speak]);

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

  const togglePower = async () => {
    if (isVoiceEnabled) {
      setIsVoiceEnabled(false);
      realtimeManualStopRef.current = true;
      stopRealtimeSession();
      stopPipelineVoice();
      setVoiceEngine('pipeline');
      setWaveActive(false);
      setIsProcessing(false);
      addLog('⏹ Voice deaktiviert');
      return;
    }

    setIsVoiceEnabled(true);
    realtimeManualStopRef.current = false;
    addLog('⚡ Voice aktiviert');
    try {
      await startRealtimeSession();
    } catch {
      setVoiceEngine('pipeline');
      setRealtimeStatus('failed');
      addLog('↩ Pipeline-Fallback aktiv');
      if (supportsSpeechRecognition && recognRef.current) {
        try { recognRef.current.start(); setIsListening(true); } catch {}
      }
    }
  };

  const toggleListen = async () => {
    if (!isVoiceEnabled) {
      await togglePower();
      return;
    }

    if (voiceEngine === 'realtime') {
      if (realtimeStatus === 'connected') {
        addLog('🧬 Live-Session aktiv');
        return;
      }
      if (realtimeStatus !== 'connecting') {
        try {
          realtimeManualStopRef.current = false;
          await startRealtimeSession();
        } catch {
          addLog('⚠ Realtime Start fehlgeschlagen');
        }
      }
      return;
    }

    if (supportsSpeechRecognition) {
      if (isListening) {
        try { recognRef.current?.stop(); } catch {}
        setIsListening(false);
      } else {
        try { recognRef.current?.start(); setIsListening(true); } catch {}
      }
      return;
    }

    if (isFallbackRecording) {
      stopFallbackRecording();
      return;
    }

    await startFallbackRecording();
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

      {/* Swiss flag — minimal top bar */}
      <div className="flex justify-center pt-3 pb-0.5">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-label="Swiss flag" style={{ display: 'block' }}>
          <rect width="20" height="20" rx="2" fill="#D52B1E"/>
          <rect x="8.5" y="3" width="3" height="14" fill="white"/>
          <rect x="3" y="8.5" width="14" height="3" fill="white"/>
        </svg>
      </div>

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
          <a
            href="/swiss-characters"
            className="rounded-full border border-cyan-400/40 px-2.5 py-1 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-500/10"
          >
            Characters
          </a>
          {savedMins > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
              <Zap size={9} /> {timeSavedLabel} gespart
            </div>
          )}
          <button
            onClick={togglePower}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold"
            style={{
              borderColor: isVoiceEnabled ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.2)',
              color: isVoiceEnabled ? '#34d399' : 'rgba(255,255,255,0.5)',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <Power size={9} /> {isVoiceEnabled ? 'ON' : 'OFF'}
          </button>
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
            <span
              className="text-white font-black select-none"
              style={{
                fontSize: 40,
                letterSpacing: -2,
                lineHeight: 1,
                opacity: isListening ? 1 : 0.75,
                textShadow: isListening ? '0 0 20px rgba(255,120,120,0.6)' : '0 0 16px rgba(255,255,255,0.4)',
              }}
            >Q</span>
          </button>
        </div>

        <p className="text-white/30 text-xs mt-4 tracking-wider">
          {voiceEngine === 'realtime'
            ? (realtimeStatus === 'connecting'
              ? '🧬 Q Voice OS verbindet…'
              : realtimeStatus === 'reconnecting'
                ? '🟡 Reconnect läuft…'
              : realtimeStatus === 'connected'
                ? '🟢 Live Voice OS aktiv'
                : '⚠ Realtime nicht verbunden')
            : supportsSpeechRecognition
            ? (isListening ? '🔴 Hört zu…' : (isVoiceEnabled ? 'Bereit zum Zuhören' : 'Tippen zum Aktivieren'))
            : (isFallbackRecording ? '🔴 Aufnahme läuft… tippen zum Stoppen' : (isVoiceEnabled ? 'Tippen zum Aufnehmen' : 'Voice einschalten'))}
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

      {/* Single reliable voice path only */}
      <div className="px-5 mb-4">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-2">Voice Engine</p>
        <div className="rounded-xl px-3 py-2 text-[10px] text-white/45" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {voiceEngine === 'realtime'
            ? `Realtime WebRTC · ${realtimeStatus.toUpperCase()} · OpenAI Live Session`
            : supportsSpeechRecognition
              ? 'Pipeline Fallback: Browser STT · /api/chat · /api/tts'
              : 'Fallback aktiv: Aufnahme -> /api/transcribe -> /api/chat -> TTS'}
        </div>
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

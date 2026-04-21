// src/pages/QOSPage.tsx
// Q-Network Phase 4 — QOS: Voice Operating System Interface
// Council of Light: استیو جابز (سادگی) + ناسا (پایداری) + برنامه‌نویس خبره

import { useEffect, useRef, useState } from 'react';

type ListeningState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export default function QOSPage() {
  const [state, setState]     = useState<ListeningState>('idle');
  const [log, setLog]         = useState<string[]>(['> QOS v1.0 — سیستم عامل صوتی کیو', '> آماده دریافت دستور...']);
  const [lastCmd, setLastCmd] = useState('');
  const recognitionRef        = useRef<SpeechRecognition | null>(null);
  const synth                 = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const appendLog = (line: string) =>
    setLog(prev => [...prev.slice(-49), `> ${line}`]);

  const speak = (text: string) => {
    if (!synth) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'de-CH';
    utt.rate  = 0.88;
    utt.pitch = 1.05;
    setState('speaking');
    utt.onend = () => setState('idle');
    synth.speak(utt);
  };

  const processCommand = async (cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    setState('processing');
    appendLog(`Befehl: ${cmd}`);

    // Wake-word required: "Q ..."
    if (!lower.startsWith('q ') && lower !== 'q') {
      appendLog('Kein Weckwort erkannt — bitte mit "Q" beginnen');
      setState('idle');
      return;
    }

    const stripped = lower.replace(/^q\s*/, '');

    let response = 'Befehl wird verarbeitet';

    if (/status|zustand|حال/i.test(stripped)) {
      response = 'Alle Systeme betriebsbereit. Kerngesund.';
    } else if (/zeit|time|ساعت/i.test(stripped)) {
      response = `Es ist ${new Date().toLocaleTimeString('de-CH')} Uhr.`;
    } else if (/hilfe|help|کمک/i.test(stripped)) {
      response = 'Verfügbare Befehle: Status, Zeit, Speicher, Analyse, Beenden.';
    } else if (/speicher|memory|حافظه/i.test(stripped)) {
      response = 'Arbeitsspeicher normal. Kein Engpass erkannt.';
    } else if (/analyse|analyze|آنالیز/i.test(stripped)) {
      response = 'Netzwerkanalyse läuft. 12 Knoten aktiv, Latenz unter 20ms.';
    } else if (/beenden|stop|خروج/i.test(stripped)) {
      response = 'Bis dann. Q schaltet sich in den Standby-Modus.';
    }

    appendLog(`Antwort: ${response}`);
    speak(response);
  };

  const startListening = () => {
    const SR =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ??
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SR) {
      appendLog('Spracherkennung nicht unterstützt — bitte Chrome verwenden');
      setState('error');
      return;
    }

    const rec = new SR();
    rec.lang           = 'de-CH';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart  = () => { setState('listening'); appendLog('Zuhören...'); };
    rec.onerror  = (e) => { appendLog(`Fehler: ${e.error}`); setState('error'); };
    rec.onresult = (e) => {
      const cmd = e.results[0][0].transcript;
      setLastCmd(cmd);
      processCommand(cmd);
    };
    rec.onend = () => {
      if (state === 'listening') setState('idle');
    };

    rec.start();
    recognitionRef.current = rec;
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synth?.cancel();
    };
  }, []);

  const stateColors: Record<ListeningState, string> = {
    idle:       'text-green-400',
    listening:  'text-cyan-400',
    processing: 'text-yellow-400',
    speaking:   'text-purple-400',
    error:      'text-red-400',
  };
  const stateLabels: Record<ListeningState, string> = {
    idle:       'BEREIT',
    listening:  'ZUHÖREN',
    processing: 'VERARBEITUNG',
    speaking:   'SPRECHEN',
    error:      'FEHLER',
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-start p-6">
      {/* Header */}
      <div className="w-full max-w-3xl mb-6 border-b border-green-700 pb-4">
        <h1 className="text-2xl tracking-widest">Q-OS  <span className="text-xs text-green-600 ml-2">Voice Operating System v1.0</span></h1>
        <p className="text-xs text-green-700 mt-1">Sprache: Deutsch (Schweiz) · Wake-Word: "Q"</p>
      </div>

      {/* Status */}
      <div className="w-full max-w-3xl flex items-center gap-3 mb-4">
        <span className={`text-xs font-bold tracking-widest ${stateColors[state]}`}>
          [{stateLabels[state]}]
        </span>
        {lastCmd && (
          <span className="text-xs text-green-600 truncate">Letzter Befehl: {lastCmd}</span>
        )}
      </div>

      {/* Terminal Log */}
      <div className="w-full max-w-3xl bg-black border border-green-800 rounded h-80 overflow-y-auto p-4 mb-6 text-xs leading-6">
        {log.map((line, i) => (
          <div key={i} className="opacity-90">{line}</div>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4">
        <button
          onClick={startListening}
          disabled={state === 'listening' || state === 'processing'}
          className="px-6 py-2 border border-green-500 text-green-400 hover:bg-green-900 disabled:opacity-40 text-sm tracking-widest transition-colors"
        >
          SPRECHEN
        </button>
        <button
          onClick={() => { synth?.cancel(); setState('idle'); appendLog('Abgebrochen.'); }}
          className="px-6 py-2 border border-red-700 text-red-500 hover:bg-red-950 text-sm tracking-widest transition-colors"
        >
          STOP
        </button>
        <button
          onClick={() => setLog(['> QOS v1.0 bereit...'])}
          className="px-6 py-2 border border-green-800 text-green-700 hover:bg-zinc-900 text-sm tracking-widest transition-colors"
        >
          LÖSCHEN
        </button>
      </div>
    </div>
  );
}

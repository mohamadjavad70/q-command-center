// src/pages/QSwissLanding.tsx
// Q-Swiss Personal AI â€” Ø§ÛŒØ¬Ù†Øª Ù‡ÙˆØ´Ù…Ù†Ø¯ Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø³ÙˆØ¦ÛŒØ³
// Ø§Ø±Ø²Ø´ Ø§ØµÙ„ÛŒ: Û² Ø³Ø§Ø¹Øª ØµØ±ÙÙ‡â€ŒØ¬ÙˆÛŒÛŒ Ø±ÙˆØ²Ø§Ù†Ù‡ | Spare 2 Stunden tÃ¤glich
// Ø´ÙˆØ±Ø§ÛŒ Ù†ÙˆØ±: Ø¬Ø§Ø¨Ø² (Ø³Ø§Ø¯Ú¯ÛŒ) + Ø§Ø¯ÛŒØ³ÙˆÙ† (Ø¨Ø§Ø²Ø§Ø±) + Ø³Ù…ÛŒØ¹ÛŒ (Ø¯Ù‚Øª ÙÙ†ÛŒ)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mail, Mic, MicOff, Trash2, Reply, AlertTriangle,
  CheckCircle, Clock, Sparkles, ChevronDown, ChevronUp,
  Calendar, Inbox, ShieldAlert, RefreshCw, Zap, X, Play,
} from 'lucide-react';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface EmailItem {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  received: string;
  category: 'personal' | 'work' | 'spam' | 'scam' | 'newsletter' | 'unread';
  aiSummary?: string;
  aiReply?: string;
  processed: boolean;
  timeSaved: number; // seconds
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

interface DailyTask {
  time: string;
  task: string;
  duration: number; // minutes
  aiHandled: boolean;
  savedMins: number;
}

// â”€â”€â”€ Demo Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEMO_EMAILS: EmailItem[] = [
  {
    id: 'e1',
    from: 'hr@ubs.com',
    subject: 'Ihre Bewerbung â€” Software Engineer',
    preview: 'Sehr geehrte/r Bewerber/in, vielen Dank fÃ¼r Ihre Bewerbung...',
    body: 'Sehr geehrte/r Bewerber/in,\n\nVielen Dank fÃ¼r Ihre Bewerbung fÃ¼r die Position Software Engineer bei UBS. Wir haben Ihre Unterlagen erhalten und prÃ¼fen diese sorgfÃ¤ltig. Wir werden uns innerhalb von 2 Wochen bei Ihnen melden.\n\nMit freundlichen GrÃ¼ssen,\nUBS HR Team',
    received: 'Heute 09:14',
    category: 'work',
    processed: false,
    timeSaved: 420,
  },
  {
    id: 'e2',
    from: 'noreply@newsletter-shop.ch',
    subject: 'ðŸ›ï¸ 50% Rabatt â€” Nur heute!',
    preview: 'Verpassen Sie nicht unsere einmaligen Angebote...',
    body: 'Klicken Sie hier fÃ¼r unglaubliche Angebote!',
    received: 'Heute 08:30',
    category: 'spam',
    processed: false,
    timeSaved: 90,
  },
  {
    id: 'e3',
    from: 'security@paypal-verify.net',
    subject: 'âš ï¸ Ihr Konto wurde gesperrt â€” Sofort handeln',
    preview: 'Ihr PayPal-Konto wurde vorÃ¼bergehend eingeschrÃ¤nkt...',
    body: 'Klicken Sie auf den Link um Ihr Konto zu entsperren: http://paypal-fake.net/verify',
    received: 'Heute 07:55',
    category: 'scam',
    processed: false,
    timeSaved: 300,
  },
  {
    id: 'e4',
    from: 'marco.bianchi@gmail.com',
    subject: 'Mittagessen Freitag?',
    preview: 'Hey, hast du am Freitag Zeit fÃ¼r ein Mittagessen?',
    body: 'Hey,\n\nHast du am Freitag, 25. April, Zeit fÃ¼r ein Mittagessen? Wir kÃ¶nnten ins Zeughauskeller gehen?\n\nBis dann,\nMarco',
    received: 'Gestern 18:42',
    category: 'personal',
    processed: false,
    timeSaved: 180,
  },
  {
    id: 'e5',
    from: 'team@swisscom.ch',
    subject: 'Ihre Rechnung April 2026 â€” CHF 78.90',
    preview: 'Ihre monatliche Rechnung ist verfÃ¼gbar...',
    body: 'Ihre Rechnung fÃ¼r April 2026 betrÃ¤gt CHF 78.90. FÃ¤llig am 01.05.2026.',
    received: 'Gestern 10:00',
    category: 'newsletter',
    processed: false,
    timeSaved: 60,
  },
];

const DEMO_TASKS: DailyTask[] = [
  { time: '08:00', task: 'E-Mails prÃ¼fen & beantworten',       duration: 120, aiHandled: true,  savedMins: 110 },
  { time: '10:00', task: 'Meeting Protokoll schreiben',         duration: 30,  aiHandled: true,  savedMins: 25  },
  { time: '12:00', task: 'Mittagessen ðŸŒ¿',                     duration: 60,  aiHandled: false, savedMins: 0   },
  { time: '14:00', task: 'Bericht fÃ¼r Vorgesetzte vorbereiten', duration: 45,  aiHandled: true,  savedMins: 38  },
  { time: '17:00', task: 'Spaziergang am See ðŸ”ï¸',               duration: 60,  aiHandled: false, savedMins: 0   },
  { time: '18:30', task: 'Lesen / Familie Zeit â˜•',              duration: 90,  aiHandled: false, savedMins: 0   },
];

const AI_SUMMARIES: Record<string, { summary: string; reply: string }> = {
  e1: {
    summary: 'ðŸ¢ **UBS HR:** BestÃ¤tigung des Eingangs Ihrer Bewerbung. Entscheidung in 2 Wochen erwartet. Keine Aktion erforderlich.',
    reply: 'Sehr geehrte Damen und Herren,\n\nVielen Dank fÃ¼r die BestÃ¤tigung. Ich freue mich auf Ihre RÃ¼ckmeldung.\n\nMit freundlichen GrÃ¼ssen',
  },
  e2: {
    summary: 'ðŸ—‘ï¸ **Newsletter/Werbung:** Automatisch kategorisiert. Kein Handlungsbedarf. Abmeldung empfohlen.',
    reply: '',
  },
  e3: {
    summary: 'ðŸš¨ **SCAM ERKANNT:** Phishing-Versuch! Diese E-Mail ist KEINE offizielle PayPal-Kommunikation. Domain "paypal-fake.net" ist betrÃ¼gerisch. Sofort lÃ¶schen.',
    reply: '',
  },
  e4: {
    summary: 'ðŸ‘‹ **PersÃ¶nlich â€” Marco:** Einladung zum Mittagessen am Freitag (25. April) im Zeughauskeller.',
    reply: 'Hey Marco,\n\nFreitag klingt super! Zeughauskeller ist perfekt. Sagen wir 12:30 Uhr?\n\nBis Freitag,',
  },
  e5: {
    summary: 'ðŸ’³ **Swisscom Rechnung:** CHF 78.90 fÃ¤llig am 01.05.2026. Normal, keine Aktion nÃ¶tig.',
    reply: '',
  },
};

const CATEGORY_CONFIG = {
  personal:   { label: 'PersÃ¶nlich', color: '#10b981', bg: '#d1fae5', icon: 'ðŸ‘¤' },
  work:       { label: 'Arbeit',     color: '#3b82f6', bg: '#dbeafe', icon: 'ðŸ’¼' },
  spam:       { label: 'Spam',       color: '#f59e0b', bg: '#fef3c7', icon: 'ðŸ—‘ï¸' },
  scam:       { label: 'âš ï¸ Scam',   color: '#ef4444', bg: '#fee2e2', icon: 'ðŸš¨' },
  newsletter: { label: 'Newsletter', color: '#8b5cf6', bg: '#ede9fe', icon: 'ðŸ“°' },
  unread:     { label: 'Ungelesen',  color: '#6b7280', bg: '#f3f4f6', icon: 'ðŸ“§' },
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const QSwissLanding: React.FC = () => {
  const [tab, setTab]               = useState<'chat' | 'email' | 'planner'>('chat');
  const [messages, setMessages]     = useState<ChatMessage[]>([{
    id: '0',
    role: 'assistant',
    content: 'GrÃ¼ezi! ðŸ‡¨ðŸ‡­\n\nIch bin **Q-Swiss** â€” Ihr persÃ¶nlicher KI-Assistent.\n\nÙ…Ù† Ø¯Ø³ØªÛŒØ§Ø± Ù‡ÙˆØ´Ù…Ù†Ø¯ Ø´Ù…Ø§ Ù‡Ø³ØªÙ… Ú©Ù‡ **Ø±ÙˆØ²Ø§Ù†Ù‡ Û² Ø³Ø§Ø¹Øª Ø§Ø² ÙˆÙ‚Øªâ€ŒØªØ§Ù†** Ø±Ø§ Ø¢Ø²Ø§Ø¯ Ù…ÛŒâ€ŒÚ©Ù†Ù…:\n\nâ€¢ ðŸ“§ Ø§ÛŒÙ…ÛŒÙ„â€ŒÙ‡Ø§ Ø±Ø§ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ù… Ùˆ Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ù…\nâ€¢ ðŸš¨ Ø§Ø³Ù¾Ù… Ùˆ Ú©Ù„Ø§Ù‡Ø¨Ø±Ø¯Ø§Ø±ÛŒ Ø±Ø§ Ø´Ù†Ø§Ø³Ø§ÛŒÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ù…\nâ€¢ âœï¸ Ù¾Ø§Ø³Ø®â€ŒÙ‡Ø§ÛŒ Ø¢Ù…Ø§Ø¯Ù‡ Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ Ù…ÛŒâ€ŒØ¯Ù‡Ù…\nâ€¢ ðŸ“… Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø±ÙˆØ²ØªØ§Ù† Ø±Ø§ Ø¨Ù‡ÛŒÙ†Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ù…\n\nØ¨Ø±Ø§ÛŒ Ø´Ø±ÙˆØ¹ ØªØ¨ **Email** Ø±Ø§ Ø¨Ø²Ù†ÛŒØ¯ ÛŒØ§ Ø¨Ù¾Ø±Ø³ÛŒØ¯!',
    ts: new Date(),
  }]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [listening, setListening]   = useState(false);
  const [emails, setEmails]         = useState<EmailItem[]>(DEMO_EMAILS);
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [weather, setWeather]       = useState<{ temp: number; icon: string } | null>(null);

  const endRef      = useRef<HTMLDivElement>(null);
  const recognRef   = useRef<SpeechRecognition | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Weather â€” Open-Meteo
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=47.3769&longitude=8.5417&current_weather=true')
      .then(r => r.json())
      .then(d => {
        if (!d.current_weather) return;
        const c = d.current_weather.weathercode as number;
        setWeather({ temp: Math.round(d.current_weather.temperature), icon: c === 0 ? 'â˜€ï¸' : c < 3 ? 'â›…' : c < 60 ? 'â˜ï¸' : 'ðŸŒ§' });
      })
      .catch(() => {});
  }, []);

  // â”€â”€ Voice â”€â”€
  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice recognition not supported in this browser.'); return; }

    if (listening) {
      recognRef.current?.stop();
      setListening(false);
      return;
    }

    const recog: SpeechRecognition = new SR();
    recog.lang = 'de-CH';
    recog.interimResults = false;
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setTimeout(() => handleSend(t), 300);
    };
    recog.onend = () => setListening(false);
    recog.start();
    recognRef.current = recog;
    setListening(true);
  }, [listening]);

  // â”€â”€ Chat â”€â”€
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, ts: new Date() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    const pid = (Date.now() + 1).toString();
    setMessages(p => [...p, { id: pid, role: 'assistant', content: 'â€¦', ts: new Date() }]);

    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const reply = buildReply(text);
    setMessages(p => p.map(m => m.id === pid ? { ...m, content: reply } : m));
    setLoading(false);
  }, [input, loading]);

  // â”€â”€ Email AI â”€â”€
  const processAllEmails = async () => {
    setProcessing(true);
    for (let i = 0; i < emails.length; i++) {
      await new Promise(r => setTimeout(r, 350));
      setEmails(prev => prev.map((e, idx) => idx === i
        ? { ...e, processed: true, aiSummary: AI_SUMMARIES[e.id]?.summary, aiReply: AI_SUMMARIES[e.id]?.reply }
        : e
      ));
    }
    setProcessing(false);
  };

  const deleteEmail = (id: string) => setEmails(p => p.filter(e => e.id !== id));

  const totalSaved = emails.filter(e => e.processed).reduce((s, e) => s + e.timeSaved, 0);
  const unprocessed = emails.filter(e => !e.processed).length;

  // â”€â”€ Stats â”€â”€
  const categoryCounts = emails.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {} as Record<string, number>);
  const scamCount = (categoryCounts.scam || 0) + (categoryCounts.spam || 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* â”€â”€ Header â”€â”€ */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }} className="sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>Q</div>
            <div>
              <div className="font-bold text-gray-800 text-sm">Q-Swiss</div>
              <div className="text-[10px] text-gray-400">KI-Assistent â€¢ Û² Ø³Ø§Ø¹Øª/Ø±ÙˆØ² Ø¢Ø²Ø§Ø¯</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {weather && <span className="hidden sm:block">{weather.icon} {weather.temp}Â°C ZÃ¼rich</span>}
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2 py-1 text-[10px] font-bold">
              <Zap size={10} /> {Math.round(totalSaved / 60)}h {totalSaved % 60}m saved
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {([['chat','ðŸ’¬ Chat'],['email','ðŸ“§ Email Agent'],['planner','ðŸ“… Planner']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className="px-4 py-2 text-xs font-semibold transition-all rounded-t-lg"
              style={tab === t
                ? { background: '#fff', color: '#dc2626', borderTop: '2px solid #dc2626', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }
                : { color: '#6b7280', background: 'transparent', borderTop: '2px solid transparent' }
              }>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: CHAT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === 'chat' && (
          <div className="flex flex-col gap-3">
            {/* Quick actions */}
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: 'ðŸ“§', label: 'Email analysieren', prompt: 'Bitte analysiere meine Emails und erstelle eine Zusammenfassung.' },
                { icon: 'ðŸš¨', label: 'Scam erkennen',     prompt: 'Wie erkenne ich Phishing-E-Mails?' },
                { icon: 'â±ï¸', label: 'Zeit sparen',       prompt: 'Wie viel Zeit spare ich tÃ¤glich mit Q-Swiss?' },
                { icon: 'ðŸ“', label: 'Reply schreiben',   prompt: 'Schreibe eine professionelle Antwort auf eine BewerbungsbestÃ¤tigung.' },
                { icon: 'ðŸ‡¨ðŸ‡­', label: 'Schweizer Recht',  prompt: 'Was sind die wichtigsten Datenschutzrechte in der Schweiz (DSG)?' },
              ].map((a, i) => (
                <button key={i} onClick={() => handleSend(a.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-700 hover:border-red-300 hover:text-red-600 transition-colors shadow-sm">
                  {a.icon} {a.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[60vh]">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-white text-xs mr-2 flex-shrink-0 self-end mb-1"
                        style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>Q</div>
                    )}
                    <div className={`max-w-[84%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-red-600 text-white rounded-br-sm'
                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
                    }`} style={{ direction: 'auto' } as React.CSSProperties}>
                      {msg.content}
                      <div className={`text-[9px] mt-1 text-right ${msg.role === 'user' ? 'text-red-200' : 'text-gray-300'}`}>
                        {msg.ts.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-white text-xs mr-2 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>Q</div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 p-3 flex gap-2">
                <input ref={inputRef} type="text" value={input} dir="auto"
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Nachricht schreibenâ€¦ (Deutsch, ÙØ§Ø±Ø³ÛŒ, English)"
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:border-red-300 transition-colors"
                />
                <button onClick={toggleVoice}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: listening ? '#dc2626' : '#f3f4f6', color: listening ? '#fff' : '#6b7280' }}
                  title="Spracheingabe">
                  {listening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
                <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: EMAIL AGENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === 'email' && (
          <div className="flex flex-col gap-3">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total',    value: emails.length,            color: '#3b82f6', icon: <Inbox size={14}/> },
                { label: 'Scam/Spam', value: scamCount,               color: '#ef4444', icon: <ShieldAlert size={14}/> },
                { label: 'Bearbeitet', value: emails.filter(e=>e.processed).length, color: '#10b981', icon: <CheckCircle size={14}/> },
                { label: 'Zeit gespart', value: `${Math.round(totalSaved/60)}h ${totalSaved%60}m`, color: '#f59e0b', icon: <Clock size={14}/> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                  <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                  <div className="font-bold text-gray-800 text-sm">{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              onClick={processAllEmails}
              disabled={processing || unprocessed === 0}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff' }}
            >
              {processing
                ? <><RefreshCw size={15} className="animate-spin" /> KI verarbeitet E-Mailsâ€¦</>
                : unprocessed > 0
                ? <><Sparkles size={15} /> {unprocessed} E-Mail{unprocessed > 1 ? 's' : ''} mit KI analysieren</>
                : <><CheckCircle size={15} /> Alle E-Mails bearbeitet</>
              }
            </button>

            {/* Email List */}
            <div className="flex flex-col gap-2">
              {emails.map(email => {
                const cfg = CATEGORY_CONFIG[email.category];
                const isExpanded = expanded === email.id;
                const sum = AI_SUMMARIES[email.id];

                return (
                  <div key={email.id} className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all"
                    style={{ borderColor: email.category === 'scam' ? '#fca5a5' : '#e5e7eb' }}>
                    {/* Email header row */}
                    <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : email.id)}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-800 text-xs truncate">{email.from}</span>
                          <span className="text-[9px] text-gray-400 flex-shrink-0 ml-2">{email.received}</span>
                        </div>
                        <div className="text-xs text-gray-700 font-medium truncate">{email.subject}</div>
                        <div className="text-[10px] text-gray-400 truncate">{email.preview}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {email.processed && (
                            <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle size={9} /> KI fertig â€¢ {Math.round(email.timeSaved / 60)}m gespart
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex gap-1 ml-1">
                        <button onClick={e => { e.stopPropagation(); deleteEmail(email.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={12} />
                        </button>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400 self-center" /> : <ChevronDown size={14} className="text-gray-400 self-center" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 space-y-3">
                        {/* Full body */}
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {email.body}
                        </div>

                        {/* AI Summary */}
                        {email.processed && email.aiSummary && (
                          <div className="rounded-lg p-3 text-xs leading-relaxed"
                            style={{ background: email.category === 'scam' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${email.category === 'scam' ? '#fca5a5' : '#bbf7d0'}` }}>
                            <div className="flex items-center gap-1 mb-1.5 font-semibold"
                              style={{ color: email.category === 'scam' ? '#dc2626' : '#059669' }}>
                              {email.category === 'scam' ? <AlertTriangle size={12} /> : <Sparkles size={12} />}
                              KI-Zusammenfassung
                            </div>
                            <div className="text-gray-700 whitespace-pre-wrap">{email.aiSummary}</div>
                          </div>
                        )}

                        {/* AI Reply suggestion */}
                        {email.processed && email.aiReply && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
                            <div className="flex items-center gap-1 mb-1.5 font-semibold text-blue-700">
                              <Reply size={12} /> Vorgeschlagene Antwort
                            </div>
                            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">{email.aiReply}</div>
                            <button className="mt-2 flex items-center gap-1 text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                              <Send size={10} /> Antwort senden
                            </button>
                          </div>
                        )}

                        {/* Not yet processed */}
                        {!email.processed && (
                          <button onClick={processAllEmails}
                            className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 font-medium">
                            <Play size={10} /> Jetzt analysieren
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="text-center text-[10px] text-gray-400 py-2">
              ðŸ”’ E-Mails werden lokal verarbeitet â€” keine Daten werden gespeichert
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: PLANNER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === 'planner' && (
          <div className="flex flex-col gap-3">
            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-red-500" />
                  Heute â€” Montag, 21. April 2026
                </div>
                <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold">
                  âš¡ 2h 53m gespart
                </div>
              </div>
              {/* Progress bar */}
              <div className="text-[10px] text-gray-500 mb-1">KI Ã¼bernimmt {Math.round((DEMO_TASKS.filter(t=>t.aiHandled).reduce((s,t)=>s+t.duration,0) / DEMO_TASKS.reduce((s,t)=>s+t.duration,0))*100)}% Ihrer Aufgaben</div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                  style={{ width: `${Math.round((DEMO_TASKS.filter(t=>t.aiHandled).reduce((s,t)=>s+t.duration,0) / DEMO_TASKS.reduce((s,t)=>s+t.duration,0))*100)}%` }} />
              </div>
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-2">
              {DEMO_TASKS.map((task, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                  <div className="text-[10px] font-mono text-gray-400 w-12 flex-shrink-0">{task.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${task.aiHandled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {task.task}
                    </div>
                    <div className="text-[10px] text-gray-400">{task.duration} Min.</div>
                  </div>
                  {task.aiHandled ? (
                    <div className="flex-shrink-0 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <Sparkles size={9} /> KI {task.savedMins}m
                    </div>
                  ) : (
                    <div className="flex-shrink-0 text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle size={9} /> Du
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Time saved visual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs font-semibold text-gray-700 mb-3">ðŸ”ï¸ Was Sie mit 2 Stunden mehr machen kÃ¶nnen:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ['ðŸš¶', 'Spaziergang am See', '45 Min.'],
                  ['ðŸ“š', 'Buch lesen',          '60 Min.'],
                  ['â˜•', 'Kaffee mit Freunden', '90 Min.'],
                  ['ðŸ§˜', 'Yoga / Meditation',  '30 Min.'],
                  ['ðŸŒ¿', 'Natur geniessen',    '120 Min.'],
                  ['ðŸ‘¨â€ðŸ‘©â€ðŸ‘§', 'Familie Zeit',       '120 Min.'],
                ].map(([icon, label, time]) => (
                  <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <div className="font-medium text-gray-700">{label}</div>
                      <div className="text-gray-400 text-[9px]">{time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Footer â”€â”€ */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-4">
        <div className="flex justify-center gap-6 text-[10px] text-gray-400">
          <span>ðŸ”’ Datenschutz guaranteed</span>
          <span>âš¡ Offline-fÃ¤hig</span>
          <span>ðŸ‡¨ðŸ‡­ Made for Switzerland</span>
        </div>
        <div className="text-center text-[9px] text-gray-300 mt-1">
          Powered by <a href="/" className="text-red-400 hover:underline">Q-Swiss AI</a> â€¢ qmetaram.com
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Offline Chat Replies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildReply(text: string): string {
  const t = text.toLowerCase();

  if (t.includes('email') || t.includes('mail') || t.includes('Ø§ÛŒÙ…ÛŒÙ„') || t.includes('analyse')) {
    return 'ðŸ“§ **Email Agent bereit!**\n\nGehen Sie zum Tab **"Email Agent"** â€” dort werde ich:\n\nâ€¢ Alle E-Mails lesen und kategorisieren\nâ€¢ Spam & Scam erkennen und markieren\nâ€¢ Wichtige E-Mails zusammenfassen\nâ€¢ Professionelle Antworten vorschlagen\n\nDurchschnittliche Zeitersparnis: **2 Stunden tÃ¤glich** âš¡';
  }
  if (t.includes('scam') || t.includes('phishing') || t.includes('Ú©Ù„Ø§Ù‡Ø¨Ø±Ø¯Ø§Ø±ÛŒ') || t.includes('Ø§Ø³Ù¾Ù…')) {
    return 'ðŸš¨ **Scam-Erkennung:**\n\nIch erkenne folgende Muster:\n\nâ€¢ **Domain-FÃ¤lschung:** paypal-fake.net â‰  paypal.com\nâ€¢ **Dringlichkeit:** "Sofort handeln!" â†’ rotes Flag\nâ€¢ **Unbekannte Links:** immer vor dem Klicken prÃ¼fen\nâ€¢ **Grammatikfehler:** oft in Betrugs-E-Mails\n\nIm Email Agent kategorisiere ich automatisch alle Scam-Mails mit ðŸš¨.';
  }
  if (t.includes('zeit') || t.includes('time') || t.includes('spare') || t.includes('Ø³Ø§Ø¹Øª') || t.includes('ÙˆÙ‚Øª')) {
    return 'â±ï¸ **Zeitersparnis mit Q-Swiss:**\n\nDurchschnittlich spart jeder Nutzer:\n\nâ€¢ E-Mails lesen & sortieren: **45 Min./Tag**\nâ€¢ Antworten schreiben: **35 Min./Tag**\nâ€¢ Spam lÃ¶schen: **10 Min./Tag**\nâ€¢ Berichte / Protokolle: **30 Min./Tag**\n\n**Total: ~2 Stunden tÃ¤glich**\n\nDas sind **730 Stunden/Jahr** mehr fÃ¼r das Wesentliche! ðŸ”ï¸';
  }
  if (t.includes('bewerbung') || t.includes('antwort') || t.includes('reply') || t.includes('Ù¾Ø§Ø³Ø®')) {
    return 'âœï¸ **Professionelle Antwort:**\n\nHier ein Muster fÃ¼r eine Bewerbungsantwort:\n\n---\nSehr geehrte Damen und Herren,\n\nVielen Dank fÃ¼r Ihre prompte RÃ¼ckmeldung. Ich freue mich sehr Ã¼ber Ihr Interesse und stehe fÃ¼r ein GesprÃ¤ch jederzeit zur VerfÃ¼gung.\n\nMit freundlichen GrÃ¼ssen\n---\n\nIm **Email Agent** schlage ich automatisch passende Antworten vor! ðŸŽ¯';
  }
  if (t.includes('dsg') || t.includes('datenschutz') || t.includes('recht') || t.includes('privac')) {
    return 'âš–ï¸ **Datenschutz Schweiz (DSG 2023):**\n\nIhre wichtigsten Rechte:\n\nâ€¢ **Auskunftsrecht:** Welche Daten werden gespeichert?\nâ€¢ **Recht auf LÃ¶schung:** Ihre Daten lÃ¶schen lassen\nâ€¢ **DatenportabilitÃ¤t:** Daten exportieren\nâ€¢ **Widerspruchsrecht:** Verarbeitung ablehnen\n\nQ-Swiss speichert **keine** Ihrer Daten â€” alles bleibt lokal! ðŸ”’';
  }
  if (t.includes('chf') || t.includes('franken') || t.includes('eur') || t.includes('ÙØ±Ø§Ù†Ú©')) {
    return 'ðŸ’± **CHF â†” EUR:**\n\nAktueller Richtkurs:\n1 CHF â‰ˆ 1.058 EUR\n\nHinweis: FÃ¼r den genauen Kurs besuchen Sie:\nâ€¢ SIX Swiss Exchange (six-group.com)\nâ€¢ SNB (snb.ch)\n\nKleine Umrechnungshilfe:\n100 CHF â†’ ~105.80 EUR\n500 CHF â†’ ~529.00 EUR';
  }

  // Default
  return `âœ… Ihre Anfrage wurde verstanden:\n\n*"${text}"*\n\nIch bin Q-Swiss â€” Ihr persÃ¶nlicher KI-Assistent fÃ¼r den Alltag in der Schweiz.\n\n**Ich kann helfen mit:**\nâ€¢ ðŸ“§ E-Mail-Verwaltung (2h/Tag sparen!)\nâ€¢ ðŸš¨ Scam & Spam erkennen\nâ€¢ âœï¸ Professionelle Antworten\nâ€¢ ðŸ“… Tagesplanung optimieren\nâ€¢ ðŸ‡¨ðŸ‡­ Schweizer Recht & Alltag\n\nStellen Sie Ihre nÃ¤chste Frage auf Deutsch, Englisch oder ÙØ§Ø±Ø³ÛŒ!`;
}

export default QSwissLanding;

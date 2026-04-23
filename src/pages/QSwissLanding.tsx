import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  CloudSun,
  Mail,
  Shield,
  Sparkles,
  TrendingUp,
  Wifi,
} from "lucide-react";

type TabKey = "chat" | "email" | "planner";
type Locale = "en" | "de" | "fr" | "fa";

type EmailItem = {
  id: number;
  from: string;
  subject: string;
  preview: string;
  category: "work" | "spam" | "scam" | "personal" | "newsletter";
  isScam: boolean;
};

type TaskItem = {
  time: string;
  title: string;
  duration: number;
  aiDuration: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialEmails: EmailItem[] = [
  {
    id: 1,
    from: "hr@ubs.com",
    subject: "Your application - Software Engineer",
    preview: "Thank you for your application. We will review and get back to you soon.",
    category: "work",
    isScam: false,
  },
  {
    id: 2,
    from: "noreply@newsletter-shop.ch",
    subject: "50% discount - Today only",
    preview: "Do not miss our limited offer. Click to see all deals.",
    category: "spam",
    isScam: false,
  },
  {
    id: 3,
    from: "security@paypal-verify.net",
    subject: "Your account is locked - Immediate action required",
    preview: "Your account was restricted. Verify now to unlock your account.",
    category: "scam",
    isScam: true,
  },
  {
    id: 4,
    from: "marco.bianchi@gmail.com",
    subject: "Lunch on Friday?",
    preview: "Hey, are you free for lunch this Friday in Zurich?",
    category: "personal",
    isScam: false,
  },
  {
    id: 5,
    from: "team@swisscom.ch",
    subject: "April 2026 invoice - CHF 78.90",
    preview: "Your monthly invoice is ready. Payment due date: 01.05.2026.",
    category: "newsletter",
    isScam: false,
  },
];

const initialTasks: TaskItem[] = [
  { time: "08:00", title: "Check and reply to emails", duration: 120, aiDuration: 110 },
  { time: "10:00", title: "Write meeting notes", duration: 30, aiDuration: 25 },
  { time: "12:00", title: "Lunch break", duration: 60, aiDuration: 0 },
  { time: "14:00", title: "Prepare manager report", duration: 45, aiDuration: 38 },
  { time: "17:00", title: "Walk by the lake", duration: 60, aiDuration: 0 },
];

const I18N: Record<
  Locale,
  {
    labels: {
      weather: string;
      characters: string;
      tabs: { email: string; planner: string; chat: string };
      savedToday: string;
      automation: string;
      analyze: string;
      localProcessing: string;
      offline: string;
      madeForSwiss: string;
      aiHandling: string;
      send: string;
      chatPlaceholder: string;
      footer: string;
      language: string;
    };
    categories: Record<EmailItem["category"] | "scamBadge", string>;
    replies: {
      scam: string;
      spam: string;
      normal: (name: string) => string;
      askEmail: string;
      askTime: (mins: number) => string;
      thanks: string;
      default: string;
    };
  }
> = {
  en: {
    labels: {
      weather: "15C Zurich",
      characters: "Q Characters",
      tabs: { email: "Email Agent", planner: "Planner", chat: "Chat" },
      savedToday: "Time saved today",
      automation: "+48% AI automation",
      analyze: "Analyze now",
      localProcessing: "Emails are processed locally",
      offline: "Offline-ready",
      madeForSwiss: "Made for Switzerland",
      aiHandling: "AI handles this",
      send: "Send",
      chatPlaceholder: "Write a message... (English, German, French, Persian)",
      footer: "Privacy-first • Offline-ready • Made for Switzerland",
      language: "Language",
    },
    categories: {
      work: "Work",
      spam: "Spam",
      scam: "Scam",
      personal: "Personal",
      newsletter: "Newsletter",
      scamBadge: "Scam",
    },
    replies: {
      scam: "Warning: this looks like a fraudulent email. Do not reply.",
      spam: "Spam detected and removed.",
      normal: (name) => `Suggested reply: Thank you for your message, ${name}. I will get back to you shortly.`,
      askEmail: "If you want email help, click Analyze now on any email card.",
      askTime: (mins) => `You have already saved ${mins} minutes today.`,
      thanks: "You are welcome. Happy to help.",
      default: "I can help with email triage, planning, and time-saving actions.",
    },
  },
  de: {
    labels: {
      weather: "15C Zuerich",
      characters: "Q Charaktere",
      tabs: { email: "E-Mail Agent", planner: "Planer", chat: "Chat" },
      savedToday: "Heute gesparte Zeit",
      automation: "+48% KI-Automatisierung",
      analyze: "Jetzt analysieren",
      localProcessing: "E-Mails werden lokal verarbeitet",
      offline: "Offline-faehig",
      madeForSwiss: "Fuer die Schweiz gebaut",
      aiHandling: "KI uebernimmt",
      send: "Senden",
      chatPlaceholder: "Nachricht schreiben... (Englisch, Deutsch, Franzoesisch, Persisch)",
      footer: "Datenschutz zuerst • Offline-faehig • Fuer die Schweiz gebaut",
      language: "Sprache",
    },
    categories: {
      work: "Arbeit",
      spam: "Spam",
      scam: "Betrug",
      personal: "Persoenlich",
      newsletter: "Newsletter",
      scamBadge: "Betrug",
    },
    replies: {
      scam: "Warnung: Das ist wahrscheinlich eine betruegerische E-Mail. Bitte nicht antworten.",
      spam: "Spam erkannt und entfernt.",
      normal: (name) => `Antwortvorschlag: Vielen Dank fuer Ihre Nachricht, ${name}. Ich melde mich in Kuerze.`,
      askEmail: "Wenn Sie Hilfe mit E-Mails wollen, klicken Sie auf Jetzt analysieren bei einer Karte.",
      askTime: (mins) => `Sie haben heute bereits ${mins} Minuten gespart.`,
      thanks: "Gern geschehen. Ich helfe gerne.",
      default: "Ich kann bei E-Mails, Planung und Zeitersparnis helfen.",
    },
  },
  fr: {
    labels: {
      weather: "15C Zurich",
      characters: "Q Personnages",
      tabs: { email: "Agent Email", planner: "Planificateur", chat: "Chat" },
      savedToday: "Temps gagne aujourd'hui",
      automation: "+48% automatisation IA",
      analyze: "Analyser",
      localProcessing: "Les emails sont traites localement",
      offline: "Mode hors ligne",
      madeForSwiss: "Concu pour la Suisse",
      aiHandling: "IA en charge",
      send: "Envoyer",
      chatPlaceholder: "Ecrire un message... (Anglais, Allemand, Francais, Persan)",
      footer: "Confidentialite d'abord • Hors ligne • Concu pour la Suisse",
      language: "Langue",
    },
    categories: {
      work: "Travail",
      spam: "Spam",
      scam: "Fraude",
      personal: "Personnel",
      newsletter: "Newsletter",
      scamBadge: "Fraude",
    },
    replies: {
      scam: "Alerte: cet email semble frauduleux. Ne repondez pas.",
      spam: "Spam detecte et supprime.",
      normal: (name) => `Reponse suggeree: Merci pour votre message, ${name}. Je vous reponds rapidement.`,
      askEmail: "Pour l'aide email, cliquez sur Analyser sur une carte email.",
      askTime: (mins) => `Vous avez deja economise ${mins} minutes aujourd'hui.`,
      thanks: "Avec plaisir. Je suis la pour aider.",
      default: "Je peux aider avec les emails, la planification et le gain de temps.",
    },
  },
  fa: {
    labels: {
      weather: "15C Zurich",
      characters: "شخصیت های Q",
      tabs: { email: "عامل ایمیل", planner: "برنامه ریز", chat: "چت" },
      savedToday: "زمان ذخیره شده امروز",
      automation: "+48% خودکارسازی هوش مصنوعی",
      analyze: "تحلیل",
      localProcessing: "ایمیل ها به صورت محلی پردازش می شوند",
      offline: "آماده آفلاین",
      madeForSwiss: "ساخته شده برای سوییس",
      aiHandling: "هوش مصنوعی انجام می دهد",
      send: "ارسال",
      chatPlaceholder: "پیام بنویسید... (English, Deutsch, Francais, فارسی)",
      footer: "حریم خصوصی اول • آفلاین • برای سوییس",
      language: "زبان",
    },
    categories: {
      work: "کاری",
      spam: "هرزنامه",
      scam: "کلاهبرداری",
      personal: "شخصی",
      newsletter: "خبرنامه",
      scamBadge: "کلاهبرداری",
    },
    replies: {
      scam: "هشدار: این ایمیل مشکوک به کلاهبرداری است. پاسخ ندهید.",
      spam: "هرزنامه شناسایی و حذف شد.",
      normal: (name) => `پاسخ پیشنهادی: از پیام شما متشکرم، ${name}. به زودی پاسخ می دهم.`,
      askEmail: "برای کمک ایمیل، روی دکمه تحلیل در هر کارت ایمیل بزنید.",
      askTime: (mins) => `شما امروز ${mins} دقیقه صرفه جویی کرده اید.`,
      thanks: "خواهش می کنم. خوشحال می شوم کمک کنم.",
      default: "من می توانم در ایمیل، برنامه ریزی و صرفه جویی زمان کمک کنم.",
    },
  },
};

function detectInputLanguage(text: string, fallbackLocale: Locale): Locale {
  const t = text.trim().toLowerCase();
  if (!t) return fallbackLocale;

  // Persian/Arabic script detection
  if (/[\u0600-\u06FF]/.test(t)) return "fa";

  // French keywords
  if (/\b(bonjour|merci|mail|courriel|temps|plan|bonjour)\b/.test(t)) return "fr";

  // German keywords
  if (/\b(hallo|danke|zeit|mail|e-?mail|planen|gruezi|grueezi)\b/.test(t)) return "de";

  return "en";
}

function pickCategoryLabel(email: EmailItem, locale: Locale): string {
  const dict = I18N[locale].categories;
  if (email.isScam) return dict.scamBadge;
  return dict[email.category];
}

function pickSpeechLang(locale: Locale): string {
  if (locale === "de") return "de-CH";
  if (locale === "fr") return "fr-FR";
  if (locale === "fa") return "fa-IR";
  return "en-US";
}

const QSwissLanding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("email");
  const [locale, setLocale] = useState<Locale>("en");
  const [emails, setEmails] = useState<EmailItem[]>(initialEmails);
  const [tasks] = useState<TaskItem[]>(initialTasks);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const t = I18N[locale];

  const savedTime = useMemo(
    () => tasks.reduce((acc, task) => acc + (task.aiDuration || 0), 0),
    [tasks],
  );

  const speak = (text: string, langLocale: Locale = locale) => {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = pickSpeechLang(langLocale);
    utterance.rate = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const preferred = utterance.lang.split("-")[0];
    const voiceMatch =
      voices.find((voice) => voice.lang === utterance.lang) ||
      voices.find((voice) => voice.lang.startsWith(preferred));

    if (voiceMatch) utterance.voice = voiceMatch;
    window.speechSynthesis.speak(utterance);
  };

  const handleAnalyzeEmail = (id: number) => {
    const email = emails.find((item) => item.id === id);
    if (!email) return;

    let reply = "";
    if (email.isScam) {
      reply = t.replies.scam;
      setEmails((prev) => prev.filter((item) => item.id !== id));
    } else if (email.category === "spam") {
      reply = t.replies.spam;
      setEmails((prev) => prev.filter((item) => item.id !== id));
    } else {
      reply = t.replies.normal(email.from.split("@")[0]);
    }

    setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    speak(reply, locale);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const inputText = chatInput.trim();
    const replyLocale = detectInputLanguage(inputText, locale);
    const tr = I18N[replyLocale].replies;

    setChatMessages((prev) => [...prev, { role: "user", content: inputText }]);

    const lower = inputText.toLowerCase();
    let reply = "";

    if (lower.includes("email") || lower.includes("mail") || lower.includes("ایمیل") || lower.includes("courriel")) {
      reply = tr.askEmail;
    } else if (lower.includes("time") || lower.includes("zeit") || lower.includes("temps") || lower.includes("زمان")) {
      reply = tr.askTime(savedTime);
    } else if (lower.includes("thanks") || lower.includes("thank you") || lower.includes("danke") || lower.includes("merci") || lower.includes("ممنون")) {
      reply = tr.thanks;
    } else {
      reply = tr.default;
    }

    setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    speak(reply, replyLocale);
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white font-sans antialiased">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
              <span className="text-lg font-bold text-white">Q</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Q-Swiss</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-slate-500">
              <CloudSun size={16} /> {t.labels.weather}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              {t.labels.language}
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Francais</option>
                <option value="fa">فارسی</option>
              </select>
            </label>
            <Link
              to="/swiss-characters"
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              {t.labels.characters}
            </Link>
            <Link
              to="/character/globe"
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
            >
              Globe
            </Link>
            <Link
              to="/character/advanced"
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              Advanced
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl gap-8 px-6">
          {[
            { id: "email", label: t.labels.tabs.email, icon: Mail },
            { id: "planner", label: t.labels.tabs.planner, icon: Calendar },
            { id: "chat", label: t.labels.tabs.chat, icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <tab.icon size={16} /> {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">{t.labels.savedToday}</p>
            <p className="text-3xl font-bold text-blue-700">
              {Math.floor(savedTime / 60)}h {savedTime % 60}m
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-emerald-600 shadow-sm">
            <TrendingUp size={16} /> {t.labels.automation}
          </div>
        </div>

        {activeTab === "email" && (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{email.from}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          email.isScam
                            ? "bg-red-100 text-red-700"
                            : email.category === "spam"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {pickCategoryLabel(email, locale)}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-700">{email.subject}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{email.preview}</p>
                  </div>
                  <button
                    onClick={() => handleAnalyzeEmail(email.id)}
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 transition hover:bg-blue-100"
                  >
                    <CheckCircle size={14} /> {t.labels.analyze}
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-center gap-6 text-center text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Shield size={12} /> {t.labels.localProcessing}
              </span>
              <span className="flex items-center gap-1">
                <Wifi size={12} /> {t.labels.offline}
              </span>
              <span>{t.labels.madeForSwiss}</span>
            </div>
          </div>
        )}

        {activeTab === "planner" && (
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-slate-400">{task.time}</span>
                  <div>
                    <p className="font-medium text-slate-700">{task.title}</p>
                    <p className="text-xs text-slate-400">
                      {task.duration} min {task.aiDuration > 0 && `(${task.aiDuration} min saved by AI)`}
                    </p>
                  </div>
                </div>
                {task.aiDuration > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                    {t.labels.aiHandling}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="h-96 space-y-3 overflow-y-auto p-5">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder={t.labels.chatPlaceholder}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              <button
                onClick={handleSendChat}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm text-white transition hover:bg-blue-700"
              >
                {t.labels.send}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>{t.labels.footer}</p>
        <p className="mt-1">Powered by Q-Swiss AI • qmetaram.com</p>
      </footer>
    </div>
  );
};

export default QSwissLanding;

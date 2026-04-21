// src/hooks/useVoiceEngine.ts
// موتور صدا برای مرکز فرماندهی — Web Speech API (TTS)
// شورای نور: استیو جابز (سادگی) + ابن‌سینا (طبیعی بودن صدا)

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceGender = 'female' | 'male';

export interface VoiceEngineState {
  speaking: boolean;
  voiceGender: VoiceGender;
  voiceReady: boolean;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
}

export interface VoiceEngineActions {
  speak: (text: string, lang?: string) => void;
  stop: () => void;
  setGender: (g: VoiceGender) => void;
  selectVoice: (index: number) => void;
  announce: (message: string) => void;
}

// پیام‌های آماده فرماندهی (فارسی + انگلیسی)
export const COMMAND_PHRASES = {
  systemReady:    'سیستم QNet آماده است. تمام لایه‌های امنیتی فعال.',
  attackDetected: 'هشدار! حمله شبکه‌ای شناسایی شد. لایه‌های دفاعی در حال اجرا.',
  nodeOffline:    'یک گره شبکه قطع شده است. در حال بازیابی...',
  pilotStarted:   'Production Pilot شروع شد. ده گره فعال.',
  allClear:       'وضعیت پاک. تمام گره‌ها آنلاین. تهدیدی شناسایی نشد.',
  rlLearning:     'سیستم یادگیری تقویتی در حال به‌روزرسانی مدل.',
};

export function useVoiceEngine(): VoiceEngineState & VoiceEngineActions {
  const [speaking,            setSpeaking]           = useState(false);
  const [voiceGender,         setVoiceGenderState]   = useState<VoiceGender>('female');
  const [availableVoices,     setAvailableVoices]    = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex,  setSelectedVoiceIndex] = useState(0);
  const [voiceReady,          setVoiceReady]         = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // بارگذاری صداها
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // ترتیب اولویت: فارسی، عربی، انگلیسی
      const sorted = [...voices].sort((a, b) => {
        const aLang = a.lang.toLowerCase();
        const bLang = b.lang.toLowerCase();
        if (aLang.startsWith('fa') && !bLang.startsWith('fa')) return -1;
        if (!aLang.startsWith('fa') && bLang.startsWith('fa'))  return 1;
        if (aLang.startsWith('ar') && !bLang.startsWith('ar')) return -1;
        if (!aLang.startsWith('ar') && bLang.startsWith('ar'))  return 1;
        return 0;
      });

      setAvailableVoices(sorted);
      setVoiceReady(true);

      // انتخاب اولیه بر اساس جنسیت
      pickVoiceByGender(sorted, voiceGender);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => { window.speechSynthesis.onvoiceschanged = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickVoiceByGender = useCallback(
    (voices: SpeechSynthesisVoice[], gender: VoiceGender) => {
      if (voices.length === 0) return;
      const keywords = gender === 'female'
        ? ['female', 'woman', 'zira', 'cortana', 'samira', 'sara', 'google us english', 'microsoft zira']
        : ['male', 'man', 'david', 'mark', 'ali', 'microsoft david', 'google uk'];

      let idx = voices.findIndex(v =>
        keywords.some(k => v.name.toLowerCase().includes(k)),
      );
      if (idx === -1) idx = gender === 'female' ? 0 : Math.min(1, voices.length - 1);
      setSelectedVoiceIndex(idx);
    },
    [],
  );

  const setGender = useCallback(
    (g: VoiceGender) => {
      setVoiceGenderState(g);
      pickVoiceByGender(availableVoices, g);
    },
    [availableVoices, pickVoiceByGender],
  );

  const selectVoice = useCallback((index: number) => {
    setSelectedVoiceIndex(index);
  }, []);

  const speak = useCallback(
    (text: string, lang = 'fa-IR') => {
      if (!window.speechSynthesis || !text) return;
      window.speechSynthesis.cancel();

      const utter    = new SpeechSynthesisUtterance(text);
      utter.lang     = lang;
      utter.rate     = 0.92;
      utter.pitch    = voiceGender === 'female' ? 1.2 : 0.85;
      utter.volume   = 1;

      if (availableVoices[selectedVoiceIndex]) {
        utter.voice = availableVoices[selectedVoiceIndex];
        // اگر صدا فارسی نداشت، زبان را انگلیسی بگذار
        const vLang = availableVoices[selectedVoiceIndex].lang;
        if (!vLang.startsWith('fa') && lang === 'fa-IR') {
          utter.lang = vLang;
        }
      }

      utter.onstart = () => setSpeaking(true);
      utter.onend   = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [availableVoices, selectedVoiceIndex, voiceGender],
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // announce = speak + پیام وضعیت
  const announce = useCallback(
    (message: string) => speak(message),
    [speak],
  );

  return {
    speaking,
    voiceGender,
    voiceReady,
    availableVoices,
    selectedVoiceIndex,
    speak,
    stop,
    setGender,
    selectVoice,
    announce,
  };
}

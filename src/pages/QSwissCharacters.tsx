import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Link, useLocation } from "react-router-dom";
import { speakHybrid, unlockAudio, type VoiceEmotion } from "@/lib/voiceEngine";
import { fetchCloudMemory, getOrCreateUserId, saveCloudMemory } from "@/lib/cloudMemoryClient";
import {
  buildMemoryContext,
  extractUserMemory,
  loadConversationHistory,
  loadUserMemory,
  saveConversationHistory,
  saveUserMemory,
  type ChatTurn,
  type UserMemory,
} from "@/lib/memoryEngine";
import { minimiseContext, sanitiseMessage } from "@/lib/chat-context";

type EyePair = {
  left: THREE.Mesh;
  right: THREE.Mesh;
};

type EmotionKey = "neutral" | "happy" | "sad" | "angry" | "calm" | "serious";

type EmotionConfig = {
  eyeScale: number;
  speed: number;
  glow: number;
  color: number;
  phrase: string;
};

const EMOTIONS: Record<EmotionKey, EmotionConfig> = {
  neutral: {
    eyeScale: 1,
    speed: 1,
    glow: 0.65,
    color: 0x22d3ee,
    phrase: "Ø¯Ø± Ø­Ø§Ù„Øª Ù¾Ø§ÛŒØ¯Ø§Ø± Ù‡Ø³ØªÙ….",
  },
  happy: {
    eyeScale: 1.28,
    speed: 1.45,
    glow: 1,
    color: 0x22c55e,
    phrase: "Ø§Ù†Ø±Ú˜ÛŒ Ù…Ø«Ø¨Øª ÙØ¹Ø§Ù„ Ø´Ø¯.",
  },
  sad: {
    eyeScale: 0.72,
    speed: 0.58,
    glow: 0.35,
    color: 0x3b82f6,
    phrase: "Ù…Ù† Ú©Ù†Ø§Ø± ØªÙˆ Ù‡Ø³ØªÙ…. Ø¨Ø§ Ù‡Ù… Ø¢Ø±Ø§Ù… Ù¾ÛŒØ´ Ù…ÛŒâ€ŒØ±ÙˆÛŒÙ….",
  },
  angry: {
    eyeScale: 1.12,
    speed: 1.9,
    glow: 1.35,
    color: 0xef4444,
    phrase: "Ù‚Ø¯Ø±Øª Ø¨Ø§Ù„Ø§ Ø±ÙØª. ØªÙ…Ø±Ú©Ø² Ú©Ù†ÛŒÙ… Ùˆ Ø¹Ù…Ù„ Ú©Ù†ÛŒÙ….",
  },
  calm: {
    eyeScale: 0.92,
    speed: 0.82,
    glow: 0.5,
    color: 0x38bdf8,
    phrase: "Ø¨Ø§ Ø¢Ø±Ø§Ù…Ø´ Ø§Ø¯Ø§Ù…Ù‡ Ù…ÛŒâ€ŒØ¯Ù‡ÛŒÙ….",
  },
  serious: {
    eyeScale: 1.02,
    speed: 0.95,
    glow: 0.8,
    color: 0xf59e0b,
    phrase: "Ø­Ø§Ù„Øª Ø¬Ø¯ÛŒ ÙØ¹Ø§Ù„ Ø§Ø³Øª. Ø¯Ù‚ÛŒÙ‚ Ù¾ÛŒØ´ Ù…ÛŒâ€ŒØ±ÙˆÛŒÙ….",
  },
};

function pickEmotionFromText(text: string): EmotionKey {
  if (text.includes("Ø¯ÙˆØ³ØªØª Ø¯Ø§Ø±Ù…") || text.includes("Ø®ÙˆØ´Ø­Ø§Ù„Ù…") || text.includes("Ø¹Ø§Ù„ÛŒÙ‡")) return "happy";
  if (text.includes("Ù†Ø§Ø±Ø§Ø­ØªÙ…") || text.includes("ØºÙ…Ú¯ÛŒÙ†") || text.includes("Ø­Ø§Ù„Ù… Ø¨Ø¯Ù‡")) return "sad";
  if (text.includes("Ø¹ØµØ¨Ø§Ù†ÛŒ") || text.includes("Ú©Ù„Ø§ÙÙ‡") || text.includes("Ø®Ø´Ù…")) return "angry";
  return "neutral";
}

function normalizeEmotion(emotion: string): EmotionKey {
  const e = emotion.toLowerCase();
  if (e === "happy" || e === "sad" || e === "angry" || e === "calm" || e === "serious") return e;
  return "neutral";
}

export default function QSwissCharacters() {
  const location = useLocation();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionKey>("neutral");
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(
    () => (typeof window !== "undefined" ? (localStorage.getItem("q_eleven_key") ?? "") : ""),
  );
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const userIdRef = useRef<string>(typeof window !== "undefined" ? getOrCreateUserId() : "guest");
  const conversationHistoryRef = useRef<ChatTurn[]>(
    typeof window !== "undefined" ? loadConversationHistory() : [],
  );
  const userMemoryRef = useRef<UserMemory>(
    typeof window !== "undefined" ? loadUserMemory() : { interests: [] },
  );

  const emotionRef = useRef<EmotionKey>("neutral");
  const isListeningRef = useRef(false);
  const mouthRef = useRef<THREE.Mesh | null>(null);

  const viewMode = location.pathname.includes("/character/globe")
    ? "globe"
    : location.pathname.includes("/character/advanced")
      ? "advanced"
      : "hub";

  // Unlock AudioContext on first click
  useEffect(() => {
    const handler = () => { unlockAudio(); document.removeEventListener("click", handler); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Keep ElevenLabs key synced for voice engine
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("q_eleven_key", elevenLabsKey);
  }, [elevenLabsKey]);

  // â”€â”€â”€ AI Backend Call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getAIResponse = useCallback(async (text: string): Promise<{ text: string; emotion: EmotionKey }> => {
    try {
      const cloud = await fetchCloudMemory(userIdRef.current);
      const cloudHints = cloud
        ? `Cloud Memory:\nName: ${cloud.profile?.name ?? "unknown"}\nLanguage: ${cloud.profile?.language ?? "unknown"}\nInterests: ${(cloud.interests || []).join(", ") || "unknown"}`
        : "Cloud Memory: unavailable";
      const context = `${buildMemoryContext(userMemoryRef.current)}\n${cloudHints}`;
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${context}\n\nUser says: ${text}`,
          history: minimiseContext(conversationHistoryRef.current),
          userId: userIdRef.current,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { text: data.text ?? text, emotion: normalizeEmotion(data.emotion ?? "neutral") };
    } catch {
      // Offline fallback: local emotion-based reply
      const emo = pickEmotionFromText(text);
      return { text: EMOTIONS[emo].phrase, emotion: emo };
    }
  }, []);

  // â”€â”€â”€ processVoiceCommand (STT â†’ AI â†’ TTS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const processVoiceCommand = useCallback(async (txt: string) => {
    setLastTranscript(txt);
    setAiThinking(true);

    userMemoryRef.current = extractUserMemory(txt, userMemoryRef.current);
    saveUserMemory(userMemoryRef.current);
    void saveCloudMemory(userIdRef.current, { type: "fact", content: txt, source: "voice-user" });

    // Sanitise before storing (redact PII)
    const sanitisedTxt = sanitiseMessage(txt);
    conversationHistoryRef.current.push({ role: "user", content: sanitisedTxt });
    saveConversationHistory(conversationHistoryRef.current);

    try {
      const { text: reply, emotion } = await getAIResponse(sanitisedTxt);

      conversationHistoryRef.current.push({ role: "assistant", content: reply });
      saveConversationHistory(conversationHistoryRef.current);
      void saveCloudMemory(userIdRef.current, { type: "fact", content: reply, source: "voice-assistant" });

      setCurrentEmotion(emotion);
      await speakHybrid(reply, emotion as VoiceEmotion);
    } finally {
      setAiThinking(false);
    }
  }, [getAIResponse]);

  useEffect(() => {
    emotionRef.current = currentEmotion;
  }, [currentEmotion]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 8.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x7dd3fc, 0.55);
    const key = new THREE.PointLight(0x22d3ee, 1.15, 30);
    key.position.set(3, 4, 6);
    const rim = new THREE.PointLight(0x818cf8, 0.8, 30);
    rim.position.set(-4, 2, -3);
    scene.add(ambient, key, rim);

    const root = new THREE.Group();
    scene.add(root);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 42, 42),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.65 }),
    );
    head.position.y = 1.9;

    const facePlate = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 42, 42, 0.25, Math.PI - 0.5, 0.25, Math.PI - 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.05, roughness: 0.35, transparent: true, opacity: 0.82 }),
    );
    facePlate.position.z = 0.18;
    head.add(facePlate);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x164e63, emissiveIntensity: 1.1 });
    const eyes: EyePair = {
      left: new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), eyeMaterial.clone()),
      right: new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), eyeMaterial.clone()),
    };
    eyes.left.position.set(-0.42, 0.08, 1.16);
    eyes.right.position.set(0.42, 0.08, 1.16);
    head.add(eyes.left, eyes.right);

    // Mouth for lip sync
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.1 }),
    );
    mouth.position.set(0, -0.58, 1.2);
    mouth.scale.set(1.1, 0.28, 0.52);
    head.add(mouth);
    mouthRef.current = mouth;

    const bodyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x06b6d4) },
        accentColor: { value: new THREE.Color(0x818cf8) },
        glowPower: { value: 0.65 },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 p = position;
          float wave1 = sin((p.y * 3.5) + (time * 1.8)) * 0.12;
          float wave2 = cos((p.x * 4.0) + (time * 1.1)) * 0.07;
          p.x += wave1;
          p.z += wave2;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 accentColor;
        uniform float glowPower;
        varying vec2 vUv;

        void main() {
          float pulse = 0.55 + 0.45 * sin((vUv.y * 12.0) + (vUv.x * 6.0));
          vec3 color = mix(baseColor, accentColor, vUv.y);
          gl_FragColor = vec4(color * pulse * glowPower, 0.95);
        }
      `,
      transparent: true,
    });

    const fluidBody = new THREE.Mesh(new THREE.SphereGeometry(1.35, 58, 58), bodyMaterial);
    fluidBody.position.y = -0.2;
    fluidBody.scale.set(1.1, 1.35, 0.9);

    const bodySpine = new THREE.Group();
    for (let i = 0; i < 120; i++) {
      const t = i * 0.19;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.032 + (i % 4) * 0.003, 8, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22d3ee : 0x93c5fd, transparent: true, opacity: 0.8 }),
      );
      m.position.set(Math.cos(t) * 1.05, -1.2 - i * 0.028, Math.sin(t) * 1.05);
      bodySpine.add(m);
    }

    const energyBase = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.3, 80),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
    );
    energyBase.rotation.x = -Math.PI / 2;
    energyBase.position.y = -4.95;

    root.add(head, fluidBody, bodySpine, energyBase);

    const mouse = { x: 0, y: 0 };
    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", onPointerMove);

    const clock = new THREE.Clock();
    let rafId = 0;
    let smoothEyeScale = 1;
    let smoothSpeed = 1;
    let smoothGlow = 0.65;
    const smoothColor = new THREE.Color(0x22d3ee);

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const t = clock.getElapsedTime();
      const cfg = EMOTIONS[emotionRef.current];

      smoothEyeScale += (cfg.eyeScale - smoothEyeScale) * 0.08;
      smoothSpeed += (cfg.speed - smoothSpeed) * 0.08;
      smoothGlow += (cfg.glow - smoothGlow) * 0.08;
      smoothColor.lerp(new THREE.Color(cfg.color), 0.08);

      bodyMaterial.uniforms.time.value = t;
      bodyMaterial.uniforms.glowPower.value = smoothGlow;
      bodyMaterial.uniforms.baseColor.value = smoothColor;
      bodyMaterial.uniforms.accentColor.value = smoothColor.clone().lerp(new THREE.Color(0xffffff), 0.35);

      root.rotation.y = Math.sin(t * 0.26 * smoothSpeed) * 0.2;
      root.position.y = Math.sin(t * 1.7 * smoothSpeed) * 0.06;

      const pupilTarget = new THREE.Vector3(mouse.x * 1.1, 1.9 + mouse.y * 0.55, 7.8);
      eyes.left.lookAt(pupilTarget);
      eyes.right.lookAt(pupilTarget);

      const blink = 1 - Math.max(0, Math.sin(t * 1.9 + 1.2)) * 0.2;
      eyes.left.scale.set(smoothEyeScale, blink * smoothEyeScale, smoothEyeScale);
      eyes.right.scale.set(smoothEyeScale, blink * smoothEyeScale, smoothEyeScale);
      (eyes.left.material as THREE.MeshStandardMaterial).color.copy(smoothColor);
      (eyes.right.material as THREE.MeshStandardMaterial).color.copy(smoothColor);
      (eyes.left.material as THREE.MeshStandardMaterial).emissive.copy(smoothColor);
      (eyes.right.material as THREE.MeshStandardMaterial).emissive.copy(smoothColor);

      energyBase.rotation.z += 0.007;
      energyBase.scale.setScalar(1 + Math.sin(t * (2.2 * smoothSpeed)) * 0.08 * smoothGlow);

      // Subtle idle mouth animation keeps the avatar alive between speech turns.
      if (mouthRef.current) {
        const idle = 0.035 * (1 + Math.sin(t * 2.8 * smoothSpeed));
        mouthRef.current.scale.y = 0.3 + idle;
        mouthRef.current.scale.x = 1.1 + idle * 0.35;
      }

      renderer.render(scene, camera);
    };
    animate();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any = null;

    if (SR) {
      recognition = new SR();
      recognition.lang = "fa-IR";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const txt = String(event.results[event.results.length - 1][0].transcript || "").trim();
        if (!txt) return;
        processVoiceCommand(txt);
      };
      recognition.onend = () => {
        if (isListeningRef.current) {
          recognition.start();
          return;
        }
        setListening(false);
      };
    }

    const toggleListening = () => {
      if (!recognition) return;
      if (isListeningRef.current) {
        isListeningRef.current = false;
        recognition.stop();
        setListening(false);
        return;
      }
      isListeningRef.current = true;
      recognition.start();
      setListening(true);
    };

    const onVoiceToggle = () => toggleListening();
    window.addEventListener("q-voice-toggle", onVoiceToggle as EventListener);

    const onEmotionSet = (ev: Event) => {
      const customEv = ev as CustomEvent<EmotionKey>;
      if (!customEv.detail) return;
      setCurrentEmotion(customEv.detail);
      speakHybrid(EMOTIONS[customEv.detail].phrase, customEv.detail as VoiceEmotion);
    };
    window.addEventListener("q-emotion-set", onEmotionSet as EventListener);

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      if (recognition) {
        isListeningRef.current = false;
        recognition.stop();
      }
      window.removeEventListener("q-voice-toggle", onVoiceToggle as EventListener);
      window.removeEventListener("q-emotion-set", onEmotionSet as EventListener);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("resize", onResize);
      window.speechSynthesis.cancel();
      mouthRef.current = null;
      renderer.dispose();
      bodyMaterial.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const setEmotion = (emotion: EmotionKey) => {
    setCurrentEmotion(emotion);
    window.dispatchEvent(new CustomEvent<EmotionKey>("q-emotion-set", { detail: emotion }));
  };

  const toggleVoice = () => {
    window.dispatchEvent(new Event("q-voice-toggle"));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Q Swiss Character Hub</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">ÙØ¶Ø§ÛŒ Ù…Ø±Ú©Ø²ÛŒ Ú©Ø§Ø±Ú©ØªØ±Ù‡Ø§ÛŒ Q</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Ø§ÛŒÙ† ØµÙØ­Ù‡ Ù…Ø¹Ù…Ø§Ø±ÛŒ ÙˆØ§Ø­Ø¯ÛŒ Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ú©ØªØ±Ù‡Ø§ÛŒ ØµÙØ­Ù‡ Ø³ÙˆØ¦ÛŒØ³ÛŒ Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯: Ù†Ø³Ø®Ù‡ Ú©Ø±Ù‡ Ø²Ù…ÛŒÙ† Ù‚Ø¨Ù„ÛŒ + Ù†Ø³Ø®Ù‡ Ù…ÙˆØ¬ÙˆØ¯ Ø²Ù†Ø¯Ù‡ Ù¾ÛŒØ´Ø±ÙØªÙ‡.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/swiss" className="rounded-lg border border-cyan-400/50 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10">
              Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ Swiss
            </Link>
            <Link to="/character/globe" className="rounded-lg border border-sky-400/40 px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/10">
              Globe Page
            </Link>
            <Link to="/character/advanced" className="rounded-lg border border-indigo-400/40 px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-500/10">
              Advanced Page
            </Link>
            <a href="/q-being.html" className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              Ø¨Ø§Ø²Ú©Ø±Ø¯Ù† Q-Being Ú©Ù„Ø§Ø³ÛŒÚ©
            </a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {viewMode !== "advanced" && (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-lg font-semibold">Ú©Ø§Ø±Ú©ØªØ± Û±: Ú©Ø±Ù‡ Ø²Ù…ÛŒÙ† Ù‚Ø¨Ù„ÛŒ (Legacy Globe)</h2>
              <p className="mt-1 text-xs text-slate-400">Ù‡Ù…Ø§Ù† Ú©Ø§Ø±Ú©ØªØ± Ù‚Ø¯ÛŒÙ…ÛŒ Q Ú©Ù‡ Ø±ÙˆÛŒ q-being Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯.</p>
            </div>
            <iframe
              title="Q Legacy Globe Character"
              src="/q-being.html"
              className="h-[520px] w-full border-0"
              loading="lazy"
            />
          </section>
          )}

          {viewMode !== "globe" && (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-lg font-semibold">Ú©Ø§Ø±Ú©ØªØ± Û²: Ù…ÙˆØ¬ÙˆØ¯ Ù¾ÛŒØ´Ø±ÙØªÙ‡ (Eyes + Fluid Body)</h2>
              <p className="mt-1 text-xs text-slate-400">Ø¨Ø¯Ù† Ø³ÛŒØ§Ù„ØŒ Ú†Ø´Ù…â€ŒÙ‡Ø§ÛŒ ÙˆØ§Ú©Ù†Ø´ÛŒØŒ ØªÙ†ÙØ³ØŒ Ø§Ø­Ø³Ø§Ø³ Ùˆ Ø´Ø®ØµÛŒØª ØµÙˆØªÛŒ Ú©ÙˆØ¯Ú©Ø§Ù†Ù‡-ÙØ¶Ø§ÛŒÛŒ.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
              {([
                ["neutral", "Neutral"],
                ["happy", "Happy"],
                ["sad", "Sad"],
                ["angry", "Angry"],
              ] as Array<[EmotionKey, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setEmotion(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${currentEmotion === key ? "bg-cyan-400 text-slate-900" : "border border-slate-700 text-slate-300 hover:border-cyan-400/40"}`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={toggleVoice}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${listening ? "bg-emerald-400 text-slate-900" : "border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"}`}
              >
                {listening ? "Listening..." : "Start Voice"}
              </button>
              <button
                onClick={() => speakQWebSpeech("Gruezi, Q isch bereit.", "neutral")}
                className="rounded-full border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/10"
              >
                Test Voice
              <button
                onClick={() => speakHybrid("Gruezi! Q isch bereit.", "calm")}
                className="rounded-full border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/10"
              >
                Test Voice
              </button>
                ðŸ”‘ ElevenLabs
              </button>
            </div>
            {showKeyInput && (
              <div className="border-b border-slate-800 px-4 py-2 flex items-center gap-2">
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="sk-... (ElevenLabs API Key)"
                  className="flex-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 border border-slate-700 focus:border-yellow-400 outline-none"
                />
                <span className="text-xs text-slate-500">
                  {elevenLabsKey ? "âœ… Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯" : "Ø¨Ø¯ÙˆÙ† Ú©Ù„ÛŒØ¯ = Web Speech"}
                </span>
              </div>
            )}
            <div ref={mountRef} className="h-[520px] w-full" />
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
              <span className="font-semibold text-cyan-300">Emotion:</span> {currentEmotion}
              {aiThinking && (
                <span className="ml-3 animate-pulse text-yellow-300">⏳ در حال فکر کردن...</span>
              )}
              {lastTranscript && !aiThinking && (
                <span className="ml-3">
                  <span className="font-semibold text-violet-300">Voice:</span> {lastTranscript}
                </span>
              )}
            </div>
          </section>
          )}
        </div>
      </div>
    </div>
  );
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
    environment: process.env.NODE_ENV ?? "development",
  });
}

function reportError(scope, error, extras = {}) {
  console.error(scope, error);
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((s) => {
    s.setTag("scope", scope);
    for (const [key, value] of Object.entries(extras)) {
      s.setExtra(key, value);
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

process.on("uncaughtException", (error) => {
  reportError("process.uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  reportError("process.unhandledRejection", reason);
});

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://qmetaram.com",
  "https://www.qmetaram.com",
  "https://qmetaram.ch",
  "https://www.qmetaram.ch",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : []),
]);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("CORS blocked"));
  },
}));
app.use(helmet());
app.use(express.json({ limit: "20mb" }));

const RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS ?? 30);
const AI_RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AI_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS ?? 10);
const rateBuckets = new Map();
const aiRateBuckets = new Map();

function getClientIp(req) {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    return cfIp.trim();
  }
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function apiRateLimiter(req, res, next) {
  const key = `${getClientIp(req)}:${req.path}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED", retryAfterSec });
  }

  bucket.count += 1;
  return next();
}

app.use("/api", apiRateLimiter);

function aiRateLimiter(req, res, next) {
  const key = `${getClientIp(req)}:${req.path}`;
  const now = Date.now();
  const bucket = aiRateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    aiRateBuckets.set(key, { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (bucket.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({ error: "AI_RATE_LIMIT_EXCEEDED", retryAfterSec });
  }

  bucket.count += 1;
  return next();
}

app.use("/api/chat", aiRateLimiter);
app.use("/api/transcribe", aiRateLimiter);
app.use("/api/tts", aiRateLimiter);

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, Math.max(30_000, RATE_LIMIT_WINDOW_MS)).unref?.();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of aiRateBuckets.entries()) {
    if (now > bucket.resetAt) aiRateBuckets.delete(key);
  }
}, Math.max(30_000, AI_RATE_LIMIT_WINDOW_MS)).unref?.();

// P0 fail-close guard at origin: block sensitive probes even if edge rules fail.
const BLOCKED_PATH_FRAGMENTS = ["/.env", "/wp-admin", "/wp-login.php", "/_profiler", "/phpinfo.php"];
app.use((req, res, next) => {
  const p = String(req.path || "").toLowerCase();
  const blocked = BLOCKED_PATH_FRAGMENTS.some((frag) => p.includes(frag));
  if (blocked) {
    return res.status(403).json({ error: "BLOCKED_BY_SECURITY_POLICY" });
  }
  return next();
});

// ─── Guardian: Input Sanitization Middleware ──────────────────────────────────
class GuardianError extends Error {
  constructor(code) { super(code); this.name = "GuardianError"; this.code = code; }
}

const GUARDIAN_PATTERNS = [
  /eval\s*\(/i,
  /__proto__/i,
  /constructor\s*\[/i,
  /\$where/i,
  /<\s*script/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /\bexec\s*\(/i,
  /\bspawn\s*\(/i,
];
const GUARDIAN_MAX_STRING = 50_000;
const GUARDIAN_MAX_DEPTH = 8;

let guardianBlockCount = 0;

function guardianScan(value, depth = 0) {
  if (depth > GUARDIAN_MAX_DEPTH) return;
  if (typeof value === "string") {
    if (value.length > GUARDIAN_MAX_STRING) throw new GuardianError("INPUT_TOO_LONG");
    for (const p of GUARDIAN_PATTERNS) {
      if (p.test(value)) throw new GuardianError("BLOCKED_PATTERN");
    }
  } else if (Array.isArray(value)) {
    for (const v of value) guardianScan(v, depth + 1);
  } else if (value !== null && typeof value === "object") {
    for (const k of Object.keys(value)) {
      guardianScan(k, depth + 1);
      guardianScan(value[k], depth + 1);
    }
  }
}

function guardianMiddleware(req, res, next) {
  try {
    if (req.body && typeof req.body === "object") guardianScan(req.body);
    if (req.query && typeof req.query === "object") guardianScan(req.query);
    next();
  } catch (err) {
    if (err instanceof GuardianError) {
      guardianBlockCount += 1;
      console.warn(`[GUARDIAN] blocked request: ${err.message} | IP: ${getClientIp(req)} | path: ${req.path}`);
      return res.status(400).json({ error: "GUARDIAN_BLOCKED", reason: err.message });
    }
    next(err);
  }
}

app.use("/api", guardianMiddleware);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Supabase (service-role, backend-only) ────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[Q-API] FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
// ─── Auth Middleware (Supabase JWT) ─────────────────────────────────────────
// Set REQUIRE_AUTH=true in .env to enforce JWT on /memory and /conversations endpoints.
// When false (default), a warning is logged and userId from URL params is used.
const REQUIRE_AUTH = process.env.REQUIRE_AUTH === "true";

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    if (REQUIRE_AUTH) {
      return res.status(401).json({ error: "UNAUTHORIZED", hint: "Authorization: Bearer <supabase-token>" });
    }
    console.warn(`[AUTH] Unauthenticated access to ${req.path} from ${getClientIp(req)} — set REQUIRE_AUTH=true to enforce`);
    return next();
  }
  const token = authHeader.slice(7).trim();
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }
    req.user = user;
    next();
  } catch (err) {
    reportError("requireAuth", err);
    return res.status(500).json({ error: "AUTH_ERROR" });
  }
}

const ALLOWED_EMOTIONS = new Set(["neutral", "happy", "calm", "sad", "angry", "serious"]);
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview";
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? "alloy";
const REALTIME_INSTRUCTIONS = [
  "You are Q Swiss Voice.",
  "Speak naturally, precisely, and briefly.",
  "Use German by default unless the user clearly switches language.",
  "Allow barge-in and keep a calm, analytical tone.",
].join(" ");
// ─── Supabase user_memory helpers ───────────────────────────────────────────

async function getUser(userId) {
  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { userId, profile: {}, interests: [], memory: [], updatedAt: 0 };
  return {
    userId: data.user_id,
    profile: data.profile ?? {},
    interests: Array.isArray(data.interests) ? data.interests : [],
    memory: Array.isArray(data.memory) ? data.memory : [],
    updatedAt: data.updated_at ?? 0,
  };
}

async function saveUser(user) {
  const { error } = await supabase
    .from("user_memory")
    .upsert(
      {
        user_id: user.userId,
        profile: user.profile,
        interests: user.interests,
        memory: user.memory,
        updated_at: user.updatedAt,
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

async function getConversation(userId, title = "default") {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, messages, created_at, updated_at")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      userId,
      title,
      messages: [],
    };
  }
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function saveConversation({ userId, title = "default", messages = [] }) {
  const trimmed = (Array.isArray(messages) ? messages : []).slice(-200);
  const { error } = await supabase
    .from("conversations")
    .upsert(
      {
        user_id: userId,
        title,
        messages: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,title" }
    );
  if (error) throw error;
}

function calculatePriority(entry) {
  const text = String(entry.content ?? "").toLowerCase();
  let score = 0.25;

  if (entry.type === "fact") score += 0.25;
  if (entry.type === "preference") score += 0.2;
  if (entry.type === "identity") score += 0.3;
  if (entry.bookmarked) score += 0.25;
  if (entry.liked) score += 0.15;
  if (/فوری|مهم|urgent|important|critical/.test(text)) score += 0.15;
  if (String(entry.content ?? "").length > 120) score += 0.08;

  return Math.min(1, Number(score.toFixed(2)));
}

function extractProfileHints(text) {
  const hints = { profile: {}, interests: [] };
  const nameMatch = String(text).match(/(?:اسم من|name is|ich hei(?:s|ß)e|benim ad(?:ı|im))\s+([^.!؟?\n]{2,32})/i);
  if (nameMatch?.[1]) hints.profile.name = nameMatch[1].trim();

  if (/[\u0600-\u06FF]/.test(text)) hints.profile.language = "fa";
  else if (/[äöüß]/i.test(text) || /\bhallo\b|\bdeutsch\b/i.test(text)) hints.profile.language = "de";
  else if (/[ğüşöçıİĞÜŞÖÇ]/.test(text) || /\bmerhaba\b|\bturk(?:ce|ish)?\b/i.test(text)) hints.profile.language = "tr";
  else if (/\bhello\b|\benglish\b|\bhi\b/i.test(text)) hints.profile.language = "en";

  const interestMatch = String(text).match(/(?:علاقه دارم به|i like|i am interested in|ich mag|interessiere mich f[üu]r|ilgi alan[ıi]m)\s+([^.!؟?\n]{2,60})/i);
  if (interestMatch?.[1]) hints.interests.push(interestMatch[1].trim());

  return hints;
}

function formatTopMemory(user, limit = 8) {
  const top = [...user.memory]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, limit)
    .map((m) => `- (${m.type}) ${m.content}`)
    .join("\n");
  return top || "- none";
}

function mergeUniqueInterests(current, incoming) {
  const out = [...current];
  for (const it of incoming) {
    if (!out.some((x) => x.toLowerCase() === String(it).toLowerCase())) out.push(it);
  }
  return out;
}

function redactSensitiveText(value) {
  return String(value ?? "")
    .replace(/\b[\w.+%-]+@[\w-]+\.[a-zA-Z]{2,}\b/g, "[EMAIL]")
    .replace(/\b(\+?\d[\d\s\-.()]{7,15}\d)\b/g, "[PHONE]")
    .slice(0, 2000);
}

function minimiseHistory(history) {
  return (Array.isArray(history) ? history : [])
    .slice(-5)
    .map((h) => ({
      role: h?.role === "assistant" ? "assistant" : "user",
      content: redactSensitiveText(h?.content),
    }));
}


app.get("/api/realtime/session", async (_req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        modalities: ["audio", "text"],
        instructions: REALTIME_INSTRUCTIONS,
        turn_detection: { type: "server_vad" },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json({
      ...data,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      endpoint: `https://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
    });
  } catch (error) {
    reportError("/api/realtime/session", error);
    return res.status(500).json({ error: "realtime session failed" });
  }
});

app.get("/memory/:userId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.params.userId;
    const user = await getUser(userId);
    return res.json(user);
  } catch (err) {
    reportError("/memory GET", err, { userId: req.params?.userId });
    return res.status(500).json({ error: "memory read failed" });
  }
});

app.post("/memory/:userId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.params.userId;
    const { profile, newMemory } = req.body ?? {};

    const user = await getUser(userId);

    if (profile && typeof profile === "object") {
      user.profile = { ...user.profile, ...profile };
    }

    if (newMemory && typeof newMemory === "object") {
      const entry = {
        type: newMemory.type ?? "fact",
        content: String(newMemory.content ?? "").trim(),
        source: newMemory.source ?? "client",
        liked: Boolean(newMemory.liked),
        bookmarked: Boolean(newMemory.bookmarked),
        priority: calculatePriority(newMemory),
        timestamp: Date.now(),
      };
      if (entry.content) user.memory.push(entry);
    }

    if (user.memory.length > 1000) {
      user.memory = [...user.memory]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .slice(0, 800);
    }

    user.updatedAt = Date.now();
    await saveUser(user);
    return res.json({ status: "ok" });
  } catch (err) {
    reportError("/memory POST", err, { userId: req.params?.userId });
    return res.status(500).json({ error: "memory write failed" });
  }
});

app.get("/api/conversations/:userId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.params.userId;
    const { title = "default" } = req.query;
    const conversation = await getConversation(userId, String(title));
    return res.json(conversation);
  } catch (err) {
    reportError("/api/conversations GET", err, { userId: req.params?.userId });
    return res.status(500).json({ error: "conversation read failed" });
  }
});

app.post("/api/conversations/:userId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.params.userId;
    const { title = "default", messages = [] } = req.body ?? {};
    await saveConversation({ userId, title: String(title), messages });
    return res.json({ status: "ok" });
  } catch (err) {
    reportError("/api/conversations POST", err, { userId: req.params?.userId });
    return res.status(500).json({ error: "conversation write failed" });
  }
});

/**
 * POST /api/transcribe
 * Body: { audioBase64: string, mimeType?: string, language?: string }
 * Response: { text: string }
 */
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "de" } = req.body ?? {};

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const binary = Buffer.from(audioBase64, "base64");
    if (!binary.length) {
      return res.status(400).json({ error: "invalid audio payload" });
    }

    const file = await toFile(binary, "voice-input.webm", { type: mimeType });
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      language: String(language || "de").slice(0, 8),
    });

    return res.json({ text: String(transcript.text || "").trim() });
  } catch (error) {
    reportError("/api/transcribe", error);
    return res.status(500).json({ error: "transcription failed" });
  }
});

/**
 * POST /api/chat
 * Body: { message: string, history?: {role, content}[] }
 * Response: { text: string, emotion: string }
 */
/**
 * POST /api/tts
 * Body: { text: string, voice?: string, speed?: number }
 * Response: audio/mpeg stream
 */
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "alloy", speed = 0.95 } = req.body ?? {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    }
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: ["alloy","echo","fable","onyx","nova","shimmer"].includes(String(voice)) ? String(voice) : "alloy",
      input: String(text).slice(0, 4096),
      speed: Math.min(4.0, Math.max(0.25, Number(speed) || 0.95)),
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    reportError("/api/tts", error);
    return res.status(500).json({ error: "TTS failed" });
  }
});

/**
 * POST /api/chat
 * Body: { message: string, history?: {role, content}[] }
 * Response: { text: string, emotion: string }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], userId = "guest" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const user = await getUser(userId);
    const safeMessage = redactSensitiveText(message);
    const hints = extractProfileHints(safeMessage);
    user.profile = { ...user.profile, ...hints.profile };
    user.interests = mergeUniqueInterests(user.interests, hints.interests);

    user.memory.push({
      type: "utterance",
      content: safeMessage.slice(0, 500),
      source: "user",
      priority: calculatePriority({ type: "utterance", content: safeMessage }),
      timestamp: Date.now(),
    });

    const systemPrompt = `You are Q — a multilingual AI assistant with an emotional presence.
Rules:
1. Detect the language of the user's message and reply in the SAME language.
2. Keep replies concise (1–3 sentences).
3. At the END of your JSON response, include an "emotion" field: one of neutral | happy | calm | sad | angry | serious.
4. Always respond as valid JSON: { "text": "...", "emotion": "..." }
Languages you support: Persian (fa), German (de), Turkish (tr), English (en).

Cloud Memory for this user:
Name: ${user.profile.name ?? "unknown"}
Language: ${user.profile.language ?? "unknown"}
Interests: ${user.interests.length ? user.interests.join(", ") : "unknown"}
Top Memories:
${formatTopMemory(user, 8)}`;

    const conversation = await getConversation(userId);
    const conversationHistory = (Array.isArray(conversation.messages) ? conversation.messages : [])
      .slice(-5)
      .map((h) => ({
        role: h?.role === "assistant" ? "assistant" : "user",
        content: redactSensitiveText(h?.content),
      }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      ...minimiseHistory(history),
      { role: "user", content: safeMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: 256,
    });

    const raw = completion.choices[0].message.content ?? '{"text":"...", "emotion":"neutral"}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw, emotion: "neutral" };
    }

    const emotion = String(parsed?.emotion ?? "neutral").toLowerCase();
    const safeEmotion = ALLOWED_EMOTIONS.has(emotion) ? emotion : "neutral";

    user.memory.push({
      type: "assistant",
      content: String(parsed.text ?? raw).slice(0, 500),
      source: "assistant",
      priority: calculatePriority({ type: "assistant", content: parsed.text ?? raw }),
      timestamp: Date.now(),
    });

    if (user.memory.length > 1000) {
      user.memory = [...user.memory]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .slice(0, 800);
    }
    user.updatedAt = Date.now();
    await saveUser(user);

    const updatedConversation = [
      ...(Array.isArray(conversation.messages) ? conversation.messages : []),
      { role: "user", content: safeMessage.slice(0, 2000), timestamp: Date.now() },
      { role: "assistant", content: String(parsed.text ?? raw).slice(0, 2000), timestamp: Date.now() },
    ];
    await saveConversation({ userId, title: "default", messages: updatedConversation });

    return res.json({
      text: parsed.text ?? raw,
      emotion: safeEmotion,
    });
  } catch (err) {
    reportError("/api/chat", err, { userId: req.body?.userId ?? "guest" });
    return res.status(500).json({ error: "AI error", text: "سیستم موقتاً در دسترس نیست.", emotion: "calm" });
  }
});

app.get("/health", (_req, res) => res.json({
  status: "ok",
  keyConfigured: Boolean(process.env.OPENAI_API_KEY),
}));

app.get("/health/runtime", (_req, res) => {
  const mem = process.memoryUsage();
  return res.json({
    status: "ok",
    uptimeSec: Number(process.uptime().toFixed(2)),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
    pid: process.pid,
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    const { count: userCount, error: userErr } = await supabase
      .from("user_memory")
      .select("*", { count: "exact", head: true });
    if (userErr) throw userErr;
    const { count: conversationCount, error: convErr } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });
    if (convErr) throw convErr;
    return res.json({
      status: "ok",
      userCount: userCount ?? 0,
      conversationCount: conversationCount ?? 0,
      backend: "supabase",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/health/security", (_req, res) => {
  return res.json({
    status: "ok",
    guardian: {
      active: true,
      blockedPatterns: GUARDIAN_PATTERNS.length,
      maxStringLength: GUARDIAN_MAX_STRING,
      maxDepth: GUARDIAN_MAX_DEPTH,
      blockCount: guardianBlockCount,
    },
    auth: {
      requireAuthEnforced: REQUIRE_AUTH,
      hint: REQUIRE_AUTH ? "JWT required" : "Set REQUIRE_AUTH=true to enforce JWT",
    },
    blockedPathFragments: BLOCKED_PATH_FRAGMENTS,
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    failCloseGuard: true,
  });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[Q-API] running on http://localhost:${PORT}`));

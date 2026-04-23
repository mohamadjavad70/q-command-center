// Vercel Serverless Function — POST /api/chat
import OpenAI from 'openai';

const ALLOWED_EMOTIONS = new Set(['neutral', 'happy', 'calm', 'sad', 'angry', 'serious']);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function redactSensitiveText(value) {
  return String(value ?? '')
    .replace(/\b[\w.+%-]+@[\w-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]')
    .replace(/\b(\+?\d[\d\s\-.()]{7,15}\d)\b/g, '[PHONE]')
    .slice(0, 2000);
}

function minimiseHistory(history) {
  return (Array.isArray(history) ? history : [])
    .slice(-5)
    .map((h) => ({
      role: h?.role === 'assistant' ? 'assistant' : 'user',
      content: redactSensitiveText(h?.content),
    }));
}

export default async function handler(req, res) {
  // Security: block sensitive probes
  const p = String(req.url || '').toLowerCase();
  const blocked = ['/.env', '/wp-admin', '/wp-login.php', '/_profiler', '/phpinfo.php']
    .some((f) => p.includes(f));
  if (blocked) return res.status(403).json({ error: 'BLOCKED_BY_SECURITY_POLICY' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], userId = 'guest' } = req.body ?? {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const safeMessage = redactSensitiveText(message);

    const systemPrompt = `You are Q — a multilingual AI assistant with an emotional presence.
Rules:
1. Detect the language of the user's message and reply in the SAME language.
2. Keep replies concise (1–3 sentences).
3. At the END of your JSON response, include an "emotion" field: one of neutral | happy | calm | sad | angry | serious.
4. Always respond as valid JSON: { "text": "...", "emotion": "..." }
Languages you support: Persian (fa), German (de), Turkish (tr), English (en).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...minimiseHistory(history),
      { role: 'user', content: safeMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 256,
    });

    const raw = completion.choices[0].message.content ?? '{"text":"...", "emotion":"neutral"}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw, emotion: 'neutral' };
    }

    const emotion = String(parsed?.emotion ?? 'neutral').toLowerCase();
    const safeEmotion = ALLOWED_EMOTIONS.has(emotion) ? emotion : 'neutral';

    return res.json({ text: parsed.text ?? raw, emotion: safeEmotion, userId });
  } catch (err) {
    console.error('[/api/chat] error:', err);
    return res.status(500).json({
      error: 'AI error',
      text: 'سیستم موقتاً در دسترس نیست.',
      emotion: 'calm',
    });
  }
}

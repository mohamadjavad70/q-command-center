// Vercel Serverless Function — POST /api/tts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ALLOWED_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'alloy', speed = 0.95 } = req.body ?? {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: ALLOWED_VOICES.has(String(voice)) ? String(voice) : 'alloy',
      input: String(text).slice(0, 4096),
      speed: Math.min(4.0, Math.max(0.25, Number(speed) || 0.95)),
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (err) {
    console.error('[/api/tts] error:', err);
    return res.status(500).json({ error: 'TTS failed' });
  }
}

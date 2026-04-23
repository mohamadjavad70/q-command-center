// Vercel Serverless Function — POST /api/transcribe
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioBase64, mimeType = 'audio/webm', language = 'de' } = req.body ?? {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const binary = Buffer.from(audioBase64, 'base64');
    if (!binary.length) {
      return res.status(400).json({ error: 'invalid audio payload' });
    }

    const file = await toFile(binary, 'voice-input.webm', { type: mimeType });
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      language: String(language || 'de').slice(0, 8),
    });

    return res.json({ text: String(transcript.text || '').trim() });
  } catch (err) {
    console.error('[/api/transcribe] error:', err);
    return res.status(500).json({ error: 'transcription failed' });
  }
}

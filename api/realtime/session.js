// Vercel Serverless Function — GET /api/realtime/session
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';
    const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? 'alloy';
    const REALTIME_INSTRUCTIONS = [
      'You are Q Swiss Voice.',
      'Speak naturally, precisely, and briefly.',
      'Use German by default unless the user clearly switches language.',
      'Allow barge-in and keep a calm, analytical tone.',
    ].join(' ');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        modalities: ['audio', 'text'],
        instructions: REALTIME_INSTRUCTIONS,
        turn_detection: { type: 'server_vad' },
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
  } catch (err) {
    console.error('[/api/realtime/session] error:', err);
    return res.status(500).json({ error: 'realtime session failed' });
  }
}

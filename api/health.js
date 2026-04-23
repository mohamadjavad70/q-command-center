// Vercel Serverless Function — GET /api/health
export default function handler(req, res) {
  return res.json({
    status: 'ok',
    keyConfigured: Boolean(process.env.OPENAI_API_KEY),
    runtime: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
}

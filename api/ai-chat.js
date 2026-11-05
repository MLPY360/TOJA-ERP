/**
 * Vercel Serverless Function: /api/ai-chat
 * Relays requests to NVIDIA NIM API (https://integrate.api.nvidia.com/v1/chat/completions)
 * Prevents browser CORS restrictions and securely accesses VITE_NVIDIA_API_KEY / NVIDIA_API_KEY.
 */

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

const FALLBACK_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'mistralai/mistral-large-2-instruct'
];

export default async function handler(req, res) {
  // CORS Headers for modern browser clients
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Check process.env.VITE_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY
  const apiKey =
    process.env.VITE_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    (typeof req.headers?.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim()
      : '');

  if (!apiKey) {
    return res.status(500).json({
      error: 'مفتاح VITE_NVIDIA_API_KEY غير موجود في متغيرات البيئة (VITE_NVIDIA_API_KEY / NVIDIA_API_KEY).'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const {
      messages,
      model,
      temperature = 0.5,
      max_tokens = 1024,
      response_format
    } = body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // 2. Explicitly target https://integrate.api.nvidia.com/v1/chat/completions with meta/llama-3.3-70b-instruct
    const primaryModel = (typeof model === 'string' && model.trim() && (model.startsWith('meta/') || model.startsWith('nvidia/') || model.startsWith('mistralai/')))
      ? model.trim()
      : DEFAULT_MODEL;

    const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
    let lastError = null;

    for (const currentModel of modelsToTry) {
      try {
        const payload = {
          model: currentModel,
          messages,
          temperature: typeof temperature === 'number' ? temperature : 0.5,
          max_tokens: typeof max_tokens === 'number' ? max_tokens : 1024,
          stream: false
        };

        if (response_format) {
          payload.response_format = response_format;
        }

        const nvidiaRes = await fetch(NVIDIA_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await nvidiaRes.json().catch(() => ({}));

        if (nvidiaRes.ok) {
          return res.status(200).json(data);
        }

        console.warn(`[NVIDIA Serverless] Model "${currentModel}" failed with status ${nvidiaRes.status}:`, data);
        lastError = data;

        // Try next candidate model if current one is not found, deprecated/gone, or rate limited
        if (nvidiaRes.status === 404 || nvidiaRes.status === 410 || nvidiaRes.status === 429 || nvidiaRes.status === 503) {
          continue;
        }

        // Return early on 400 bad request if it's the first model attempt
        if (nvidiaRes.status === 400 && modelsToTry.indexOf(currentModel) === 0) {
          return res.status(400).json(data);
        }
      } catch (err) {
        lastError = err;
        console.warn(`[NVIDIA Serverless] Request failed for model "${currentModel}":`, err.message);
        continue;
      }
    }

    return res.status(502).json({
      error: 'Failed to get completion from NVIDIA NIM candidate models.',
      details: lastError
    });
  } catch (error) {
    console.error('NVIDIA NIM API Serverless Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}

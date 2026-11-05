/**
 * Vercel Serverless Function: /api/ai-chat
 * Relays requests to NVIDIA NIM API (https://integrate.api.nvidia.com/v1/chat/completions)
 * Prevents browser CORS restrictions and securely accesses VITE_NVIDIA_API_KEY / NVIDIA_API_KEY.
 */

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const FALLBACK_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct'
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

  const apiKey =
    process.env.VITE_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'مفتاح VITE_NVIDIA_API_KEY غير موجود في متغيرات البيئة (VITE_NVIDIA_API_KEY / NVIDIA_API_KEY).'
    });
  }

  try {
    const {
      messages,
      model,
      temperature = 0.5,
      max_tokens = 1024,
      response_format
    } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const modelsToTry = model ? [model, ...FALLBACK_MODELS.filter(m => m !== model)] : FALLBACK_MODELS;
    let lastError = null;

    for (const currentModel of modelsToTry) {
      try {
        const payload = {
          model: currentModel,
          messages,
          temperature,
          max_tokens
        };

        if (response_format) {
          payload.response_format = response_format;
        }

        const nvidiaRes = await fetch(NVIDIA_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await nvidiaRes.json().catch(() => ({}));

        if (nvidiaRes.ok) {
          return res.status(200).json(data);
        }

        // If rate limited or model not found, try fallback
        if (nvidiaRes.status === 404 || nvidiaRes.status === 429 || nvidiaRes.status === 503) {
          console.warn(`[NVIDIA Serverless] Model "${currentModel}" failed with status ${nvidiaRes.status}, trying fallback.`);
          lastError = data;
          continue;
        }

        // Return error if bad request (400) or other error
        return res.status(nvidiaRes.status).json(data);
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

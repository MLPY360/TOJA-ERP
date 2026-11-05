/**
 * Vercel Serverless Function: /api/ai-chat
 * Relays requests to NVIDIA NIM API (https://integrate.api.nvidia.com/v1/chat/completions)
 * Prevents browser CORS restrictions and securely accesses VITE_NVIDIA_API_KEY / NVIDIA_API_KEY.
 */

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

// Active models with verified 200 OK responses on NVIDIA NIM as fallbacks
const FALLBACK_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'nvidia/nemotron-3.5-bolt-e4b',
  'google/diffusiongemma-26b-a4b-it',
  'poolside/laguna-xs-2.1',
  'meta/llama-3.1-70b-instruct'
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

  // 1. Retrieve and sanitize API key from environment or client header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const clientBearer = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : null;

  const rawKey =
    process.env.VITE_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    clientBearer ||
    '';

  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

  console.log(`[NVIDIA Serverless] Request received [${req.method}]`);
  console.log(`[NVIDIA Serverless] Key presence: VITE_NVIDIA_API_KEY=${Boolean(process.env.VITE_NVIDIA_API_KEY)}, NVIDIA_API_KEY=${Boolean(process.env.NVIDIA_API_KEY)}, ClientBearer=${Boolean(clientBearer)}`);
  console.log(`[NVIDIA Serverless] Key format: startsWith=${apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'}, length=${apiKey.length}`);

  if (!apiKey) {
    console.error('[NVIDIA Serverless] FATAL: Missing NVIDIA API key. Set VITE_NVIDIA_API_KEY or NVIDIA_API_KEY in Vercel project environment variables.');
    return res.status(500).json({
      error: 'مفتاح VITE_NVIDIA_API_KEY غير موجود في متغيرات بيئة Vercel (VITE_NVIDIA_API_KEY / NVIDIA_API_KEY).',
      code: 'MISSING_API_KEY'
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
      console.warn('[NVIDIA Serverless] Bad Request: messages array is required');
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Explicitly target meta/llama-3.3-70b-instruct by default, with automatic fallback to verified active models
    const requestedModel = (typeof model === 'string' && model.trim())
      ? model.trim()
      : DEFAULT_MODEL;

    const modelsToTry = [
      requestedModel,
      ...FALLBACK_MODELS.filter(m => m !== requestedModel)
    ];

    console.log(`[NVIDIA Serverless] Candidate models queue:`, modelsToTry);

    let lastError = null;
    let lastStatus = 502;

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      console.log(`[NVIDIA Serverless] [Attempt ${i + 1}/${modelsToTry.length}] Calling NVIDIA NIM model "${currentModel}" at ${NVIDIA_ENDPOINT}...`);

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

        const t0 = Date.now();
        const nvidiaRes = await fetch(NVIDIA_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const elapsedMs = Date.now() - t0;
        const status = nvidiaRes.status;
        const statusText = nvidiaRes.statusText;
        const data = await nvidiaRes.json().catch(() => ({}));

        if (nvidiaRes.ok) {
          console.log(`[NVIDIA Serverless] ✅ SUCCESS! Model "${currentModel}" returned HTTP ${status} in ${elapsedMs}ms. Tokens: ${data.usage?.total_tokens ?? 'N/A'}`);
          return res.status(200).json(data);
        }

        // Upstream returned an error status - log full details for Vercel Runtime Logs
        console.error(`[NVIDIA Serverless] ❌ Model "${currentModel}" failed with HTTP ${status} (${statusText}) in ${elapsedMs}ms:`, JSON.stringify(data));
        lastError = data;
        lastStatus = status;

        // If 401 Unauthorized, the API key itself is invalid or rejected by NVIDIA
        if (status === 401) {
          console.error('[NVIDIA Serverless] FATAL 401: NVIDIA API key rejected. Please check key validity in NVIDIA dashboard.');
          return res.status(401).json({
            error: 'NVIDIA NIM API key is unauthorized or rejected (401).',
            details: data
          });
        }

        // If 404 (Not Found), 410 (Gone / EOL), 429 (Rate Limit), or 5xx, continue to next fallback model
        if (status === 404 || status === 410 || status === 429 || status === 500 || status === 502 || status === 503) {
          console.warn(`[NVIDIA Serverless] Model "${currentModel}" returned HTTP ${status}. Moving to next fallback model...`);
          continue;
        }

        // If 400 Bad Request on first attempt, retry without response_format if present
        if (status === 400 && i === 0 && response_format) {
          console.warn(`[NVIDIA Serverless] Model "${currentModel}" returned HTTP 400 with response_format. Retrying plain...`);
          delete payload.response_format;
          const retryRes = await fetch(NVIDIA_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          const retryData = await retryRes.json().catch(() => ({}));
          if (retryRes.ok) {
            console.log(`[NVIDIA Serverless] ✅ Retry without response_format succeeded for "${currentModel}"`);
            return res.status(200).json(retryData);
          }
        }
      } catch (err) {
        lastError = { message: err?.message || String(err) };
        console.error(`[NVIDIA Serverless] Network/Fetch exception for model "${currentModel}":`, err?.message || err);
        continue;
      }
    }

    console.error(`[NVIDIA Serverless] ALL candidate models failed. Last status: ${lastStatus}, details:`, JSON.stringify(lastError));
    return res.status(lastStatus || 502).json({
      error: 'Failed to get completion from NVIDIA NIM candidate models.',
      upstreamStatus: lastStatus,
      details: lastError
    });
  } catch (error) {
    console.error('[NVIDIA Serverless] Unhandled Serverless Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}

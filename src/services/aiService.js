import { GoogleGenAI } from '@google/genai';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const CANDIDATE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

const getGroqApiKey = () => (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GROQ_API_KEY : (typeof process !== 'undefined' ? process.env?.VITE_GROQ_API_KEY : ''));
const getGeminiApiKey = () => (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : ''));

/**
 * Timeout helper ensuring requests fail fast rather than hanging indefinitely
 */
const withTimeout = (promise, ms = 25000, modelName = '') => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout: Model "${modelName}" did not respond within ${ms / 1000}s`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const cleanJsonString = (raw) => {
  if (!raw) return '{}';
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
};

/**
 * Core Groq API caller with multi-model fallback.
 * Uses OpenAI-compatible chat completions endpoint: https://api.groq.com/openai/v1/chat/completions
 */
export const callGroqChat = async (messages, options = {}) => {
  const apiKey = options.apiKey || getGroqApiKey();
  if (!apiKey) {
    throw new Error("مفتاح VITE_GROQ_API_KEY غير موجود في ملف .env");
  }

  const modelsToTry = options.models || CANDIDATE_MODELS;
  const temperature = options.temperature ?? 0.5;
  const jsonMode = Boolean(options.jsonMode);
  const timeoutMs = options.timeoutMs || 25000;

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const requestBody = {
        model,
        messages,
        temperature
      };

      if (jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const fetchPromise = fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await withTimeout(fetchPromise, timeoutMs, model);

      // Handle transient rate limits or missing model access by falling through to next candidate
      if (response.status === 404 || response.status === 429 || response.status === 503) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[Groq AI] Model "${model}" HTTP ${response.status}:`, errJson?.error?.message || response.statusText);
        continue;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Groq AI] Request to model "${model}" failed:`, err?.message || err);
      continue;
    }
  }

  const friendlyError = "⚠️ تعذر الاتصال بموديلات الذكاء الاصطناعي (Groq) حالياً، يرجى المحاولة بعد لحظات.";
  if (jsonMode) {
    throw new Error(lastError?.message || friendlyError);
  }

  return friendlyError;
};

/**
 * AI CFO Executive Chat Advisor for TOJA Partners
 */
export const askFinancialAdvisorChat = async (conversationHistory, userQuestion, systemContext = {}) => {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("مفتاح VITE_GROQ_API_KEY غير موجود في ملف .env");
  }

  const systemPrompt = `
  أنت المستشار والشريك المالي التنفيذي (AI CFO) لبراند الملابس المصري TOJA والشركاء الأربعة (أحمد عرنوس، محمد حسان، يوسف سامح، مصطفى إبراهيم).
  
  بيانات وأرقام TOJA اللحظية:
  - نسبة استرداد رأس المال: ${systemContext?.capitalRecoveryRate || '83.9%'}
  - إجمالي الكاش المحصل الفعلي: ${systemContext?.collectedRevenue || '21,310 EGP'}
  - قيمة بضاعة المخزن المتبقية: ${systemContext?.remainingStockValue || '7,605 EGP'}
  - المطلوب للتعادل: ${systemContext?.remainingToBreakEven || '4,080 EGP'}
  - حالة الأرباح: ${systemContext?.profitZoneStatus || 'Recovering Capital'}
  - أهم المنتجات بالمخزن: ${JSON.stringify(systemContext?.topStockHoldings || [])}

  المطلوب:
  جاوب بلهجة بيزنس مصرية محترفة ومباشرة، معتمدًا على الأرقام الحقيقية المذكورة.
  - إذا كان السؤال عن سحب الأرباح: وضّح ضرورة تغطية مبلغ التعادل (4,080 ج.م) أولاً قبل سحب الأرباح للحفاظ على أمان السيولة.
  - نسق الرد بنقاط وخط عريض للأرقام.
  `;

  // Build message sequence supporting multi-turn conversation history
  let chatMessages = [{ role: 'system', content: systemPrompt }];

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const validHistory = conversationHistory
      .filter(m => m && m.content)
      .slice(-8)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const lastMsg = validHistory[validHistory.length - 1];
    if (lastMsg && lastMsg.role === 'user' && lastMsg.content === userQuestion) {
      chatMessages = [chatMessages[0], ...validHistory];
    } else {
      chatMessages = [chatMessages[0], ...validHistory, { role: 'user', content: userQuestion }];
    }
  } else {
    chatMessages.push({ role: 'user', content: userQuestion });
  }

  return await callGroqChat(chatMessages, {
    temperature: 0.5,
    apiKey
  });
};

/**
 * Fast order parser extracting customer and inventory details
 */
export const parseOrderFromText = async (rawText, availableProducts = []) => {
  const prompt = `
  You are an expert order extraction engine for an Egyptian apparel brand (TOJA).
  Extract customer and order details from this message:
  "${rawText}"

  Available products in inventory:
  ${JSON.stringify(availableProducts.map(p => ({ sku: p.sku, name: p.name, sizes: Object.keys(p.initialStock || {}) })))}

  Respond ONLY with a valid JSON object matching this schema:
  {
    "customerName": "string",
    "phone": "normalized 11-digit string starting with 01...",
    "governorate": "standard Egyptian governorate name (e.g. Cairo, Giza, Port Said, Alexandria)",
    "detailedAddress": "string",
    "items": [
      {
        "sku": "matching product SKU",
        "productName": "matching product Name",
        "size": "normalized size: M, L, XL, XXL, etc.",
        "quantity": 1
      }
    ],
    "notes": "string"
  }
  `;

  const responseText = await callGroqChat([
    { role: 'system', content: 'You are an order parser that strictly returns a JSON object.' },
    { role: 'user', content: prompt }
  ], { jsonMode: true, temperature: 0.1 });

  return JSON.parse(cleanJsonString(responseText));
};

/**
 * Strategic Financial & Inventory Advisory
 */
export const getFinancialAdvisory = async (financialMetrics, inventoryMetrics, recentOrders = []) => {
  const prompt = `
  You are a senior fashion business consultant and CFO advising the 4 partners of TOJA apparel brand.
  Analyze these real-time numbers:
  - Capital Recovery: ${JSON.stringify(financialMetrics)}
  - Warehouse Inventory: ${JSON.stringify(inventoryMetrics)}
  - Orders volume: ${recentOrders.length}

  Provide an executive, concise strategic Arabic report with 3 distinct sections:
  1. 📊 تشخيص السيولة والموقف المالي الحالي (Liquidity & Capital health)
  2. ⚡ قرارات تشغيلية عاجلة (موديلات يُنصح بتسييلها عبر عروض، موديلات تحتاج زيادة تشغيل فوري)
  3. 🚀 خطة التحرك للدفعة القادمة لتعظيم الأرباح وتفادي هدر الكاش.
  `;

  return await callGroqChat([
    { role: 'system', content: 'أنت مستشار مالي استراتيجي لشركاء براند ملابس مصري.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5 });
};

/**
 * Smart Customer Care WhatsApp Copywriting
 */
export const generateSmartWhatsApp = async (customerName, orderData, intent = 'confirmation') => {
  const prompt = `
  Write a high-converting, friendly, and respectful Egyptian Arabic WhatsApp message from TOJA clothing brand to customer "${customerName}".
  Intent: ${intent} (e.g., 'confirmation', 'shipped', 'follow_up_vip', 're_engage_return').
  Order details: ${JSON.stringify(orderData)}.
  Keep it engaging, warm, professional, with brand identity. Include emojis.
  `;

  return await callGroqChat([
    { role: 'system', content: 'أنت مسؤول خدمة العملاء لبراند الملابس المصري TOJA.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.6 });
};

/**
 * Expense Receipt OCR Parser (Multimodal Vision)
 * Uses Gemini when available as an image vision engine, with graceful handling.
 */
export const parseExpenseReceipt = async (base64Image, mimeType = 'image/jpeg') => {
  const geminiKey = getGeminiApiKey();

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          "Extract expense details from this Egyptian receipt/invoice. Return ONLY a JSON object: { amount: number, category: string, description: string, date: 'YYYY-MM-DD', supplierName: string }."
        ],
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(cleanJsonString(response.text));
    } catch (err) {
      console.warn("[Receipt OCR] Gemini vision failed:", err?.message || err);
    }
  }

  throw new Error("لم يتمكن النظام من قراءة بيانات الفاتورة تلقائياً. يرجى إدخال البيانات يدوياً.");
};

/**
 * Fully Automated Daily AI Task Dispatcher for TOJA Partners
 * Generates EXACTLY 4 highly specific operational tasks, strictly 1 customized task
 * for each of the 4 partners matching their exact role, seasonal strategy, and live numbers.
 */
export const generateDailyPartnerTasks = async (systemContext = {}) => {
  const seasonPhase = systemContext.seasonPhase || 'winter_prep';
  const dailyFocusNote = (systemContext.dailyFocusNote || '').trim();
  const todayStr = systemContext.todayStr || new Date().toISOString().split('T')[0];

  let seasonalDirective = '';
  if (seasonPhase === 'winter_prep') {
    seasonalDirective = `
    ⚠️ المرحلة الاستراتيجية للبراند: "التحضير للموسم الشتوي وإطلاق كولكشن الشتاء (Winter Collection Launch)"
    تعليمات صارمة للموسم الشتوي (Winter Shift):
    - ممنوع تماماً تكليف أي شريك بأي مهام إنتاج أو تشغيل صيفي! كل التركيز على الكولكشن الشتوي.
    - 1. Ahmed Arnos (المبيعات والتشغيل والمصانع - Sales & Production Ops):
         * البحث عن وتوريد خامات الأقمشة الشتوية الثقيلة (Heavyweight fabrics: ميلتون مصري تقيل، مهير، قطن داخلي مبطن).
         * عمل عينات مع المصانع (Sampling) للهوديز والسويت شيرتات الثقيلة وحساب تكلفة القطعة بدقة (Costing per piece) ومطابقة جدول تسليم المصانع.
    - 2. Mohamed Hassan (التسويق والحملات الإعلانية - Marketing & Growth):
         * إعداد خطة واستراتيجية حملات التمهيد والتشويق (Teaser Campaign Strategy).
         * بناء قائمة انتظار العملاء المميزين (VIP Early-Bird Waitlist) وتهيئة جماهير اللوك ألايك للموسم الشتوي.
         * تخطيط وتوزيع الميزانية الإعلانية لدروب الشتاء.
    - 3. Yossef Sameh (الهوية البصرية وتصاميم الميديا وصناعة المحتوى - Creative & Content):
         * إعداد لوحات الإلهام ومود بوردز اللوك بوك الشتوي (Winter Lookbook Moodboards).
         * تحديد وتجربة أماكن التطريز أو الطباعة والتايبوجرافي على خامات الهودي الشتوية.
         * تجهيز وتصميم مواد التغليف والشنط والتاجز الشتوية الفخمة (Winter Packaging Design).
    - 4. Moustafa Ebrahim (العمليات والشحن وتجهيز الطلبات - Logistics & Shipping):
         * توريد علب كرتون وشنط شحن بأحجام أكبر (Larger packaging boxes / Heavy polymailers) لتستوعب الملابس الشتوية الثقيلة والمنفوشة دون ضغطها.
         * مراجعة شرائح وزن الشحن وأسعار شركات الشحن للطرود الشتوية الثقيلة، والتأكد من توافر مساحة تجهيز كافية بالمخزن.
    `;
  } else if (seasonPhase === 'summer_liquidation') {
    seasonalDirective = `
    ⚠️ المرحلة الاستراتيجية للبراند: "تصفية الموسم الصيفي (Summer Liquidation)"
    تعليمات صارمة:
    - التركيز بنسبة 100% على تسييل بواقي المقاسات والموديلات الصيفية وتحويلها لكاش فوري.
    - عروض مجمعة (Bundles) وتخفيضات هجومية على التيشيرتات والقطع المتبقية.
    - إعلانات إعادة استهداف للسلات المتروكة وتنشيط قاعدة العملاء القدامى.
    - تجهيز الكاش المحصل لتمويل تجهيزات دروب الشتاء.
    `;
  } else if (seasonPhase === 'active_selling') {
    seasonalDirective = `
    ⚠️ المرحلة الاستراتيجية للبراند: "ذروة المبيعات والتشغيل اليومي (In-Season Peak)"
    تعليمات صارمة:
    - أقصى سرعة في استيفاء وشحن الطلبات اليومية (Same-Day / Next-Day Dispatch).
    - رفع وتوسيع ميزانيات الإعلانات الرابحة ومراقبة تكلفة الاستحواذ اللحظية.
    - تسليم كل الشحنات للمناديب أولاً بأول وحل أي شكاوى عملاء فورياً.
    `;
  } else if (seasonPhase === 'restock_fulfillment') {
    seasonalDirective = `
    ⚠️ المرحلة الاستراتيجية للبراند: "إعادة إنتاج وتوريد (Restock & Scaling)"
    تعليمات صارمة:
    - إعادة تشغيل وحجز الموديلات والمقاسات الأكثر طلباً (Best Sellers Restock) في المصانع.
    - فحص ومراقبة الجودة للخياطة والتقفيل للدفعة الجديدة قبل الاستلام.
    - إشعار العملاء المسجلين بقوائم الانتظار بتوفر المقاسات مجدداً.
    `;
  }

  const focusDirective = dailyFocusNote ? `
  🎯 توجيه إداري استراتيجي مباشر لليوم من إدارة TOJA:
  "${dailyFocusNote}"
  (ملاحظة هامة: هذا التوجيه الإداري له الأولوية القصوى ويجب أن ينعكس مباشرة وعملياً في مهام الشركاء المعنيين به!)
  ` : '';

  const prompt = `
  أنت المنسق والمدير التنفيذي للعمليات (AI Chief Operating Officer) لبراند الملابس المصري TOJA والشركاء الأربعة.
  المطلوب: توليد خطة العمل والمهام التشغيلية اليومية العاجلة لليوم (Daily Standup Dispatch)، بحيث يتم إسناد مهمة واحدة دقيقة ومحددة وعملية جداً لكل شريك من الشركاء الأربعة بما يطابق اختصاصه تماماً والمرحلة الاستراتيجية للبراند.

  ${seasonalDirective}
  ${focusDirective}

  أرقام وبيانات TOJA اللحظية اليوم:
  - عدد الطلبات المعلقة / قيد التجهيز والشحن: ${systemContext.pendingOrdersCount || 0} طلب
  - نسبة استرداد رأس المال الحالية: ${systemContext.capitalRecoveryRate || '83.9%'}
  - إجمالي الكاش المحصل الفعلي: ${systemContext.collectedRevenue || '21,310 EGP'}
  - قيمة بضاعة المخزن المتبقية: ${systemContext.remainingStockValue || '7,605 EGP'}
  - المنتجات والمقاسات منخفضة المخزون أو الراكدة: ${JSON.stringify(systemContext.lowStockItems || [])}
  - شحنات متأخرة أو مرتجعات: ${systemContext.returnsCount || 0}

  توزيع الشركاء الأربعة واختصاصاتهم الإلزامية:
  1. Ahmed Arnos: المبيعات والتشغيل والمصانع (Sales & Production Ops)
  2. Mohamed Hassan: التسويق والحملات الإعلانية وتنسيق الأداء (Marketing & Growth)
  3. Yossef Sameh: الهوية البصرية وتصاميم الميديا وصناعة المحتوى (Creative & Content)
  4. Moustafa Ebrahim: العمليات والشحن وتجهيز الطلبات والمرتجعات (Logistics & Shipping)

  شروط هامة جداً:
  - أخرج مصفوفة تحتوي على 4 مهام بالضبط (واحدة لكل شريك بالاسم الإنجليزي المطابق: "Ahmed Arnos", "Mohamed Hassan", "Yossef Sameh", "Moustafa Ebrahim").
  - اكتب العنوان والوصف بلهجة بيزنس مصرية مباشرة واحترافية وبأرقام وإجراءات محددة مستمدة من المرحلة الاستراتيجية والتوجيه اليومي والبيانات.
  - اجعل الأولوية: "urgent" أو "high" أو "normal".
  - تاريخ التسليم الافتراضي: "${todayStr}".

  أجب فقط بصيغة JSON مطابقة تماماً للشكل التالي:
  {
    "tasks": [
      {
        "partnerName": "Ahmed Arnos",
        "title": "...",
        "description": "...",
        "priority": "urgent",
        "category": "production",
        "dueDate": "${todayStr}"
      },
      {
        "partnerName": "Mohamed Hassan",
        "title": "...",
        "description": "...",
        "priority": "high",
        "category": "marketing",
        "dueDate": "${todayStr}"
      },
      {
        "partnerName": "Yossef Sameh",
        "title": "...",
        "description": "...",
        "priority": "normal",
        "category": "creative",
        "dueDate": "${todayStr}"
      },
      {
        "partnerName": "Moustafa Ebrahim",
        "title": "...",
        "description": "...",
        "priority": "high",
        "category": "operations_shipping",
        "dueDate": "${todayStr}"
      }
    ]
  }
  `;

  const responseText = await callGroqChat([
    { role: 'system', content: 'You are the Operations & Executive AI Director for Egyptian apparel brand TOJA. Always return strictly valid JSON matching the requested schema.' },
    { role: 'user', content: prompt }
  ], { jsonMode: true, temperature: 0.3 });

  const parsed = JSON.parse(cleanJsonString(responseText));
  if (Array.isArray(parsed?.tasks) && parsed.tasks.length > 0) {
    return parsed.tasks;
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed;
  }
  throw new Error("لم يتمكن محرك الذكاء الاصطناعي من توليد مصفوفة المهام بالشكل المطلوب.");
};


/**
 * TOJA Studio Image Utilities
 * 
 * Provides guaranteed, 100% resilient studio garment placeholders and
 * safe fallback handlers for all Storefront and ERP product imagery.
 * Replaces any broken external or imgbb.com/ibb.co service unavailable URLs.
 */

// Color palettes for tailored studio garment placeholders
const GARMENT_COLORS = {
  white: {
    fill: '#FAFAFA',
    stroke: '#18181B',
    seam: '#E4E4E7',
    collar: '#F4F4F5',
    text: '#18181B',
    accent: '#A1A1AA',
    badge: 'WHITE / أبيض'
  },
  offwhite: {
    fill: '#F5F5F0',
    stroke: '#18181B',
    seam: '#E2E2D8',
    collar: '#ECECE5',
    text: '#18181B',
    accent: '#9E9E90',
    badge: 'OFF-WHITE / أوف وايت'
  },
  black: {
    fill: '#18181B',
    stroke: '#09090B',
    seam: '#27272A',
    collar: '#27272A',
    text: '#FFFFFF',
    accent: '#71717A',
    badge: 'BLACK / أسود'
  },
  brown: {
    fill: '#3F2A21',
    stroke: '#281B15',
    seam: '#54382C',
    collar: '#54382C',
    text: '#FFFFFF',
    accent: '#A88D7D',
    badge: 'BROWN / بني'
  },
  beige: {
    fill: '#D8C7B5',
    stroke: '#4A3C31',
    seam: '#C2AE9A',
    collar: '#C2AE9A',
    text: '#27272A',
    accent: '#7D6A58',
    badge: 'BEIGE / بيج'
  },
  olive: {
    fill: '#394436',
    stroke: '#222920',
    seam: '#4F5D4B',
    collar: '#4F5D4B',
    text: '#FFFFFF',
    accent: '#8C9B88',
    badge: 'DARK OLIVE / زيتي'
  },
  navy: {
    fill: '#1E293B',
    stroke: '#0F172A',
    seam: '#334155',
    collar: '#334155',
    text: '#FFFFFF',
    accent: '#94A3B8',
    badge: 'NAVY / كحلي'
  },
  burgundy: {
    fill: '#4A1521',
    stroke: '#2B0A12',
    seam: '#68202F',
    collar: '#68202F',
    text: '#FFFFFF',
    accent: '#B06371',
    badge: 'BURGUNDY / نبيتي'
  },
  grey: {
    fill: '#64748B',
    stroke: '#334155',
    seam: '#94A3B8',
    collar: '#475569',
    text: '#FFFFFF',
    accent: '#CBD5E1',
    badge: 'GREY / رمادي'
  }
};

/**
 * Detects color key from product name or metadata
 */
export const detectGarmentColor = (input = '') => {
  const str = String(input).toLowerCase();
  if (str.includes('off-white') || str.includes('offwhite') || str.includes('أوف وايت')) return 'offwhite';
  if (str.includes('white') || str.includes('أبيض')) return 'white';
  if (str.includes('black') || str.includes('أسود')) return 'black';
  if (str.includes('brown') || str.includes('بني')) return 'brown';
  if (str.includes('beige') || str.includes('biege') || str.includes('بيج')) return 'beige';
  if (str.includes('olive') || str.includes('زيتي')) return 'olive';
  if (str.includes('navy') || str.includes('كحلي')) return 'navy';
  if (str.includes('burgundy') || str.includes('نبيتي') || str.includes('بورجوندي')) return 'burgundy';
  if (str.includes('grey') || str.includes('gray') || str.includes('gry') || str.includes('رمادي')) return 'grey';
  return 'white';
};

/**
 * Detects garment type (tee, henley, polo, pants)
 */
export const detectGarmentType = (input = '', category = '') => {
  const str = `${String(input)} ${String(category)}`.toLowerCase();
  if (str.includes('sweatpant') || str.includes('pants') || str.includes('wide leg') || str.includes('بنطلون') || str.includes('سويت بانتس') || str.includes('bottom')) {
    return 'pants';
  }
  if (str.includes('henley') || str.includes('هنلي') || str.includes('هينلي')) {
    return 'henley';
  }
  if (str.includes('polo') || str.includes('knit') || str.includes('بولو') || str.includes('تريكو')) {
    return 'polo';
  }
  return 'tee';
};

/**
 * Generates an SVG Data URI tailored to the specific garment type and color.
 * Designed to fit seamlessly on TOJA's neutral #F4F4F5 studio background.
 */
export const generateStudioGarmentSvg = (type = 'tee', colorKey = 'white', label = 'TOJA ESSENTIAL') => {
  const c = GARMENT_COLORS[colorKey] || GARMENT_COLORS.white;
  const cleanLabel = (label || 'TOJA ESSENTIAL').toUpperCase();

  let garmentPath = '';
  let garmentDetails = '';

  if (type === 'pants') {
    // Wide Leg Sweatpants Silhouette
    garmentPath = `
      <!-- Waistband -->
      <rect x="210" y="150" width="180" height="26" rx="6" fill="${c.collar}" stroke="${c.stroke}" stroke-width="2.5" />
      <!-- Drawstrings -->
      <path d="M290 176 Q285 210 275 230 M310 176 Q315 210 325 230" fill="none" stroke="${c.stroke}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Main Legs & Crotch -->
      <path d="
        M210 176
        L185 530
        Q185 540 195 540
        L270 540
        Q280 540 280 530
        L295 330
        L310 330
        L325 530
        Q325 540 335 540
        L410 540
        Q420 540 420 530
        L390 176
        Z
      " fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
    `;
    garmentDetails = `
      <!-- Pocket slash lines -->
      <line x1="225" y1="200" x2="215" y2="250" stroke="${c.seam}" stroke-width="2" stroke-linecap="round"/>
      <line x1="375" y1="200" x2="385" y2="250" stroke="${c.seam}" stroke-width="2" stroke-linecap="round"/>
      <!-- Inner seam detail -->
      <line x1="300" y1="330" x2="300" y2="350" stroke="${c.stroke}" stroke-width="2.5"/>
    `;
  } else if (type === 'henley') {
    // Henley Shirt Silhouette with 3-button placket
    garmentPath = `
      <!-- Main Body & Sleeves -->
      <path d="
        M230 170
        C270 195, 330 195, 370 170
        L460 215
        L425 285
        L385 260
        L385 520
        L215 520
        L215 260
        L175 285
        L140 215
        Z
      " fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Collar Band -->
      <path d="M230 170 C270 195, 330 195, 370 170" fill="none" stroke="${c.collar}" stroke-width="8" stroke-linecap="round"/>
    `;
    garmentDetails = `
      <!-- Henley Button Placket -->
      <rect x="288" y="190" width="24" height="95" rx="3" fill="${c.collar}" stroke="${c.stroke}" stroke-width="2"/>
      <!-- 3 Buttons -->
      <circle cx="300" cy="208" r="3.5" fill="${c.text}" stroke="${c.stroke}" stroke-width="1.5"/>
      <circle cx="300" cy="235" r="3.5" fill="${c.text}" stroke="${c.stroke}" stroke-width="1.5"/>
      <circle cx="300" cy="262" r="3.5" fill="${c.text}" stroke="${c.stroke}" stroke-width="1.5"/>
      <!-- Shoulder Seams -->
      <line x1="230" y1="170" x2="300" y2="215" stroke="${c.seam}" stroke-width="1.5" opacity="0.6"/>
    `;
  } else if (type === 'polo') {
    // Knit Polo Silhouette with collar wings
    garmentPath = `
      <!-- Main Body & Sleeves -->
      <path d="
        M230 170
        C270 190, 330 190, 370 170
        L465 210
        L435 280
        L390 258
        L390 520
        L210 520
        L210 258
        L165 280
        L135 210
        Z
      " fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
    `;
    garmentDetails = `
      <!-- Polo Collar Wings -->
      <path d="M230 170 L280 225 L300 185 L320 225 L370 170 Z" fill="${c.collar}" stroke="${c.stroke}" stroke-width="2" stroke-linejoin="round"/>
      <!-- Placket & Buttons -->
      <rect x="290" y="200" width="20" height="75" rx="2" fill="${c.collar}" stroke="${c.stroke}" stroke-width="1.5"/>
      <circle cx="300" cy="225" r="3" fill="${c.text}"/>
      <circle cx="300" cy="255" r="3" fill="${c.text}"/>
    `;
  } else {
    // Classic Heavyweight Boxy T-Shirt Silhouette
    garmentPath = `
      <!-- Main Body & Boxy Sleeves -->
      <path d="
        M225 170
        C270 195, 330 195, 375 170
        L470 215
        L435 285
        L390 260
        L390 520
        L210 520
        L210 260
        L165 285
        L130 215
        Z
      " fill="${c.fill}" stroke="${c.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
    `;
    garmentDetails = `
      <!-- Crewneck Ribbed Collar -->
      <path d="M225 170 C270 195, 330 195, 375 170" fill="none" stroke="${c.collar}" stroke-width="8" stroke-linecap="round"/>
      <path d="M225 170 C270 195, 330 195, 375 170" fill="none" stroke="${c.stroke}" stroke-width="2"/>
      <path d="M235 180 C272 201, 328 201, 365 180" fill="none" stroke="${c.seam}" stroke-width="1.5"/>
      <!-- Chest Pocket / Subtle Monogram -->
      <rect x="245" y="270" width="36" height="42" rx="3" fill="${c.collar}" stroke="${c.seam}" stroke-width="1.5" opacity="0.6"/>
    `;
  }

  const rawSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="100%" height="100%">
      <!-- Studio Card Neutral Canvas -->
      <rect width="100%" height="100%" fill="#F4F4F5"/>

      <!-- Subtle Studio Lighting Overhead Soft Glow -->
      <radialGradient id="studioGlow" cx="50%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#F4F4F5" stop-opacity="0"/>
      </radialGradient>
      <rect width="100%" height="100%" fill="url(#studioGlow)"/>

      <!-- Floor Contact Shadow Grounding the Garment -->
      <ellipse cx="300" cy="570" rx="140" ry="14" fill="#000000" opacity="0.08"/>
      <ellipse cx="300" cy="570" rx="90" ry="8" fill="#000000" opacity="0.05"/>

      <!-- Garment Group -->
      <g id="garment">
        ${garmentPath}
        ${garmentDetails}
      </g>

      <!-- Minimalist Studio Editorial Watermark & Tag -->
      <g transform="translate(300, 640)" text-anchor="middle">
        <text y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" letter-spacing="3" fill="#18181B">
          TOJA CAIRO
        </text>
        <text y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="#71717A">
          ${cleanLabel}
        </text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg.trim())}`;
};

/**
 * Universal Studio Garment SVG data URI
 */
export const STUDIO_GARMENT_SVG = generateStudioGarmentSvg('tee', 'white', 'TOJA STUDIO GARMENT');

/**
 * Primary high-resolution photographic studio placeholder
 */
export const DEFAULT_PRODUCT_IMAGE = STUDIO_GARMENT_SVG;

/**
 * Checks whether an image URL is truly missing, invalid, or corrupted.
 * Real photo URLs (including ImgBB, Firebase Storage, Cloudinary, etc.) are valid and prioritized.
 */
export const isInvalidUrl = (url) => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  return (
    lower.includes('service-unavailable') ||
    lower.includes('undefined') ||
    lower.includes('null') ||
    lower === 'default' ||
    lower === '[object object]'
  );
};

/**
 * Backward compatibility alias for isInvalidUrl.
 */
export const isBrokenOrImgbbUrl = (url) => isInvalidUrl(url);

/**
 * Resolves the real original product photography URL across all common database schemas.
 * Prioritizes actual photo links over any cartoon/mockup templates:
 * item?.imageUrl || item?.image || item?.photoUrl || item?.images?.[0] || originalProduct?.imageUrl
 */
export const resolveProductImageUrl = (item, originalProduct = null) => {
  if (!item && !originalProduct) return '';

  const candidates = [
    item?.imageUrl,
    item?.image,
    item?.photoUrl,
    item?.photo,
    Array.isArray(item?.images) ? item.images[0] : null,
    item?.images?.front,
    item?.thumbnail,
    originalProduct?.imageUrl,
    originalProduct?.image,
    originalProduct?.photoUrl,
    originalProduct?.photo,
    Array.isArray(originalProduct?.images) ? originalProduct.images[0] : null,
    originalProduct?.images?.front,
    originalProduct?.thumbnail,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed && !isInvalidUrl(trimmed)) {
        return trimmed;
      }
    }
  }

  return '';
};

/**
 * Resolves a dedicated studio garment placeholder for a specific product object or name.
 */
export const getStudioPlaceholderForProduct = (productOrName, category) => {
  if (!productOrName) return STUDIO_GARMENT_SVG;

  const name = typeof productOrName === 'string'
    ? productOrName
    : (productOrName?.name || productOrName?.title || '');
  const cat = category || (typeof productOrName === 'object' ? productOrName?.category : '') || '';

  const colorKey = detectGarmentColor(`${name} ${cat}`);
  const type = detectGarmentType(name, cat);

  return generateStudioGarmentSvg(type, colorKey, name || 'TOJA ESSENTIAL');
};

/**
 * Returns a sanitized, working image URL.
 * Prioritizes the real original product photography stored in Firestore/Storage.
 * Only falls back to the clean studio placeholder if no real photo exists or if it fails.
 */
export const getSafeProductImage = (url, fallback, productContext) => {
  // 1. Direct valid photography URL passed
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed && !isInvalidUrl(trimmed)) {
      return trimmed;
    }
  }

  // 2. Resolve real photo from productContext if available
  if (productContext) {
    const contextPhoto = resolveProductImageUrl(productContext);
    if (contextPhoto) {
      return contextPhoto;
    }
  }

  // 3. Fallback URL if valid
  if (fallback && typeof fallback === 'string') {
    const trimmedFallback = fallback.trim();
    if (trimmedFallback && !isInvalidUrl(trimmedFallback)) {
      return trimmedFallback;
    }
  }

  // 4. Fall back to clean studio placeholder only when no real photo exists
  if (productContext) {
    return getStudioPlaceholderForProduct(productContext);
  }

  return STUDIO_GARMENT_SVG;
};

/**
 * Safe onError image fallback handler to prevent broken image icons and infinite loops.
 */
export const handleImageError = (event, fallback = STUDIO_GARMENT_SVG, productContext = null) => {
  if (!event || !event.currentTarget) return;

  const imgEl = event.currentTarget;

  // Prevent infinite loop if fallback itself triggers an error
  imgEl.onerror = (e) => {
    if (e && e.currentTarget) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = STUDIO_GARMENT_SVG;
    }
  };

  const safeReplacement = productContext
    ? getStudioPlaceholderForProduct(productContext)
    : (fallback || STUDIO_GARMENT_SVG);

  imgEl.src = safeReplacement;
};

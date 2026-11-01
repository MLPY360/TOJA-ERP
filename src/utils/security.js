/**
 * Centralized Security Hardening Module for TOJA ERP
 * Provides Input Sanitization, Output Validation, Parameterized Query Safety,
 * Password Strength Policy, and Client-Side Brute-Force Rate Limiting.
 */

export const FIELD_LIMITS = {
  name: 60,
  email: 100,
  phone: 15,
  address: 250,
  streetName: 120,
  buildingNumber: 30,
  apartmentFloor: 40,
  city: 60,
  governorate: 40,
  orderId: 25,
  promoCode: 20,
  notes: 500,
  reason: 120,
  message: 1000
};

/**
 * Strips HTML, scripts, event handlers, and dangerous characters from raw user input.
 * Enforces strict max-length constraints and collapses whitespace.
 */
export function sanitizeInput(val, maxLength = 250) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') {
    val = String(val);
  }

  let cleaned = val
    // Remove script tags and content within
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove inline event handlers (e.g. onerror=, onload=, onclick=)
    .replace(/\bon\w+\s*=/gi, '')
    // Remove javascript: pseudo-protocols
    .replace(/javascript\s*:/gi, '')
    // Strip dangerous bracket/injection characters
    .replace(/[<>${}]/g, '')
    // Normalize unicode control characters
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    // Normalize excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (typeof maxLength === 'number' && maxLength > 0) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Sanitizes all string values of an object against specified field limits.
 * Intelligently preserves image URLs, base64 data URLs, and asset paths without truncation or corruption.
 */
export function sanitizeObject(obj, limits = FIELD_LIMITS) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' ? sanitizeObject(item, limits) : item));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const k = key.toLowerCase();
      const isImgField = (
        k.includes('image') ||
        k.includes('photo') ||
        k.includes('avatar') ||
        k.includes('thumbnail') ||
        k === 'url' ||
        k === 'link' ||
        value.startsWith('data:image/') ||
        value.startsWith('https://') ||
        value.startsWith('http://') ||
        value.startsWith('blob:') ||
        value.startsWith('/')
      );

      if (isImgField) {
        // Preserve image URLs, base64 data URLs, and storage paths without truncation
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript\s*:/gi, '')
          .trim();
      } else {
        const limit = limits[key] || 250;
        sanitized[key] = sanitizeInput(value, limit);
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, limits);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') {
          const isImg = (
            item.startsWith('data:image/') ||
            item.startsWith('https://') ||
            item.startsWith('http://') ||
            item.startsWith('blob:') ||
            item.startsWith('/')
          );
          if (isImg) {
            return item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/javascript\s*:/gi, '').trim();
          }
          return sanitizeInput(item, 250);
        } else if (item && typeof item === 'object') {
          return sanitizeObject(item, limits);
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Ensures any parameter passed into Firestore queries (`where`, `doc`, `collection`)
 * is strictly a safe primitive (string/number) without path traversal or NoSQL injection.
 */
export function safeQueryParam(param, maxLength = 100) {
  if (param === null || param === undefined) return '';

  // Reject objects, arrays, and functions immediately
  if (typeof param === 'object' || typeof param === 'function') {
    throw new Error('Invalid query parameter type: expected primitive string or number.');
  }

  let safe = String(param)
    // Strip directory traversal
    .replace(/\.\./g, '')
    .replace(/[\\/]/g, '')
    // Strip Firestore internal reserved document markers
    .replace(/__.*__/g, '')
    // Strip null bytes
    .replace(/\0/g, '')
    .trim();

  if (maxLength > 0) {
    safe = safe.slice(0, maxLength);
  }

  return safe;
}

/**
 * Validates and sanitizes data fetched from Firestore before rendering or using in calculations.
 * Strictly preserves all valid image paths, Firebase Storage URLs, base64 strings, and relative asset URLs.
 */
export function validateOutput(data) {
  if (!data || typeof data !== 'object') return data;

  const safe = Array.isArray(data) ? [] : {};

  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'number') {
      // Ensure number is finite and not NaN
      safe[k] = Number.isFinite(v) ? v : 0;
    } else if (typeof v === 'string') {
      const lowerKey = k.toLowerCase();
      const isImgField = (
        lowerKey.includes('image') ||
        lowerKey.includes('photo') ||
        lowerKey.includes('avatar') ||
        lowerKey.includes('thumbnail') ||
        lowerKey === 'url' ||
        lowerKey === 'link' ||
        v.startsWith('data:image/') ||
        v.startsWith('https://') ||
        v.startsWith('http://') ||
        v.startsWith('blob:') ||
        v.startsWith('/') ||
        v.startsWith('./') ||
        v.startsWith('../')
      );

      if (isImgField) {
        // Never strip, corrupt, or clear valid image URLs, base64 strings, or asset paths
        safe[k] = v.trim();
      } else {
        safe[k] = v;
      }
    } else if (v && typeof v === 'object') {
      safe[k] = validateOutput(v);
    } else {
      safe[k] = v;
    }
  }

  return safe;
}

/**
 * Password Complexity Validator
 * Requires: >= 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 */
export function checkPasswordStrength(password) {
  const p = typeof password === 'string' ? password : '';
  const checks = {
    length: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p)
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  let score = 0;
  if (checks.length) score += 1;
  if (checks.hasUpper && checks.hasLower) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;

  return {
    checks,
    score, // 0 to 4
    isStrong: passedCount === 5,
    passedCount
  };
}

/**
 * Client-Side Brute-Force Rate Limiter
 * Tracks failed attempts per action key in sessionStorage / localStorage
 */
const RATE_LIMIT_PREFIX = 'toja_rl_';

export function checkRateLimit(actionKey, maxAttempts = 5, lockoutMs = 5 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
    if (!raw) return { allowed: true, attempts: 0, retryAfterSeconds: 0 };

    const record = JSON.parse(raw);
    const now = Date.now();

    // Check if lockout has expired
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSecs = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, attempts: record.attempts, retryAfterSeconds: remainingSecs };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      localStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
      return { allowed: true, attempts: 0, retryAfterSeconds: 0 };
    }

    // Sliding window check (default 10 mins window)
    if (record.firstAttempt && now - record.firstAttempt > 10 * 60 * 1000) {
      localStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
      return { allowed: true, attempts: 0, retryAfterSeconds: 0 };
    }

    if (record.attempts >= maxAttempts) {
      const lockedUntil = now + lockoutMs;
      record.lockedUntil = lockedUntil;
      localStorage.setItem(`${RATE_LIMIT_PREFIX}${actionKey}`, JSON.stringify(record));
      return { allowed: false, attempts: record.attempts, retryAfterSeconds: Math.ceil(lockoutMs / 1000) };
    }

    return { allowed: true, attempts: record.attempts, retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, attempts: 0, retryAfterSeconds: 0 };
  }
}

export function recordRateLimitAttempt(actionKey, maxAttempts = 5, lockoutMs = 5 * 60 * 1000) {
  try {
    const key = `${RATE_LIMIT_PREFIX}${actionKey}`;
    const raw = localStorage.getItem(key);
    const now = Date.now();

    let record = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: now, lockedUntil: null };
    record.attempts = (record.attempts || 0) + 1;

    if (record.attempts >= maxAttempts) {
      record.lockedUntil = now + lockoutMs;
    }

    localStorage.setItem(key, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

export function resetRateLimit(actionKey) {
  try {
    localStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
  } catch {}
}

export function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

import { collection, doc, writeBatch, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { isSuperAdmin } from './authConfig.js';

/**
 * Standard Log Levels
 */
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
};

const LOG_LEVEL_PRIORITY = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
};

// Sensitive property keys to scrub from logs
const SENSITIVE_KEY_PATTERNS = [
  /passw(or)?d/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth(orization)?/i,
  /bearer/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /private[_-]?key/i,
  /credential/i
];

/**
 * Recursively sanitize payloads to prevent leaking sensitive credentials
 */
export function sanitizePayload(data, depth = 0, seen = new WeakSet()) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (depth > 8) return '[MAX_DEPTH_EXCEEDED]';
  if (seen.has(data)) return '[CIRCULAR_REFERENCE]';

  seen.add(data);

  if (Array.isArray(data)) {
    return data.map(item => sanitizePayload(item, depth + 1, seen));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value, depth + 1, seen);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Normalize and serialize Error objects
 */
function serializeError(err) {
  if (!err) return null;
  if (err instanceof Error) {
    return {
      name: err.name || 'Error',
      message: err.message || String(err),
      code: err.code || err.statusCode || null,
      stack: err.stack || null
    };
  }
  if (typeof err === 'object') {
    return {
      name: err.name || 'ErrorObject',
      message: err.message || JSON.stringify(err),
      code: err.code || null,
      stack: err.stack || null
    };
  }
  return {
    name: 'Error',
    message: String(err),
    code: null,
    stack: null
  };
}

/**
 * Generate a unique correlation Request ID
 */
function generateRequestId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `req_${ts}_${rand}`;
}

// Session request ID cached in memory & sessionStorage
let currentRequestId = (() => {
  try {
    const existing = sessionStorage.getItem('toja_request_id');
    if (existing) return existing;
    const newId = generateRequestId();
    sessionStorage.setItem('toja_request_id', newId);
    return newId;
  } catch {
    return generateRequestId();
  }
})();

/**
 * Extract active user authentication & RBAC context
 */
function getUserContext() {
  try {
    const rawUser = localStorage.getItem('toja_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    const userEmail = user?.email || auth.currentUser?.email || null;
    const isSuper = isSuperAdmin(userEmail);

    let userRole = localStorage.getItem('toja_user_role') || (isSuper ? 'admin' : 'operations');
    // Security lockdown: non-super-admins cannot masquerade as admin in logs
    if (!isSuper && userRole === 'admin') {
      userRole = 'operations';
    }

    const userId = user?.id || user?.uid || auth.currentUser?.uid || 'anonymous';
    const userName = user?.name || user?.displayName || auth.currentUser?.displayName || 'Anonymous';

    return { userId, userName, userEmail, userRole };
  } catch {
    return {
      userId: auth.currentUser?.uid || 'anonymous',
      userName: 'Anonymous',
      userEmail: auth.currentUser?.email || null,
      userRole: 'operations'
    };
  }
}

/**
 * Enterprise Structured Logger with In-Memory Buffering & Firestore Persistence
 */
class LoggerService {
  constructor() {
    this.buffer = [];
    this.inMemoryRing = []; // Cache up to 100 recent entries in RAM
    this.maxBufferSize = 10;
    this.flushIntervalMs = 1500;
    this.flushTimer = null;
    this.isFlushing = false;
    this.activeMinLevel = (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) ? LogLevel.DEBUG : LogLevel.INFO;

    // Load any unwritten backup logs from localStorage
    this.restoreFromBackup();

    // Flush buffer before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      window.addEventListener('online', () => {
        this.flush();
      });
    }
  }

  /**
   * Set minimum active log level filter
   */
  setMinLevel(level) {
    if (LOG_LEVEL_PRIORITY[level] !== undefined) {
      this.activeMinLevel = level;
    }
  }

  /**
   * Generate or retrieve current trace correlation ID
   */
  getRequestId() {
    return currentRequestId;
  }

  newRequestId() {
    currentRequestId = generateRequestId();
    try {
      sessionStorage.setItem('toja_request_id', currentRequestId);
    } catch {}
    return currentRequestId;
  }

  setRequestId(id) {
    if (id) {
      currentRequestId = String(id);
      try {
        sessionStorage.setItem('toja_request_id', currentRequestId);
      } catch {}
    }
    return currentRequestId;
  }

  /**
   * Core logging method
   */
  log({ level, action, module, payload = {}, error = null, message = '' }) {
    const entryPriority = LOG_LEVEL_PRIORITY[level] ?? LOG_LEVEL_PRIORITY.INFO;
    const minPriority = LOG_LEVEL_PRIORITY[this.activeMinLevel] ?? LOG_LEVEL_PRIORITY.INFO;

    const user = getUserContext();
    const timestamp = new Date().toISOString();
    const sanitizedPayload = sanitizePayload(payload);
    const serializedError = serializeError(error);

    const logEntry = {
      timestamp,
      level,
      requestId: currentRequestId,
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      userRole: user.userRole,
      action: action ? String(action).toUpperCase() : 'UNKNOWN_ACTION',
      module: module ? String(module).toLowerCase() : 'system',
      message: message || `${action} in ${module}`,
      payload: sanitizedPayload || {},
      error: serializedError,
      clientInfo: typeof window !== 'undefined' ? {
        url: window.location.pathname,
        userAgent: window.navigator.userAgent
      } : null
    };

    // Print to browser console with stylized badge
    this.logToConsole(logEntry);

    // Save into in-memory ring buffer (up to 100 recent entries)
    this.inMemoryRing.unshift(logEntry);
    if (this.inMemoryRing.length > 100) {
      this.inMemoryRing.pop();
    }

    // If below min priority in production, skip persisting to Firestore
    if (entryPriority < minPriority && !import.meta?.env?.DEV) {
      return logEntry;
    }

    // Add to buffer queue
    this.buffer.push(logEntry);

    // Immediate flush on ERROR or FATAL, or if buffer is full
    if (level === LogLevel.ERROR || level === LogLevel.FATAL || this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }

    return logEntry;
  }

  logToConsole(entry) {
    if (typeof console === 'undefined') return;

    const colors = {
      [LogLevel.DEBUG]: 'color: #94A3B8; font-weight: bold;',
      [LogLevel.INFO]: 'color: #10B981; font-weight: bold;',
      [LogLevel.WARN]: 'color: #F59E0B; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #EF4444; font-weight: bold;',
      [LogLevel.FATAL]: 'color: #DC2626; font-weight: 900; background: #FEE2E2;'
    };

    const style = colors[entry.level] || 'color: #64748B;';
    const prefix = `%c[${entry.level}] [${entry.module}] ${entry.action}:`;

    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      console.error(prefix, style, entry.message, { payload: entry.payload, error: entry.error, meta: entry });
    } else if (entry.level === LogLevel.WARN) {
      console.warn(prefix, style, entry.message, { payload: entry.payload, meta: entry });
    } else if (entry.level === LogLevel.DEBUG) {
      console.debug(prefix, style, entry.message, { payload: entry.payload, meta: entry });
    } else {
      console.log(prefix, style, entry.message, { payload: entry.payload, meta: entry });
    }
  }

  scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Flush buffered logs to Firestore 'system_logs' collection in a single batch
   */
  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0 || this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    const batchItems = [...this.buffer];
    this.buffer = [];

    try {
      const batch = writeBatch(db);
      const systemLogsCol = collection(db, 'system_logs');

      batchItems.forEach((item) => {
        const docRef = doc(systemLogsCol);
        batch.set(docRef, {
          ...item,
          id: docRef.id
        });
      });

      await batch.commit();
      this.clearBackup();
    } catch (err) {
      console.warn('[LoggerService] Failed to commit log batch to Firestore:', err);
      // Save items to local backup storage to prevent data loss
      this.saveToBackup(batchItems);
    } finally {
      this.isFlushing = false;
      // If new entries were added while flushing, schedule next flush
      if (this.buffer.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  saveToBackup(items) {
    try {
      const existingRaw = localStorage.getItem('toja_log_backup');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const combined = [...existing, ...items].slice(-50); // Keep max 50 in localStorage
      localStorage.setItem('toja_log_backup', JSON.stringify(combined));
    } catch {}
  }

  clearBackup() {
    try {
      localStorage.removeItem('toja_log_backup');
    } catch {}
  }

  restoreFromBackup() {
    try {
      const raw = localStorage.getItem('toja_log_backup');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          this.buffer.push(...items);
          this.clearBackup();
          this.scheduleFlush();
        }
      }
    } catch {}
  }

  // Convenience API Methods
  debug(action, module, payload = {}, message = '') {
    return this.log({
      level: LogLevel.DEBUG,
      action,
      module,
      payload,
      message: message || `${action} diagnostic trace`
    });
  }

  info(action, module, payload = {}, message = '') {
    return this.log({
      level: LogLevel.INFO,
      action,
      module,
      payload,
      message: message || `${action} completed`
    });
  }

  warn(action, module, payload = {}, message = '') {
    return this.log({
      level: LogLevel.WARN,
      action,
      module,
      payload,
      message: message || `${action} warning`
    });
  }

  error(action, module, error = null, payload = {}, message = '') {
    return this.log({
      level: LogLevel.ERROR,
      action,
      module,
      error,
      payload,
      message: message || (error?.message ? `${action} error: ${error.message}` : `${action} failed`)
    });
  }

  fatal(action, module, error = null, payload = {}, message = '') {
    return this.log({
      level: LogLevel.FATAL,
      action,
      module,
      error,
      payload,
      message: message || `CRITICAL FAILURE: ${action} - ${error?.message || 'Fatal error'}`
    });
  }

  /**
   * Subscribe to real-time system logs feed
   */
  subscribeSystemLogs({ limitCount = 300, onUpdate, onError }) {
    try {
      const q = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const logs = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          if (onUpdate) onUpdate(logs);
        },
        (error) => {
          console.warn('[LoggerService] Firestore subscription error:', error);
          if (onError) onError(error);
        }
      );
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  }

  /**
   * Fetch one-time snapshot of system logs
   */
  async fetchSystemLogs({ limitCount = 300 } = {}) {
    try {
      const q = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[LoggerService] Failed to fetch system logs:', err);
      return [];
    }
  }
}

// Singleton logger export
export const logger = new LoggerService();
export default logger;

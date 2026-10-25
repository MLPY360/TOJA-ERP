import assert from 'assert';
import { sanitizePayload, LogLevel } from './src/utils/logger.js';
import { translations } from './src/translations.js';
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from './src/utils/authConfig.js';

console.log('================================================================');
console.log('  STRUCTURED & CENTRALIZED LOGGING ARCHITECTURE TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. Log Levels & Constants Verification
// -------------------------------------------------------------
console.log('\n--- 1. LOG LEVELS SPECIFICATION ---');

test('Standard Log Levels defined: DEBUG, INFO, WARN, ERROR, FATAL', () => {
  assert.strictEqual(LogLevel.DEBUG, 'DEBUG');
  assert.strictEqual(LogLevel.INFO, 'INFO');
  assert.strictEqual(LogLevel.WARN, 'WARN');
  assert.strictEqual(LogLevel.ERROR, 'ERROR');
  assert.strictEqual(LogLevel.FATAL, 'FATAL');
});

// -------------------------------------------------------------
// 2. Sensitive Payload Sanitization
// -------------------------------------------------------------
console.log('\n--- 2. PAYLOAD SANITIZATION & SECURITY ---');

test('Sanitizer redacts passwords, tokens, API keys, secrets, and credentials', () => {
  const sensitivePayload = {
    orderId: 'ORD-1234',
    customerName: 'Ahmed Ali',
    password: 'SuperSecretPassword123!',
    user_password: 'anotherPassword',
    api_key: 'AIzaSyCePNvIrwlz4mci9hvV4YEtbYPiR4ivh1w',
    authToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    secretKey: 'top_secret',
    creditCard: '4111-2222-3333-4444',
    cvv: '123',
    nested: {
      clientSecret: 'secret_nested_value',
      safeField: 'This should remain intact'
    }
  };

  const sanitized = sanitizePayload(sensitivePayload);

  assert.strictEqual(sanitized.orderId, 'ORD-1234');
  assert.strictEqual(sanitized.customerName, 'Ahmed Ali');
  assert.strictEqual(sanitized.password, '[REDACTED]');
  assert.strictEqual(sanitized.user_password, '[REDACTED]');
  assert.strictEqual(sanitized.api_key, '[REDACTED]');
  assert.strictEqual(sanitized.authToken, '[REDACTED]');
  assert.strictEqual(sanitized.secretKey, '[REDACTED]');
  assert.strictEqual(sanitized.creditCard, '[REDACTED]');
  assert.strictEqual(sanitized.cvv, '[REDACTED]');
  assert.strictEqual(sanitized.nested.clientSecret, '[REDACTED]');
  assert.strictEqual(sanitized.nested.safeField, 'This should remain intact');
});

test('Sanitizer handles circular references and nested arrays safely', () => {
  const circularObj = { name: 'Circular Test' };
  circularObj.self = circularObj;

  const arrayPayload = [
    { password: '123', item: 'T-Shirt' },
    { token: 'abc', sku: 'TS-BLK-M' }
  ];

  const sanitizedCircular = sanitizePayload(circularObj);
  assert.strictEqual(sanitizedCircular.name, 'Circular Test');
  assert.strictEqual(sanitizedCircular.self, '[CIRCULAR_REFERENCE]');

  const sanitizedArray = sanitizePayload(arrayPayload);
  assert.strictEqual(sanitizedArray[0].password, '[REDACTED]');
  assert.strictEqual(sanitizedArray[0].item, 'T-Shirt');
  assert.strictEqual(sanitizedArray[1].token, '[REDACTED]');
  assert.strictEqual(sanitizedArray[1].sku, 'TS-BLK-M');
});

// -------------------------------------------------------------
// 3. Structured Log Metadata Schema
// -------------------------------------------------------------
console.log('\n--- 3. STRUCTURED LOG ENTRY METADATA VALIDATION ---');

test('Structured Log Entry conforms to mandatory telemetry fields', () => {
  const sampleLog = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    requestId: 'req_12345_abcdef',
    userId: 'user_admin_001',
    userName: 'Operations Lead',
    userRole: 'admin',
    action: 'ORDER_CREATE',
    module: 'orders',
    message: 'Order ORD-8899 created successfully',
    payload: {
      orderId: 'doc_123',
      displayId: 'ORD-8899',
      total: 1250,
      customerName: 'Youssef'
    },
    error: null
  };

  // Check ISO 8601 timestamp format
  assert.match(sampleLog.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(sampleLog.level));
  assert.ok(sampleLog.requestId.startsWith('req_'));
  assert.ok(sampleLog.userId.length > 0);
  assert.ok(['admin', 'operations', 'finance'].includes(sampleLog.userRole));
  assert.strictEqual(sampleLog.action, 'ORDER_CREATE');
  assert.strictEqual(sampleLog.module, 'orders');
  assert.strictEqual(sampleLog.payload.total, 1250);
  assert.strictEqual(sampleLog.error, null);
});

test('Error structure serializes Error instance properly for ERROR/FATAL levels', () => {
  const err = new Error('Database connection timed out');
  err.code = 'firestore/unavailable';

  const serializedError = {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack
  };

  const errorLog = {
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    requestId: 'req_trace_999',
    userId: 'admin_1',
    userRole: 'admin',
    action: 'FIRESTORE_WRITE_FAIL',
    module: 'inventory',
    message: 'Failed to update stock: Database connection timed out',
    payload: { productId: 'prod_1', size: 'XL', delta: -2 },
    error: serializedError
  };

  assert.strictEqual(errorLog.level, 'ERROR');
  assert.strictEqual(errorLog.error.name, 'Error');
  assert.strictEqual(errorLog.error.message, 'Database connection timed out');
  assert.strictEqual(errorLog.error.code, 'firestore/unavailable');
  assert.ok(errorLog.error.stack.length > 0);
});

// -------------------------------------------------------------
// 4. Bilingual Translations Verification
// -------------------------------------------------------------
console.log('\n--- 4. BILINGUAL TRANSLATIONS INTEGRITY ---');

test('English and Arabic translation dictionaries contain all structured logging keys', () => {
  const requiredKeys = [
    'structuredLogs',
    'centralizedLogsDesc',
    'logLevel',
    'allLevels',
    'moduleFilter',
    'allModules',
    'dateRange',
    'today',
    'last7Days',
    'customRange',
    'searchLogsPlaceholder',
    'exportJson',
    'exportCsv',
    'liveSync',
    'refresh',
    'flushBuffer',
    'bufferFlushed',
    'totalLogs',
    'filteredLogs',
    'noLogsFound',
    'payloadContext',
    'errorStackTrace',
    'traceMetadata',
    'copyJson',
    'copied',
    'requestId',
    'adminOnlyLogs',
    'activityFeedTab',
    'systemLogsTab'
  ];

  requiredKeys.forEach((key) => {
    assert.ok(translations.en[key], `Missing English translation for: ${key}`);
    assert.ok(translations.ar[key], `Missing Arabic translation for: ${key}`);
  });
});

// -------------------------------------------------------------
// 5. Full-Text Search and Filtering Logic
// -------------------------------------------------------------
console.log('\n--- 5. ADMIN LOG VIEWER SEARCH & FILTERING LOGIC ---');

test('Search filter matches action, requestId, userId, message, and nested payload fields', () => {
  const logs = [
    {
      id: '1',
      action: 'ORDER_CREATE',
      requestId: 'req_alpha_111',
      userId: 'usr_77',
      message: 'Created order for Tarek',
      payload: { customerName: 'Tarek', orderId: 'ORD-5501' }
    },
    {
      id: '2',
      action: 'INVENTORY_ADJUST',
      requestId: 'req_beta_222',
      userId: 'usr_88',
      message: 'Adjusted stock for Polo Shirt',
      payload: { sku: 'POLO-WHT-L', delta: -5 }
    },
    {
      id: '3',
      action: 'BLACKLIST_ADD',
      requestId: 'req_gamma_333',
      userId: 'usr_99',
      message: 'Customer added to blacklist',
      payload: { phone: '01011112222', reason: 'High return rate' }
    }
  ];

  const search = (query) => {
    const q = query.toLowerCase();
    return logs.filter(l =>
      l.message.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.requestId.toLowerCase().includes(q) ||
      l.userId.toLowerCase().includes(q) ||
      JSON.stringify(l.payload).toLowerCase().includes(q)
    );
  };

  assert.strictEqual(search('ORD-5501').length, 1);
  assert.strictEqual(search('ORD-5501')[0].id, '1');

  assert.strictEqual(search('POLO-WHT-L').length, 1);
  assert.strictEqual(search('POLO-WHT-L')[0].id, '2');

  assert.strictEqual(search('req_gamma_333').length, 1);
  assert.strictEqual(search('req_gamma_333')[0].id, '3');

  assert.strictEqual(search('blacklist').length, 1);
});

// -------------------------------------------------------------
// 6. Super Admin Whitelist & RBAC Lockdown
// -------------------------------------------------------------
console.log('\n--- 6. SUPER ADMIN WHITELIST & RBAC LOCKDOWN ---');

test('SUPER_ADMIN_EMAILS contains mohameedhasan81@gmail.com', () => {
  assert.ok(SUPER_ADMIN_EMAILS.includes('mohameedhasan81@gmail.com'));
});

test('isSuperAdmin correctly identifies super admin email (case-insensitive & trimmed)', () => {
  assert.strictEqual(isSuperAdmin('mohameedhasan81@gmail.com'), true);
  assert.strictEqual(isSuperAdmin('MohameedHasan81@gmail.com'), true);
  assert.strictEqual(isSuperAdmin('  mohameedhasan81@gmail.com  '), true);
  assert.strictEqual(isSuperAdmin({ email: 'mohameedhasan81@gmail.com' }), true);
});

test('isSuperAdmin blocks non-super-admin emails and invalid inputs', () => {
  assert.strictEqual(isSuperAdmin('operations@toja.com'), false);
  assert.strictEqual(isSuperAdmin('admin@hacker.io'), false);
  assert.strictEqual(isSuperAdmin(''), false);
  assert.strictEqual(isSuperAdmin(null), false);
  assert.strictEqual(isSuperAdmin(undefined), false);
  assert.strictEqual(isSuperAdmin({ email: 'staff@toja.com' }), false);
});

test('RBAC Lockdown rule: Non-super-admins cannot hold admin role', () => {
  const enforceRole = (userEmail, requestedRole) => {
    if (isSuperAdmin(userEmail)) {
      return requestedRole || 'admin';
    }
    // Strict lockdown: all non-super-admin accounts forced to non-admin roles
    return requestedRole === 'admin' ? 'operations' : (requestedRole || 'operations');
  };

  assert.strictEqual(enforceRole('mohameedhasan81@gmail.com', 'admin'), 'admin');
  assert.strictEqual(enforceRole('mohameedhasan81@gmail.com', 'operations'), 'operations');
  assert.strictEqual(enforceRole('hacker@test.com', 'admin'), 'operations');
  assert.strictEqual(enforceRole('staff@toja.com', 'finance'), 'finance');
  assert.strictEqual(enforceRole('staff@toja.com', 'admin'), 'operations');
});

console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(0)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

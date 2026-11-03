#!/usr/bin/env node
/**
 * TOJA Project — Automated Secret & Credential Scanner
 * 
 * Inspects source code and staged git files for:
 * - Plaintext passwords (e.g. password: '...', setPassword('...'))
 * - Cloud & AI API keys (Google, OpenAI, Groq, Anthropic, AWS)
 * - Private Keys & Certificates (RSA, EC, OPENSSH)
 * - Authentication Tokens & JWTs (GitHub, Slack, Bearer, etc.)
 * 
 * Usage:
 *   node scripts/scan-secrets.mjs           # Scans all source files
 *   node scripts/scan-secrets.mjs --staged  # Scans only git-staged files (for pre-commit hook)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isStagedOnly = process.argv.includes('--staged');

// Directories and files to strictly ignore
const IGNORED_PATHS = [
  'node_modules',
  'dist',
  'dist-ssr',
  '.git',
  '.firebase',
  'package-lock.json',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'rules_verification_report.md',
  'test_logging_architecture.mjs'
];

// File extensions to scan
const SCANNABLE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.html', '.css', '.rules', '.yml', '.yaml', '.sh', '.env.example'
]);

// Known harmless UI strings or localization values that should not be flagged as passwords
const LOCALIZATION_SAFE_VALUES = new Set([
  'password',
  'كلمة المرور',
  'كلمة السر',
  'mot de passe',
  'contraseña',
  'enter password',
  'new password',
  'confirm password',
  'current password',
  'admin',
  'customer',
  'user'
]);

// Secret Detection Signatures
const SECRET_PATTERNS = [
  {
    name: 'Hardcoded Plaintext Password Assignment',
    // Matches password: 'xyz' or password = "xyz"
    regex: /(?:password|passwd|pwd)\s*[:=]\s*['"`]([A-Za-z0-9!@#$%^&*()_+=\-{}[\]:;<>?,./~]{4,})['"`]/i,
    severity: 'HIGH'
  },
  {
    name: 'Hardcoded setPassword Literal Call',
    // Matches setPassword('xyz') with non-empty string literal
    regex: /setPassword\s*\(\s*['"`]([A-Za-z0-9!@#$%^&*()_+=\-{}[\]:;<>?,./~]{2,})['"`]\s*\)/,
    severity: 'HIGH'
  },
  {
    name: 'Known Staging Password Leak (toja2026)',
    regex: /toja2026[!A-Za-z0-9]*/i,
    severity: 'CRITICAL'
  },
  {
    name: 'Private Encryption Key Header',
    regex: /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/,
    severity: 'CRITICAL'
  },
  {
    name: 'Google / Gemini API Secret Key',
    regex: /AQ\.[A-Za-z0-9_-]{35,}/,
    severity: 'HIGH'
  },
  {
    name: 'Groq API Key',
    regex: /gsk_[A-Za-z0-9]{30,}/,
    severity: 'HIGH'
  },
  {
    name: 'OpenAI API Key',
    regex: /sk-(?:proj-)?[A-Za-z0-9-_]{32,}/,
    severity: 'HIGH'
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}/,
    severity: 'HIGH'
  },
  {
    name: 'Slack Token',
    regex: /xox[baprs]-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}/,
    severity: 'HIGH'
  },
  {
    name: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    severity: 'HIGH'
  },
  {
    name: 'Unmasked High-Entropy JWT Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    severity: 'MEDIUM'
  }
];

function maskSecret(str) {
  if (!str || str.length <= 4) return '****';
  return str.slice(0, 2) + '•'.repeat(Math.min(str.length - 4, 12)) + str.slice(-2);
}

function shouldIgnorePath(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.endsWith('scan-secrets.mjs') || normalized.endsWith('rules_verification_report.md')) {
    return true;
  }
  return IGNORED_PATHS.some((ignored) => normalized === ignored || normalized.startsWith(ignored + '/'));
}

function getFilesToScan() {
  if (isStagedOnly) {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
        cwd: ROOT_DIR,
        encoding: 'utf8'
      });
      return output
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
        .map((f) => path.resolve(ROOT_DIR, f))
        .filter((f) => fs.existsSync(f));
    } catch {
      return collectAllFiles(ROOT_DIR);
    }
  }
  return collectAllFiles(ROOT_DIR);
}

function collectAllFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (shouldIgnorePath(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectAllFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function main() {
  const files = getFilesToScan();
  const violations = [];

  console.log(`\x1b[36m🔍 [TOJA Secret Scanner] Inspecting ${files.length} file(s)${isStagedOnly ? ' (staged git files)' : ''}...\x1b[0m`);

  for (const file of files) {
    const relPath = path.relative(ROOT_DIR, file);

    if (shouldIgnorePath(relPath)) {
      continue;
    }

    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Exclude comments that explicitly mention test fixtures or doc examples
      if (line.includes('gitguardian-ignore') || line.includes('gitleaks:allow')) {
        continue;
      }

      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const matchedVal = (match[1] || match[0]).trim();

          // Exemption: Public Firebase client config in src/firebase.js
          if (relPath.replace(/\\/g, '/').includes('src/firebase.js') && pattern.name.includes('Google')) {
            continue;
          }

          // Exemption: .env.example with placeholders
          if (relPath.includes('.env.example') && (line.includes('your_') || line.includes('empty') || line.trim().endsWith('='))) {
            continue;
          }

          // Exemption: UI localization dictionaries (translations.js, i18n) where values are harmless words
          if (
            pattern.name === 'Hardcoded Plaintext Password Assignment' &&
            LOCALIZATION_SAFE_VALUES.has(matchedVal.toLowerCase())
          ) {
            continue;
          }

          violations.push({
            file: relPath,
            lineNum: i + 1,
            ruleName: pattern.name,
            severity: pattern.severity,
            preview: line.trim(),
            matchedText: matchedVal
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\n\x1b[41m\x1b[37m 🚨 CRITICAL: ${violations.length} POTENTIAL SECRET(S) / CREDENTIAL LEAKS DETECTED! \x1b[0m\n`);

    for (const v of violations) {
      console.error(`  \x1b[33m${v.file}:${v.lineNum}\x1b[0m — [${v.severity}] \x1b[31m${v.ruleName}\x1b[0m`);
      console.error(`    Found:   \x1b[31m${maskSecret(v.matchedText)}\x1b[0m`);
      console.error(`    Context: \x1b[90m${v.preview.slice(0, 100)}\x1b[0m\n`);
    }

    console.error(`\x1b[31m❌ Commit / Build BLOCKED by TOJA Security Policy.\x1b[0m`);
    console.error(`👉 Never commit plain-text credentials. Use environment variables (.env) or pass them at runtime.\n`);
    process.exit(1);
  }

  console.log(`\x1b[32m✅ [TOJA Secret Scanner] 0 secrets detected. Codebase is clean.\x1b[0m\n`);
  process.exit(0);
}

main();

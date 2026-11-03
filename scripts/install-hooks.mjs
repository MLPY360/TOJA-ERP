#!/usr/bin/env node
/**
 * TOJA Project — Git Hooks Installer
 * 
 * Automatically configures the pre-commit hook in .git/hooks to run:
 * 1. scan-secrets.mjs (checking staged files for plaintext credentials)
 * 2. validate-rules.mjs (checking firestore.rules for syntax and security)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const GIT_HOOKS_DIR = path.join(ROOT_DIR, '.git', 'hooks');
const PRE_COMMIT_HOOK = path.join(GIT_HOOKS_DIR, 'pre-commit');

const HOOK_CONTENT = `#!/bin/sh
# ── TOJA Pre-Commit Security & Rules Protection ──

echo "\\033[36m[Pre-Commit Hook] Running secrets scanner on staged changes...\\033[0m"
node scripts/scan-secrets.mjs --staged
SCAN_EXIT=$?
if [ $SCAN_EXIT -ne 0 ]; then
  echo ""
  echo "\\033[31m❌ [PRE-COMMIT BLOCKED] Secrets or plaintext credentials detected in staged commit!\\033[0m"
  echo "👉 Remove hardcoded secrets or move them to .env before committing."
  exit 1
fi

echo "\\033[36m[Pre-Commit Hook] Validating Firestore Security Rules...\\033[0m"
node scripts/validate-rules.mjs
RULES_EXIT=$?
if [ $RULES_EXIT -ne 0 ]; then
  echo ""
  echo "\\033[31m❌ [PRE-COMMIT BLOCKED] firestore.rules failed syntax or security validation!\\033[0m"
  exit 1
fi

echo "\\033[32m✅ [Pre-Commit Hook] All security & rules checks passed.\\033[0m"
exit 0
`;

function installHook() {
  if (!fs.existsSync(path.join(ROOT_DIR, '.git'))) {
    console.log('\x1b[33m⚠️  No .git directory found. Skipping hook installation (not a git root).\x1b[0m');
    return;
  }

  if (!fs.existsSync(GIT_HOOKS_DIR)) {
    fs.mkdirSync(GIT_HOOKS_DIR, { recursive: true });
  }

  fs.writeFileSync(PRE_COMMIT_HOOK, HOOK_CONTENT, { mode: 0o755 });
  // Also try chmod on POSIX/Git-bash environments
  try {
    fs.chmodSync(PRE_COMMIT_HOOK, 0o755);
  } catch {}

  console.log(`\x1b[32m✅ [Git Hooks] Pre-commit security hook installed at ${path.relative(ROOT_DIR, PRE_COMMIT_HOOK)}\x1b[0m`);
}

installHook();


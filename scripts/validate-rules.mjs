#!/usr/bin/env node
/**
 * TOJA Project — Firestore Security Rules Syntax & Integrity Validator
 * 
 * Verifies:
 * - Proper rules_version and service cloud.firestore declaration
 * - Syntax balance (curly braces, parentheses, square brackets)
 * - String literal closure (single/double quotes)
 * - Zero duplicate match paths in the same nesting scope
 * - Strict security lockdown on sensitive ERP & admin collections
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RULES_FILE = path.join(ROOT_DIR, 'firestore.rules');

function validateRules() {
  console.log(`\x1b[36m🛡️  [Rules Validator] Inspecting ${path.relative(ROOT_DIR, RULES_FILE)}...\x1b[0m`);

  if (!fs.existsSync(RULES_FILE)) {
    console.error(`\x1b[31m❌ [Error] firestore.rules file not found at ${RULES_FILE}\x1b[0m`);
    process.exit(1);
  }

  const content = fs.readFileSync(RULES_FILE, 'utf8');
  const errors = [];
  const lines = content.split('\n');

  // Check 1: Root declaration
  if (!content.includes("rules_version = '2';") && !content.includes('rules_version = "2";')) {
    errors.push("Missing mandatory `rules_version = '2';` header.");
  }
  if (!content.includes('service cloud.firestore')) {
    errors.push("Missing mandatory `service cloud.firestore` root block.");
  }

  // Check 2: Structural delimiter balance
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inBlockComment = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const nextChar = line[charIdx + 1];

      // Handle block comments
      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          charIdx++;
        }
        continue;
      }

      // Handle string literals
      if (inSingleQuote) {
        if (char === "'" && line[charIdx - 1] !== '\\') {
          inSingleQuote = false;
        }
        continue;
      }
      if (inDoubleQuote) {
        if (char === '"' && line[charIdx - 1] !== '\\') {
          inDoubleQuote = false;
        }
        continue;
      }

      // Check for comment starts
      if (char === '/' && nextChar === '/') {
        break; // Ignore rest of the line
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        charIdx++;
        continue;
      }

      // String begins
      if (char === "'") {
        inSingleQuote = true;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = true;
        continue;
      }

      // Delimiters
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount < 0) {
          errors.push(`Line ${lineIdx + 1}: Unexpected closing brace '}' without matching '{'.`);
        }
      } else if (char === '(') parenCount++;
      else if (char === ')') {
        parenCount--;
        if (parenCount < 0) {
          errors.push(`Line ${lineIdx + 1}: Unexpected closing parenthesis ')' without matching '('.`);
        }
      } else if (char === '[') bracketCount++;
      else if (char === ']') {
        bracketCount--;
        if (bracketCount < 0) {
          errors.push(`Line ${lineIdx + 1}: Unexpected closing bracket ']' without matching '['.`);
        }
      }
    }

    if (inSingleQuote) {
      errors.push(`Line ${lineIdx + 1}: Unclosed single quote (') on this line.`);
      inSingleQuote = false; // Reset to prevent cascading false positives
    }
    if (inDoubleQuote) {
      errors.push(`Line ${lineIdx + 1}: Unclosed double quote (") on this line.`);
      inDoubleQuote = false;
    }
  }

  if (braceCount !== 0) {
    errors.push(`Brace imbalance: ${braceCount > 0 ? `${braceCount} unclosed '{'` : `${Math.abs(braceCount)} extra '}'`}.`);
  }
  if (parenCount !== 0) {
    errors.push(`Parentheses imbalance: ${parenCount > 0 ? `${parenCount} unclosed '('` : `${Math.abs(parenCount)} extra ')'`}.`);
  }
  if (bracketCount !== 0) {
    errors.push(`Bracket imbalance: ${bracketCount > 0 ? `${bracketCount} unclosed '['` : `${Math.abs(bracketCount)} extra ']'`}.`);
  }

  // Check 3: Duplicate Match Paths
  const topLevelMatches = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const matchDirective = line.match(/^match\s+(\/[a-zA-Z0-9_\-{}]+)\s*\{/);
    if (matchDirective) {
      const matchPath = matchDirective[1];
      if (topLevelMatches.has(matchPath)) {
        errors.push(`Duplicate match path detected: "${matchPath}" at Line ${i + 1} (previously declared at Line ${topLevelMatches.get(matchPath)}).`);
      } else {
        topLevelMatches.set(matchPath, i + 1);
      }
    }
  }

  // Check 4: Sensitive Collections Lockdown
  const SENSITIVE_COLLECTIONS = ['admins', 'expenses', 'partners', 'withdrawals', 'courier_settlements'];
  for (const coll of SENSITIVE_COLLECTIONS) {
    const regex = new RegExp(`match\\s+/${coll}/\\{[a-zA-Z0-9_]+\\}\\s*\\{[\\s\\S]*?allow\\s+write\\s*:\\s*if\\s+true;`, 'i');
    if (regex.test(content)) {
      errors.push(`SECURITY LEAK: Sensitive collection '/${coll}' allows unrestricted public writes ('allow write: if true;').`);
    }
  }

  // Output
  if (errors.length > 0) {
    console.error(`\n\x1b[41m\x1b[37m 🚨 FIRESTORE RULES VALIDATION FAILED WITH ${errors.length} ERROR(S) \x1b[0m\n`);
    for (const err of errors) {
      console.error(`  \x1b[31m✖\x1b[0m ${err}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(`\x1b[32m✅ [Rules Validator] firestore.rules is syntactically sound, balanced, and passed all security audits.\x1b[0m\n`);
  process.exit(0);
}

validateRules();

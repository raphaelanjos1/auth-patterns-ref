/**
 * Domain boundary fitness function (IAM-12, IAM-13).
 *
 * Scans src/user/** and src/auth/** (.ts, including specs) for cross-domain imports.
 *
 * Allowlist:
 * - IAM → Audit: only paths under src/audit-log/events (e.g. publish-audit, audit.event, audit-actions)
 * - IAM → Shared: only src/shared/database, src/shared/hashing, src/shared/swagger (and subpaths)
 * - user → auth: only src/auth/authorization (not authentication/, auth.service, auth.repository, etc.)
 * - Within-domain: imports resolving under the same src/user or src/auth tree are allowed
 * - External packages and @generated/* are not checked
 *
 * Forbidden examples:
 * - ../audit-log/audit-log.service, audit-log.module, audit-log.repository
 * - any audit-log import outside events/
 * - ../shared/<anything-other-than-database|hashing|swagger>
 * - user importing ../auth/authentication/...
 *
 * Usage:
 *   node scripts/check-domain-boundaries.mjs
 *   node scripts/check-domain-boundaries.mjs --self-test
 *   npm run check:boundaries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const IAM_ROOTS = ['src/user', 'src/auth'];
const SHARED_ALLOW = ['src/shared/database', 'src/shared/hashing', 'src/shared/swagger'];
const AUDIT_EVENTS_PREFIX = 'src/audit-log/events';
const AUTH_AUTHORIZATION_PREFIX = 'src/auth/authorization';

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const IMPORT_SIDE_EFFECT_RE = /^import\s+['"]([^'"]+)['"]/gm;

/** Built-in violation used by --self-test (must be detected). */
const SELF_TEST_BAD_IMPORT = "import { AuditLogService } from '../audit-log/audit-log.service';";

function listTsFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...listTsFiles(p));
    else if (ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function relFromRoot(absPath) {
  return toPosix(path.relative(ROOT, absPath));
}

function resolveRelativeImport(importerRel, specifier) {
  const importerDir = path.join(ROOT, path.dirname(importerRel));
  const resolved = path.normalize(path.join(importerDir, specifier));
  return relFromRoot(resolved);
}

function extractImportSpecifiers(content) {
  const specifiers = [];
  let m;
  IMPORT_FROM_RE.lastIndex = 0;
  while ((m = IMPORT_FROM_RE.exec(content)) !== null) {
    specifiers.push(m[1]);
  }
  IMPORT_SIDE_EFFECT_RE.lastIndex = 0;
  while ((m = IMPORT_SIDE_EFFECT_RE.exec(content)) !== null) {
    specifiers.push(m[1]);
  }
  return specifiers;
}

function isExternalSpecifier(specifier) {
  return !specifier.startsWith('.');
}

function isSameIamTree(importerRel, targetRel) {
  if (importerRel.startsWith('src/user/') && targetRel.startsWith('src/user/')) return true;
  if (importerRel.startsWith('src/auth/') && targetRel.startsWith('src/auth/')) return true;
  return false;
}

function isUnderPrefix(targetRel, prefix) {
  return targetRel === prefix || targetRel.startsWith(`${prefix}/`);
}

function isAllowedShared(targetRel) {
  return SHARED_ALLOW.some((p) => isUnderPrefix(targetRel, p));
}

function checkResolvedImport(importerRel, specifier, targetRel) {
  if (!targetRel.startsWith('src/')) return null;

  if (isSameIamTree(importerRel, targetRel)) return null;

  if (targetRel.startsWith('src/audit-log/')) {
    if (!isUnderPrefix(targetRel, AUDIT_EVENTS_PREFIX)) {
      return {
        rule: 'IAM→Audit',
        message: `only "${AUDIT_EVENTS_PREFIX}/*" is allowed (got "${targetRel}")`,
      };
    }
    return null;
  }

  if (targetRel.startsWith('src/shared/')) {
    if (!isAllowedShared(targetRel)) {
      return {
        rule: 'IAM→Shared',
        message: `only ${SHARED_ALLOW.join(', ')} are allowed (got "${targetRel}")`,
      };
    }
    return null;
  }

  if (importerRel.startsWith('src/user/') && targetRel.startsWith('src/auth/')) {
    if (!isUnderPrefix(targetRel, AUTH_AUTHORIZATION_PREFIX)) {
      return {
        rule: 'user→auth',
        message: `only "${AUTH_AUTHORIZATION_PREFIX}/*" is allowed (got "${targetRel}")`,
      };
    }
    return null;
  }

  return {
    rule: 'IAM cross-domain',
    message: `import from "${targetRel}" is not in the allowlist`,
  };
}

function violationsForFile(importerRel, content) {
  const violations = [];
  const specifiers = extractImportSpecifiers(content);

  for (const specifier of specifiers) {
    if (isExternalSpecifier(specifier)) continue;
    const targetRel = resolveRelativeImport(importerRel, specifier);
    const issue = checkResolvedImport(importerRel, specifier, targetRel);
    if (issue) {
      violations.push({
        file: importerRel,
        specifier,
        resolved: targetRel,
        ...issue,
      });
    }
  }

  return violations;
}

function scanIamTree() {
  const violations = [];
  for (const root of IAM_ROOTS) {
    const absRoot = path.join(ROOT, root);
    for (const absFile of listTsFiles(absRoot)) {
      const rel = relFromRoot(absFile);
      const content = fs.readFileSync(absFile, 'utf8');
      violations.push(...violationsForFile(rel, content));
    }
  }
  return violations;
}

function formatViolation(v) {
  return `${v.file}: [${v.rule}] "${v.specifier}" → ${v.resolved} — ${v.message}`;
}

function runSelfTest() {
  const fakeFile = 'src/user/__self-test__.ts';
  const found = violationsForFile(fakeFile, SELF_TEST_BAD_IMPORT);
  if (found.length === 0) {
    console.error('Self-test FAILED: built-in bad import was not detected.');
    console.error(`  Pattern: ${SELF_TEST_BAD_IMPORT.trim()}`);
    process.exit(1);
  }
  console.log('Self-test OK: detector caught built-in violation:');
  console.log(formatViolation(found[0]));
  process.exit(0);
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const violations = scanIamTree();
  if (violations.length === 0) {
    console.log('Domain boundary check passed (src/user, src/auth).');
    process.exit(0);
  }

  console.error(`Domain boundary check failed (${violations.length} violation(s)):\n`);
  for (const v of violations) {
    console.error(formatViolation(v));
  }
  process.exit(1);
}

main();

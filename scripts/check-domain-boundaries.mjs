/**
 * Domain boundary fitness function (IAM-12, IAM-13).
 *
 * Scans src/user/**, src/auth/**, and src/permissions-api/** (.ts, including specs).
 *
 * Allowlist:
 * - IAM → Audit: only paths under src/audit-log/events (e.g. publish-audit, audit.event, audit-actions)
 * - IAM → Shared: only src/shared/database, src/shared/hashing, src/shared/swagger, src/shared/contracts (and subpaths)
 * - user → permissions-api: only src/permissions-api (published RBAC facade; not src/auth/*)
 * - auth → permissions-api: only src/permissions-api (IPermissionChecker port; implementation stays in auth)
 * - auth → user: only src/user/domain/ports (persistence port interfaces; not application/, dto/, etc.)
 * - permissions-api → shared: only src/shared/contracts (and subpaths; JwtPayload on port)
 * - Within-domain: imports resolving under the same tree are allowed
 * - External packages and @generated/* are not checked
 *
 * Forbidden examples:
 * - permissions-api importing ../auth/authorization/action.enum
 * - ../audit-log/audit-log.service, audit-log.module, audit-log.repository
 * - any audit-log import outside events/
 * - ../shared/<anything-other-than-database|hashing|swagger|contracts>
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
const FACADE_ROOTS = ['src/permissions-api'];
const SCAN_ROOTS = [...IAM_ROOTS, ...FACADE_ROOTS];
const SHARED_ALLOW = [
  'src/shared/database',
  'src/shared/hashing',
  'src/shared/swagger',
  'src/shared/contracts',
];
const PERMISSIONS_API_SHARED_ALLOW = ['src/shared/contracts'];
const AUDIT_EVENTS_PREFIX = 'src/audit-log/events';
const PERMISSIONS_API_PREFIX = 'src/permissions-api';
const USER_PORTS_PREFIX = 'src/user/domain/ports';

const IMPORT_FROM_RE =
  /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const IMPORT_SIDE_EFFECT_RE = /^import\s+['"]([^'"]+)['"]/gm;

/** Built-in violations used by --self-test (must be detected). */
const SELF_TEST_IAM_BAD_IMPORT =
  "import { AuditLogService } from '../audit-log/audit-log.service';";
const SELF_TEST_FACADE_BAD_IMPORT =
  "import { Action } from '../auth/authorization/action.enum';";

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

function isSameTree(importerRel, targetRel, prefix) {
  return importerRel.startsWith(`${prefix}/`) && targetRel.startsWith(`${prefix}/`);
}

function isSameIamTree(importerRel, targetRel) {
  if (isSameTree(importerRel, targetRel, 'src/user')) return true;
  if (isSameTree(importerRel, targetRel, 'src/auth')) return true;
  return false;
}

function isUnderPrefix(targetRel, prefix) {
  return targetRel === prefix || targetRel.startsWith(`${prefix}/`);
}

function isAllowedShared(targetRel, allowList = SHARED_ALLOW) {
  return allowList.some((p) => isUnderPrefix(targetRel, p));
}

function checkPermissionsApiImport(importerRel, targetRel) {
  if (isSameTree(importerRel, targetRel, 'src/permissions-api')) return null;

  if (targetRel.startsWith('src/auth/') || targetRel.startsWith('src/user/')) {
    return {
      rule: 'permissions-api→IAM',
      message: `facade must not import implementation domains (got "${targetRel}")`,
    };
  }

  if (targetRel.startsWith('src/shared/')) {
    if (!isAllowedShared(targetRel, PERMISSIONS_API_SHARED_ALLOW)) {
      return {
        rule: 'permissions-api→Shared',
        message: `only ${PERMISSIONS_API_SHARED_ALLOW.join(', ')} are allowed (got "${targetRel}")`,
      };
    }
    return null;
  }

  if (targetRel.startsWith('src/')) {
    return {
      rule: 'permissions-api cross-domain',
      message: `import from "${targetRel}" is not in the allowlist`,
    };
  }

  return null;
}

function checkResolvedImport(importerRel, specifier, targetRel) {
  if (!targetRel.startsWith('src/')) return null;

  if (importerRel.startsWith('src/permissions-api/')) {
    return checkPermissionsApiImport(importerRel, targetRel);
  }

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

  if (importerRel.startsWith('src/user/') && isUnderPrefix(targetRel, PERMISSIONS_API_PREFIX)) {
    return null;
  }

  if (importerRel.startsWith('src/user/') && targetRel.startsWith('src/auth/')) {
    return {
      rule: 'user→auth',
      message: `use "${PERMISSIONS_API_PREFIX}/*" instead of "${targetRel}"`,
    };
  }

  if (importerRel.startsWith('src/auth/') && isUnderPrefix(targetRel, PERMISSIONS_API_PREFIX)) {
    return null;
  }

  if (importerRel.startsWith('src/auth/') && targetRel.startsWith('src/user/')) {
    if (!isUnderPrefix(targetRel, USER_PORTS_PREFIX)) {
      return {
        rule: 'auth→user',
        message: `only "${USER_PORTS_PREFIX}/*" is allowed (got "${targetRel}")`,
      };
    }
    return null;
  }

  if (importerRel.startsWith('src/user/') || importerRel.startsWith('src/auth/')) {
    if (isUnderPrefix(targetRel, PERMISSIONS_API_PREFIX)) {
      return null;
    }
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

function scanDomainTrees() {
  const violations = [];
  for (const root of SCAN_ROOTS) {
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
  const iamFakeFile = 'src/user/__self-test__.ts';
  const iamFound = violationsForFile(iamFakeFile, SELF_TEST_IAM_BAD_IMPORT);
  if (iamFound.length === 0) {
    console.error('Self-test FAILED: IAM built-in bad import was not detected.');
    console.error(`  Pattern: ${SELF_TEST_IAM_BAD_IMPORT.trim()}`);
    process.exit(1);
  }

  const facadeFakeFile = 'src/permissions-api/__self-test__.ts';
  const facadeFound = violationsForFile(facadeFakeFile, SELF_TEST_FACADE_BAD_IMPORT);
  if (facadeFound.length === 0) {
    console.error('Self-test FAILED: permissions-api built-in bad import was not detected.');
    console.error(`  Pattern: ${SELF_TEST_FACADE_BAD_IMPORT.trim()}`);
    process.exit(1);
  }

  console.log('Self-test OK: detector caught built-in violations:');
  console.log(formatViolation(iamFound[0]));
  console.log(formatViolation(facadeFound[0]));
  process.exit(0);
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const violations = scanDomainTrees();
  if (violations.length === 0) {
    console.log('Domain boundary check passed (src/user, src/auth, src/permissions-api).');
    process.exit(0);
  }

  console.error(`Domain boundary check failed (${violations.length} violation(s)):\n`);
  for (const v of violations) {
    console.error(formatViolation(v));
  }
  process.exit(1);
}

main();

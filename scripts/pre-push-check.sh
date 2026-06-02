#!/usr/bin/env sh
# Optional local gate before push (not installed automatically).
# Usage: sh scripts/pre-push-check.sh
# Or copy into .git/hooks/pre-push (see README).

set -e
npm run verify
npm run build
node scripts/check-domain-boundaries.mjs --self-test

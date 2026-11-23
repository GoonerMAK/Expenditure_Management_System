#!/usr/bin/env bash
set -uo pipefail
source "$(dirname "$0")/env.sh"
"$ROOT/tools/seed-e2e.sh" || exit 1
(cd "$ROOT/e2e" && npx playwright test "$@")
status=$?
if [ "${KEEP_SHOTS:-0}" != "1" ]; then
  git -C "$ROOT" checkout -- e2e/screenshots
fi
exit $status

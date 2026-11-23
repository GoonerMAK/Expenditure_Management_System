#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$ROOT/server"
npx prisma migrate deploy

if netstat -ano | awk '$2 ~ /:4000$/ && $4 == "LISTENING" {found=1} END {exit !found}'; then
  echo "server on :4000 locks the Prisma engine; skipped generate. Run tools/dev-down.sh, then this script again, if the schema changed."
  exit 0
fi
npx prisma generate

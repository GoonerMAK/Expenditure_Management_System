#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
LOGS="$ROOT/tools/.logs"
mkdir -p "$LOGS"

docker start expenditure-dev-db >/dev/null
(cd "$ROOT/server" && npm run -s build)
(cd "$ROOT/server" && nohup npm run -s dev >"$LOGS/server.log" 2>&1 &)
(cd "$ROOT/client" && nohup npx vite --port 5173 >"$LOGS/client.log" 2>&1 &)

for url in http://localhost:4000 http://localhost:5173; do
  for _ in $(seq 30); do curl -s -o /dev/null "$url" && break; sleep 1; done
  curl -s -o /dev/null "$url" || { echo "not up: $url (see $LOGS)"; exit 1; }
done
echo "server :4000, client :5173, logs in tools/.logs"

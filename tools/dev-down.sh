#!/usr/bin/env bash
set -uo pipefail
for port in 4000 5173; do
  pid="$(netstat -ano | awk -v p=":$port" '$2 ~ p"$" && $4 == "LISTENING" {print $5; exit}')"
  [ -n "$pid" ] && taskkill //PID "$pid" //T //F >/dev/null && echo "stopped :$port (pid $pid)"
done
exit 0

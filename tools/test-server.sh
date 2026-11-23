#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$ROOT/server"
PORT=4100 npm test -- "$@"

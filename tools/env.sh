ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/server/.env" | head -1 | cut -d= -f2- | tr -d "\"'")"
export ROOT DATABASE_URL

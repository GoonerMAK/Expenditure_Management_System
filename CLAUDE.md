# Expenditure Management System

React + Vite + Tailwind client, Express + Prisma + Postgres server, Playwright e2e.

## Map
| Path | What |
|---|---|
| `client/` | React app, `:5173`. Hardcodes API at `localhost:4000`, so one live app at a time |
| `server/` | Express API, `:4000`. `dev` runs `dist/`, so build after edits |
| `server/prisma/` | Schema and migrations |
| `e2e/` | Playwright specs; each passing flow writes `e2e/screenshots/<flow>.png` |
| `tools/` | Reusable scripts, below. Use these instead of rewriting commands |

## tools/
| Script | Does |
|---|---|
| `tools/dev-up.sh` | Starts `expenditure-dev-db` (port 5433), builds and starts server + client, waits until both answer |
| `tools/dev-down.sh` | Stops whatever listens on 4000 and 5173 |
| `tools/db-migrate.sh` | `prisma migrate deploy` + `generate` against `server/.env` |
| `tools/seed-e2e.sh` | Seeds e2e users and category with the 5433 `DATABASE_URL` |
| `tools/test-server.sh` | Server Jest suites on `PORT=4100` (dev server can keep 4000). A second run adds ~5 failures from leftover fixed-email rows |
| `tools/e2e.sh` | Seed + Playwright. Restores committed screenshots afterwards; `KEEP_SHOTS=1` keeps the new ones (UI redesigned on purpose) |

## Reply style
- Caveman mode, always, even without the caveman plugin (also cloud sessions): drop articles, filler, pleasantries and hedging; fragments OK; keep technical terms, code, paths and errors exact. Pattern: `[thing] [action] [reason]. [next step].`
- Why: short replies cost about 75% fewer output tokens, are faster to read, and keep the full technical content. Write normal prose for code, commits, PRs, security warnings and irreversible-action confirmations.

## Rules
- Dev DB is container `expenditure-dev-db` on 5433. Never stop other projects' containers on 5432.
- PR format: title `[branch] Past-tense summary`; body sections Server / Client / Tests / Decisions; screenshot links to `e2e/screenshots/*.png`.

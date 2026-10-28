#!/usr/bin/env bash
# Creates the e2e users and category. Safe to run more than once; nothing is deleted.
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/expenditure_management}"
DIR="$(dirname "$0")"
DATA="$DIR/test-data.json"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

field() { node -p "require('$DATA').$1"; }
PASSWORD="$(field password)"

ADMIN_EMAIL="$(field users.admin.email)" ADMIN_USERNAME="$(field users.admin.username)" ADMIN_PASSWORD="$PASSWORD" \
    npm --prefix "$DIR/../server" run -s seed:admin

curl -sf -c "$JAR" -o /dev/null -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$(field users.admin.email)\",\"password\":\"$PASSWORD\"}"

api() { curl -s -b "$JAR" -H 'Content-Type: application/json' "$@"; }

api -o /dev/null -X POST "$API_URL/roles" -d '{"role_name":"Contributor"}'

for key in contributor readOnly; do
    email="$(field "users.$key.email")"
    username="$(field "users.$key.username")"
    role="$(field "users.$key.role")"

    api -o /dev/null -X POST "$API_URL/auth/signup" \
        -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"username\":\"$username\"}"

    id="$(api "$API_URL/users/usernames" | node -p "JSON.parse(require('fs').readFileSync(0)).find((u) => u.username === '$username').id")"
    api -sf -o /dev/null -X PUT "$API_URL/users/$id" -d "{\"data\":{\"role_name\":\"$role\"}}"
done

api -o /dev/null -X POST "$API_URL/categories" -d "{\"category_name\":\"$(field category)\"}"

echo "Seeded e2e users and category"

#!/usr/bin/env bash
# Creates the e2e users and category. Safe to run more than once; nothing is deleted.
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/expenditure_management}"
DATA="$(dirname "$0")/test-data.json"
PASSWORD="$(node -p "require('$DATA').password")"
CATEGORY="$(node -p "require('$DATA').category")"

for key in admin contributor readOnly; do
    email="$(node -p "require('$DATA').users.$key.email")"
    username="$(node -p "require('$DATA').users.$key.username")"
    role="$(node -p "require('$DATA').users.$key.role")"

    # Sign up through the API so the password is hashed by the app
    curl -s -o /dev/null -X POST "$API_URL/auth/signup" \
        -H 'Content-Type: application/json' \
        -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"username\":\"$username\"}"

    # New users are Read-only; set the role directly since the first admin has no one to promote them
    psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 <<SQL
INSERT INTO "Role" (id, role_name, updated_at) VALUES (gen_random_uuid(), '$role', now()) ON CONFLICT (role_name) DO NOTHING;
UPDATE "User" SET role_name = '$role', role_id = (SELECT id FROM "Role" WHERE role_name = '$role') WHERE email = '$email';
SQL
done

psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 <<SQL
INSERT INTO "Category" (id, category_name, updated_at) VALUES (gen_random_uuid(), '$CATEGORY', now()) ON CONFLICT (category_name) DO NOTHING;
SQL

echo "Seeded e2e users and category"

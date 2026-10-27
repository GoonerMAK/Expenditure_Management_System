# E2E tests

Playwright tests that run against the real app (client, server and Postgres).

## Run

1. Start Postgres, run the server migrations, and start the server (`:4000`) and client (`:5173`).
2. Install and seed:
   ```bash
   cd e2e
   npm install
   npm run seed
   npm test
   ```

`npm run seed` creates one user per role from [test-data.json](test-data.json) (password in the same file) and a test category. It can be run more than once.

Set `DATABASE_URL`, `API_URL` or `BASE_URL` if your setup differs from the defaults.

## Test data

Tests never delete data. Every run adds new projects, categories and roles with a unique suffix, so earlier data is kept for reference.

[db-snapshot.sql](db-snapshot.sql) is a data-only dump of the database after the first test runs. Load it into an empty, migrated database with:

```bash
psql "$DATABASE_URL" -f db-snapshot.sql
```

The snapshot includes one run against the code before [#4](https://github.com/GoonerMAK/Expenditure_Management_System/issues/4) was fixed. The unedited `E2E Owner Check 1793104614463` project, owned by `e2e_admin`, came from that run: a contributor was able to create it in the admin's name.

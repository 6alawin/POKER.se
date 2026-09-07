# Work log — 2026-09-02

## Goal

Fix the frontend login `Network Error` that occurred after Google sign-in.

## Root causes found

1. The frontend calls `POST /auth/verify` on the backend at port `3000` after Firebase authentication.
2. The backend initially could not start because PostgreSQL configuration and credentials were not usable.
3. Running `node server/dist/index.js` from the repository root originally loaded no environment variables because `dotenv` searched for a root `.env`, while the real file is `server/.env`.

## Code changes made

- `server/src/db.ts`
  - Loads `server/.env` using an absolute path based on `__dirname`.
- `server/src/index.ts`
  - Loads `server/.env` the same way.
  - Removes logging of the database connection string.
- `client/src/pages/LoginPage.tsx`
  - Replaces the vague Axios `Network Error` with a clear message when the game server cannot be reached.
- `SETUP.md`
  - Documents the login/network-error troubleshooting path.

Both client and server builds passed after these changes.

## Local PostgreSQL recovery completed

- PostgreSQL 18 service data directory: `C:\Program Files\PostgreSQL\18\data`
- PostgreSQL now listens on port `5432`.
- The `postgres` database role password was reset locally.
- Database `pokerio` was created (or already existed).
- Temporary `trust` rules added to `pg_hba.conf` for password recovery were removed again; localhost authentication was restored to `scram-sha-256`.

## How to run next time

Use two terminals from the repository root.

### Terminal 1: backend

```powershell
npm run build --workspace server
node server/dist/index.js
```

Wait for `Server running on port 3000` and keep this terminal open.

### Terminal 2: frontend

```powershell
npm run dev --workspace client
```

Open the Vite URL (normally `http://localhost:5173`) and sign in.

## Sensitive-data reminder

- Do not commit or share `server/.env` or `client/.env`.
- Do not put database passwords, Firebase service-account keys, or tokens into issue comments, chat, screenshots, or Git.

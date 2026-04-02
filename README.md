# Finance API

Backend for a finance dashboard: users and roles, financial records (CRUD + filters), dashboard analytics, and JWT-based role access control. Built with **Node.js**, **TypeScript**, **Fastify**, **Prisma**, and **SQLite**.

## Assumptions

- **Record ownership:** Each financial record belongs to one user (`userId`). Non-admin users only see and aggregate **their own** records. **Admins** see and aggregate **all** users’ records unless they pass `userId` to scope to one user.
- **Who can write records:** Only **ADMIN** may create, update, or delete financial records (Viewer and Analyst are read-only for records, as in the sample role matrix).
- **Who can manage users:** Only **ADMIN** may list users, create users, or change another user’s role/status/email. Any active user may read their own profile (`GET /me`, `GET /users/:id` when `id` is self) and may update **only their own** `name` (not role/status/email).
- **Inactive users:** Cannot authenticate; active sessions are rejected once the user becomes inactive.
- **Dates:** Query datetime fields use ISO 8601 strings. Monthly trends group by **UTC** month boundaries.
- **Assessment scope:** JWT secret is configurable; this is not a production-hardened deployment (no rate limiting unless added later).

## Prerequisites

- Node.js 20+
- npm

## Setup

1. Copy environment file:

   ```bash
   copy .env.example .env
   ```

   On Unix: `cp .env.example .env`

   Set `JWT_SECRET` to at least 16 characters and optionally `PORT` (default `3000`).

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate the Prisma client (required after every `npm install`; `migrate` also runs this):

   ```bash
   npm run db:generate
   ```

4. Create the database and run migrations (creates `dev.db` at the project root when `DATABASE_URL=file:./dev.db`):

   ```bash
   npx prisma migrate dev
   ```

5. Seed demo users and sample records:

   ```bash
   npm run db:seed
   ```

## Troubleshooting (Windows)

**`EPERM: operation not permitted, rename ... query_engine-windows.dll.node`**

This usually means **another process is holding** the Prisma engine file (common causes: `npm run dev` / `tsx watch`, another terminal in this project, or antivirus scanning `node_modules`).

1. Stop all Node processes using this repo (close dev servers, stop the debugger, exit extra terminals). On Windows, **Cursor** or **VS Code** may still hold a lock if a terminal had `npm run dev` running—stop that task first.
2. If you are sure no other work needs Node, you can end every Node process, then regenerate:

   ```powershell
   taskkill /F /IM node.exe
   npm run db:generate
   ```

   (`taskkill` stops **all** Node processes on the machine.)

3. If deletion of `node_modules\.prisma` fails with “access denied”, the DLL is still loaded—repeat step 1–2, then:

   ```powershell
   Remove-Item -Recurse -Force node_modules\.prisma
   npm run db:generate
   ```

`npm install` no longer runs `prisma generate` automatically so installs are less likely to hit this lock while something else is running.

## Run

```bash
npm run dev
```

Server listens on `http://localhost:3000` (or `PORT`).

## Seeded accounts

| Email               | Password     | Role    |
| ------------------- | ------------ | ------- |
| viewer@example.com  | password123  | VIEWER  |
| analyst@example.com | password123  | ANALYST |
| admin@example.com   | password123  | ADMIN   |

## Authentication

- `POST /auth/login` with JSON `{ "email", "password" }` returns `{ "token": "<JWT>" }`.
- Send `Authorization: Bearer <token>` on protected routes.

## API overview

### Public

| Method | Path          | Description        |
| ------ | ------------- | ------------------ |
| GET    | /health       | Health check       |
| POST   | /auth/login   | Obtain JWT         |

### Protected (require `Authorization: Bearer`)

| Method | Path                    | Roles | Description |
| ------ | ----------------------- | ----- | ----------- |
| GET    | /me                     | All   | Current user profile |
| GET    | /users                  | Admin | Paginated user list (`?page`, `?limit`) |
| POST   | /users                  | Admin | Create user (email, password, name?, role, status) |
| GET    | /users/:id              | Admin or self | Get user |
| PATCH  | /users/:id              | Admin (any field) or self (`name` only) | Update user |
| GET    | /records                | All   | List records with filters (`page`, `limit`, `userId` admin only, `dateFrom`, `dateTo`, `category`, `type`) |
| POST   | /records                | Admin | Create record (`userId`, `amount`, `type`, `category`, `date`, `notes?`) |
| GET    | /records/:id            | All   | Get one record (scoped by role) |
| PATCH  | /records/:id            | Admin | Update record |
| DELETE | /records/:id            | Admin | Delete record |
| GET    | /dashboard/summary      | All   | `totalIncome`, `totalExpense`, `net`, `scope` |
| GET    | /dashboard/by-category  | All   | Category totals |
| GET    | /dashboard/trends       | All   | Monthly trends |
| GET    | /dashboard/recent       | All   | Recent records (`?limit` default 10) |

Dashboard endpoints accept optional `userId` (admin only), `dateFrom`, `dateTo`.

## Example: login and call dashboard

```bash
curl -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"viewer@example.com\",\"password\":\"password123\"}"
```

Copy `token` from the response, then:

```bash
curl -s http://localhost:3000/dashboard/summary ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Project layout

- `src/routes/` — HTTP handlers (parse input, call services).
- `src/services/` — Business rules and authorization checks.
- `src/db/` — Prisma-only data access (“db service” layer).
- `src/middleware/authenticate.ts` — JWT verification and active-user check.
- `prisma/` — Schema, migrations, seed.

## Scripts

| Script        | Description                |
| ------------- | -------------------------- |
| `npm run dev` | Dev server with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm test` | Integration tests (Vitest; uses isolated `test.db`, resets via `tests/setup.ts`) |
| `npm run test:watch` | Vitest watch mode |

## Tradeoffs

- **SQLite:** Easy local setup; not ideal for high concurrent write loads.
- **Trends aggregation:** Implemented in-process from fetched rows for clarity; for very large datasets, SQL-side grouping would be preferable.
- **No public registration:** Users are created by admin or seed to keep access control explicit.

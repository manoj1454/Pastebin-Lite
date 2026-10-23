# PasteLite - Ephemeral Text & Code Sharing

A modern, fast, full-stack Pastebin application built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma ORM with PostgreSQL (optimized for Neon and Vercel).

---

## ✨ Features

- **Lite GitHub Gist / Pastebin Aesthetic**: Clean dark UI with monospace code editor, line numbering, character/word counting, and line-wrapping toggles.
- **Short, Shareable URLs**: Compact, collision-resistant 8-character NanoIDs (e.g. `/p/7xK9qLm2`).
- **Flexible Expiration**:
  - Time-based expiration (e.g., 10 minutes, 1 hour, 1 day, 7 days, or custom timestamp).
  - View-count expiration / Burn-after-reading (e.g., 1 view, 5 views, 10 views, or custom count).
- **Atomic Concurrency**: View counts increment safely on every successful access, instantly triggering HTTP 410 Gone once limits are surpassed.
- **Zod Validation**: Robust input parsing and error reporting on API route handlers.
- **One-Click Vercel Deployment**: Pre-configured build hooks (`prisma generate`) and compatibility with serverless PostgreSQL (Neon, Vercel Postgres, Supabase).

---

## 🗄️ Database Schema

The application uses Prisma with a PostgreSQL database:

```prisma
model Paste {
  id           String    @id
  content      String    @db.Text
  createdAt    DateTime  @default(now())
  expiresAt    DateTime?
  maxViews     Int?
  currentViews Int       @default(0)

  @@index([createdAt])
  @@index([expiresAt])
}
```

---

## 🔌 API Documentation

### 1. Create a Paste
**`POST /api/pastes`**

Creates a new paste with optional expiration settings.

#### Request Body (JSON)
```json
{
  "content": "const message = 'Hello, World!';",
  "expiresAt": "2026-10-23T12:00:00.000Z", // Optional ISO 8601 string or null
  "maxViews": 5 // Optional integer >= 1 or null
}
```

#### Response (201 Created)
```json
{
  "id": "3mK8vP9x",
  "url": "http://localhost:3000/p/3mK8vP9x",
  "createdAt": "2026-10-23T11:20:00.000Z",
  "expiresAt": "2026-10-23T12:00:00.000Z",
  "maxViews": 5,
  "currentViews": 0
}
```

---

### 2. Retrieve a Paste
**`GET /api/pastes/[id]`**

Fetches paste content, verifies expiration, and increments `currentViews`.

#### Response (200 OK)
```json
{
  "id": "3mK8vP9x",
  "content": "const message = 'Hello, World!';",
  "createdAt": "2026-10-23T11:20:00.000Z",
  "expiresAt": "2026-10-23T12:00:00.000Z",
  "maxViews": 5,
  "currentViews": 1,
  "remainingViews": 4
}
```

#### Response (410 Gone - Expired or View Limit Exceeded)
```json
{
  "error": "This paste has reached its maximum view limit",
  "reason": "max_views_reached",
  "maxViews": 5,
  "currentViews": 5
}
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your `DATABASE_URL` (local PostgreSQL, Neon, Supabase, etc.):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pastebin?schema=public"
```

### 3. Sync Database Schema
Push the Prisma schema to your database:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Smoke Testing

Execute the automated test suite verifying all 4 production scenarios against the live database:

```bash
npx ts-node tests/smoke-test.ts
# or
npm run test:smoke
```

The test runner validates:
1. **Standard Paste:** Creates a paste, fetches it, verifies content matches, and checks `currentViews = 1`.
2. **Time Expiration:** Tests past `expiresAt`, asserts **HTTP 410** and `reason: "expired_by_time"`.
3. **View Expiration:** Creates paste with `maxViews: 1`, verifies 1st fetch succeeds (200), and 2nd fetch returns **HTTP 410** with `reason: "max_views_reached"`.
4. **Not Found:** Queries non-existent UUID, asserts **HTTP 404**.

---

## ☁️ Deployment on Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `DATABASE_URL`: Connection string from [Neon](https://neon.tech) or Vercel Postgres.
4. Deploy! Vercel automatically runs `prisma generate && next build` via the pre-configured `build` script.

# PasteLite - Ephemeral Text & Code Sharing

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?logo=prisma)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?logo=postgresql)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

A modern, production-grade, full-stack Pastebin application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM** with **PostgreSQL (Neon)**. Designed for speed, minimal aesthetic (GitHub Gist style), and robust expiration and view-limit guarantees.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | **Next.js (App Router)** | Full-stack React framework with Server Components & Route Handlers |
| **Language** | **TypeScript** | Strict type-safety across front-end and backend APIs |
| **Styling** | **Tailwind CSS v4** | Dark-mode GitHub Gist aesthetic with monospace typography |
| **Database** | **PostgreSQL (Neon)** | Serverless Postgres with connection pooling |
| **ORM** | **Prisma ORM (v6)** | Type-safe schema, migrations, and atomic transactions |
| **Validation** | **Zod** | Runtime schema parsing and input sanitization |
| **Identifiers** | **NanoID** | Compact, 8-character collision-resistant shareable URLs |
| **Icons** | **Lucide React** | Clean, lightweight UI icons |
| **Testing** | **ts-node & Axios** | Automated end-to-end smoke test suite |

---

## ✨ Key Features

1. **GitHub Gist / Pastebin "Lite" Aesthetic**:
   - Clean dark-mode UI with monospace text editor.
   - Real-time line counter and character counter.
   - Dedicated "Clear" button and "Copy to Clipboard" feedback.
   - Word wrapping and line-number gutter toggles on view pages.
   - Download as `.txt` and raw view helpers.

2. **Short, Clean Shareable URLs**:
   - Generates compact 8-character NanoIDs (e.g., `/p/3mK8vP9x`).
   - Collision-resistant and safe for sharing across messaging platforms.

3. **Time-Based Expiration**:
   - Presets for *10 Minutes*, *1 Hour*, *1 Day*, *7 Days*, and custom date-time.
   - Server strictly enforces `expiresAt` validation. Expired pastes return **HTTP 410 Gone** with `reason: "expired_by_time"`.

4. **View-Count Limits (Burn-After-Reading)**:
   - Presets for *Unlimited*, *1 View (Burn after reading 🔥)*, *5 Views*, *10 Views*, *100 Views*, or custom count.
   - Automatically returns **HTTP 410 Gone** with `reason: "max_views_reached"` when limit is exceeded.

5. **Atomic Concurrency & Race-Condition Safety**:
   - View increments are executed within a database transaction (`db.$transaction`) using atomic `increment: 1` directly returning the updated record in a single round-trip.

6. **Distinct HTTP Status Codes**:
   - **HTTP 404 (Not Found)**: Target ID does not exist.
   - **HTTP 410 (Gone / Expired)**: Target paste existed but expired by time or view limits.
   - **HTTP 400 (Bad Request)**: Validation error or invalid request payload.

---

## 🗄️ Database Schema

Defined in [`prisma/schema.prisma`](./prisma/schema.prisma):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

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

### 1. Create Paste
**`POST /api/pastes`**

Accepts `content`, optional `expiresAt`, and optional `maxViews`.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "content": "const greeting = 'Hello, PasteLite!';",
  "expiresAt": "2026-10-23T12:00:00.000Z",
  "maxViews": 5
}
```

#### Response (`201 Created`)
```json
{
  "id": "THrqq6EK",
  "url": "http://localhost:3000/p/THrqq6EK",
  "createdAt": "2026-10-23T11:44:40.000Z",
  "expiresAt": "2026-10-23T12:00:00.000Z",
  "maxViews": 5,
  "currentViews": 0
}
```

---

### 2. Retrieve Paste
**`GET /api/pastes/[id]`**

Fetches paste content, strictly validates expiration, and atomically increments `currentViews`.

#### Response (`200 OK`)
```json
{
  "id": "THrqq6EK",
  "content": "const greeting = 'Hello, PasteLite!';",
  "createdAt": "2026-10-23T11:44:40.000Z",
  "expiresAt": "2026-10-23T12:00:00.000Z",
  "maxViews": 5,
  "currentViews": 1,
  "remainingViews": 4
}
```

#### Response (`410 Gone - Expired by Time`)
```json
{
  "error": "Paste expired",
  "reason": "expired_by_time",
  "expiresAt": "2026-10-23T11:40:00.000Z"
}
```

#### Response (`410 Gone - View Limit Reached`)
```json
{
  "error": "Paste expired",
  "reason": "max_views_reached",
  "maxViews": 1,
  "currentViews": 1
}
```

#### Response (`404 Not Found`)
```json
{
  "error": "Paste not found"
}
```

---

## 📁 Project Structure

```
.
├── .env.example             # Environment variables template
├── prisma/
│   └── schema.prisma        # Database schema for PostgreSQL/Neon
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── pastes/
│   │   │       ├── route.ts         # POST /api/pastes
│   │   │       └── [id]/
│   │   │           └── route.ts     # GET /api/pastes/[id]
│   │   ├── p/[id]/
│   │   │   └── page.tsx             # View paste page
│   │   ├── globals.css              # Theme and typography styles
│   │   ├── layout.tsx               # Root layout & navigation header
│   │   └── page.tsx                 # Home creation page
│   ├── components/
│   │   └── PasteViewer.tsx          # Client component for rendering paste
│   └── lib/
│       ├── db.ts                    # Prisma singleton connection manager
│       ├── id.ts                    # NanoID generator
│       ├── prisma.ts                # Prisma export
│       └── validations.ts           # Zod validation schemas
├── tests/
│   └── smoke-test.ts        # Standalone automated smoke tests
├── vercel.json              # One-click Vercel build configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20 & 26)
- npm or pnpm
- A PostgreSQL database instance (Neon recommended)

### 2. Clone Repository
```bash
git clone https://github.com/manoj1454/Pastebin-Lite.git
cd Pastebin-Lite
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Create `.env` from template:
```bash
cp .env.example .env
```

Set your PostgreSQL connection string in `.env`:
```env
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-project-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Push Database Schema
Sync your database with the Prisma schema:
```bash
npx prisma db push
```

### 6. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Automated Smoke Testing

Execute the automated test runner to test all 4 core scenarios against the live database:

```bash
npm run test:smoke
# or
npx ts-node tests/smoke-test.ts
```

### Test Suite Coverage:
- **Scenario 1 (Standard Paste)**: Creates a paste, fetches it, verifies content matches, and checks `currentViews = 1`.
- **Scenario 2 (Time Expiration)**: Verifies that past `expiresAt` returns **HTTP 410** with `reason: "expired_by_time"`.
- **Scenario 3 (View Expiration)**: Creates paste with `maxViews: 1`, ensures 1st fetch succeeds (HTTP 200), and 2nd fetch returns **HTTP 410** with `reason: "max_views_reached"`.
- **Scenario 4 (Not Found)**: Queries random UUID, verifies response is **HTTP 404**.

---

## ☁️ Deployment on Vercel

1. Push this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the `Pastebin-Lite` repository.
4. Add the Environment Variable:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
5. Click **Deploy**. Vercel will run `prisma generate && next build` automatically using [`vercel.json`](./vercel.json).

---

## 📄 License

MIT License. Built for clean and ephemeral code sharing.

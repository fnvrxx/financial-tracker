# FinTrack v2 — Personal Financial Tracker

Personal finance tracker dengan purple gradient UI, PostgreSQL database, dan Google Sheets sync.

Perlu diperbaiki:
- [ ] Masih perlu dioptimasi, karena setiap reload butuh waktu lama
- [ ] Desain perlu di upgrade lagi agar lebih menarik dan simple
- [ ] icon diubah bikin sendiri (jangan import! terlalu berat)
- [ ] 
## Tech Stack

- **Framework**: Next.js 14 (App Router + PWA)
- **Database**: PostgreSQL via Drizzle ORM + postgres.js
- **Sync**: Google Sheets API v4 (one-way push)
- **Styling**: Tailwind CSS + DM Sans / Plus Jakarta Sans
- **Charts**: Custom SVG donut chart + sparkline
- **Notifications**: Telegram Bot (opsional)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL
createdb fintrack
# Atau pakai Docker:
# docker run -d --name fintrack-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack postgres:16

# 3. Setup environment
cp .env.example .env
# Edit DATABASE_URL dan kredensial Google Sheets

# 4. Push schema ke database
npm run db:push

# 5. Seed data awal
npm run db:seed

# 6. Run dev server
npm run dev
```

Buka http://localhost:3000

## Pages

| Route | Deskripsi |
|-------|-----------|
| `/` | Home — savings card, top spending, monthly budget progress |
| `/graph` | Billing Reports — donut chart per bulan, category breakdown |
| `/transactions` | Daftar transaksi dengan filter income/expense |
| `/category` | Budget tracking — sparkline chart, progress per kategori |

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/transactions` | List transaksi (filter: from, to, type) |
| POST | `/api/transactions` | Buat transaksi + auto sync + budget check |
| DELETE | `/api/transactions?id=N` | Hapus transaksi |
| GET | `/api/accounts` | List akun |
| GET | `/api/categories` | List kategori |
| GET | `/api/budgets` | Status semua budget |
| GET | `/api/reports?type=summary` | Ringkasan bulan ini |
| GET | `/api/reports?type=byCategory` | Breakdown per kategori |
| GET | `/api/reports?type=trend` | Tren 6 bulan |
| GET | `/api/sync` | Status sinkronisasi |

## Deploy

```bash
# Vercel (butuh PostgreSQL external seperti Neon/Supabase)
vercel --prod

# VPS dengan Docker Compose
docker compose up -d
```

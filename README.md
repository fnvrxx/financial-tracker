# FinTrack v2 — Personal Financial Tracker

Personal finance tracker berbasis web dengan purple gradient UI, PostgreSQL database, kalender transaksi, budget tracking, dan Google Sheets sync.

→ Dokumentasi lengkap ada di folder [`docs/`](./docs/)

---

## Tech Stack

| Layer      | Library                                    |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 14 (App Router, PWA)               |
| Database   | PostgreSQL · Drizzle ORM · postgres.js     |
| Styling    | Tailwind CSS · DM Sans / Plus Jakarta Sans |
| Charts     | Custom SVG sparkline + donut chart         |
| Sync       | Google Sheets API v4 (one-way push)        |
| Notifikasi | Telegram Bot (opsional)                    |
| Date utils | date-fns                                   |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL
createdb fintrack
# Atau Docker:
# docker run -d --name fintrack-db -p 5432:5432 \
#   -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack postgres:16

# 3. Setup environment
cp .env.example .env
# Edit DATABASE_URL, GOOGLE_*, TELEGRAM_* sesuai kebutuhan

# 4. Jalankan Seed data (contoh)
bash seed_database.sh

# 5. Jalankan dev server
npm run dev
```

Buka http://localhost:3000

---

## Pages

| Route           | Deskripsi                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------ |
| `/`             | Home — savings card, top spending, monthly budget progress                                 |
| `/graph`        | Reports — donut chart per bulan, category breakdown                                        |
| `/transactions` | Daftar transaksi + kalender interaktif                                                     |
| `/category`     | Budget tracking — sparkline 3 minggu, progress per kategori, detail transaksi per kategori |

---

## API Endpoints

| Method | Endpoint                                | Deskripsi                                           |
| ------ | --------------------------------------- | --------------------------------------------------- |
| GET    | `/api/transactions`                     | List transaksi (filter: from, to, type, categoryId) |
| POST   | `/api/transactions`                     | Buat transaksi + auto sync + budget alert           |
| DELETE | `/api/transactions?id=N`                | Hapus transaksi + rollback saldo                    |
| GET    | `/api/accounts`                         | List semua akun                                     |
| GET    | `/api/categories`                       | List kategori (filter: type)                        |
| POST   | `/api/categories`                       | Buat kategori baru                                  |
| GET    | `/api/budgets`                          | Status budget (filter: month=yyyy-MM-dd)            |
| POST   | `/api/budgets`                          | Buat budget baru                                    |
| PUT    | `/api/budgets`                          | Update limit budget                                 |
| GET    | `/api/reports?type=summary`             | Ringkasan income/expense bulan ini                  |
| GET    | `/api/reports?type=byCategory`          | Breakdown per kategori                              |
| GET    | `/api/reports?type=trend&period=weekly` | Tren 3 minggu terakhir                              |
| GET    | `/api/sync`                             | Status sinkronisasi Google Sheets                   |
| POST   | `/api/sync?action=process`              | Proses ulang antrian sync                           |
| POST   | `/api/sync?action=init`                 | Inisialisasi sheet header                           |

---

## Yang Perlu Diperbaiki

- [x] **Performa** — setiap navigasi halaman fetch ulang semua data; perlu SWR/React Query + cache
- [ ] **Ikon kategori** — saat ini hanya huruf pertama nama; perlu icon library ringan (inline SVG, bukan import package berat)
- [ ] **Desain budget card** — tampilan perlu dipoles, terutama state "over budget"
- [ ] **Hapus transaksi** — saat ini klik langsung hapus tanpa UI konfirmasi yang proper (masih pakai `confirm()` browser)
- [ ] **Edit budget** — limit budget bisa diupdate via API tapi belum ada UI-nya di halaman category
- [ ] **Validasi form** — `CreateBudgetForm` dan `TransactionForm` belum ada validasi client-side yang ketat
- [ ] **Error boundary** — halaman tidak punya fallback UI saat fetch gagal
- [ ] **Offline support** — PWA manifest sudah ada tapi service worker belum dikonfigurasi
- [ ] **Tahun di month picker** — category page bisa navigasi tahun, tapi transactions page belum

---

## Yang Bisa Dikembangkan

- [ ] **Multi-user / auth** — tambah NextAuth.js atau Clerk untuk login
- [ ] **Capture kwitansi** - ada scan live camera untuk kwitansi kemudian masuk ke sistem
- [ ] **Recurring transactions** — transaksi berulang otomatis (langganan, cicilan)
- [ ] **Export PDF/CSV** — laporan bulanan bisa diunduh langsung dari app
- [ ] **Push notification** — budget alert via web push, bukan hanya Telegram
- [ ] **Dark mode** — toggle tema gelap
- [ ] **Multi-currency** — dukungan mata uang selain IDR
- [ ] **Savings goals** — target tabungan dengan progress tracking
- [ ] **Account transfer** — fitur transfer antar akun (bukan hanya income/expense)
- [ ] **Split bill** — satu transaksi bisa dibagi ke beberapa kategori
- [ ] **Foto struk** — attach foto nota ke transaksi
- [ ] **AI categorization** — auto-kategorisasi transaksi berdasarkan catatan

---

## Deploy

```bash
# Vercel (butuh PostgreSQL external — Neon atau Supabase)
vercel --prod

# VPS dengan Docker Compose
docker compose up -d
```

Lihat [`docs/setup.md`](./docs/setup.md) untuk panduan deploy lengkap.

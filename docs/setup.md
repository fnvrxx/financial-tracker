# Setup Guide

---

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ (lokal atau cloud)
- (Opsional) Akun Google Cloud untuk Sheets sync
- (Opsional) Telegram Bot untuk notifikasi budget

---

## 1. Clone & Install

```bash
git clone <repo-url> financial-tracker
cd financial-tracker
npm install
```

---

## 2. Environment Variables

Salin file contoh dan isi nilainya:

```bash
cp .env.example .env
```

### Wajib

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fintrack
```

### Opsional — Google Sheets Sync

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

Cara mendapatkan kredensial:
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project → aktifkan **Google Sheets API**
3. Buat **Service Account** → buat key (JSON)
4. Share Google Sheet ke email service account (Editor)
5. Copy `client_email` dan `private_key` dari JSON ke `.env`

### Opsional — Telegram Notifikasi

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_CHAT_ID=987654321
```

Cara mendapatkan:
1. Chat `@BotFather` di Telegram → `/newbot`
2. Copy token
3. Kirim pesan ke bot → buka `https://api.telegram.org/bot<TOKEN>/getUpdates` → ambil `chat.id`

---

## 3. Setup Database

### Lokal

```bash
createdb fintrack
npm run db:push
```

### Docker

```bash
docker run -d \
  --name fintrack-db \
  -p 5432:5432 \
  -e POSTGRES_USER=fnvrxx \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fintrack \
  postgres:16

npm run db:push
```

---

## 4. Seed Data

### Data default (akun + kategori)

```bash
npx tsx src/db/seed.ts
```

### Data contoh (145 transaksi Jan–Mar 2025)

```bash
bash seed_database.sh
```

---

## 5. Inisialisasi Google Sheets (jika dipakai)

```bash
curl -X POST http://localhost:3000/api/sync?action=init
```

Ini akan membuat sheet "Transactions" dengan header row di spreadsheet yang dikonfigurasi.

---

## 6. Jalankan

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

---

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di dashboard Vercel
4. Untuk database, gunakan [Neon](https://neon.tech) atau [Supabase](https://supabase.com) (PostgreSQL cloud gratis)

```bash
# Atau langsung dari CLI
vercel --prod
```

---

## Deploy ke VPS (Docker Compose)

```bash
# Pastikan docker-compose.yml sudah dikonfigurasi
docker compose up -d

# Push schema
docker compose exec app npm run db:push
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Connection refused` ke DB | Pastikan PostgreSQL berjalan dan `DATABASE_URL` benar |
| Sync Sheets gagal | Cek `GOOGLE_PRIVATE_KEY` — pastikan newline `\n` tidak di-escape ganda |
| Telegram tidak terkirim | Cek `TELEGRAM_CHAT_ID` — harus chat dengan bot minimal sekali |
| Build error TypeScript | Jalankan `npm run build` untuk melihat detail error |
| Data tidak muncul di app | Pastikan seed sudah dijalankan dan bulan di picker sesuai data |

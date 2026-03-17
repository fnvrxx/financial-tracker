# Database

ORM: **Drizzle ORM** · Driver: **postgres.js** · DB: **PostgreSQL 15+**

---

## Schema

### `accounts`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `name` | text NOT NULL | Nama akun |
| `type` | enum(`cash`, `bank`, `ewallet`) | |
| `balance` | real DEFAULT 0 | Saldo saat ini (auto-update saat transaksi) |
| `icon` | text DEFAULT `"wallet"` | |
| `created_at` | timestamp | |

---

### `categories`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `name` | text NOT NULL | |
| `icon` | text DEFAULT `"tag"` | Key ikon (utensils, car, heart, dll.) |
| `type` | enum(`income`, `expense`) | |
| `color` | text DEFAULT `"#7c4dff"` | Hex color |

---

### `transactions`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `account_id` | integer FK → accounts | |
| `category_id` | integer FK → categories | |
| `type` | enum(`income`, `expense`) | |
| `amount` | real NOT NULL | Selalu positif |
| `note` | text DEFAULT `""` | Catatan opsional |
| `date` | text NOT NULL | Format `yyyy-MM-dd` |
| `synced` | boolean DEFAULT false | Sudah di-push ke Google Sheets? |
| `created_at` | timestamp | |

---

### `budgets`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `category_id` | integer FK → categories | |
| `limit_amount` | real NOT NULL | Target pengeluaran per periode |
| `period` | enum(`monthly`, `weekly`) | |

Satu kategori idealnya punya satu budget. Tidak ada constraint UNIQUE di DB, validasi di sisi aplikasi.

---

### `sync_queue`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `transaction_id` | integer FK → transactions | |
| `status` | enum(`pending`, `done`, `failed`) | |
| `retries` | integer DEFAULT 0 | Maks 3 sebelum jadi `failed` |
| `last_error` | text | Pesan error terakhir |
| `created_at` | timestamp | |

---

## Relasi

```
accounts ──< transactions >── categories
                                  │
                               budgets

transactions ──< sync_queue
```

---

## Commands

```bash
# Push schema ke database (buat/alter tabel)
npm run db:push

# Buka Drizzle Studio (GUI database)
npm run db:studio

# Seed data default (akun + kategori)
npx tsx src/db/seed.ts

# Seed 145 transaksi contoh Jan–Mar 2025
bash seed_database.sh
```

---

## Catatan Desain

- **`amount` selalu positif** — tipe transaksi (income/expense) menentukan arahnya, bukan sign amount
- **`balance` di accounts** — diupdate langsung saat POST/DELETE transaksi (optimistic update di DB level)
- **`date` sebagai text** — disimpan sebagai `yyyy-MM-dd` string agar mudah difilter dengan `gte`/`lte` tanpa timezone issue
- **`synced` flag** — jika sync ke Sheets berhasil langsung, flag langsung `true`; jika gagal masuk `sync_queue` dengan status `pending`

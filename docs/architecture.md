# Architecture

## Struktur Folder

```
financial-tracker/
├── src/
│   ├── app/
│   │   ├── (main)/               # Route group — layout dengan BottomNav + TransactionForm
│   │   │   ├── layout.tsx        # Global FAB (TransactionForm) + BottomNav + OfflineIndicator
│   │   │   ├── page.tsx          # Home
│   │   │   ├── graph/page.tsx    # Reports
│   │   │   ├── transactions/     # Transaksi + kalender
│   │   │   └── category/         # Budget tracking
│   │   ├── api/
│   │   │   ├── transactions/     # GET, POST, DELETE
│   │   │   ├── accounts/         # GET
│   │   │   ├── categories/       # GET, POST
│   │   │   ├── budgets/          # GET, POST, PUT
│   │   │   ├── reports/          # GET (summary, byCategory, trend)
│   │   │   └── sync/             # GET, POST
│   │   ├── globals.css
│   │   └── layout.tsx            # Root layout (font, PWA meta)
│   ├── components/
│   │   ├── BottomNav.tsx         # Tab bar bawah (4 item)
│   │   ├── BudgetStatusBadge.tsx # Badge "on track" / "exceeded"
│   │   ├── OfflineIndicator.tsx  # Banner offline + pending sync count
│   │   ├── CreateBudgetForm.tsx  # Modal buat kategori + budget baru
│   │   ├── DonutChart.tsx        # SVG donut chart untuk graph page
│   │   ├── LoadingSpinner.tsx    # Spinner reusable
│   │   ├── PageHeader.tsx        # Header ungu dengan slot children
│   │   └── TransactionForm.tsx   # Modal form tambah transaksi
│   ├── db/
│   │   ├── index.ts              # Koneksi drizzle + postgres.js
│   │   ├── schema.ts             # Definisi tabel
│   │   └── seed.ts               # Seed awal (akun + kategori default)
│   ├── lib/
│   │   ├── api-client.ts         # Typed fetch wrapper (api.*)
│   │   ├── budget-checker.ts     # Hitung spent per kategori + alert logic
│   │   ├── events.ts             # useRefreshListener — custom event bus
│   │   ├── offline-queue.ts      # IndexedDB queue untuk transaksi offline
│   │   ├── offline-sync.ts       # Auto-flush queue saat kembali online
│   │   ├── sheets.ts             # Google Sheets API helper
│   │   ├── sync.ts               # Sync queue manager
│   │   └── utils.ts              # formatRupiah, formatDate, cn
│   └── types/
│       └── index.ts              # Interface TypeScript (BudgetStatus, dll)
├── public/
│   └── sw.js                     # Service Worker (cache + offline)
├── docs/                         # Dokumentasi ini
├── seed_database.sh              # Script seed 145 transaksi Jan–Mar 2025
├── seed_data.sql                 # SQL data contoh
├── next.config.js
├── tailwind.config.ts
└── drizzle.config.ts
```

---

## Data Flow

### Tambah Transaksi

```
User isi TransactionForm
  → POST /api/transactions
    → Validasi Zod
    → INSERT transactions
    → UPDATE accounts.balance
    → syncTransaction(id)        ← async, tidak block response
      → appendTransaction (Google Sheets)
      → jika gagal → INSERT syncQueue
    → checkBudgetForCategory()   ← async, tidak block response
      → jika near/over limit → sendBudgetAlert() (Telegram)
  → emitRefresh()                ← custom event, semua page refresh data
```

### Budget Check per Bulan

```
GET /api/budgets?month=2025-03-01
  → checkBudgets("2025-03-01")
    → SELECT budgets JOIN categories
    → untuk tiap budget:
        → SUM(transactions.amount) WHERE date BETWEEN monthStart AND monthEnd
    → return BudgetStatus[]
```

### Trend Sparkline (Weekly)

```
GET /api/reports?type=trend&period=weekly&to=2025-03-31
  → refDate = 2025-03-31
  → refWeekEnd = endOfWeek(refDate)
  → loop i = 2..0:
      weekEnd   = subWeeks(refWeekEnd, i)
      weekStart = startOfWeek(weekEnd)
      income + expense = SUM per minggu
  → return 3 titik data
```

---

## State Management

Tidak menggunakan state management library. Pola yang dipakai:

- **Local state** — `useState` per komponen/page
- **Refresh event** — `emitRefresh()` dipanggil setelah mutasi; semua page yang mount `useRefreshListener` akan re-fetch
- **URL tidak dipakai sebagai state** — filter bulan, tab, dsb. disimpan di local state saja

---

## Rendering Strategy

Semua halaman adalah **Client Components** (`"use client"`) karena data difetch di sisi client via `api-client.ts`. Next.js App Router tetap dipakai untuk:
- File-based routing
- API Routes (`/app/api/*`)
- Layout nesting
- Static shell (halaman dikompilasi sebagai static, data diisi di browser)

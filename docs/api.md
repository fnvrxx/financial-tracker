# API Reference

Base URL: `/api`

Semua request/response menggunakan `Content-Type: application/json`.

---

## Transactions

### `GET /api/transactions`

List transaksi dengan filter opsional.

**Query params:**

| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `from` | `yyyy-MM-dd` | — | Tanggal mulai |
| `to` | `yyyy-MM-dd` | — | Tanggal akhir |
| `type` | `income\|expense` | — | Filter tipe |
| `categoryId` | `number` | — | Filter kategori |
| `limit` | `number` | `50` | Maks data yang dikembalikan |
| `offset` | `number` | `0` | Untuk pagination |

**Response:** `TransactionWithRelations[]`

```json
[
  {
    "transaction": {
      "id": 1,
      "accountId": 1,
      "categoryId": 3,
      "type": "expense",
      "amount": 25000,
      "note": "Makan siang",
      "date": "2025-03-10",
      "synced": false,
      "createdAt": "2025-03-10T12:00:00Z"
    },
    "category": { "id": 3, "name": "Makan", "icon": "utensils", "type": "expense", "color": "#f97316" },
    "account": { "id": 1, "name": "BCA", "type": "bank", "balance": 5000000 }
  }
]
```

---

### `POST /api/transactions`

Buat transaksi baru. Otomatis update saldo akun, sync ke Sheets, dan cek budget.

**Request body:**

```json
{
  "accountId": 1,
  "categoryId": 3,
  "type": "expense",
  "amount": 25000,
  "note": "Makan siang",
  "date": "2025-03-10"
}
```

**Response `201`:** Transaction object

---

### `DELETE /api/transactions?id=N`

Hapus transaksi dan rollback saldo akun.

**Response:** `{ "success": true }`

---

## Accounts

### `GET /api/accounts`

List semua akun.

**Response:** `Account[]`

```json
[
  { "id": 1, "name": "BCA", "type": "bank", "balance": 5000000, "icon": "wallet" }
]
```

---

## Categories

### `GET /api/categories`

List semua kategori.

**Query params:**

| Param | Tipe | Keterangan |
|-------|------|------------|
| `type` | `income\|expense` | Filter tipe kategori |

**Response:** `Category[]`

---

### `POST /api/categories`

Buat kategori baru.

**Request body:**

```json
{
  "name": "Gym",
  "icon": "heart",
  "type": "expense",
  "color": "#ef4444"
}
```

**Response `201`:** Category object

---

## Budgets

### `GET /api/budgets`

Status budget semua kategori untuk bulan tertentu, termasuk jumlah yang sudah terpakai.

**Query params:**

| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `month` | `yyyy-MM-dd` | Bulan ini | Tanggal awal bulan yang ingin dicek |

**Response:** `BudgetStatus[]`

```json
[
  {
    "budgetId": 1,
    "categoryId": 3,
    "categoryName": "Makan",
    "categoryColor": "#f97316",
    "limitAmount": 1500000,
    "spent": 820000,
    "remaining": 680000,
    "percentage": 55,
    "period": "monthly",
    "isOverBudget": false,
    "isNearLimit": false
  }
]
```

---

### `POST /api/budgets`

Buat budget baru untuk sebuah kategori.

**Request body:**

```json
{
  "categoryId": 3,
  "limitAmount": 1500000,
  "period": "monthly"
}
```

---

### `PUT /api/budgets`

Update limit budget yang sudah ada.

**Request body:**

```json
{
  "id": 1,
  "limitAmount": 2000000
}
```

---

## Reports

### `GET /api/reports?type=summary`

Ringkasan income, expense, net, dan jumlah transaksi untuk periode tertentu.

**Query params:** `from`, `to` (default: bulan ini)

**Response:**

```json
{
  "income": 5000000,
  "expense": 2300000,
  "net": 2700000,
  "transactionCount": 42,
  "period": { "from": "2025-03-01", "to": "2025-03-31" }
}
```

---

### `GET /api/reports?type=byCategory`

Breakdown total per kategori dalam periode tertentu.

**Query params:** `from`, `to` (default: bulan ini)

**Response:** `CategoryBreakdown[]`

---

### `GET /api/reports?type=trend`

Data tren untuk sparkline chart.

**Query params:**

| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `period` | `monthly\|weekly` | `monthly` | Granularitas data |
| `to` | `yyyy-MM-dd` | Hari ini | Titik akhir tren |

- `monthly` → 6 titik, masing-masing 1 bulan
- `weekly` → 3 titik, masing-masing 1 minggu (Senin–Minggu)

**Response:** `MonthlyTrend[]`

```json
[
  { "month": "03 Mar", "income": 0, "expense": 450000, "net": -450000 },
  { "month": "10 Mar", "income": 0, "expense": 320000, "net": -320000 },
  { "month": "17 Mar", "income": 5000000, "expense": 280000, "net": 4720000 }
]
```

---

## Sync

### `GET /api/sync`

Status sinkronisasi Google Sheets.

**Response:**

```json
{
  "total": 145,
  "synced": 140,
  "unsynced": 5,
  "pendingQueue": 3,
  "failedQueue": 2
}
```

---

### `POST /api/sync?action=process`

Proses ulang semua item pending di antrian sync (max retry: 3).

### `POST /api/sync?action=init`

Inisialisasi sheet "Transactions" dengan header row di Google Sheets.

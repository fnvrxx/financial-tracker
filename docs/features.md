# Features

---

## Home (`/`)

Ringkasan keuangan bulan berjalan.

- **Savings card** — net income - expense bulan ini
- **Income / Expense summary** — dua kolom di dalam card
- **Top Spending** — 5 kategori pengeluaran terbesar bulan ini (scroll horizontal)
- **Monthly Budget** — daftar progress bar per kategori budget

---

## Graph / Reports (`/graph`)

Analisis pengeluaran visual.

- **Donut chart** — distribusi pengeluaran per kategori bulan ini
- **Category breakdown list** — ranking kategori dengan persentase dan total
- Filter income / expense

---

## Transactions (`/transactions`)

Riwayat transaksi dengan kalender interaktif.

### Kalender

- Mini kalender bulanan di atas daftar transaksi
- Navigasi bulan dengan tombol `‹ / ›`
- **Titik merah** = ada pengeluaran di tanggal tersebut
- **Titik hijau** = ada pemasukan
- Klik tanggal → filter daftar ke tanggal tersebut
- Klik lagi → kembali ke semua transaksi bulan itu
- Hari ini ditandai background ungu muda

### Summary strip

Di bawah kalender: jumlah transaksi + total income/expense (untuk periode yang ditampilkan)

### Daftar transaksi

- Dikelompokkan per tanggal, diurutkan ascending
- Tiap item: kategori, catatan/akun, nominal (merah/hijau), status sync
- Klik item → hapus transaksi (dengan konfirmasi)

### Filter

- Tombol Semua / Pemasukan / Pengeluaran di header
- Filter berlaku bersamaan dengan pilihan tanggal di kalender

---

## Category / Budget (`/category`)

Tracking budget bulanan per kategori.

### Header

- Sparkline chart **3 minggu terakhir** (pengeluaran per minggu)
- Sisa budget total bulan ini
- Nama bulan + tahun yang dipilih

### Month Picker

- Klik ikon kalender di header → grid bulan
- Navigasi tahun dengan `‹ / ›` (bisa ke tahun-tahun sebelumnya)
- Pilih bulan → semua data reload untuk bulan tersebut
- Tombol "Kembali ke bulan ini" muncul saat melihat bulan lampau

### Budget Cards

- Progress bar per kategori (hijau → kuning → merah sesuai persentase)
- Nominal terpakai vs limit
- Badge "on track" atau "exceeding"
- **Klik card** → detail sheet muncul dengan daftar transaksi kategori tersebut

### Detail Sheet

- Header: nama kategori, progress bar, persentase, sisa budget
- Daftar transaksi kategori di bulan yang dipilih, diurutkan ascending
- Tiap item: catatan/nama, tanggal, akun, nominal
- Footer: jumlah transaksi + total

### Belum Ada Budget

- Seksi di bawah budget cards menampilkan kategori yang belum punya budget
- Tombol "Set Budget" di tiap item → modal input nominal
- Preview target harian otomatis dihitung

### FAB "+"

- Buka `CreateBudgetForm` — buat kategori baru sekaligus budgetnya
- Field: nama, ikon (8 pilihan), warna (8 warna), tipe, target bulanan
- Preview target harian muncul otomatis saat mengisi nominal

---

## TransactionForm (Global FAB)

Tersedia di semua halaman kecuali `/category`.

- Posisi kanan bawah, gradient ungu
- Modal slide-up dari bawah
- Field: nominal, akun, tipe (income/expense), kategori, catatan, tanggal

---

## Google Sheets Sync

Setiap transaksi baru otomatis di-push ke Google Sheets.

- Jika berhasil: flag `synced = true`
- Jika gagal: masuk `sync_queue` dengan status `pending`
- Retry otomatis saat `POST /api/sync?action=process` dipanggil (maks 3x)
- Kolom di sheet: ID, Date, Type, Category, Account, Amount, Note, Created At, Synced At

---

## Telegram Budget Alert

Notifikasi otomatis saat budget hampir habis atau terlampaui.

- Trigger: setiap transaksi `expense` dibuat
- Kondisi: `percentage >= 80` (near limit) atau `spent > limitAmount` (over budget)
- Format pesan:
  ```
  ! Budget Exceeded (105%)
  Category: Makan
  Spent: Rp 1.575.000 / Rp 1.500.000
  ```

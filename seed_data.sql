-- ═══════════════════════════════════════════════════════════════
-- FinTrack PostgreSQL Seed Script
-- 145 transaksi dari Januari - Maret 2026
-- Run: psql -d fintrack -f seed_data.sql
-- Atau: cat seed_data.sql | docker exec -i fintrack-db psql -U postgres -d fintrack
-- ═══════════════════════════════════════════════════════════════

-- Pastikan enum types sudah ada (dari db:push)
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('cash', 'bank', 'ewallet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('monthly', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('pending', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create tables if not exist
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'cash',
  balance REAL NOT NULL DEFAULT 0,
  icon TEXT DEFAULT 'wallet',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'tag',
  type tx_type NOT NULL DEFAULT 'expense',
  color TEXT DEFAULT '#7c4dff'
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  type tx_type NOT NULL,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  limit_amount REAL NOT NULL,
  period period_type NOT NULL DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  status sync_status NOT NULL DEFAULT 'pending',
  retries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- CLEAR EXISTING DATA (fresh start)
-- ═══════════════════════════════════════════════════════════════
TRUNCATE transactions, sync_queue, budgets, categories, accounts RESTART IDENTITY CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- ACCOUNTS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO accounts (name, type, balance, icon) VALUES
  ('Cash', 'cash', 0, 'banknote'),
  ('Mandiri', 'bank', 0, 'landmark'),
  ('BNI', 'bank', 0, 'landmark'),
  ('GoPay', 'ewallet', 0, 'smartphone'),
  ('ShopeePay', 'ewallet', 0, 'smartphone'),
  ('Jago', 'bank', 0, 'smartphone');

-- ═══════════════════════════════════════════════════════════════
-- CATEGORIES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO categories (name, icon, type, color) VALUES
  ('Gaji', 'briefcase', 'income', '#10b981'),
  ('Freelance', 'laptop', 'income', '#06b6d4'),
  ('Investasi', 'trending-up', 'income', '#3b82f6'),
  ('Lainnya', 'plus-circle', 'income', '#8b5cf6'),
  ('Makan & Minum', 'utensils', 'expense', '#ef4444'),
  ('Transportasi', 'car', 'expense', '#f97316'),
  ('Belanja', 'shopping-bag', 'expense', '#ec4899'),
  ('Tagihan', 'receipt', 'expense', '#8b5cf6'),
  ('Hiburan', 'gamepad-2', 'expense', '#06b6d4'),
  ('Kesehatan', 'heart-pulse', 'expense', '#10b981'),
  ('Pendidikan', 'graduation-cap', 'expense', '#3b82f6'),
  ('Lainnya', 'more-horizontal', 'expense', '#6b7280');


-- ═══════════════════════════════════════════════════════════════
-- TRANSACTIONS (145 records, Jan-Mar 2026)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO transactions (account_id, category_id, type, amount, note, date, synced) VALUES
  (2, 5, 'expense', 13000, 'Makan', '2026-01-01', false),
  (2, 5, 'expense', 4000, 'Minum', '2026-01-01', false),
  (2, 5, 'expense', 19000, 'Kopi', '2026-01-01', false),
  (2, 5, 'expense', 11000, 'Mie gacoan', '2026-01-02', false),
  (5, 12, 'expense', 24000, 'Bayar utang ke hapid', '2026-01-03', false),
  (3, 8, 'expense', 50000, 'Icloud', '2026-01-03', false),
  (5, 8, 'expense', 22000, 'Galon', '2026-01-03', false),
  (5, 5, 'expense', 19000, 'Makan', '2026-01-03', false),
  (5, 5, 'expense', 32000, 'Minum', '2026-01-03', false),
  (1, 6, 'expense', 25000, 'Bensin', '2026-01-04', false),
  (1, 5, 'expense', 15000, 'Makan', '2026-01-04', false),
  (2, 5, 'expense', 80000, 'Katsu chicken', '2026-01-04', false),
  (5, 5, 'expense', 35000, 'Katsu', '2026-01-05', false),
  (5, 5, 'expense', 4000, 'Golda', '2026-01-05', false),
  (5, 8, 'expense', 31000, 'Laundry', '2026-01-05', false),
  (5, 5, 'expense', 32000, 'Kopi', '2026-01-05', false),
  (1, 5, 'expense', 15000, 'Tahu tek', '2026-01-06', false),
  (1, 5, 'expense', 15000, 'Ayam', '2026-01-07', false),
  (1, 5, 'expense', 16000, 'Naspad', '2026-01-07', false),
  (3, 8, 'expense', 40000, 'Pulsa', '2026-01-07', false),
  (3, 5, 'expense', 24000, 'Kopi + mie', '2026-01-08', false),
  (3, 7, 'expense', 26000, 'Shampoo', '2026-01-08', false),
  (3, 5, 'expense', 15000, 'Makan', '2026-01-08', false),
  (2, 5, 'expense', 72000, 'Naspad', '2026-01-09', false),
  (3, 8, 'expense', 46000, 'Galon', '2026-01-09', false),
  (2, 5, 'expense', 31000, 'Martabak', '2026-01-10', false),
  (3, 9, 'expense', 15000, 'Jajan', '2026-01-10', false),
  (3, 5, 'expense', 14000, 'Makan', '2026-01-11', false),
  (1, 6, 'expense', 20000, 'Bensin', '2026-01-11', false),
  (1, 5, 'expense', 20000, 'Taburai', '2026-01-12', false),
  (1, 5, 'expense', 19000, 'Kopken', '2026-01-13', false),
  (1, 5, 'expense', 10000, 'Kopi', '2026-01-13', false),
  (1, 6, 'expense', 3000, 'Parkir', '2026-01-13', false),
  (3, 11, 'expense', 63000, 'Print', '2026-01-13', false),
  (2, 9, 'expense', 4000, 'Jajan', '2026-01-15', false),
  (2, 5, 'expense', 15000, 'Makan', '2026-01-15', false),
  (2, 5, 'expense', 17000, 'Makan', '2026-01-15', false),
  (2, 5, 'expense', 12000, 'Makan', '2026-01-16', false),
  (2, 9, 'expense', 10000, 'Jajan', '2026-01-16', false),
  (1, 6, 'expense', 20000, 'Bensin', '2026-01-17', false),
  (3, 8, 'expense', 46000, 'Galon', '2026-01-18', false),
  (3, 5, 'expense', 18000, 'Makan', '2026-01-18', false),
  (2, 5, 'expense', 21000, 'Makan', '2026-01-18', false),
  (2, 5, 'expense', 13000, 'Makan', '2026-01-19', false),
  (2, 11, 'expense', 17000, 'Print', '2026-01-20', false),
  (4, 5, 'expense', 10000, 'Makan', '2026-01-20', false),
  (3, 8, 'expense', 20000, 'Paket data', '2026-01-21', false),
  (2, 5, 'expense', 19000, 'Kopken', '2026-01-21', false),
  (1, 5, 'expense', 18000, 'Makan', '2026-01-21', false),
  (2, 5, 'expense', 19000, 'Kopken', '2026-01-22', false),
  (3, 6, 'expense', 20000, 'Bensin', '2026-01-22', false),
  (3, 5, 'expense', 13000, 'Makan', '2026-01-22', false),
  (2, 11, 'expense', 39000, 'Print', '2026-01-23', false),
  (2, 5, 'expense', 17000, 'J chicken', '2026-01-23', false),
  (2, 5, 'expense', 21000, 'Nasgor jawa + telur', '2026-01-24', false),
  (2, 5, 'expense', 12000, 'Cilok bakar', '2026-01-24', false),
  (2, 6, 'expense', 10000, 'Bensin faishal', '2026-01-24', false),
  (2, 8, 'expense', 65000, 'Netflix', '2026-01-24', false),
  (2, 6, 'expense', 150000, 'Servis', '2026-01-24', false),
  (2, 6, 'expense', 23000, 'Tol + bensin', '2026-01-25', false),
  (2, 5, 'expense', 53000, 'Fudgybro', '2026-01-25', false),
  (2, 5, 'expense', 20000, 'Ayam', '2026-01-25', false),
  (3, 5, 'expense', 24000, 'Makan', '2026-01-26', false),
  (2, 5, 'expense', 10000, 'Teh', '2026-01-26', false),
  (2, 5, 'expense', 18000, 'Ayam', '2026-01-26', false),
  (2, 5, 'expense', 15000, 'Makan', '2026-01-27', false),
  (2, 6, 'expense', 88000, 'Tiket', '2026-01-28', false),
  (2, 7, 'expense', 12000, 'Alat pensil', '2026-01-28', false),
  (1, 5, 'expense', 26000, 'Makan', '2026-01-28', false),
  (1, 8, 'expense', 20000, 'Galon', '2026-01-28', false),
  (1, 5, 'expense', 5000, 'Es teh', '2026-01-29', false),
  (1, 5, 'expense', 17000, 'Ayam', '2026-01-29', false),
  (3, 5, 'expense', 16000, 'Kopi', '2026-01-29', false),
  (3, 5, 'expense', 23000, 'Makan', '2026-01-30', false),
  (1, 5, 'expense', 20000, 'Makan', '2026-01-30', false),
  (1, 5, 'expense', 18000, 'Makan', '2026-01-31', false),
  (3, 5, 'expense', 19000, 'Kopken', '2026-01-31', false),
  (2, 5, 'expense', 24000, 'Tomoro coffe', '2026-01-31', false),
  (2, 7, 'expense', 32000, 'Obat mata', '2026-01-31', false),
  (1, 5, 'expense', 13000, 'Makan', '2026-01-31', false),
  (2, 8, 'expense', 20000, 'Pulsa', '2026-01-31', false),
  (1, 5, 'expense', 21000, 'Aqua', '2026-02-01', false),
  (1, 5, 'expense', 20000, 'Aqua', '2026-02-01', false),
  (1, 9, 'expense', 16000, 'Jajan', '2026-02-01', false),
  (2, 11, 'expense', 23000, 'Print', '2026-02-02', false),
  (2, 5, 'expense', 30000, 'Makan', '2026-02-02', false),
  (2, 9, 'expense', 47000, 'Jajan', '2026-02-02', false),
  (2, 9, 'expense', 47000, 'Jajan', '2026-02-03', false),
  (2, 5, 'expense', 61000, 'Makan gacoan', '2026-02-03', false),
  (2, 8, 'expense', 49000, 'Icloud', '2026-02-05', false),
  (2, 5, 'expense', 25000, 'Kopken', '2026-02-06', false),
  (3, 5, 'expense', 19000, 'Kopken', '2026-02-07', false),
  (3, 7, 'expense', 22000, 'Inhaler + susu', '2026-02-10', false),
  (2, 5, 'expense', 95000, 'Bakpia', '2026-02-12', false),
  (2, 6, 'expense', 70000, 'Bensin', '2026-02-12', false),
  (1, 7, 'expense', 71000, 'Sabun + deoderant', '2026-02-18', false),
  (2, 6, 'expense', 80000, 'Tiket kereta', '2026-02-18', false),
  (3, 6, 'expense', 12000, 'Tiket komuner', '2026-02-19', false),
  (3, 5, 'expense', 54000, 'Mie gacoan', '2026-02-19', false),
  (3, 5, 'expense', 23000, 'Kopi + coklat lumer pisang', '2026-02-20', false),
  (1, 6, 'expense', 10000, 'Bensin', '2026-02-20', false),
  (1, 5, 'expense', 15000, 'Nasi', '2026-02-21', false),
  (1, 9, 'expense', 11000, 'Jajan', '2026-02-22', false),
  (1, 6, 'expense', 20000, 'Bensin', '2026-02-22', false),
  (1, 5, 'expense', 13000, 'Tahu tek', '2026-02-23', false),
  (6, 8, 'expense', 400000, 'Claude', '2026-02-24', false),
  (3, 7, 'expense', 38000, 'Beli follo', '2026-02-24', false),
  (3, 5, 'expense', 39000, 'Ayam', '2026-02-24', false),
  (3, 9, 'expense', 11000, 'Jajan', '2026-02-24', false),
  (1, 5, 'expense', 18000, 'Padang', '2026-02-25', false),
  (3, 8, 'expense', 20000, 'Paket data', '2026-02-26', false),
  (3, 7, 'expense', 75000, 'Buku', '2026-02-26', false),
  (1, 9, 'expense', 16000, 'Jajan', '2026-02-27', false),
  (6, 8, 'expense', 36000, 'Laundry', '2026-02-27', false),
  (3, 7, 'expense', 13000, 'Stella', '2026-02-27', false),
  (3, 6, 'expense', 12000, 'Tiket', '2026-02-28', false),
  (3, 6, 'expense', 20000, 'Bensin', '2026-03-01', false),
  (3, 5, 'expense', 13000, 'Batagor', '2026-03-01', false),
  (2, 5, 'expense', 23000, 'Makan', '2026-03-01', false),
  (3, 12, 'expense', 1000000, 'Bisnis', '2026-03-03', false),
  (3, 12, 'expense', 100000, 'Porto', '2026-03-03', false),
  (1, 5, 'expense', 15000, 'Makan ayam', '2026-03-04', false),
  (1, 5, 'expense', 5000, 'Teh', '2026-03-04', false),
  (2, 12, 'expense', 300000, 'Bagi takjil', '2026-03-04', false),
  (2, 8, 'expense', 50000, 'Icloud', '2026-03-04', false),
  (1, 9, 'expense', 10000, 'Jajan', '2026-03-04', false),
  (2, 5, 'expense', 27000, 'Makan', '2026-03-05', false),
  (3, 5, 'expense', 10000, 'Es buah', '2026-03-05', false),
  (2, 5, 'expense', 32000, 'Makan', '2026-03-06', false),
  (1, 6, 'expense', 25000, 'Bensin', '2026-03-06', false),
  (2, 8, 'expense', 29000, 'Galon', '2026-03-07', false),
  (3, 12, 'expense', 35000, 'Urunan bukber', '2026-03-07', false),
  (1, 5, 'expense', 12000, 'Mie', '2026-03-08', false),
  (2, 5, 'expense', 19000, 'Kopken', '2026-03-08', false),
  (2, 8, 'expense', 79000, 'Idcloudhost', '2026-03-09', false),
  (2, 5, 'expense', 15000, 'Ayam', '2026-03-10', false),
  (2, 11, 'expense', 15000, 'Transkrip', '2026-03-10', false),
  (2, 8, 'expense', 12000, 'Canva', '2026-03-11', false),
  (2, 5, 'expense', 10000, 'Gorengan', '2026-03-11', false),
  (2, 9, 'expense', 26000, 'Jajan', '2026-03-11', false),
  (2, 5, 'expense', 19000, 'Obat + minum mineral', '2026-03-12', false),
  (2, 8, 'expense', 15000, 'Pulsa', '2026-03-12', false),
  (2, 9, 'expense', 22000, 'Jajan', '2026-03-13', false),
  (2, 6, 'expense', 29000, 'Gojek', '2026-03-13', false),
  (2, 5, 'expense', 24000, 'Makan', '2026-03-14', false);

-- ═══════════════════════════════════════════════════════════════
-- UPDATE ACCOUNT BALANCES
-- ═══════════════════════════════════════════════════════════════
UPDATE accounts SET balance = -sub.total
FROM (
  SELECT account_id, SUM(amount) as total
  FROM transactions
  WHERE type = 'expense'
  GROUP BY account_id
) sub
WHERE accounts.id = sub.account_id;

-- ═══════════════════════════════════════════════════════════════
-- BUDGETS (based on average spending)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO budgets (category_id, limit_amount, period) VALUES
  (5, 700000, 'monthly'),   -- Makan & Minum
  (6, 300000, 'monthly'),   -- Transportasi
  (7, 150000, 'monthly'),   -- Belanja
  (8, 400000, 'monthly'),   -- Tagihan
  (9, 100000, 'monthly'),   -- Hiburan
  (11, 100000, 'monthly');  -- Pendidikan

-- ═══════════════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  tx_count INTEGER;
  total_expense NUMERIC;
BEGIN
  SELECT COUNT(*), SUM(amount) INTO tx_count, total_expense FROM transactions;
  RAISE NOTICE '✅ Seed complete: % transactions, total expense Rp %', tx_count, total_expense;
  RAISE NOTICE '   Jan: % tx', (SELECT COUNT(*) FROM transactions WHERE date LIKE '2026-01%');
  RAISE NOTICE '   Feb: % tx', (SELECT COUNT(*) FROM transactions WHERE date LIKE '2026-02%');
  RAISE NOTICE '   Mar: % tx', (SELECT COUNT(*) FROM transactions WHERE date LIKE '2026-03%');
END $$;

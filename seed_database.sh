#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FinTrack Database Seed Script
# Memasukkan 145 transaksi (Jan-Mar 2025) ke PostgreSQL
# ═══════════════════════════════════════════════════════════════

set -e

DB_NAME="${DB_NAME:-fintrack}"
DB_USER="${DB_USER:-fnvrxx}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed_data.sql"

echo "🗄️  FinTrack Database Seeder"
echo "══════════════════════════════════════"
echo "  Database : $DB_NAME"
echo "  Host     : $DB_HOST:$DB_PORT"
echo "  User     : $DB_USER"
echo "  SQL File : $SQL_FILE"
echo "══════════════════════════════════════"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ File seed_data.sql tidak ditemukan!"
    exit 1
fi

# Method 1: Direct psql
if command -v psql &> /dev/null; then
    echo "📦 Menggunakan psql..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
    echo ""
    echo "✅ Selesai! Cek data:"
    echo "   psql -d $DB_NAME -c \"SELECT date, COUNT(*), SUM(amount) FROM transactions GROUP BY date ORDER BY date;\""
    exit 0
fi

# Method 2: Docker
if command -v docker &> /dev/null; then
    CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -1)
    if [ -n "$CONTAINER" ]; then
        echo "🐳 Menggunakan Docker container: $CONTAINER"
        cat "$SQL_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
        echo ""
        echo "✅ Selesai!"
        exit 0
    fi
fi

echo "❌ psql atau Docker tidak ditemukan."
echo ""
echo "Cara manual:"
echo "  1. psql -d $DB_NAME -f seed_data.sql"
echo "  2. cat seed_data.sql | docker exec -i <container> psql -U postgres -d fintrack"
echo "  3. Copy-paste isi seed_data.sql ke pgAdmin / DBeaver"
exit 1

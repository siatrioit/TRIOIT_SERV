#!/bin/bash
# Sagatavo vienu mapi augšupielādei uz cPanel serv.trioit.lv
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy/serv.trioit.lv"

echo "→ Building frontend..."
cd "$ROOT/frontend"
echo "VITE_API_URL=/api/v1" > .env.production
npm ci
npm run build

echo "→ Building backend..."
cd "$ROOT/backend"
npm ci
npm run build

echo "→ Assembling deploy folder..."
rm -rf "$OUT"
mkdir -p "$OUT/public" "$OUT/uploads"

cp -r "$ROOT/backend/dist" "$OUT/dist"
cp "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" "$OUT/"
cp -r "$ROOT/frontend/dist/"* "$OUT/public/"

echo "✓ Gatavs: $OUT"
echo "  Augšupielādē visu mapi uz /home/TAVSUSER/serv.trioit.lv/"
echo "  cPanel → Setup Node.js App → startup: dist/index.js → Restart"

#!/bin/bash
# Build script — izpildās uz servera (.cpanel.yml vai manuāli)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# cPanel Node.js: izmanto app virtuālo vidi, ja pieejama
if [ -f "$HOME/nodevenv/TRIOIT_SERV/backend/18/bin/activate" ]; then
  source "$HOME/nodevenv/TRIOIT_SERV/backend/18/bin/activate"
elif [ -d "/opt/cpanel/ea-nodejs18/bin" ]; then
  export PATH="/opt/cpanel/ea-nodejs18/bin:$PATH"
fi

echo "=== TRIO-SERV deploy ==="

echo "→ Frontend build..."
cd "$ROOT/frontend"
echo "VITE_API_URL=/api/v1" > .env.production
npm ci --omit=dev 2>/dev/null || npm install
npm run build

echo "→ Backend build..."
cd "$ROOT/backend"
npm ci --omit=dev 2>/dev/null || npm install
npm run build

echo "→ Kopē frontend uz backend/public..."
rm -rf public
mkdir -p public
cp -r "$ROOT/frontend/dist/"* public/

echo "→ Restart signal..."
mkdir -p tmp
touch tmp/restart.txt 2>/dev/null || true

echo "=== Deploy pabeigts ==="

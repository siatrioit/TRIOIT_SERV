#!/bin/bash
# Build script — izpildās uz servera (.cpanel.yml Deploy HEAD)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# cPanel Node.js virtuālā vide (20.x, pēc tam 18.x fallback)
NODEVENV_BASE="$HOME/nodevenv/serv.trioit.lv/repo/backend"
for VER in 20 22 18; do
  if [ -f "$NODEVENV_BASE/$VER/bin/activate" ]; then
    # shellcheck disable=SC1090
    source "$NODEVENV_BASE/$VER/bin/activate"
    echo "Using Node from nodevenv/$VER"
    break
  fi
done

if ! command -v npm >/dev/null 2>&1; then
  for NODE_BIN in /opt/cpanel/ea-nodejs20/bin /opt/cpanel/ea-nodejs18/bin; do
    if [ -d "$NODE_BIN" ]; then
      export PATH="$NODE_BIN:$PATH"
      echo "Using Node from $NODE_BIN"
      break
    fi
  done
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Deploy cannot build."
  exit 1
fi

echo "=== TRIO-SERV deploy ==="
echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

echo "→ Frontend build..."
cd "$ROOT/frontend"
echo "VITE_API_URL=/api/v1" > .env.production
# Build vajag devDependencies (vite, typescript)
npm ci 2>/dev/null || npm install
npm run build

echo "→ Backend build..."
cd "$ROOT/backend"
npm ci 2>/dev/null || npm install
npm run build

echo "→ Kopē frontend uz backend/public..."
rm -rf "$ROOT/backend/public"
mkdir -p "$ROOT/backend/public"
cp -r "$ROOT/frontend/dist/"* "$ROOT/backend/public/"

echo "→ Restart signal (Passenger)..."
mkdir -p "$ROOT/backend/tmp"
touch "$ROOT/backend/tmp/restart.txt" 2>/dev/null || true

echo "=== Deploy pabeigts ==="
ls -la "$ROOT/backend/dist/index.js"
ls -la "$ROOT/backend/public/index.html"

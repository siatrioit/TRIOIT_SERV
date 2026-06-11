# Deployment — cPanel + serv.trioit.lv

## Arhitektūra

```
trioit.lv                    → pamatlapa (public_html) — NETIEK SKARTA
serv.trioit.lv               → subdomain (Node.js apkalpo visu)
  ├── /                      → React frontend
  ├── /api/v1/...            → REST API
  └── /health                → health check

/home/user/TRIOIT_SERV/      → Git repo (atsevišķa mape!)
/home/user/serv.trioit.lv/   → subdomain default faili — NETIEK LIETOTI
```

**Git repo** liec mapē `TRIOIT_SERV`, ne `serv.trioit.lv` (tur jau ir `public_html`).

---

## Solis 1 — Subdomain

1. cPanel → **Domains** → **Subdomains** (vai **Create A New Domain**)
2. Subdomain: `serv`
3. Domēns: `trioit.lv`
4. Rezultāts: `serv.trioit.lv`
5. Document root (piemērs): `/home/tavsuser/serv.trioit.lv`

> Mape tiek izveidota automātiski. `trioit.lv/public_html` paliek neskarts.

---

## Solis 2 — MySQL datubāze

1. cPanel → **MySQL Databases**
2. Jauna DB: `trio_serv` (pilns nosaukums būs `tavsuser_trio_serv`)
3. Jauns lietotājs + piešķirt visas tiesības DB
4. **phpMyAdmin** → Import → `database/schema.mysql.sql`

---

## Solis 3 — Failu sagatavošana (lokāli)

```bash
# Frontend build — API uz tā paša domēna (bez CORS problēmām)
cd frontend
echo "VITE_API_URL=/api/v1" > .env.production
npm install
npm run build

# Backend build
cd ../backend
npm install
npm run build

# Frontend dist → backend/public (viena augšupielāde)
mkdir -p public
cp -r ../frontend/dist/* public/
```

Servera mapes struktūra:

```
/home/tavsuser/serv.trioit.lv/
├── dist/                 ← backend (TypeScript build)
│   └── index.js
├── public/               ← frontend (Vite build)
│   ├── index.html
│   ├── assets/
│   └── ...
├── package.json
├── package-lock.json
├── .env
├── uploads/
└── node_modules/         ← npm install uz servera
```

Augšupielādē visu mapi caur **File Manager** vai **FTP** uz `/home/tavsuser/serv.trioit.lv/`.

---

## Solis 4 — Setup Node.js App (cPanel)

cPanel → **Software** → **Setup Node.js App** → **Create Application**

| Lauks | Vērtība |
|-------|---------|
| **Node.js version** | 18.x vai 20.x (jaunākais pieejamais) |
| **Application mode** | Production |
| **Application root** | `serv.trioit.lv` (ceļš uz mapi no Solis 1) |
| **Application URL** | `serv.trioit.lv` |
| **Application startup file** | `dist/index.js` |

Pēc izveides:

1. Noklikšķini **Run NPM Install**
2. Pievieno vides mainīgos (skat. zemāk) → **Save**
3. Noklikšķini **Restart**

### Vides mainīgie (.env)

cPanel Node.js panelī pievieno (vai izveido `.env` failu mapē):

```env
NODE_ENV=production
API_PREFIX=/api/v1
STATIC_DIR=./public

DB_TYPE=mysql
DB_HOST=localhost
DB_NAME=tavsuser_trio_serv
DB_USER=tavsuser_trio
DB_PASSWORD=your_password

JWT_SECRET=izveido-garu-nejaušu-virkni-min-32-simboli
JWT_EXPIRES_IN=24h

CORS_ORIGIN=https://serv.trioit.lv
OPENAI_API_KEY=sk-...

UPLOAD_DIR=./uploads
```

> **PORT** — neliec manuāli! cPanel Node.js pats iestata `PORT` vides mainīgo.

---

## Solis 5 — SSL

1. cPanel → **SSL/TLS Status** (vai **Let's Encrypt**)
2. Atzīmē `serv.trioit.lv` → **Run AutoSSL** / **Issue**

Pārliecinies, ka atver `https://serv.trioit.lv` (ne http).

---

## Solis 6 — Pārbaude

| URL | Sagaidāmais rezultāts |
|-----|----------------------|
| `https://serv.trioit.lv` | Login lapa (React) |
| `https://serv.trioit.lv/health` | `{"status":"ok",...}` |
| `https://serv.trioit.lv/api/v1/services` | 401 (bez token — normāli) |

---

## Atjaunināšana pēc izmaiņām

```bash
# Lokāli — pārbūvē un augšupielādē
cd frontend && npm run build
cd ../backend && npm run build
rm -rf public && mkdir public && cp -r ../frontend/dist/* public/
# Augšupielādē dist/, public/, package.json uz serveri
```

cPanel → **Setup Node.js App** → **Restart**

---

## Biežākās problēmas

### "Cannot GET /" vai tukša lapa
- Pārbaudi, vai `public/index.html` eksistē
- `STATIC_DIR=./public` ir iestatīts
- Restart Node.js app

### API nestrādā / 502 Bad Gateway
- **Setup Node.js App** → pārbaudi statusu (Running)
- Skaties **stderr.log** mapē `serv.trioit.lv/`
- Pārbaudi `.env` DB piekļuves datus

### React maršruti (piem. /incidents) dod 404
- `STATIC_DIR` ir ieslēgts (SPA fallback index.ts)
- Restart pēc `dist/` atjaunināšanas

### CORS kļūda
- Frontend build ar `VITE_API_URL=/api/v1` (relatīvs ceļš)
- `CORS_ORIGIN=https://serv.trioit.lv`

### npm install kļūdas uz servera
- Izmanto **Run NPM Install** cPanel panelī, ne SSH, ja nav pieredzes
- Node versijai jāsakrīt ar lokālo (18+)

---

## Kad vajadzētu 2. subdomain?

Tikai ja hosting neļauj frontend + API uz viena Node.js app. Tad:

| Subdomain | Loma |
|-----------|------|
| `serv.trioit.lv` | Tikai statiskais frontend (`public_html`) |
| `api.serv.trioit.lv` | Node.js API |

Tavā gadījumā ar **Setup Node.js App** pietiek ar **vienu** — `serv.trioit.lv`.

---

## Checklist

- [ ] Subdomain `serv.trioit.lv` izveidots
- [ ] MySQL schema importēta
- [ ] Faili augšupielādēti (`dist/`, `public/`, `package.json`)
- [ ] Node.js app izveidots un **Running**
- [ ] `.env` / vides mainīgie iestatīti
- [ ] SSL aktīvs
- [ ] `https://serv.trioit.lv/health` atbild
- [ ] Login lapa atveras
- [ ] Admin lietotājs DB izveidots

# TRIOIT_SERV

Lauka servisa pārvaldības sistēma — optimizēta mobilajām ierīcēm un cPanel hostingam.

**Repo:** https://github.com/siatrioit/TRIOIT_SERV  
**Production:** https://serv.trioit.lv

## Funkcijas

- Klientu, līgumu un vienību pārvaldība
- Atgadījumu reģistrs ar prioritātēm un statusiem
- Pakalpojumu katalogs (pēc līguma / ārpus līguma)
- Rēķinu izrakstīšana un kontrole
- AI balss ievade un dabiskās valodas vaicājumi
- Karte ar klientu atrašanās vietām (Leaflet)

## Struktūra

```
TRIO-SERV/
├── backend/          # Node.js + Express API
├── frontend/         # React + TypeScript PWA
├── database/         # SQL schemas (PostgreSQL + MySQL)
└── docs/             # Tehniskā dokumentācija
```

## Ātrā palaišana (lokāli)

```bash
# Datubāze
mysql -u root -p trio_serv < database/schema.mysql.sql

# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001/api/v1

## Dokumentācija

- [Tehniskā specifikācija](docs/TECHNICAL_SPEC.md)
- [API endpoints](docs/API.md)
- [UI/UX mobilajām ierīcēm](docs/UI_UX_MOBILE.md)
- [AI stratēģija](docs/AI_STRATEGY.md)
- [cPanel deployment](docs/DEPLOYMENT_CPANEL.md)

## cPanel izvietošana

Skatīt [docs/AUTO_DEPLOY.md](docs/AUTO_DEPLOY.md) — `git push` + cPanel Deploy (bez roku kopēšanas).

## Testi

```bash
cd backend && npm test
cd frontend && npm test
```

## Tehnoloģijas

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite PWA
- **Backend:** Node.js, Express, TypeScript, Zod
- **DB:** MySQL/MariaDB (cPanel) vai PostgreSQL
- **AI:** OpenAI GPT-4o-mini, Web Speech API

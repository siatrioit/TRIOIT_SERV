# TRIO-SERV — Tehniskā specifikācija

## 1. Sistēmas arhitektūra

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILIE PĀRLŪKI (PWA)                     │
│  React + TypeScript + Tailwind + Service Worker (offline)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST API
┌──────────────────────────▼──────────────────────────────────┐
│              Node.js + Express API (api.domain.lv)           │
│  JWT Auth │ Rate Limit │ Validation (Zod) │ File Upload       │
└──────┬───────────────┬──────────────────┬───────────────────┘
       │               │                  │
┌──────▼──────┐ ┌──────▼──────┐    ┌───────▼────────┐
│ MySQL/MariaDB│ │ OpenAI API  │    │ Google/Azure   │
│ (cPanel DB)  │ │ (NLP/LLM)   │    │ Speech-to-Text │
└─────────────┘ └─────────────┘    └────────────────┘
```

### cPanel izvietošanas modelis

| Komponents | Kur hostēt | Piezīmes |
|------------|-----------|----------|
| Frontend (PWA) | `public_html/` vai apakšdomēns | Statiski `dist/` faili |
| Backend API | Node.js Selector (cPanel) vai VPS | Port 3001, reverse proxy |
| Datubāze | cPanel MySQL | `schema.mysql.sql` |
| Faili | `public_html/uploads/` vai S3 | Līgumu/rēķinu PDF |

## 2. Datu plūsmas

### Atgadījuma reģistrācija (balss)

```
Mikrofons → Web Speech API → Transkripts
    → POST /ai/voice-to-incident
    → OpenAI ekstrakcija (klients, SN, prioritāte)
    → DB lookup (clients, units)
    → Lietotāja apstiprinājums (ja confidence < 0.7)
    → POST /ai/confirm-incident → incidents tabula
```

### Rēķina automātiska izveide

```
Atgadījums (completed) → incident_services
    → POST /invoices/from-incident/:id
    → invoice + invoice_items
    → PDF ģenerēšana (nākotnē)
    → Status: draft → issued → sent → paid
```

### Entītiju relācijas

```
users
  └── clients
        ├── contracts
        │     └── units
        ├── units
        ├── incidents
        │     ├── incident_services → services
        │     └── invoices
        └── invoices
```

## 3. Drošība un privātums

### Autentifikācija
- JWT ar 24h derīgumu
- Lomas: `admin`, `manager`, `technician`, `viewer`
- Paroles: bcrypt (cost 12)

### API drošība
- Helmet.js (HTTP headers)
- Rate limiting: 200 req/15min
- CORS: tikai atļautie domēni
- Input validācija: Zod schemas
- SQL injection aizsardzība: parametrizēti vaicājumi

### Privātums (GDPR)
- Klientu personas dati šifrēti transportā (HTTPS)
- Audit log visām izmaiņām
- Datu eksports pēc pieprasījuma
- Soft delete klientiem (`is_active = 0`)
- AI transkripti glabājas tikai ar lietotāja piekrišanu

### Failu drošība
- Upload validācija (MIME type, size limit)
- Faili ārpus `public_html` vai ar signed URLs

## 4. Tehnoloģiju stack

| Slānis | Tehnoloģija |
|--------|-------------|
| Frontend | React 18, TypeScript, Tailwind, Vite PWA |
| Backend | Node.js 18+, Express, TypeScript |
| DB | MySQL/MariaDB (cPanel) vai PostgreSQL |
| AI | OpenAI GPT-4o-mini, Web Speech API |
| Kartes | Leaflet + OpenStreetMap |
| Testi | Vitest |

## 5. Nefunkcionālās prasības

- Mobilā-first: min 48px touch targets
- Offline: PWA cache kritiskajiem API
- Atbildes laiks: < 500ms API (bez AI)
- Pieejamība: 99.5% uptime mērķis

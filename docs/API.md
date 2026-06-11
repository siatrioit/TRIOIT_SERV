# TRIO-SERV API Dokumentācija

Base URL: `https://api.yourdomain.lv/api/v1`

Autentifikācija: `Authorization: Bearer <JWT_TOKEN>`

---

## Auth

### POST /auth/login

```json
// Request
{
  "email": "tech@example.lv",
  "password": "securePassword123"
}

// Response 200
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "tech@example.lv",
      "full_name": "Jānis Bērziņš",
      "role": "technician"
    }
  }
}
```

### GET /auth/me

```json
// Response 200
{
  "data": {
    "id": "uuid",
    "email": "tech@example.lv",
    "full_name": "Jānis Bērziņš",
    "role": "technician",
    "phone": "+37120000000"
  }
}
```

---

## Clients

### GET /clients

Query params: `page`, `limit`, `search`, `city`

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "SIA Rīgas Veikals",
      "client_type": "company",
      "address": "Brīvības iela 1",
      "city": "Rīga",
      "latitude": 56.9496,
      "longitude": 24.1052,
      "phone": "+37120000001",
      "email": "info@rigasveikals.lv",
      "representative": "Pēteris Kalniņš",
      "is_active": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

### POST /clients

```json
// Request
{
  "name": "SIA Jauns Klients",
  "client_type": "company",
  "address": "Daugavpils iela 10",
  "city": "Rīga",
  "phone": "+37120000002",
  "email": "kontakts@jaunsklients.lv",
  "latitude": 56.95,
  "longitude": 24.11
}

// Response 201
{ "data": { "id": "uuid", "name": "SIA Jauns Klients", ... } }
```

### GET /clients/:id
### PUT /clients/:id
### DELETE /clients/:id (soft delete)

---

## Contracts

### GET /contracts?client_id=uuid&status=active

### POST /contracts

```json
{
  "client_id": "uuid",
  "contract_number": "LIG-2026-001",
  "title": "IT apkopes līgums",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "status": "active",
  "monthly_fee": 150.00,
  "terms": "Iekļauta 4h reakcija"
}
```

---

## Units

### GET /units?client_id=uuid&serial_number=POS

### POST /units

```json
{
  "client_id": "uuid",
  "contract_id": "uuid",
  "unit_type": "pos",
  "serial_number": "POS-2024-00123",
  "model": "Verifone V240m",
  "manufacturer": "Verifone",
  "status": "active"
}
```

---

## Incidents

### GET /incidents?status=pending&priority=high&city=Rīga

### POST /incidents

```json
{
  "client_id": "uuid",
  "unit_id": "uuid",
  "title": "POS nedarbojas",
  "description": "Ekrāns melns pēc strāvas padeves",
  "priority": "high",
  "reported_by": "Pēteris Kalniņš",
  "reported_via": "phone"
}
```

### PATCH /incidents/:id/status

```json
{
  "status": "completed",
  "resolution": "Nomainīts barošanas bloks. POS darbojas."
}
```

---

## Services

### GET /services?coverage_type=contract

### POST /services

```json
{
  "code": "SRV-006",
  "name": "Printera tīrīšana",
  "coverage_type": "extra",
  "base_price": 25.00,
  "transport_price": 20.00
}
```

---

## Invoices

### GET /invoices?status=overdue&client_id=uuid

### POST /invoices

```json
{
  "client_id": "uuid",
  "incident_id": "uuid",
  "issue_date": "2026-06-11",
  "due_date": "2026-06-25",
  "tax_rate": 21,
  "items": [
    {
      "service_id": "uuid",
      "description": "Remonts uz vietas",
      "quantity": 1,
      "unit_price": 45.00,
      "transport_cost": 25.00
    }
  ]
}
```

### POST /invoices/from-incident/:incidentId

Automātiski izveido rēķinu no atgadījuma pakalpojumiem.

### PATCH /invoices/:id/status

```json
{ "status": "sent" }
```

---

## AI

### POST /ai/voice-to-incident

```json
// Request
{
  "transcript": "SIA Rīgas Veikals, POS aparāts sērijas numurs POS-2024-00123 nedarbojas, ekrāns melns, steidzami"
}

// Response 200
{
  "data": {
    "extraction": {
      "client_name": "SIA Rīgas Veikals",
      "client_id": "uuid",
      "serial_number": "POS-2024-00123",
      "unit_id": "uuid",
      "title": "POS ekrāns melns",
      "description": "POS aparāts nedarbojas, ekrāns melns pēc ieslēgšanas",
      "priority": "high",
      "services": [{ "name": "Remonts uz vietas", "coverage_type": "extra" }],
      "confidence": 0.89
    },
    "needs_review": false,
    "suggested_incident": { ... }
  }
}
```

### POST /ai/confirm-incident

```json
{
  "client_id": "uuid",
  "unit_id": "uuid",
  "title": "POS ekrāns melns",
  "description": "...",
  "priority": "high",
  "voice_transcript": "...",
  "ai_confidence": 0.89,
  "corrections": [
    {
      "field_name": "priority",
      "ai_value": "medium",
      "corrected_value": "high"
    }
  ]
}
```

### POST /ai/query

```json
// Request
{ "query": "Parādi visi gaidošie atgadījumi Rīgā" }

// Response
{
  "data": {
    "answer": "Atrasti 3 gaidošie atgadījumi pilsētā Rīgā.",
    "data": [ ... ]
  }
}
```

### POST /ai/transcribe

`multipart/form-data` ar `audio` failu (webm/wav).

---

## Kļūdu formāts

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

HTTP kodi: `400` validācija, `401` auth, `403` forbidden, `404` not found, `500` server error.

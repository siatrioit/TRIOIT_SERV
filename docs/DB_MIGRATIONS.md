# Datubāzes migrācijas (bez phpMyAdmin katru reizi)

## Kā tas strādā

Jaunas tabulas/kolonnas liekam failā `database/migrations/` (piem. `002_client_objects.sql`).

Pēc deploy programma **pati** palaiž migrācijas, ja ieslēgts `AUTO_MIGRATE=true`.

Izsekošana: tabula `schema_migrations` — katrs fails tiek palaists **tikai vienu reizi**.

---

## Ērtākais ceļš (cPanel)

### Vienreiz — pilnā shēma

Ja datubāze vēl tukša, **vienreiz** phpMyAdmin → Import → `database/schema.mysql.sql`.

### Tālāk — automātiski

**Setup Node.js App** → Environment variables → pievieno:

```env
AUTO_MIGRATE=true
```

Pēc katra **Deploy** + **Restart** jaunās migrācijas uzliekas pašas.

---

## Alternatīva — viena komanda

cPanel → **Setup Node.js App** → **Run NPM Script** → `db:migrate` → Run.

(Vajag, lai `database/migrations` ir uz servera — nāk kopā ar Deploy.)

---

## Lokāli (izstrāde)

```bash
cd backend
# .env ar DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
npm run build
npm run db:migrate
```

---

## Jauna migrācija (izstrādātājam)

1. Izveido `database/migrations/003_apraksts.sql`
2. `git push` → Deploy → Restart (ar `AUTO_MIGRATE=true`)

**Nav** jākopē SQL phpMyAdmin, ja migrācijas automātiskas.

---

## phpMyAdmin vajag tikai

| Kad | Ko |
|-----|-----|
| Pirmā reize | Import `schema.mysql.sql` |
| Admin lietotājs | `seed-admin.sql` (vienreiz) |
| Avārijas gadījumā | ja `AUTO_MIGRATE` izslēgts un migrācija jāpalaiž ar roku |

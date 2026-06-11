# Ko darīt tālāk — serv.trioit.lv gatavs

## Īsā secība

```
1. MySQL DB + schema          (cPanel, 10 min)
2. Git → GitHub               (lokāli, 5 min)
3. Git clone cPanel           (cPanel, 5 min)
4. Node.js App konfigurācija  (cPanel, 10 min)
5. Deploy HEAD + Restart      (cPanel, 5 min)
6. SSL + pārbaude             (cPanel, 2 min)
```

---

## Tagad — soli pa solim

### ✅ 1. Subdomain `serv.trioit.lv` — GATAVS

### ⬜ 2. MySQL (cPanel)

1. **MySQL Databases** → izveido DB + lietotāju
2. **phpMyAdmin** → Import `database/schema.mysql.sql`
3. Admin lietotājs — pēc deploy (skat. `database/seed-admin.sql`)

### ⬜ 3. Git lokāli

```powershell
cd d:\Dev\projects\TRIO-SERV
git init
git add .
git commit -m "Initial TRIO-SERV setup"
```

Izveido repo GitHub → `git push`

Detalizēti: [GIT_CPANEL.md](GIT_CPANEL.md)

### ⬜ 4. cPanel Git

**Git Version Control** → Clone uz `/home/TAVSUSER/serv.trioit.lv`

### ⬜ 5. Node.js App

- Root: `serv.trioit.lv/backend`
- URL: `serv.trioit.lv`
- Startup: `dist/index.js`
- `.env` mainīgie (DB, JWT)

### ⬜ 6. Deploy

Git → **Deploy HEAD Commit** → Node.js → **Restart**

### ⬜ 7. Test

https://serv.trioit.lv/health

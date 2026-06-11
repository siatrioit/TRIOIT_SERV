# Git + cPanel — soli pa solim

## Kopējā shēma

```
Tavs PC (Cursor)  →  GitHub/GitLab  →  cPanel Git  →  serv.trioit.lv
```

---

## DAĻA A — Lokāli (vienreiz)

### 1. Git inicializācija

```powershell
cd d:\Dev\projects\TRIO-SERV
git init
git add .
git commit -m "Initial TRIO-SERV setup"
```

### 2. GitHub repozitorijs

Repozitorijs: **https://github.com/siatrioit/TRIOIT_SERV**

```powershell
git remote add origin https://github.com/siatrioit/TRIOIT_SERV.git
git branch -M main
git push -u origin main
```

---

## DAĻA B — cPanel (vienreiz)

### 1. MySQL datubāze

1. cPanel → **MySQL Databases**
2. DB: `trio_serv` + lietotājs ar pilnām tiesībām
3. **phpMyAdmin** → Import `database/schema.mysql.sql`

4. Admin lietotājs (pēc pirmā deploy):
   ```bash
   cd ~/serv.trioit.lv/repo/backend
   node scripts/hash-password.js "TavaJaunaParole"
   ```
   Rezultātu ievieto phpMyAdmin → `users` tabula (skat. `database/seed-admin.sql`)

### 2. Git Version Control

> **Svarīgi:** NEklonē tieši uz `serv.trioit.lv` sakni — tur jau ir `public_html`.
> Izmanto apakšmapi: **`serv.trioit.lv/repo`**

1. cPanel → **Git Version Control** → **Create**
2. **Clone a Repository**:

| Lauks | Vērtība |
|-------|---------|
| Clone URL | `https://github.com/siatrioit/TRIOIT_SERV.git` |
| Repository Path | `serv.trioit.lv/repo` |

> Pilns ceļš: `/home/tavsuser/serv.trioit.lv/repo`

3. Ja privāts repo — **SSH Key** vai **Access Token**:
   - Git Version Control → Manage → **SSH Keys** → ģenerē atslēgu
   - Publisko daļu pievieno GitHub → Settings → Deploy keys

4. Pēc klona → **Update from Remote** (vai automātiski pēc create)

### 3. Labo `.cpanel.yml`

`.cpanel.yml` failā aizvieto `TAVSUSER` ar cPanel lietotājvārdu:

```yaml
- export DEPLOYPATH=/home/tavsuser/serv.trioit.lv/repo
```

Commit + push, vai labo tieši serverī pēc klona.

### 4. Setup Node.js App

**Software → Setup Node.js App → Create Application**

| Lauks | Vērtība |
|-------|---------|
| Node.js version | 18.x vai 20.x |
| Application root | `serv.trioit.lv/repo/backend` |
| Application URL | `serv.trioit.lv` |
| Application startup file | `dist/index.js` |

> `serv.trioit.lv/public_html` mapē esošie faili netiek lietoti — Node.js apkalpo visu subdomain.

**Environment variables** (pievieno panelī):

```env
NODE_ENV=production
API_PREFIX=/api/v1
STATIC_DIR=./public
DB_TYPE=mysql
DB_HOST=localhost
DB_NAME=tavsuser_trio_serv
DB_USER=tavsuser_trio
DB_PASSWORD=***
JWT_SECRET=garš-nejaušs-virkne
CORS_ORIGIN=https://serv.trioit.lv
```

### 5. Pirmais deploy

1. Git Version Control → repo `serv.trioit.lv/repo`
2. Noklikšķini **Deploy HEAD Commit**
3. Skaties deploy log — jāizpildās `scripts/deploy-cpanel.sh`
4. **Setup Node.js App** → **Run NPM Install** → **Restart**

### 6. SSL

cPanel → **SSL/TLS Status** → AutoSSL `serv.trioit.lv`

### 7. Pārbaude

- https://serv.trioit.lv — login lapa
- https://serv.trioit.lv/health — `{"status":"ok"}`
- Login ar admin lietotāju, ko izveidoji phpMyAdmin

---

## DAĻA C — Ikdienas darbs

```powershell
# Lokāli — izmaiņas
git add .
git commit -m "Apraksts"
git push
```

cPanel → **Git Version Control** → **Pull or Deploy** → **Update from Remote** → **Deploy HEAD Commit**

→ **Setup Node.js App** → **Restart** (ja deploy nerestartē automātiski)

---

## Automātisks deploy (opcija)

cPanel → Git repo → **Pull Deployment** — ieslēdz, lai push uz `main` automātiski deploy.

---

## Biežās kļūdas

| Problēma | Risinājums |
|----------|------------|
| Clone failed | Pārbaudi GitHub URL / deploy key / token |
| Deploy failed — npm not found | Labo ceļu `scripts/deploy-cpanel.sh` nodevenv aktivizācijai |
| 502 pēc deploy | Run NPM Install + Restart Node.js app |
| `.cpanel.yml` DEPLOYPATH nepareizs | Jābūt `/home/user/serv.trioit.lv/repo` |
| Clone — mapē jau ir faili | Izmanto apakšmapi `serv.trioit.lv/repo`, ne sakni |

# Automātisks deploy (bez roku kopēšanas)

## Plūsma

```
PC: git push
  → GitHub Actions uzbūvē un commito repo/web/
  → cPanel: Update from Remote (vai automātiski)
  → Deploy HEAD (.cpanel.yml kopē web/ → backend/)
  → Passenger restart (tmp/restart.txt)
```

Tu **nekopē** failus ar roku. Vienīgais manuālais solis pēc push (ja nav Pull Deployment):
**Update from Remote** → **Deploy HEAD** → gatavs.

---

## Vienreizēja iestatīšana (cPanel)

### 1. Git → ieslēdz Pull Deployment

**Git Version Control** → repo `serv.trioit.lv/repo` → **Manage**

Ieslēdz:
- **Pull Deployment** (automātiski velk no GitHub, kad ir izmaiņas)

Ja hosting piedāvā **Webhook** — pievieno GitHub repo → Settings → Webhooks (URL no cPanel).

### 2. Node.js — startup file

| Lauks | Vērtība |
|-------|---------|
| Application root | `serv.trioit.lv/backend` |
| Startup file | **`server.js`** |

### 3. `.cpanel.yml` serverī

Jābūt identiskam GitHub versijai. **Nerediģē serverī** — tikai `git pull`.

Pārbaudi: `repo/.cpanel.yml` satur `DEPLOYPATH=/home2/trioitlv/serv.trioit.lv`

---

## Ikdiena (tikai 1 komanda)

```powershell
cd d:\Dev\projects\TRIO-SERV
git add .
git commit -m "Apraksts"
git push
```

Tālāk automātiski (ar Pull Deployment) vai manuāli:
1. Pagaidi, kamēr [GitHub Actions](https://github.com/siatrioit/TRIOIT_SERV/actions) ir **zaļš** ✅
2. **Update from Remote** — jāredz jauns commits `chore: update web/ build...`
3. **Deploy HEAD Commit** — izvēlies **šo** web/ commit, ne tikai avota kodu

> **Svarīgi:** cPanel Deploy kopē mapi `repo/web/`. Ja Actions **sarkans**, `web/` nav atjaunināts un lapa paliek vecā — pat ja Deploy izdevās.

Pagaidi ~2–3 min pēc push.

Pārbaude: https://serv.trioit.lv/health — jārāda `"version": "0.1.0"` (kad backend atjaunināts)

---

## Kā zināt, ka Deploy izdevās

| Pārbaude | OK |
|----------|-----|
| Git → Last Deployment | ir datums, ne "Not available" |
| `backend/dist/index.js` | sākas ar `express`, ne `http` |
| `/health` | `{"status":"ok"}` |

---

## Deploy poga pelēka / "The system cannot deploy"

cPanel prasa **abas**:
1. derīgs `repo/.cpanel.yml`
2. **nav** necommitotu izmaiņu serverī

### Solis A — Update from Remote

Vispirms spied **Update from Remote** (zila poga). Tikai pēc tam **Deploy HEAD Commit**.

### Solis B — notīrīt necommitotās izmaiņas (bez Terminal)

Biežākais iemesls: agrāk labots `.cpanel.yml` vai citi faili **File Manager** (serverī, ne GitHub).

**File Manager** → `serv.trioit.lv/repo` → ieslēdz **Show Hidden Files**:

1. Atver `.cpanel.yml` — saturam jāsakrīt ar [GitHub versiju](https://github.com/siatrioit/TRIOIT_SERV/blob/main/.cpanel.yml)
2. Ja redzēsi arī `.cpanel.yml` ar paplašinājumu `.orig`, `.bak` — **dzēs** tos
3. Atgriezies Git → **Update from Remote** → pārbaudi, vai **Deploy** kļūst aktīva

### Solis C — tīrs re-clone (drošākais)

Ja Deploy joprojām pelēks:

1. **Git Version Control** → repo → **Delete** (noņem tikai Git saiti)
2. **File Manager** → dzēs mapi `serv.trioit.lv/repo` pilnībā
3. **Git Version Control** → **Create** → Clone:
   - URL: `https://github.com/siatrioit/TRIOIT_SERV.git`
   - Path: `serv.trioit.lv/repo`
4. **Deploy HEAD Commit** — uz tīša klona parasti uzreiz strādā

---

## Citi iemesli

1. GitHub Actions sarkans → `web/` netiek atjaunināts
2. Nav **Update from Remote** pirms Deploy
3. Hosting bloķē `.cpanel.yml` → jautā atbalstam

---

## Ko NEKAD nedzīt ar roku

- `backend/dist/` kopēšana no `repo/web/` — to dara Deploy
- `backend/public/` kopēšana — to dara Deploy

Roku vajag tikai, ja Deploy logs rāda kļūdu.

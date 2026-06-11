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
1. **Update from Remote**
2. **Deploy HEAD Commit**

Pagaidi ~2–3 min pēc push (GitHub Actions jāuzbūvē `web/`).

Pārbaudi: https://github.com/siatrioit/TRIOIT_SERV/actions — zaļš ✅

---

## Kā zināt, ka Deploy izdevās

| Pārbaude | OK |
|----------|-----|
| Git → Last Deployment | ir datums, ne "Not available" |
| `backend/dist/index.js` | sākas ar `express`, ne `http` |
| `/health` | `{"status":"ok"}` |

---

## Ja Deploy atkal nestrādā

1. GitHub Actions sarkans → `web/` netiek atjaunināts
2. Nav **Update from Remote** pirms Deploy
3. `.cpanel.yml` konflikts serverī → `git reset --hard origin/main` (cPanel Terminal) vai dzēs `.cpanel.yml` un pull
4. Hosting bloķē `.cpanel.yml` → jautā atbalstam

---

## Ko NEKAD nedzīt ar roku

- `backend/dist/` kopēšana no `repo/web/` — to dara Deploy
- `backend/public/` kopēšana — to dara Deploy

Roku vajag tikai, ja Deploy logs rāda kļūdu.

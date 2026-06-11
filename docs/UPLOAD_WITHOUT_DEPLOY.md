# Augšupielāde bez Git Deploy (ja cPanel Deploy nestrādā)

Ja **Deploy HEAD Commit** rāda "Last Deployment: Not available" — tas hostingā bieži nozīmē, ka `.cpanel.yml` deploy netiek palaists. **Tas nav tava kļūda.**

Izmanto šo metodi — vienmēr strādā.

---

## Metode A — GitHub Actions (bez Node.js uz PC)

### 1. Palaid build GitHub
1. Atver https://github.com/siatrioit/TRIOIT_SERV/actions
2. Kreisajā pusē **Build for cPanel upload**
3. **Run workflow** → **Run workflow**

Pagaidi ~2–3 min, kamēr zaļš ✅.

### 2. Lejupielādē zip
1. Atver pabeigto workflow run
2. Lejupielādē **trioit-cpanel-upload** (zip fails)

### 3. Atpako un augšupielādē (cPanel File Manager)

Zip satur:
```
dist/
public/
package.json
package-lock.json
```

Augšupielādē **uz** `serv.trioit.lv/repo/backend/`:

| No zip | Uz serveri |
|--------|------------|
| `dist/` | `backend/dist/` |
| `public/` | `backend/public/` |
| `package.json` | `backend/package.json` |
| `package-lock.json` | `backend/package-lock.json` |

### 4. Node.js app
1. **Setup Node.js App** → **Run NPM Install**
2. **RESTART**

### 5. Pārbaude
- https://serv.trioit.lv/health
- https://serv.trioit.lv

---

## Metode B — Build uz sava PC

1. Instalē https://nodejs.org (LTS)
2. PowerShell:
   ```powershell
   cd d:\Dev\projects\TRIO-SERV
   .\scripts\build-for-cpanel.ps1
   ```
3. Augšupielādē `deploy\serv.trioit.lv\` saturu uz `backend/` (kā Metode A)

---

## Kad maini kodu nākotnē

```powershell
git push
```

→ GitHub Actions uzbūvē jaunu zip → lejupielādē → augšupielādē `dist/` + `public/` → **Restart**

Git **Deploy** cPanel nav vajadzīgs.

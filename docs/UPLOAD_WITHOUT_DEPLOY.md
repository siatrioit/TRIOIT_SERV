# cPanel izvietošana (kā klientiem.edgarsfoto.lv)

## Struktūra serverī

```
/home2/trioitlv/serv.trioit.lv/
├── repo/                 ← Git clone (TRIOIT_SERV)
│   └── web/              ← gatavs build (GitHub Actions)
│       ├── dist/
│       └── public/
└── backend/              ← DZĪVĀ vieta (Node.js app + Deploy kopē šeit)
    ├── dist/
    ├── public/
    └── package.json
```

## Node.js App (svarīgi!)

| Lauks | Vērtība |
|-------|---------|
| Application root | **`serv.trioit.lv/backend`** (NE repo/backend!) |
| Application URL | `serv.trioit.lv` |
| Startup file | `dist/index.js` |

---

## Ikdienas plūsma

1. `git push` no PC
2. GitHub Actions uzbūvē un commito `web/` mapē
3. cPanel → **Update from Remote**
4. **Deploy HEAD Commit** → kopē `repo/web/` → `backend/`
5. Node.js → **Run NPM Install** (ja mainījās package.json) → **Restart**

---

## Ja Deploy joprojām nestrādā

Lejupielādē zip no GitHub Actions → augšupielādē `dist/` + `public/` tieši uz `serv.trioit.lv/backend/`.

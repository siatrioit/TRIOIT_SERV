# web/ — gatavs build cPanel Deploy

Šo mapi aizpilda **GitHub Actions** pēc katra `main` push.

cPanel `.cpanel.yml` kopē:
- `web/dist/` → `serv.trioit.lv/backend/dist/`
- `web/public/` → `serv.trioit.lv/backend/public/`

Nelabo ar roku — maini `backend/` vai `frontend/` un push.

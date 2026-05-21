# Med Organizer Web

The current web app intentionally remains at the workspace root so the existing local URL still works:

```text
http://127.0.0.1:5173
```

Main web files:

- `index.html`
- `firebaseConfig.js`
- `src/app.js`
- `src/styles.css`
- `src/medications.json`
- `src/rxterms.js`

Run it from the workspace root:

```powershell
npm run web
```

If npm is not installed on the machine, this static app can still be served with:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

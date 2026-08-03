# ACQ Scuola Calcio v24 Cloud

Web app React + Vite collegata a Supabase.

## Pubblicazione nel repository esistente

Questa versione richiede una build GitHub Actions. Carica tutti i file del progetto nel repository `ACQ-Scuola-Calcio`.

1. Elimina o sostituisci il vecchio `index.html` statico.
2. Carica tutto il contenuto di questo pacchetto.
3. Vai su **Settings → Pages**.
4. In **Source**, seleziona **GitHub Actions**.
5. Dopo il commit, apri la scheda **Actions** e attendi il completamento del workflow.

## Uso locale

Richiede Node.js 20.19+ oppure 22.12+.

```bash
npm install
npm run dev
```

## Supabase

Il progetto è già configurato con il Project URL e la publishable key forniti. Non inserire mai una secret key nel codice.

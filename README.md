# ACQ Scuola Calcio v24 Cloud — Fase 2A

Release React/Vite collegata a Supabase e pronta per GitHub Pages.

## Novità Fase 2A

- backup JSON con Esporta/Importa;
- migrazione dati locali dalla v23 tramite pulsante `MIGRA V23` quando rilevati;
- undo/redo fino a 100 modifiche;
- `⌘Z` / `Ctrl+Z` e `⌘⇧Z` / `Ctrl+Shift+Z`;
- password `vittoriout` per operazioni sensibili;
- registro audit nell'archivio cloud;
- struttura dati normalizzata e compatibile con backup precedenti.

## Deploy

Sostituire nel repository i file con quelli di questo pacchetto e fare commit su `main`.
Il workflow `.github/workflows/deploy.yml` ricostruisce automaticamente GitHub Pages.

# ACQ Scuola Calcio v24 Cloud — Fase 1

Prima versione React/Vite operativa collegata a Supabase.

## Funzioni già presenti

- Login Supabase
- Sincronizzazione Realtime tra dispositivi
- Sessioni di allenamento
- Esercitazioni
- Libreria esercitazioni
- Filtri
- 30 partite per categoria
- Convocazioni con PNG
- Layout responsive
- Deploy GitHub Pages

## Pubblicazione

1. Carica tutti i file nella radice del repository `ACQ-Scuola-Calcio`.
2. Verifica che esista `.github/workflows/deploy.yml`.
3. In **Settings → Pages**, imposta **Source → GitHub Actions**.
4. Apri **Actions → Deploy GitHub Pages** e attendi la spunta verde.

## Supabase

La tabella `app_state`, le policy RLS, il Realtime e l'utente devono essere già configurati.

## Nota

Questa è la Fase 1. `PHASES.md` contiene le attività delle fasi successive.

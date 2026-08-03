# ACQ Scuola Calcio v24 Cloud · Fase 3B

## Novità

- registro modifiche permanente su tabella Supabase dedicata
- log immutabili: nessun utente può modificarli o eliminarli
- autore, email, ruolo, dispositivo, categoria e oggetto coinvolto
- tracciamento di creazioni, modifiche, eliminazioni, backup, undo/redo e accessi
- Centro Cronologia con ricerca e filtri
- filtri per operazione, categoria, utente e intervallo date
- riepilogo numerico delle operazioni
- esportazione CSV
- aggiornamento Realtime del registro
- Direttore e Coordinatore vedono tutti i log
- Allenatore e Collaboratore vedono soltanto i propri log

## Installazione

1. Aprire `supabase_phase3b.sql`.
2. Supabase → SQL Editor → New query.
3. Incollare tutto e premere Run.
4. Solo dopo il messaggio Success, caricare tutti i file su GitHub.
5. Attendere il deploy verde.
6. Fare logout e login.

Non eliminare `supabase_phase3a.sql`: resta utile per una nuova installazione completa.

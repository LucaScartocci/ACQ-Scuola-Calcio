# ACQ Scuola Calcio · Fase 6C

## Correzione prioritaria

Il Segretario viene ora riconosciuto correttamente anche quando il ruolo nel database contiene:

- `secretary`
- `SEGRETARIO`
- `segretario`
- spazi accidentali
- lettere maiuscole

Il Segretario carica esclusivamente la propria dashboard dedicata.

## Dashboard Segretario

Mostra soltanto:

- Tesserati
- Calendari partite
- Presenze
- Scadenze
- elenco delle sessioni con dati generali e presenze

Non mostra:

- creazione sessioni
- riunioni tecniche
- materiale didattico
- notifiche tecniche
- statistiche tecniche
- filtri esercitazioni
- archivio completo
- libreria esercitazioni
- valutazioni
- backup
- utenti

## Collaboratore rimosso

- eliminato dal menu Ruoli
- eventuali vecchi Collaboratori vengono convertiti in Allenatori
- i nuovi utenti hanno come ruolo predefinito Allenatore
- ruoli consentiti:
  - Direttore
  - Coordinatore
  - Allenatore
  - Segretario

## Installazione

1. Eseguire `supabase_phase6c.sql` in Supabase SQL Editor.
2. Attendere `Success`.
3. Caricare tutti i file su GitHub.
4. Attendere il deploy verde.
5. Fare logout e login con il Segretario.
6. Aggiornare forzatamente il browser o riaprire la PWA.

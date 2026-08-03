# ACQ Scuola Calcio · Fase 6A Area Segreteria

## Ruolo Segretario

Il Segretario ha una dashboard dedicata e non vede:
- esercitazioni
- libreria tecnica
- valutazioni
- backup
- utenti
- modifiche tecniche delle sedute

Vede:
- sessioni di allenamento di tutte le categorie
- numero presenti e gestione presenze
- calendari partite aggiornati dagli allenatori
- statistiche presenze individuali e per categoria

## Tre pulsanti dedicati

### Tesserati
- ricerca e filtro categoria
- documenti collegati al singolo tesserato
- Tesseramento
- Certificato medico
- Nulla osta
- Altro documento
- data di scadenza
- stato valido, in scadenza o scaduto
- apertura ed eliminazione file

### Calendari partite
- tutte le categorie
- data, ora, avversario e campo
- numero convocati
- aggiornamento automatico dai calendari degli allenatori

### Presenze
- classifica individuale
- percentuale
- minuti
- ultima presenza
- filtri ed esportazione CSV

## Installazione

1. Eseguire `supabase_phase6a.sql` in Supabase SQL Editor.
2. Attendere `Success`.
3. Caricare tutti i file su GitHub.
4. Attendere il deploy verde.
5. Creare l'utente in Authentication.
6. Dal pannello Utenti assegnare il ruolo `SEGRETARIO`.

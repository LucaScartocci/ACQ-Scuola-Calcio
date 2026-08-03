# ACQ Scuola Calcio v24 Cloud · Fase 5D

## Modifiche presenze

- in ogni sessione è possibile selezionare giocatori di qualsiasi categoria
- menu categoria preimpostato sulla categoria della seduta
- opzione Tutte le categorie
- ricerca per nome, cognome e categoria
- Seleziona visibili e Azzera visibili
- i giocatori già selezionati restano presenti anche cambiando filtro
- riepilogo completo dei giocatori selezionati
- categoria visibile accanto a ogni giocatore

## Modifiche PDF

- PDF ridotto a massimo 2 pagine
- pagina 1:
  - dati della seduta
  - obiettivo
  - numero presenti
  - elenco presenze diviso per categoria
  - riepilogo minuti ed esercitazioni
- pagina 2:
  - esercitazioni in formato compatto
  - immagine, titolo, fase, durata, giocatori, spazio e obiettivo
  - QR Code per ogni esercitazione
- massimo 6 esercitazioni mostrate nella seconda pagina
- eventuali esercitazioni aggiuntive vengono segnalate senza creare altre pagine

## Installazione

Non servono nuove query SQL.

1. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
2. Conservare `.github`.
3. Attendere il deploy verde.
4. Aggiornare forzatamente il browser o riaprire la PWA.
5. Aprire una sessione → `+ PRESENZE`.
6. Selezionare giocatori anche da categorie diverse.
7. Premere `APRI` per controllare il PDF di 2 pagine.

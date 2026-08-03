# ACQ Scuola Calcio v24 Cloud · Fase 2C

Questa release aggiunge il blocco **Partite e Convocazioni**.

## Novità

- 30 partite preimpostate per ogni categoria.
- Ordinamento automatico dalla gara più vicina alla più lontana.
- Nome avversario, data, orario e luogo modificabili.
- Logo avversario salvato su Supabase Storage e visibile su ogni dispositivo.
- Pulsante per eliminare il logo caricato.
- Pulsante Convocazione per ogni partita.
- Salvataggio condiviso di allenatore, ritrovo, luogo ritrovo, convocati e note.
- Esportazione PNG 1080×1350 con:
  - categoria dinamica;
  - stagione 2026/27 ben visibile;
  - loghi delle squadre;
  - data, ora, luogo e allenatore;
  - lista convocati in tre colonne.
- Pulsante Azzera per ripulire una singola partita.

## Aggiornamento

1. Eseguire prima il setup Storage della Fase 2B, se non è stato ancora fatto.
2. Caricare tutti i file di questo pacchetto nel repository GitHub, sovrascrivendo quelli esistenti.
3. Fare Commit changes.
4. Attendere il deploy verde nella scheda Actions.

Non sono necessarie nuove query SQL rispetto alla Fase 2B.

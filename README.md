# ACQ Scuola Calcio · Fase 6H

## Popup di sincronizzazione

- eliminato completamente il banner fisso in basso a destra
- eliminato sia dalla dashboard tecnica sia dall'Area Segreteria
- nessun movimento continuo tra “salvataggio” e “sincronizzato”
- restano soltanto messaggi temporanei per:
  - aggiornamento reale da un altro dispositivo
  - passaggio offline
  - connessione ripristinata
  - operazione salvata
  - errore

## Materiale didattico e riunioni tecniche

- upload del file nello Storage
- salvataggio immediato della scheda documento su Supabase
- conferma soltanto dopo entrambe le operazioni
- protezione contro versioni Realtime più vecchie
- pulizia automatica del file se il salvataggio archivio fallisce
- documenti eliminabili esclusivamente dal Direttore
- rimossa la password di eliminazione
- nessun limite di dimensione imposto dal codice del gestionale

Nota: restano inevitabilmente i limiti tecnici configurati nello Storage Supabase e quelli del browser/rete.

## Installazione

Non servono nuove query SQL.

1. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
2. Conservare `.github`.
3. Attendere il deploy verde.
4. Aggiornare con Command + Shift + R.
5. Su iPhone/iPad chiudere e riaprire la PWA.

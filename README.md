# ACQ Scuola Calcio v24 Cloud · Fase 2B

Aggiunge Supabase Storage per immagini e documenti, Riunioni tecniche e Materiale didattico.

## Operazione obbligatoria su Supabase
Apri `supabase_setup.sql`, copia **solo la sezione FASE 2B** oppure riesegui l’intero file nel SQL Editor. Lo script è idempotente.

## Aggiornamento GitHub
Carica tutti i file del pacchetto sovrascrivendo quelli esistenti. Il workflow GitHub Pages resta invariato.

## Funzioni
- immagini esercitazioni archiviate in Supabase Storage;
- file per riunioni tecniche e materiale didattico;
- ricerca, apertura, download ed eliminazione protetta;
- metadata sincronizzati in tempo reale nel database;
- limite bucket: 50 MB per file.

Nota: il bucket è pubblico in lettura per permettere la visualizzazione diretta delle immagini nel sito. Upload e cancellazione richiedono il login.

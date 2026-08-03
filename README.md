# ACQ Scuola Calcio v24 Cloud · Fase 2D

Questa release completa la Fase 2.

## Novità

- PWA installabile su iPad, iPhone, Android e computer
- manifest, icone e service worker
- apertura offline dell'app
- copia locale automatica dell'ultimo archivio cloud
- modifiche offline salvate localmente e inviate al ritorno della connessione
- filtri correlati tra allenatore, categoria, fase, stelle e ricerca
- filtro allenatore funzionante anche nella Libreria Esercitazioni
- pulsante Azzera filtri
- cronologia operazioni consultabile
- layout ottimizzato per iPad verticale/orizzontale e iPhone
- stati vuoti più chiari
- controllo automatico della vista Partite quando viene rimossa la categoria

## Aggiornamento

Caricare tutti i file sul repository GitHub sostituendo quelli esistenti.
Non servono nuove query SQL rispetto alla Fase 2B.

Dopo il deploy, su iPad/iPhone:
Safari → Condividi → Aggiungi alla schermata Home.

Nota offline: l'app può aprirsi e conservare modifiche temporanee senza rete. Immagini e documenti nuovi richiedono comunque una connessione per essere caricati su Supabase Storage.

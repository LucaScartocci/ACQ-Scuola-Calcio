# ACQ Scuola Calcio · Fase 6J Stability Hotfix

## Correzione definitiva documenti

I documenti di Riunioni tecniche e Materiale didattico non vengono più aggiunti
riscrivendo l'intero archivio dal browser.

La nuova funzione Supabase:

- blocca la riga dell'archivio durante l'operazione
- modifica soltanto la libreria interessata
- conserva le modifiche arrivate da altri dispositivi
- impedisce duplicati tramite ID documento
- restituisce l'archivio realmente salvato
- permette al sito di verificare la presenza del documento
- riprova automaticamente una volta in caso di errore
- crea audit e notifiche soltanto dopo la verifica positiva

L'eliminazione è atomica ed è consentita esclusivamente al Direttore.

## Altri bug corretti durante il controllo interno

- annullato un eventuale autosalvataggio vecchio prima dei salvataggi immediati
- `archiveRef` ora viene aggiornato anche durante il primo caricamento cloud
- corretta la gestione degli aggiornamenti Realtime realmente più recenti
- evitato che il callback Realtime mostri stati incoerenti
- aggiornato il riferimento locale dopo un autosalvataggio riuscito
- pulizia dei file Storage se la scheda non viene confermata dal database
- messaggi di errore più chiari quando manca la query SQL

## Installazione obbligatoria

1. Eseguire `supabase_phase6j.sql` nel SQL Editor di Supabase.
2. Attendere `Success`.
3. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
4. Attendere il deploy verde.
5. Aggiornare con Command + Shift + R oppure riaprire la PWA.
6. Provare a caricare un documento una sola volta e aggiornare la pagina.

## Verifica effettuata

È stato eseguito un controllo statico dei flussi di salvataggio, Realtime,
autosave, documenti e cache. La build completa locale non è stata eseguita
perché il registry disponibile nell'ambiente non contiene il pacchetto
`@supabase/supabase-js` nella versione del progetto.

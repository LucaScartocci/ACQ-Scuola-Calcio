# ACQ Scuola Calcio · Fase 6D Hotfix Segreteria

## Bug corretti

- le presenze del Segretario vengono ora salvate immediatamente su Supabase
- i documenti tesserato vengono confermati solo dopo il salvataggio reale del cloud
- anagrafica tesserati salvata immediatamente anche dal Segretario
- niente più falso messaggio di salvataggio
- le finestre restano aperte se Supabase restituisce un errore
- pulsanti con stato `SALVATAGGIO…`
- Cronologia e notifiche vengono scritte solo dopo il salvataggio dell’archivio
- uso dell’ultima versione dell’archivio per evitare sovrascritture Realtime

## Installazione

Non servono nuove query SQL se `supabase_phase6a.sql` e `supabase_phase6c.sql` sono già stati eseguiti.

1. Caricare tutti i file su GitHub.
2. Attendere il deploy verde.
3. Fare logout e login.
4. Registrare una presenza e ricaricare la pagina.
5. Caricare un certificato medico e ricaricare la pagina.

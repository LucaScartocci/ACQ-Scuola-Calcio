# ACQ Scuola Calcio v24 Cloud · Fase 5C

## Priorità corretta: creazione sessioni

- salvataggio della sessione immediato e atomico
- invio immediato a Supabase, senza attendere il timer generale
- Cronologia e Notifiche generate soltanto dopo il salvataggio effettivo
- blocco dei doppi clic sul pulsante Salva sessione
- pulsante `SALVATAGGIO…` durante l'operazione
- protezione dagli aggiornamenti Realtime più vecchi
- eliminato il doppio salvataggio automatico dopo un salvataggio immediato
- utilizzo dell'ultima versione reale dell'archivio tramite riferimento aggiornato
- dopo la creazione viene aperta automaticamente la categoria corretta
- filtri testuali azzerati per rendere immediatamente visibile la nuova sessione
- messaggio finale con la categoria effettivamente salvata

## Modifica grafica

- font dei filtri leggermente ridotto
- larghezze minime aumentate su desktop
- scritta `FASE ALLENAMENTO` leggibile per intero
- padding delle tendine ottimizzato

## Installazione

Non servono query SQL.

1. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
2. Conservare `.github`.
3. Attendere il deploy verde.
4. Aggiornare con Command + Shift + R.
5. Testare una nuova sessione scegliendo `PRIMI CALCI`.

# ACQ Scuola Calcio v24 Cloud · Fase 3A

## Novità

- profili utente collegati a Supabase Auth
- ruoli: Direttore Tecnico, Coordinatore, Allenatore, Collaboratore
- categorie assegnate a ogni utente
- allenatore associato al profilo
- account attivo o sospeso
- pannello Gestione utenti riservato al Direttore
- Collaboratore in sola lettura
- Allenatore limitato alle categorie assegnate e al proprio cognome
- eliminazioni consentite soltanto a Direttore e Coordinatore
- valutazioni consentite soltanto a Direttore e Coordinatore
- audit con nome, email e ruolo di chi effettua la modifica

## Installazione

1. Eseguire `supabase_phase3a.sql` in Supabase → SQL Editor.
2. Caricare tutti i file del progetto su GitHub sovrascrivendo quelli esistenti.
3. Attendere il deploy verde.
4. Accedere con `lucascartocci@gmail.com`: lo script assegna automaticamente il ruolo Direttore Tecnico.

Per aggiungere altri utenti:
Supabase → Authentication → Users → Add user.
Poi entra nel sito come Direttore → UTENTI e configura ruolo, categorie e allenatore associato.


## Ordine obbligatorio

1. Eseguire prima `supabase_phase3a.sql`.
2. Verificare che la query termini con `Success`.
3. Solo dopo caricare i file su GitHub.
4. Effettuare logout e login per ricaricare il nuovo profilo.

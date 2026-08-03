# ACQ Scuola Calcio v24 Cloud · Fase 4A PDF

## Novità

- pulsante `ESPORTA PDF` su ogni sessione di allenamento
- PDF A4 professionale multipagina
- copertina con logo, categoria, allenatore, data, durata e giocatori
- overview della seduta con obiettivo e distribuzione dei tempi
- materiale complessivo e dati operativi
- una pagina dedicata a ogni esercitazione
- immagine o schema senza deformazioni
- obiettivo, materiale, fase, durata, spazio, giocatori e descrizione
- valutazione in stelle
- QR Code per aprire direttamente l'esercitazione nel gestionale
- pagina conclusiva con riepilogo
- footer e numerazione automatica
- nome file automatico
- nuovi campi sessione: Campo/Luogo e Note dello staff
- nuovi campi esercitazione: Coaching Points e Varianti/Progressioni
- apertura diretta dell'esercitazione tramite link QR dopo il login
- correzione del collegamento alla Cronologia avanzata

## Installazione

Questa fase non richiede nuove query SQL.

1. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
2. Conservare la cartella `.github`.
3. Attendere il deploy verde.
4. Aggiornare forzatamente la pagina oppure chiudere e riaprire la PWA.
5. Aprire una sessione e premere `ESPORTA PDF`.

GitHub Actions installerà automaticamente le nuove dipendenze `jspdf` e `qrcode`.

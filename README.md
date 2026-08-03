# ACQ Scuola Calcio v24 Cloud · Fase 4B

## Modifiche applicate

- rimossi dalla barra principale:
  - Esporta
  - Importa
  - Migra V23
- Backup visibile esclusivamente al Direttore
- Utenti visibile esclusivamente al Direttore
- Coordinatori, Allenatori e Collaboratori non vedono i comandi amministrativi
- sostituito `ESPORTA PDF` con `APRI`
- `APRI` genera il PDF e mostra una vera anteprima
- dall'anteprima è possibile:
  - scaricare il PDF
  - aprirlo a tutto schermo
  - stamparlo o condividerlo tramite il visualizzatore del browser
- fallback ottimizzato per Safari su iPhone e iPad
- corretto il collegamento alla Cronologia avanzata
- barra principale più pulita

## Installazione

Non servono nuove query SQL.

1. Caricare tutti i file su GitHub sovrascrivendo quelli esistenti.
2. Conservare `.github`.
3. Attendere il deploy verde.
4. Aggiornare forzatamente il browser.
5. Su iPhone/iPad chiudere e riaprire la PWA.

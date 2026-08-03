# Fase 3B Fix

Corretto il crash `Cannot access before initialization`.

Causa: l’effetto che registrava l’accesso utilizzava `writeAuditLog` prima della dichiarazione della funzione.

La funzione viene ora inizializzata prima dell’effetto di login.

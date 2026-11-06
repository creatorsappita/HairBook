# HairBook Multi Parrucchiere - versione corretta completa

## Pubblicazione
1. Esegui `supabase/multi_hairdresser_complete.sql` in Supabase SQL Editor.
2. Sostituisci sul repository tutti i file con questa cartella completa.
3. Fai un unico commit e attendi Vercel Ready.

## Funzioni
- Foto operatore circolare 48 px (44 px mobile).
- Orari e assenze individuali.
- Scelta cliente: parrucchiere prima oppure data/ora prima.
- Opzione Qualsiasi disponibile.
- Agenda con nome operatore e filtro.
- Se non esistono operatori attivi, il flusso resta quello dell’agenda unica.

## Test minimo
- Configura orari diversi per due operatori.
- Prenota scegliendo il primo operatore.
- Prenota scegliendo prima data e ora e poi il secondo operatore.
- Verifica che due operatori possano avere appuntamenti contemporanei.
- Verifica che lo stesso operatore non possa essere prenotato due volte nello stesso intervallo.

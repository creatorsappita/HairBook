# Email di conferma con file calendario ICS

## File inclusi

- `app/prenota/page.js`: dopo la prenotazione chiama la rotta email autenticata.
- `app/api/email/booking-confirmation/route.js`: verifica il cliente, legge la prenotazione e invia l'email tramite Brevo.
- `lib/ics.js`: genera il file `appuntamento-hairbook.ics` senza dipendenze aggiuntive.
- `lib/booking-email.js`: template HTML responsive della conferma.
- `.env.example`: elenco delle variabili richieste.

## Variabili Vercel

Aggiungere in **Vercel > Project > Settings > Environment Variables**:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL` (mittente verificato in Brevo)
- `BREVO_SENDER_NAME`
- `HAIRBOOK_REPLY_TO`
- `HAIRBOOK_SALON_NAME`
- `HAIRBOOK_SALON_ADDRESS`
- `NEXT_PUBLIC_SITE_URL=https://hairbookita.vercel.app`

Le variabili Supabase già presenti non vanno cambiate.

## Pubblicazione

1. Copiare i file nel repository mantenendo i percorsi.
2. Fare commit e push su GitHub.
3. Controllare le variabili su Vercel.
4. Eseguire un nuovo deploy.
5. Creare una prenotazione di prova.

L'email contiene il riepilogo, il pulsante per l'area cliente e l'allegato ICS compatibile con Google Calendar, Calendario Apple e Microsoft Outlook.

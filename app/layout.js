import "./globals.css";

export const metadata = {
  title: "HairBook | Prenotazioni per parrucchieri",
  description:
    "Prenota online taglio, barba e trattamenti nel tuo salone di fiducia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

export const metadata = {
  title: "HairBook",
  description: "Gestionale parrucchieri",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

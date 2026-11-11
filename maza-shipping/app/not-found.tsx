import "./globals.css";

// Fallback for URLs outside a locale segment.
export default function GlobalNotFound() {
  return (
    <html lang="nl">
      <body className="grid min-h-screen place-items-center bg-navy p-8 text-center text-white">
        <div>
          <p className="font-heading text-7xl font-extrabold">404</p>
          <p className="mt-4 text-white/70">Pagina niet gevonden · Page not found · Seite nicht gefunden</p>
          <a href="/nl" className="btn-signal mt-8">Maza Shipping</a>
        </div>
      </body>
    </html>
  );
}

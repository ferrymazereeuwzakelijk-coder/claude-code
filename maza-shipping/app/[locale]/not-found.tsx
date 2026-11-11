import Link from "next/link";

// Rendered inside the locale layout. (Locale is not available here, so the text is multilingual.)
export default function NotFound() {
  return (
    <section className="grid min-h-[80svh] place-items-center bg-navy px-6 pt-24 text-center text-white">
      <div>
        <p className="font-heading text-8xl font-extrabold text-white/90">404</p>
        <h1 className="mt-4 text-2xl font-bold">Pagina niet gevonden · Page not found · Seite nicht gefunden</h1>
        <p className="mt-3 text-white/60">Deze pagina is uit koers geraakt.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/nl" className="btn-signal">Home (NL)</Link>
          <Link href="/en" className="btn-ghost-light">Home (EN)</Link>
          <Link href="/de" className="btn-ghost-light">Start (DE)</Link>
        </div>
      </div>
    </section>
  );
}

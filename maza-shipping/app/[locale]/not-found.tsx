import Link from "next/link";

// Rendered inside the locale layout. (Locale is not available here, so the text is bilingual.)
export default function NotFound() {
  return (
    <section className="grid min-h-[80svh] place-items-center bg-navy px-6 pt-24 text-center text-white">
      <div>
        <p className="font-heading text-8xl font-extrabold text-white/90">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found · Pagina niet gevonden</h1>
        <p className="mt-3 text-white/60">This page has drifted off course.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/en" className="btn-signal">Home (EN)</Link>
          <Link href="/nl" className="btn-ghost-light">Home (NL)</Link>
        </div>
      </div>
    </section>
  );
}

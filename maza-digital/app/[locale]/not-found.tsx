import Link from "next/link";
import { getDictionary } from "@/content/dictionaries";
import { defaultLocale, href } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

// not-found receives no params; Dutch is the default language.
export default function NotFound() {
  const dict = getDictionary(defaultLocale);
  return (
    <section className="container-x flex min-h-[80vh] flex-col justify-center pt-32">
      <p className="font-display text-sm text-mist">404</p>
      <h1 className="type-section mt-4 max-w-3xl">{dict.notFound.title}</h1>
      <p className="type-lead mt-6">{dict.notFound.body}</p>
      <Button asChild className="mt-10 w-fit">
        <Link href={href(defaultLocale)}>{dict.notFound.home}</Link>
      </Button>
    </section>
  );
}

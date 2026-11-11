import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import { site, whatsappHref } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TrustList } from "@/components/ui/trust-list";

export function ClosingCta({
  locale,
  dict,
  trust,
}: {
  locale: Locale;
  dict: Dictionary["cta"];
  trust?: readonly string[];
}) {
  const wa = whatsappHref();
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden border-t border-line py-28 md:py-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="glow-blue absolute left-1/2 top-1/2 h-[80vh] w-[90vw] -translate-x-1/2 -translate-y-1/2" />
        <div className="glow-violet absolute left-[70%] top-[30%] h-[50vh] w-[50vw] -translate-x-1/2" />
      </div>
      <div className="container-x">
        <h2 id="cta-title" className="type-hero uppercase">
          <span className="block text-mist">{dict.title1}</span>
          <span className="block text-white">{dict.title2}</span>
        </h2>
        <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="type-lead max-w-md">{dict.body}</p>
            {trust && <TrustList items={trust} className="mt-6 max-w-md" />}
          </div>
          <div className="flex flex-col gap-4 md:items-end">
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href={href(locale, "/contact")}>{dict.button}</Link>
            </Button>
            {wa && (
              <Button asChild size="lg" variant="outline">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden />
                  {dict.whatsapp}
                </a>
              </Button>
            )}
          </div>
          <p className="text-sm text-mist">
            {dict.note}{" "}
            <a href={`mailto:${site.email}`} className="text-white underline underline-offset-4">
              {site.email}
            </a>
          </p>
          </div>
        </div>
      </div>
    </section>
  );
}

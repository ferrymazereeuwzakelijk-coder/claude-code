import Link from "next/link";
import type { Dictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { Portrait } from "./portrait";

export function AboutTeaser({ locale, dict }: { locale: Locale; dict: Dictionary["about"] }) {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 border-t border-line py-24 md:py-36">
      <div className="container-x grid gap-14 md:grid-cols-12 md:items-center">
        <div className="md:col-span-5">
          <Portrait name={site.founder} />
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <Reveal>
            <h2 id="about-title" className="type-section">
              {dict.title}
            </h2>
          </Reveal>
          <p className="type-lead mt-8">{dict.body1}</p>
          <p className="type-lead mt-5">{dict.body2}</p>
          <Button asChild variant="outline" className="mt-10">
            <Link href={href(locale, "/about")}>{dict.more}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

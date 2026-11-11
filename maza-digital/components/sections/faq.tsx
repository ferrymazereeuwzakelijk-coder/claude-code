import { Plus } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/reveal";

/** Answers the questions that stop people from getting in touch. Includes FAQPage structured data. */
export function Faq({ dict }: { dict: Dictionary["faq"] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: dict.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 border-t border-line py-24 md:py-36">
      <div className="container-x grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Reveal className="md:sticky md:top-32">
            <h2 id="faq-title" className="type-section">
              {dict.title}
            </h2>
            <p className="type-lead mt-6">
              {dict.intro}{" "}
              <a href={`mailto:${site.email}`} className="text-white underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </Reveal>
        </div>
        <div className="md:col-span-7">
          {dict.items.map((item) => (
            <details key={item.q} className="group border-t border-line first:border-t-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-lg font-semibold tracking-[-0.02em] text-white">
                {item.q}
                <Plus aria-hidden className="mt-1 size-5 shrink-0 text-mist transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="-mt-2 pb-6 leading-relaxed text-mist">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}

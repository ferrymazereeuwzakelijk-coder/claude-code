import type { Dictionary } from "@/content/dictionaries";
import { Reveal } from "@/components/motion/reveal";

export function Why({ dict }: { dict: Dictionary["why"] }) {
  return (
    <section aria-labelledby="why-title" className="border-t border-line py-24 md:py-36">
      <div className="container-x grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Reveal className="md:sticky md:top-32">
            <h2 id="why-title" className="type-section">
              {dict.title}
            </h2>
          </Reveal>
        </div>
        <ul className="md:col-span-7">
          {dict.items.map((item) => (
            <li key={item.title} className="grid gap-3 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10">
              <h3 className="text-xl font-semibold tracking-[-0.02em]">{item.title}</h3>
              <p className="leading-relaxed text-mist">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

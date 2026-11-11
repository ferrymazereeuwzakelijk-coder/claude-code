import { LuPlus } from "react-icons/lu";

type Props = { items: readonly { q: string; a: string }[] };

/** Native <details> accordion: accessible and works without JavaScript. */
export default function Faq({ items }: Props) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it) => (
        <details key={it.q} data-reveal className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-heading text-lg font-bold text-navy transition-colors hover:text-teal [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition-transform duration-300 group-open:rotate-45 group-open:border-teal group-open:bg-teal group-open:text-white">
              <LuPlus aria-hidden className="h-4 w-4" />
            </span>
          </summary>
          <p className="max-w-3xl pb-6 leading-relaxed text-slate">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

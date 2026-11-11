import type { SpecRow } from "@/content/site";

type Props = {
  rows: readonly SpecRow[];
  labels: Record<string, string>;
  typeValue: string;
  caption: string;
  note?: string;
};

/** Technical datasheet table. Values come from content/site.ts; labels from the dictionary. */
export default function SpecTable({ rows, labels, typeValue, caption, note }: Props) {
  return (
    <div data-reveal className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="group border-b border-line last:border-0 transition-colors hover:bg-mist">
              <th
                scope="row"
                className="w-1/2 py-4 pr-4 pl-5 align-top text-[0.8rem] font-semibold tracking-[0.08em] text-slate uppercase sm:pl-7"
              >
                <span className="mr-3 inline-block w-6 font-mono text-[0.7rem] text-teal/70 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {labels[r.key] ?? r.key}
              </th>
              <td className="py-4 pr-5 font-heading text-[1.02rem] font-bold text-navy tabular-nums sm:pr-7">
                {r.key === "type" ? typeValue : r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="border-t border-line bg-mist px-5 py-4 text-sm text-slate sm:px-7">{note}</p>}
    </div>
  );
}

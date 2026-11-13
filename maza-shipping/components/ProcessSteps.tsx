type Props = { steps: readonly { title: string; text: string }[] };

export default function ProcessSteps({ steps }: Props) {
  return (
    <ol className="relative grid gap-6 md:grid-cols-3 md:gap-0">
      <span aria-hidden className="absolute top-[2.15rem] right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-teal-light/0 via-teal-light/50 to-teal-light/0 md:block" />
      {steps.map((s, i) => (
        <li
          key={s.title}
          data-reveal
          style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}
          className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-7 md:mx-3 md:p-8"
        >
          <span className="relative grid h-11 w-11 place-items-center rounded-full bg-teal font-heading text-sm font-extrabold text-white ring-8 ring-navy">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-6 text-xl font-bold text-white">{s.title}</h3>
          <p className="mt-3 leading-relaxed text-white/65">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

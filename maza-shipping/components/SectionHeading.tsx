type Props = {
  label: string;
  title: string;
  intro?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
};

export default function SectionHeading({ label, title, intro, tone = "dark", align = "left", as: H = "h2", id }: Props) {
  const isDark = tone === "dark";
  return (
    <div data-reveal className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className={`eyebrow ${isDark ? "text-teal" : "text-teal-light"} ${align === "center" ? "justify-center" : ""}`}>{label}</p>
      <H id={id} className={`mt-5 text-[2rem] leading-[1.05] font-extrabold sm:text-[2.6rem] lg:text-[3.1rem] ${isDark ? "text-navy" : "text-white"}`}>
        {title}
      </H>
      {intro && <p className={`mt-6 text-lg leading-relaxed ${isDark ? "text-slate" : "text-white/70"}`}>{intro}</p>}
    </div>
  );
}

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
      <H id={id} className={`display mt-6 text-[2.2rem] sm:text-5xl lg:text-[2.8rem] xl:text-[3.2rem] ${isDark ? "text-navy" : "text-white"}`}>
        {title}
      </H>
      {intro && <p className={`mt-6 text-lg leading-relaxed ${isDark ? "text-slate" : "text-white/70"}`}>{intro}</p>}
    </div>
  );
}

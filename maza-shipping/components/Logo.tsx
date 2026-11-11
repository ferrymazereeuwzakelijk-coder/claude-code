type Props = { className?: string; tone?: "light" | "dark" };

/** Typographic wordmark. Replace with the official logo file once supplied (see README). */
export default function Logo({ className = "", tone = "light" }: Props) {
  const fg = tone === "light" ? "text-white" : "text-navy";
  return (
    <span className={`inline-flex items-center gap-3 ${fg} ${className}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 shrink-0">
        <rect x="1" y="1" width="38" height="38" rx="9" className="fill-teal" />
        <path d="M9 27V13l6.5 8L22 13v14" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 24.5c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5" fill="none" stroke="#F08A3E" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 19.5c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5" fill="none" stroke="white" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="font-heading leading-none">
        <span className="block text-[1.05rem] font-extrabold tracking-[0.14em]">MAZA</span>
        <span className="mt-1 block text-[0.62rem] font-semibold tracking-[0.42em] opacity-70">SHIPPING</span>
      </span>
    </span>
  );
}

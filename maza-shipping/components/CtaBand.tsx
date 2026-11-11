import Link from "next/link";
import { LuArrowRight, LuPhone } from "react-icons/lu";
import Photo from "./Photo";
import type { PhotoKey } from "@/content/site";
import { company } from "@/content/site";

type Props = {
  title: readonly string[];
  text: string;
  button: string;
  buttonHref: string;
  callLabel: string;
  photo?: PhotoKey;
  alt?: string;
};

export default function CtaBand({ title, text, button, buttonHref, callLabel, photo = "iceDusk", alt = "" }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 -z-10 opacity-35">
        <Photo name={photo} alt={alt} sizes="100vw" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy/90 to-teal/30" />
      <div className="container-x grid items-end gap-10 py-24 sm:py-32 lg:grid-cols-[1.4fr_1fr]">
        <h2 data-reveal className="display text-[2.6rem] sm:text-7xl lg:text-8xl">
          {title.map((l, i) => (
            <span key={l} className={`block ${i === title.length - 1 ? "text-teal-light" : ""}`}>
              {l}
            </span>
          ))}
        </h2>
        <div data-reveal style={{ ["--reveal-delay" as string]: "150ms" }}>
          <p className="text-lg leading-relaxed text-white/75">{text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={buttonHref} className="btn-signal">
              {button} <LuArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <a href={company.phoneHref} className="btn-ghost-light">
              <LuPhone aria-hidden className="h-4 w-4" /> {callLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

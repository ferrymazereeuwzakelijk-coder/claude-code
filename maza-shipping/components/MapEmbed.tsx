"use client";

import { useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { company } from "@/content/site";

type Props = { title: string; openLabel: string };

/** Click-to-load Google Map: no third-party request (or cookies) until the visitor asks for it. */
export default function MapEmbed({ title, openLabel }: Props) {
  const [load, setLoad] = useState(false);
  const q = encodeURIComponent(`${company.address.street}, ${company.address.postalCode} ${company.address.city}, Netherlands`);
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-marine sm:aspect-[21/9]">
      {load ? (
        <iframe
          title={title}
          src={`https://www.google.com/maps?q=${q}&z=14&output=embed`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoad(true)}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-signal text-navy shadow-xl transition-transform group-hover:scale-110">
            <LuMapPin aria-hidden className="h-7 w-7" />
          </span>
          <span className="font-heading text-lg font-bold">
            {company.address.street}, {company.address.city}
          </span>
          <span className="text-sm text-white/60 underline-offset-4 group-hover:underline">{openLabel}</span>
        </button>
      )}
    </div>
  );
}

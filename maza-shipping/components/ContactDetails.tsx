import { LuMail, LuMapPin, LuMessageCircle, LuPhone, LuArrowUpRight } from "react-icons/lu";
import { company } from "@/content/site";
import type { Dictionary } from "@/content/dictionaries";

type Props = { t: Dictionary["common"]; tone?: "light" | "dark" };

export default function ContactDetails({ t, tone = "dark" }: Props) {
  const dark = tone === "dark";
  const items = [
    { icon: LuPhone, label: t.phone, value: company.phoneDisplay, href: company.phoneHref },
    { icon: LuMail, label: t.email, value: company.email, href: `mailto:${company.email}` },
    ...(company.whatsapp
      ? [{ icon: LuMessageCircle, label: t.whatsapp, value: company.phoneDisplay, href: `https://wa.me/${company.whatsapp}`, external: true }]
      : []),
    {
      icon: LuMapPin,
      label: t.address,
      value: `${company.address.street}, ${company.address.postalCode} ${company.address.city}`,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company.address.street}, ${company.address.postalCode} ${company.address.city}`)}`,
      external: true,
    },
  ];
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ icon: Icon, label, value, href, ...rest }) => {
        const external = "external" in rest && rest.external;
        return (
          <li key={label}>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`group flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 sm:p-5 ${
                dark ? "border-line bg-white hover:border-teal hover:shadow-lg" : "border-white/10 bg-white/[0.04] hover:border-teal-light/60 hover:bg-white/[0.07]"
              }`}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${dark ? "bg-mist text-teal" : "bg-teal/20 text-teal-light"}`}>
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[0.7rem] font-semibold tracking-[0.16em] uppercase ${dark ? "text-slate" : "text-white/50"}`}>{label}</span>
                <span className={`mt-0.5 block font-heading [overflow-wrap:anywhere] text-[1.05rem] font-bold ${dark ? "text-navy" : "text-white"}`}>{value}</span>
              </span>
              <LuArrowUpRight aria-hidden className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${dark ? "text-slate/50" : "text-white/40"}`} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

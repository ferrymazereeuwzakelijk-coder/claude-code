import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { getDictionary } from "@/content/dictionaries";
import { site, whatsappHref } from "@/content/site";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { TrustList } from "@/components/ui/trust-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale).meta;
  return pageMetadata({ locale, path: "/contact", title: d.contactTitle, description: d.contactDescription });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const c = dict.contact;
  const wa = whatsappHref(locale === "nl" ? "Hoi Ferry, ik heb een projectidee:" : "Hi Ferry, I have a project idea:");

  return (
    <section className="relative isolate overflow-hidden pb-24 pt-40 md:pb-36 md:pt-52">
      <div aria-hidden className="glow-blue pointer-events-none absolute -right-[15%] -top-[20%] -z-10 h-[80vh] w-[60vw]" />
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:items-start">
        {/* Order on mobile: intro, form, then details. On desktop: details beside the form. */}
        <div className="lg:col-span-4 lg:row-start-1">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.05em]">{c.title}</h1>
          <p className="type-lead mt-8">{c.intro}</p>
          <TrustList items={dict.hero.trust} className="mt-6 flex-col" />
        </div>

        <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <EnquiryForm locale={locale} dict={dict.form} email={site.email} />
          <p className="mt-4 text-sm leading-relaxed text-mist">{c.attachmentsNote}</p>
        </div>

        <div className="lg:col-span-4 lg:row-start-2">
          <div className="border-t border-line pt-8">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{c.asideTitle}</h2>
            <ol className="mt-5 space-y-4">
              {c.asideSteps.map((s, i) => (
                <li key={s} className="flex gap-4 text-sm leading-relaxed text-fog">
                  <span className="font-display tabular-nums text-mist">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12 border-t border-line pt-8">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{c.directTitle}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href={`mailto:${site.email}`} className="inline-flex items-center gap-3 text-white underline-offset-4 hover:underline">
                  <Mail aria-hidden className="size-4 text-mist" />
                  {site.email}
                </a>
              </li>
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-white underline-offset-4 hover:underline">
                    <MessageCircle aria-hidden className="size-4 text-mist" />
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

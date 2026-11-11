import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/hero/hero";
import { Faq } from "@/components/sections/faq";
import { Problems } from "@/components/sections/problems";
import { AboutTeaser } from "@/components/sections/about-teaser";
import { ClosingCta } from "@/components/sections/cta";
import { Process } from "@/components/sections/process";
import { SelectedWork } from "@/components/sections/selected-work";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Why } from "@/components/sections/why";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    ...pageMetadata({ locale, path: "", title: dict.meta.homeTitle, description: dict.meta.homeDescription }),
    title: { absolute: `${site.brandName} | ${dict.meta.homeTitle}` },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict.hero} />
      <Problems locale={locale} dict={dict.problems} />
      <ServicesGrid locale={locale} dict={dict.services} />
      <SelectedWork locale={locale} dict={dict.work} />
      <Process dict={dict.process} />
      <AboutTeaser locale={locale} dict={dict.about} />
      <Why dict={dict.why} />
      <Faq dict={dict.faq} />
      <ClosingCta locale={locale} dict={dict.cta} trust={dict.hero.trust} />
    </>
  );
}

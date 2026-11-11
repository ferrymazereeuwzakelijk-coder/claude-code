/**
 * Central brand configuration.
 * Everything here can be changed without touching components.
 * Values marked TODO need confirmation before launch.
 */

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "MAZA DIGITAL";

export const site = {
  /** Switch to "MAZAMARKETING" via NEXT_PUBLIC_BRAND_NAME. */
  brandName,
  founder: "Ferry Mazereeuw",
  url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
  /** TODO: confirm the public business address. Never use a private inbox here. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hallo@mazadigital.nl",
  /** Empty until the number is confirmed — the WhatsApp link stays hidden. */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "",
  location: { nl: "Nederland", en: "the Netherlands" },
  /**
   * Social profiles. Leave a value empty to hide it.
   * TODO: add the confirmed profile URLs.
   */
  socials: {
    linkedin: "",
    instagram: "",
    github: "",
  },
  /** Legal details shown in the footer and privacy policy. TODO: fill in before launch. */
  legal: {
    companyName: brandName,
    kvk: "", // Chamber of Commerce number
    vat: "", // BTW-id
  },
} as const;

export type SocialKey = keyof typeof site.socials;

export function whatsappHref(message?: string): string | null {
  if (!site.whatsappNumber) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsappNumber}${text}`;
}

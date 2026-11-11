import { ImageResponse } from "next/og";
import { getDictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { defaultLocale, isLocale } from "@/lib/i18n";

export const alt = "MAZA DIGITAL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const h = getDictionary(locale).hero;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#080B12",
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(75,123,255,0.28), transparent 45%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>{site.brandName}</div>
        <div style={{ display: "flex", maxWidth: 980, fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5 }}>{h.title}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#C6CCD9" }}>{h.eyebrow}</div>
      </div>
    ),
    size,
  );
}

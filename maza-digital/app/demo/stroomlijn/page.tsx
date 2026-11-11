import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { StroomlijnApp } from "./app";

export const metadata: Metadata = { title: "Stroomlijn · Offerteaanvragen automatisch verwerken" };

export default function Page() {
  return (
    <>
      <StroomlijnApp />
      <DemoBadge slug="stroomlijn" />
    </>
  );
}

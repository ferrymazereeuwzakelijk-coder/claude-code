import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { KadeboekApp } from "./app";

export const metadata: Metadata = { title: "Kadeboek · Ligplaats boeken bij Jachthaven De Kaap" };

export default function Page() {
  return (
    <>
      <KadeboekApp />
      <DemoBadge slug="kadeboek" />
    </>
  );
}

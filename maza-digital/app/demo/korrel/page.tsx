import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { KorrelApp } from "./app";

export const metadata: Metadata = { title: "Korrel · Ambachtelijke bakkerij, online bestellen" };

export default function Page() {
  return (
    <>
      <KorrelApp />
      <DemoBadge slug="korrel" />
    </>
  );
}

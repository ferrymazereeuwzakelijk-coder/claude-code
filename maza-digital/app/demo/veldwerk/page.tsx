import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { VeldwerkApp } from "./app";

export const metadata: Metadata = { title: "Veldwerk · Werkbonnen-app voor monteurs" };

export default function Page() {
  return (
    <>
      <VeldwerkApp />
      <DemoBadge slug="veldwerk" />
    </>
  );
}

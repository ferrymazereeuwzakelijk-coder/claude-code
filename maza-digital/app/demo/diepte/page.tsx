import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { DiepteApp } from "./app";

export const metadata: Metadata = { title: "Diepte · Duik de diepzee in" };

export default function Page() {
  return (
    <>
      <DiepteApp />
      <DemoBadge slug="diepte" dark />
    </>
  );
}

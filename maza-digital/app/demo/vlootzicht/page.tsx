import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo/demo-badge";
import { VlootzichtApp } from "./app";

export const metadata: Metadata = { title: "Vlootzicht · Vlootdashboard" };

export default function Page() {
  return (
    <>
      <VlootzichtApp />
      <DemoBadge slug="vlootzicht" />
    </>
  );
}

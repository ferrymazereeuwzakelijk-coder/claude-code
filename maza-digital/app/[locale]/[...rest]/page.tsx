import { notFound } from "next/navigation";

// Catch unknown paths under a locale so they render the localized not-found page.
export default function CatchAll() {
  notFound();
}

import type { Enquiry } from "./enquiry-schema";
import { company } from "@/content/site";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LABELS: Record<string, string> = {
  name: "Name", company: "Company", email: "E-mail", phone: "Telephone", service: "Service",
  location: "Location", startDate: "Start date", duration: "Duration", description: "Description",
  variant: "Form", locale: "Language",
};

export function renderEnquiry(e: Enquiry) {
  const rows = (Object.keys(LABELS) as (keyof Enquiry)[])
    .map((k) => [LABELS[k as string], String(e[k] ?? "")] as const)
    .filter(([, v]) => v !== "");
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `<h2 style="font-family:sans-serif">New website enquiry</h2><table style="font-family:sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><th align="left" style="padding:6px 12px;border-bottom:1px solid #ddd;vertical-align:top">${esc(k)}</th><td style="padding:6px 12px;border-bottom:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  return { text, html };
}

/** Sends via Resend's HTTP API (no SDK needed). Returns false when not configured. */
export async function sendEnquiryMail(e: Enquiry): Promise<"sent" | "not-configured"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "not-configured";
  const { text, html } = renderEnquiry(e);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ENQUIRY_FROM ?? "Maza Shipping website <website@mazashipping.com>",
      to: [process.env.ENQUIRY_TO ?? company.email],
      reply_to: e.email,
      subject: `Website enquiry – ${e.service} – ${e.name}${e.company ? ` (${e.company})` : ""}`,
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return "sent";
}

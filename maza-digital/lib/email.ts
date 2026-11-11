import "server-only";
import type { Enquiry } from "./enquiry-schema";
import { nl } from "@/content/dictionaries/nl";
import { site } from "@/content/site";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ENQUIRY_FROM_EMAIL && process.env.ENQUIRY_TO_EMAIL);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Labels are always Dutch in the internal notification, regardless of visitor language. */
function describe(e: Enquiry) {
  const f = nl.form;
  return [
    ["Projecttype", e.projectTypes.map((k) => f.projectTypes[k]).join(", ")],
    ["Functies", e.features.length ? e.features.map((k) => f.featureOptions[k]).join(", ") : "—"],
    ["Budget", f.budgets[e.budget]],
    ["Planning", f.timelines[e.timeline]],
    ["Naam", e.name],
    ["Bedrijf", e.company || "—"],
    ["E-mail", e.email],
    ["Telefoon", e.phone || "—"],
    ["Taal bezoeker", e.locale.toUpperCase()],
  ] as const;
}

export async function sendEnquiryEmail(e: Enquiry): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  const to = process.env.ENQUIRY_TO_EMAIL;
  if (!apiKey || !from || !to) return { ok: false, error: "not_configured" };

  const rows = describe(e);
  const text = [
    `Nieuwe projectaanvraag via ${site.brandName}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Beschrijving:",
    e.description,
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;line-height:1.5">
<h2 style="margin:0 0 16px">Nieuwe projectaanvraag</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</table>
<h3 style="margin:24px 0 8px">Beschrijving</h3>
<p style="white-space:pre-wrap">${escapeHtml(e.description)}</p>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()),
      reply_to: e.email,
      subject: `Projectaanvraag: ${e.name}${e.company ? ` (${e.company})` : ""}`,
      text,
      html,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[enquiry] Resend error", res.status, detail.slice(0, 500));
    return { ok: false, error: "send_failed" };
  }
  return { ok: true };
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile not configured: rely on honeypot, timing and rate limiting.
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

import { NextResponse } from "next/server";
import { enquirySchema } from "@/lib/enquiry-schema";
import { rateLimit } from "@/lib/rate-limit";
import { renderEnquiry, sendEnquiryMail } from "@/lib/mail";

export const runtime = "nodejs";

const MIN_FILL_MS = 3000; // humans need more than 3 s to fill the form

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot filled → pretend success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return NextResponse.json({ ok: true });
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return NextResponse.json({ ok: false, error: "validation", fields }, { status: 422 });
  }

  const data = parsed.data;
  if (Date.now() - data.startedAt < MIN_FILL_MS) return NextResponse.json({ ok: true }); // too fast: bot

  try {
    const result = await sendEnquiryMail(data);
    if (result === "not-configured") {
      if (process.env.NODE_ENV === "production") {
        console.error("[enquiry] RESEND_API_KEY missing – enquiry NOT delivered");
        return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
      }
      console.info("[enquiry] (dev, not e-mailed)\n" + renderEnquiry(data).text);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[enquiry] send failed", err);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
}

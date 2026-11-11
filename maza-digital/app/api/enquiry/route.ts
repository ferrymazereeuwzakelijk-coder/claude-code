import { NextResponse, type NextRequest } from "next/server";
import { enquirySchema, issuesToFieldErrors } from "@/lib/enquiry-schema";
import { isEmailConfigured, sendEnquiryEmail, verifyTurnstile } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 4000; // Humans need more than a few seconds for a 4-step form.
const MAX_BODY_BYTES = 20_000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`enquiry:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", fields: issuesToFieldErrors(parsed.error.issues) },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Spam traps: honeypot filled or form submitted implausibly fast.
  // Respond with a generic success so bots learn nothing, but never send email.
  const tooFast = Date.now() - data.startedAt < MIN_FILL_MS;
  if (data.website || tooFast) {
    console.warn("[enquiry] spam trap triggered", { ip, honeypot: Boolean(data.website), tooFast });
    return NextResponse.json({ ok: true });
  }

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "validation", fields: { form: "captcha" } }, { status: 422 });
  }

  // Be honest: never report success when email delivery isn't set up.
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const result = await sendEnquiryEmail(data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

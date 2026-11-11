// Simple in-memory sliding-window limiter (per server instance).
// Good enough as a second line of defence next to the honeypot and timing check;
// swap for Upstash/Redis if the site runs on many instances.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

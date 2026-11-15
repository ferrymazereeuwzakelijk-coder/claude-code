// Standalone background worker. Run one or more instances in production: `npm run worker`.
import { loadEnv } from './load-env';
loadEnv();

const { processBatch } = await import('../src/lib/queue');
const { handlers } = await import('../src/lib/worker');
const { pruneRateLimits } = await import('../src/lib/rate-limit');
const { sql, closeDb } = await import('../src/lib/db');

let running = true;
process.on('SIGTERM', () => (running = false));
process.on('SIGINT', () => (running = false));

console.log('[worker] started');
let lastPrune = 0;
while (running) {
  const n = await processBatch(handlers, 20).catch((err) => {
    console.error('[worker] batch error', err);
    return 0;
  });
  if (Date.now() - lastPrune > 3600_000) {
    await pruneRateLimits(sql()).catch(() => {});
    lastPrune = Date.now();
  }
  if (n === 0) await new Promise((r) => setTimeout(r, 1000));
}
await closeDb();
console.log('[worker] stopped');

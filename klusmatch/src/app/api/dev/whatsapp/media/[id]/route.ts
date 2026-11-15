import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isSimulatorEnabled } from '@/lib/env';
import { storage } from '@/lib/storage';

/** Serves simulator-uploaded media back to the simulator UI (dev only). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSimulatorEnabled()) return new NextResponse('Not found', { status: 404 });
  const { id } = await params;
  const [m] = await sql()<{ storage_key: string; mime_type: string }[]>`select storage_key, mime_type from wa_simulator_media where id = ${id}`;
  if (!m) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(await storage().get(m.storage_key)), { headers: { 'Content-Type': m.mime_type } });
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { storage } from '@/lib/storage';

/**
 * Serves uploaded media only to people allowed to see it:
 * the uploader, the job owner, admins, and contractors for whom the job is visible (or who quoted on it).
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const db = sql();
  const [m] = await db<{ storage_key: string; mime_type: string; owner_user_id: string | null; portfolio: boolean }[]>`
    select storage_key, mime_type, owner_user_id,
           exists (select 1 from portfolio_items p where p.media_id = media.id and not p.hidden) as portfolio
    from media where id = ${id}`;
  if (!m) return new NextResponse('Not found', { status: 404 });
  // Portfolio photos are deliberately public (they appear on public contractor profiles).
  if (m.portfolio) return serve(m.storage_key, m.mime_type, 'public, max-age=86400');
  const user = await currentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  let allowed = user.role === 'admin' || m.owner_user_id === user.id;
  if (!allowed) {
    const [r] = await db<{ ok: boolean }[]>`
      select exists (
        select 1 from job_media jm join jobs j on j.id = jm.job_id
        where jm.media_id = ${id} and (
          j.customer_id = ${user.id}
          or exists (select 1 from quotes q where q.job_id = j.id and q.contractor_id = ${user.id})
          or (j.status = 'published' and exists (
                select 1 from contractor_profiles cp join contractor_categories cc on cc.contractor_id = cp.user_id
                where cp.user_id = ${user.id} and cc.category_slug = j.category_slug
                  and km_distance(cp.base_lat, cp.base_lng, j.lat, j.lng) <= cp.service_radius_km))
        )) as ok`;
    allowed = r.ok;
  }
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });
  return serve(m.storage_key, m.mime_type, 'private, max-age=3600');
}

async function serve(key: string, mime: string, cache: string) {
  const data = await storage().get(key);
  return new NextResponse(new Uint8Array(data), {
    headers: { 'Content-Type': mime, 'Cache-Control': cache, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' },
  });
}

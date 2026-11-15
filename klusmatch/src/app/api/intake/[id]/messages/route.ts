import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { getIntake, handleCustomerTurn } from '@/lib/intake/engine';
import { assertSameOrigin, errorResponse, kickWorker } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { storeMedia } from '@/lib/storage';
import { UserFacingError } from '@/lib/errors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await params;
    const user = await currentUser();
    if (!user || user.role !== 'customer') return NextResponse.json({ error: 'Log in als klant.' }, { status: 401 });
    const intake = await getIntake(sql(), id);
    if (!intake || intake.customer_id !== user.id) return NextResponse.json({ error: 'Niet gevonden.' }, { status: 404 });
    await rateLimit(sql(), `intake:msg:${user.id}`, 60, 3600);

    const form = await req.formData();
    const text = String(form.get('text') ?? '');
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 4) throw new UserFacingError('Maximaal 4 bestanden per bericht.');
    const mediaIds: string[] = [];
    for (const file of files) {
      const stored = await storeMedia(sql(), Buffer.from(await file.arrayBuffer()), { userId: user.id });
      mediaIds.push(stored.id);
    }
    const result = await handleCustomerTurn(id, { text, mediaIds }, { resolveCustomerId: async () => user.id });
    kickWorker();
    return NextResponse.json({ ...result, mediaIds });
  } catch (err) {
    return errorResponse(err);
  }
}

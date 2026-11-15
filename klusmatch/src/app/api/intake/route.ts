import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { createIntake } from '@/lib/intake/engine';
import { assertSameOrigin, errorResponse } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await currentUser();
    if (!user || user.role !== 'customer') return NextResponse.json({ error: 'Log in als klant.' }, { status: 401 });
    await rateLimit(sql(), `intake:create:${user.id}`, 20, 3600);
    const id = await createIntake(sql(), { channel: 'web', customerId: user.id });
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse(err);
  }
}

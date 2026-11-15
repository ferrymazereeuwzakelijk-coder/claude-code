import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth/session';
import { confirmAndPublish, getIntake } from '@/lib/intake/engine';
import { assertSameOrigin, errorResponse, kickWorker } from '@/lib/http';

/** Explicit publish confirmation from the review card. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await params;
    const user = await currentUser();
    if (!user || user.role !== 'customer') return NextResponse.json({ error: 'Log in als klant.' }, { status: 401 });
    const intake = await getIntake(sql(), id);
    if (!intake || intake.customer_id !== user.id) return NextResponse.json({ error: 'Niet gevonden.' }, { status: 404 });
    const published = await confirmAndPublish(id, user.id);
    const reply =
      published.status === 'under_review'
        ? `Bedankt! Je klus (${published.ref}) vraagt om een gespecialiseerd bedrijf en wordt eerst door ons gecontroleerd.`
        : `Je klus is geplaatst! Referentie: ${published.ref}. We sturen hem nu naar geverifieerde vakmensen in jouw regio.`;
    await sql()`insert into intake_messages (intake_id, role, body) values (${id}, 'assistant', ${reply})`;
    kickWorker();
    return NextResponse.json({ ...published, reply });
  } catch (err) {
    return errorResponse(err);
  }
}

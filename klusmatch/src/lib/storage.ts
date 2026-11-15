import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from './env';
import type { Db } from './db';
import { UserFacingError } from './errors';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}

class LocalDriver implements StorageDriver {
  private root = path.resolve(process.cwd(), '.data/uploads');
  private resolve(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return p;
  }
  async put(key: string, data: Buffer) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
}

/** Supabase Storage via its REST API (service role key, server-side only). */
class SupabaseDriver implements StorageDriver {
  constructor(private url: string, private key: string, private bucket: string) {}
  private objectUrl(key: string) {
    return `${this.url.replace(/\/$/, '')}/storage/v1/object/${this.bucket}/${key}`;
  }
  async put(key: string, data: Buffer, mimeType: string) {
    const res = await fetch(this.objectUrl(key), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': mimeType, 'x-upsert': 'false' },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase storage upload failed: ${res.status}`);
  }
  async get(key: string) {
    const res = await fetch(this.objectUrl(key), { headers: { Authorization: `Bearer ${this.key}` } });
    if (!res.ok) throw new Error(`Supabase storage download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

let driver: StorageDriver | undefined;
export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  if (e.STORAGE_DRIVER === 'supabase') {
    if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    driver = new SupabaseDriver(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, e.SUPABASE_STORAGE_BUCKET);
  } else {
    driver = new LocalDriver();
  }
  return driver;
}

/** Sniffs magic bytes so a renamed file cannot masquerade as an image. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return buf.subarray(8, 10).toString('ascii') === 'qt' ? 'video/quicktime' : 'video/mp4';
  return null;
}

export async function storeMedia(
  db: Db,
  data: Buffer,
  owner: { userId?: string | null; waContactId?: string | null },
): Promise<{ id: string; mimeType: string }> {
  const mime = sniffMime(data);
  const isImage = mime && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
  const isVideo = mime && (ALLOWED_VIDEO_TYPES as readonly string[]).includes(mime);
  if (!mime || (!isImage && !isVideo)) throw new UserFacingError('Alleen foto’s (JPG, PNG, WebP) en video’s (MP4, MOV) zijn toegestaan.');
  if (isImage && data.length > MAX_IMAGE_BYTES) throw new UserFacingError('Foto is te groot (max 8 MB).');
  if (isVideo && data.length > MAX_VIDEO_BYTES) throw new UserFacingError('Video is te groot (max 50 MB).');
  const sha = createHash('sha256').update(data).digest('hex');
  const ext = mime.split('/')[1].replace('quicktime', 'mov');
  const key = `media/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  await storage().put(key, data, mime);
  const [row] = await db<{ id: string }[]>`
    insert into media (owner_user_id, wa_contact_id, storage_key, mime_type, size_bytes, sha256)
    values (${owner.userId ?? null}, ${owner.waContactId ?? null}, ${key}, ${mime}, ${data.length}, ${sha})
    returning id`;
  return { id: row.id, mimeType: mime };
}

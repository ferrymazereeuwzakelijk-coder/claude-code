import { z } from 'zod';
import { sql, type Db } from './db';
import { audit } from './audit';
import { UserFacingError } from './errors';
import { storeMedia } from './storage';

export const MAX_PORTFOLIO_ITEMS = 12;

export async function addPortfolioItem(contractorId: string, data: Buffer, input: { caption?: string; categorySlug?: string | null }) {
  const caption = z.string().trim().max(200).parse(input.caption ?? '');
  const db = sql();
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int as n from portfolio_items where contractor_id = ${contractorId}`;
  if (n >= MAX_PORTFOLIO_ITEMS) throw new UserFacingError(`Je portfolio heeft al ${MAX_PORTFOLIO_ITEMS} foto's. Verwijder er eerst een.`);
  let category: string | null = null;
  if (input.categorySlug) {
    const [ok] = await db`select 1 from contractor_categories where contractor_id = ${contractorId} and category_slug = ${input.categorySlug}`;
    if (ok) category = input.categorySlug;
  }
  const media = await storeMedia(db, data, { userId: contractorId });
  if (!media.mimeType.startsWith('image/')) throw new UserFacingError('Alleen foto’s zijn toegestaan in je portfolio.');
  const [row] = await db<{ id: string }[]>`
    insert into portfolio_items (contractor_id, media_id, caption, category_slug) values (${contractorId}, ${media.id}, ${caption}, ${category}) returning id`;
  await audit(db, { actorId: contractorId, action: 'portfolio.added', entityType: 'portfolio_item', entityId: row.id });
  return row;
}

export async function removePortfolioItem(contractorId: string, itemId: string) {
  const db = sql();
  await db`delete from portfolio_items where id = ${itemId} and contractor_id = ${contractorId}`;
  await audit(db, { actorId: contractorId, action: 'portfolio.removed', entityType: 'portfolio_item', entityId: itemId });
}

export async function listPortfolio(db: Db, contractorId: string, includeHidden = false) {
  return db<{ id: string; media_id: string; caption: string; category: string | null; hidden: boolean }[]>`
    select p.id, p.media_id, p.caption, c.name_nl as category, p.hidden
    from portfolio_items p left join categories c on c.slug = p.category_slug
    where p.contractor_id = ${contractorId} and (${includeHidden} or not p.hidden)
    order by p.created_at desc`;
}

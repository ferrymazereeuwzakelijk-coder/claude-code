import type { Db } from './db';
import type { CategoryOption } from './intake/types';

export async function listCategories(db: Db, opts: { includeInactive?: boolean } = {}): Promise<CategoryOption[]> {
  const rows = await db<{ slug: string; name_nl: string; description_nl: string; risk: CategoryOption['risk'] }[]>`
    select slug, name_nl, description_nl, risk from categories
    where ${opts.includeInactive ? true : db`active`}
    order by sort_order, name_nl`;
  return rows.map((r) => ({ slug: r.slug, name: r.name_nl, description: r.description_nl, risk: r.risk }));
}

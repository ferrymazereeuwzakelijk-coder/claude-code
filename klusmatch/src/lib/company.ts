/**
 * Legal identity of the operator, shown in the footer, legal pages and outreach e-mails.
 * Set via environment variables once the business is registered with the KvK.
 */
export type Company = {
  brand: string;
  legalName: string | null;
  kvk: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  /** true once the terms and privacy statement have been reviewed; removes the "concept" banner */
  legalReviewed: boolean;
};

export function company(): Company {
  const v = (k: string) => process.env[k]?.trim() || null;
  return {
    brand: v('COMPANY_BRAND') ?? 'KlusMatch',
    legalName: v('COMPANY_LEGAL_NAME'),
    kvk: v('COMPANY_KVK'),
    address: v('COMPANY_ADDRESS'),
    email: v('COMPANY_EMAIL'),
    phone: v('COMPANY_PHONE'),
    legalReviewed: process.env.LEGAL_REVIEWED === 'true',
  };
}

export const missing = '[nog in te vullen]';

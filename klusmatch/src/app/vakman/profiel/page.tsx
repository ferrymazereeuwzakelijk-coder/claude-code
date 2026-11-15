import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Notice, PageHeader } from '@/components/ui';
import { sql } from '@/lib/db';
import { listCategories } from '@/lib/categories';
import { getContractorProfile } from '@/lib/contractors';
import { saveProfileAction } from '@/app/actions/contractor';
import { listPortfolio, MAX_PORTFOLIO_ITEMS } from '@/lib/portfolio';
import { PortfolioManager } from './portfolio-manager';
import Link from 'next/link';

export const metadata = { title: 'Bedrijfsprofiel' };

const VERIFICATION = {
  unsubmitted: { tone: 'neutral', label: 'Nog niet ingediend' },
  pending: { tone: 'amber', label: 'Verificatie in behandeling' },
  verified: { tone: 'green', label: 'Geverifieerd' },
  rejected: { tone: 'red', label: 'Afgewezen' },
} as const;

export default async function ContractorProfilePage() {
  const user = await requireRole('contractor');
  const [profile, categories] = await Promise.all([getContractorProfile(sql(), user.id), listCategories(sql())]);
  const v = VERIFICATION[profile?.verification ?? 'unsubmitted'];
  const portfolio = profile ? await listPortfolio(sql(), user.id) : [];
  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow={profile ? 'Bedrijfsprofiel' : 'Stap 1 van 1 · Onboarding'}
        title={profile ? profile.company_name : 'Vertel ons over je bedrijf'}
        description="Klanten zien je bedrijfsnaam, vakgebieden en verificatiestatus. Na controle van je KvK-inschrijving kun je offertes versturen."
        actions={
          <>
            <Badge tone={v.tone}>{v.label}</Badge>
            {profile && <Link href={`/vakmensen/${user.id}`} className="btn-secondary text-sm">Bekijk openbaar profiel ↗</Link>}
          </>
        }
      />
      {profile?.verification === 'rejected' && profile.verification_note && (
        <div className="mb-6"><Notice tone="red" title="Verificatie afgewezen">{profile.verification_note}</Notice></div>
      )}
      <ActionForm action={saveProfileAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy-900">Bedrijfsgegevens</h2>
          <div>
            <label className="label" htmlFor="companyName">Bedrijfsnaam</label>
            <input className="input" id="companyName" name="companyName" defaultValue={profile?.company_name} required />
          </div>
          <div>
            <label className="label" htmlFor="kvkNumber">KvK-nummer</label>
            <input className="input" id="kvkNumber" name="kvkNumber" inputMode="numeric" pattern="[0-9 ]{8,9}" defaultValue={profile?.kvk_number ?? ''} required />
            <p className="mt-1.5 text-xs text-navy-400">We controleren dit handmatig in het Handelsregister. Wijzigen van naam of KvK zet je verificatie opnieuw in behandeling.</p>
          </div>
          <div>
            <label className="label" htmlFor="description">Over je bedrijf</label>
            <textarea className="input min-h-28" id="description" name="description" defaultValue={profile?.description} maxLength={2000} placeholder="Ervaring, specialisaties, certificeringen…" />
          </div>
        </section>
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy-900">Werkgebied & vakgebieden</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="basePostcode">Vestigingspostcode</label>
              <input className="input" id="basePostcode" name="basePostcode" defaultValue={profile?.base_postcode} placeholder="3512" required />
            </div>
            <div>
              <label className="label" htmlFor="serviceRadiusKm">Werkstraal (km)</label>
              <input className="input" id="serviceRadiusKm" name="serviceRadiusKm" type="number" min={5} max={150} defaultValue={profile?.service_radius_km ?? 25} required />
            </div>
          </div>
          <fieldset>
            <legend className="label">Vakgebieden (max. 8)</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <label key={c.slug} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-navy-100 p-3 text-sm transition hover:border-navy-200 has-[:checked]:border-leaf-500 has-[:checked]:bg-leaf-50/50">
                  <input type="checkbox" name="categories" value={c.slug} defaultChecked={profile?.categories.includes(c.slug)} className="mt-0.5 accent-leaf-600" />
                  <span>
                    <span className="font-medium text-navy-900">{c.name}</span>
                    {c.risk !== 'normal' && <span className="ml-1 text-[11px] text-amber-700">{c.risk === 'specialist' ? '· certificering vereist' : '· erkend vakman'}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2.5 text-sm text-navy-800">
            <input type="checkbox" name="available" defaultChecked={profile?.available ?? true} className="accent-leaf-600" />
            Ik ben beschikbaar voor nieuwe klussen
          </label>
          <SubmitButton className="btn-primary w-full py-3" pendingText="Opslaan…">{profile ? 'Wijzigingen opslaan' : 'Profiel indienen ter verificatie'}</SubmitButton>
        </section>
      </ActionForm>
      {profile && (
        <section className="card mt-6 p-6">
          <h2 className="font-semibold text-navy-900">Portfolio</h2>
          <p className="mb-5 mt-1 text-sm text-navy-500">Laat klanten zien wat je kunt. Je portfolio staat op je openbare profiel, dat klanten openen vanuit je offerte.</p>
          <PortfolioManager items={portfolio} categories={categories.filter((c) => profile.categories.includes(c.slug)).map((c) => ({ slug: c.slug, name: c.name }))} max={MAX_PORTFOLIO_ITEMS} />
        </section>
      )}
    </AppShell>
  );
}

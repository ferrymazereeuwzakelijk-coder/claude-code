import { notFound } from 'next/navigation';
import { isSimulatorEnabled } from '@/lib/env';
import { Simulator } from './simulator';

export const metadata = { title: 'WhatsApp-simulator' };
export const dynamic = 'force-dynamic';

export default function SimulatorPage() {
  if (!isSimulatorEnabled()) notFound();
  return <Simulator />;
}

import { ImageResponse } from 'next/og';

// Link preview for WhatsApp, LinkedIn, Facebook and iMessage when someone shares the site.
export const alt = 'KlusMatch — je klus geregeld';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: 72, background: 'linear-gradient(135deg, #0B1B33 0%, #13294A 60%, #065F42 140%)', color: 'white', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* drawn check mark (no glyph, so no font download is needed) */}
            <div style={{ width: 30, height: 16, borderLeft: '7px solid white', borderBottom: '7px solid white', transform: 'rotate(-45deg)', marginTop: -6 }} />
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>
            <span>Klus</span><span style={{ color: '#34D399' }}>Match</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Je klus geregeld.</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: '#34D399' }}>Door vakmensen uit je buurt.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: '#A3B2C9' }}>Foto sturen - offertes vergelijken - gratis voor klanten en vakmensen</div>
        </div>
      </div>
    ),
    size,
  );
}

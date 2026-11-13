import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ScrollSwap, SentBubble, Shot, Tap, TypingField} from '../components/ScreenUI';
import {easeIn, easeOut, ramp} from '../lib/anim';
import P from './preview.json';
import SIZES from './sizes.json';

/**
 * App Store assets.
 *  - StoreShot: 1320x2868 screenshots (iPhone 6.9"). Text sits above the app screen,
 *    the screen is a clean card underneath: text and UI never overlap.
 *  - StorePreview: 886x1920 app preview video (29.8 s): the app and the WhatsApp assistant.
 */

const FONT = 'Inter, sans-serif';
const BLUE = '#3b74ff';
const GREEN = '#21c063';
const ORANGE = '#ff8a3d';

export const SHOTS = [
  {img: 'company-dashboard.png', accent: BLUE, title: 'Maritiem personeel nodig?', sub: 'Vind snel matrozen, schippers en meer'},
  {img: 'company-form.png', accent: BLUE, title: 'Plaats je opdracht', sub: 'Kies functie, datum en locatie'},
  {img: 'whatsapp-form.png', accent: GREEN, title: 'Ook via WhatsApp', sub: 'Onze assistent zet je opdracht online', dark: true},
  {img: 'company-reactions.png', accent: GREEN, title: 'Zie wie er reageert', sub: 'Alle reacties op één plek'},
  {img: 'company-contact.png', accent: GREEN, title: 'Direct contact', sub: 'Bel of app in één tik'},
  {img: 'freelancer-assignments.png', accent: ORANGE, title: 'Voor zzp’ers', sub: 'Opdrachten die bij je passen'},
  {img: 'freelancer-reacted.png', accent: ORANGE, title: 'Reageer met één tik', sub: 'Het bedrijf ziet je reactie direct'},
];

const Backdrop: React.FC<{accent: string}> = ({accent}) => (
  <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #0c1a33 0%, #071226 45%, #030812 100%)'}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 40% at 50% 8%, ${accent}33 0%, rgba(0,0,0,0) 70%)`}} />
  </>
);

// ─────────────────────────────────────────────────────── screenshots
export const StoreShot: React.FC<{index: number}> = ({index}) => {
  const s = SHOTS[index];
  // the whole app screen fits inside this box, centred below the headline
  const boxTop = 880;
  const boxW = 1100;
  const boxH = 2868 - boxTop - 120;
  const h = (SIZES as Record<string, number>)[s.img];
  const k = Math.min(boxW / 1320, boxH / h);
  const w = 1320 * k;
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <Backdrop accent={s.accent} />
      <div style={{position: 'absolute', left: 110, right: 110, top: 250, textAlign: 'center'}}>
        <div style={{width: 120, height: 12, borderRadius: 6, background: s.accent, margin: '0 auto 54px'}} />
        <div
          style={{fontSize: 112, fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', textWrap: 'balance'} as React.CSSProperties}
        >
          {s.title}
        </div>
        <div style={{fontSize: 56, fontWeight: 500, color: '#b9c9ef', marginTop: 34, lineHeight: 1.25}}>{s.sub}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: (1320 - w) / 2,
          top: boxTop,
          width: w,
          height: h * k,
          borderRadius: 64,
          overflow: 'hidden',
          background: s.dark ? '#0b0b0b' : '#f4f5f8',
          boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 3px rgba(255,255,255,0.12)',
        }}
      >
        <Img src={staticFile(`store/${s.img}`)} style={{width: w, height: h * k, display: 'block'}} />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────── preview video
const S = P.scenes;
const CARD_X = 55;
const CARD_W = 776;
const CARD_TOP = 540;
const K = CARD_W / 1320;

/** A section title above the card (never on top of the UI). */
const Title: React.FC<{f: number; from: number; to: number; title: string; sub: string; accent: string}> = ({
  f,
  from,
  to,
  title,
  sub,
  accent,
}) => {
  const p = ramp(f, [from, from + 10], [0, 1], easeOut);
  const o = ramp(f, [to - 6, to], [0, 1], easeIn);
  return (
    <div
      style={{
        position: 'absolute',
        left: 50,
        right: 50,
        top: 130,
        textAlign: 'center',
        fontFamily: FONT,
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      <div style={{width: 84, height: 9, borderRadius: 5, background: accent, margin: '0 auto 34px'}} />
      <div style={{fontSize: 76, fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', textWrap: 'balance'} as React.CSSProperties}>{title}</div>
      <div style={{fontSize: 38, fontWeight: 500, color: '#b9c9ef', marginTop: 20}}>{sub}</div>
    </div>
  );
};

/** The app screen as a clean card; children are laid out in native 1320px coordinates. */
const Card: React.FC<{f: number; from: number; to: number; top?: number; children: React.ReactNode; dark?: boolean}> = ({
  f,
  from,
  to,
  top = 0,
  children,
  dark,
}) => {
  const p = ramp(f, [from, from + 12], [0, 1], easeOut);
  const o = ramp(f, [to - 6, to], [0, 1], easeIn);
  return (
    <div
      style={{
        position: 'absolute',
        left: CARD_X,
        top: CARD_TOP,
        width: CARD_W,
        bottom: -60,
        borderRadius: 52,
        overflow: 'hidden',
        background: dark ? '#0b0b0b' : '#f4f5f8',
        boxShadow: '0 30px 90px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.10)',
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 80 - o * 30}px) scale(${0.97 + 0.03 * p})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1320,
          height: 2868,
          transform: `scale(${K}) translateY(${-top}px)`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Logo: React.FC<{size: number}> = ({size}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.22}}>
    <Img src={staticFile('brand/logo-mark-white.png')} style={{width: size * 1.25, height: size * 1.25}} />
    <div style={{fontSize: size, fontWeight: 800, letterSpacing: '-0.02em'}}>
      <span style={{color: '#fff'}}>Crewing</span>
      <span style={{color: BLUE}}>Market</span>
    </div>
  </div>
);

/** Real WhatsApp screens: type the request, the filled-in form, 'Je opdracht staat online!'. */
const WhatsAppFlow: React.FC<{f: number}> = ({f}) => {
  const W = P.whatsapp;
  const msg = P.copy.typedMessage;
  const bubble = (top: number, pop = 1) => <SentBubble top={top} text={msg} time={P.copy.messageTime} pop={pop} />;
  const up = ramp(f, [W.sheetUp, W.sheetUp + 10], [0, 1], easeOut);
  const down = ramp(f, [W.sheetDown, W.sheetDown + 8], [0, 1], easeIn);
  const sheet = f < W.sheetDown ? up : 1 - down;
  return (
    <>
      <Shot src="wa-empty.png">
        {f < W.sheetUp && <TypingField frame={f} text={msg} start={W.typeStart} end={W.typeEnd} sent={W.send} />}
        {f >= W.send && bubble(738, ramp(f, [W.send, W.send + 8], [0, 1], easeOut))}
      </Shot>
      {f >= W.sheetDown && (
        <ScrollSwap
          frame={f}
          start={W.online}
          dur={10}
          dy={1119}
          top={320}
          bottom={2600}
          a={{src: 'wa-form-sent.png', children: bubble(504)}}
          b={{src: 'wa-online.png'}}
        />
      )}
      {sheet > 0 && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.45 * sheet})`}} />
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - sheet) * 2640}px)`}}>
            <Shot src="wa-form-complete.png" style={{clipPath: 'inset(250px 0 0 0)'}} />
          </div>
        </>
      )}
      {P.taps
        .filter((t) => t.phone === 'whatsapp')
        .map((t) => (
          <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} />
        ))}
    </>
  );
};

export const StorePreview: React.FC = () => {
  const f = useCurrentFrame();
  const A = P.app;
  const F = P.freelancer;
  const C = P.contact;
  const toast = ramp(f, [F.reacted, F.reacted + 12], [0, 1], easeOut);
  const intro = ramp(f, [S.intro.from + 2, S.intro.from + 14], [0, 1], easeOut);
  const introOut = ramp(f, [S.intro.to - 8, S.intro.to], [0, 1], easeIn);
  const end = ramp(f, [S.end.from + 2, S.end.from + 14], [0, 1], easeOut);
  const endQ = ramp(f, [S.end.from + 16, S.end.from + 28], [0, 1], easeOut);
  const accent = f < S.whatsapp.from ? BLUE : f < S.freelancer.from ? GREEN : f < S.contact.from ? ORANGE : GREEN;
  const appVideo = (
    <OffthreadVideo src={staticFile('footage/app-short.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#030812', fontFamily: FONT}}>
      <Backdrop accent={accent} />

      {/* intro */}
      {f < S.intro.to && (
        <AbsoluteFill
          style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 1 - introOut}}
        >
          <div style={{opacity: intro, transform: `translateY(${(1 - intro) * 30}px)`}}>
            <Logo size={70} />
            <div style={{fontSize: 74, fontWeight: 900, color: '#fff', lineHeight: 1.08, marginTop: 60}}>
              Maritiem personeel,
              <br />
              snel geregeld
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 1. post a job in the app */}
      <Title f={f} from={S.post.from} to={S.post.to} title="Plaats je opdracht" sub="functie, datum, locatie: klaar" accent={BLUE} />
      {f >= S.post.from && f < S.post.to && (
        <Card f={f} from={S.post.from} to={S.post.to} top={A.cropTop}>
          <Sequence from={A.clipStart} layout="none">
            {appVideo}
          </Sequence>
          {P.taps
            .filter((t) => t.phone === 'app')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
            ))}
        </Card>
      )}

      {/* 2. or via the WhatsApp assistant */}
      <Title f={f} from={S.whatsapp.from} to={S.whatsapp.to} title="Of via WhatsApp" sub="onze assistent zet je opdracht online" accent={GREEN} />
      {f >= S.whatsapp.from && f < S.whatsapp.to && (
        <Card f={f} from={S.whatsapp.from} to={S.whatsapp.to} top={180} dark>
          <WhatsAppFlow f={f} />
        </Card>
      )}

      {/* 3. freelancers react */}
      <Title f={f} from={S.freelancer.from} to={S.freelancer.to} title="Zzp’ers reageren" sub="met één tik op ‘Ik heb interesse’" accent={ORANGE} />
      {f >= S.freelancer.from && f < S.freelancer.to && (
        <Card f={f} from={S.freelancer.from} to={S.freelancer.to} top={180}>
          <Shot src="app-assignments.png" />
          {f >= F.reacted && (
            <>
              <Shot src="app-reacted.png" opacity={ramp(f, [F.reacted, F.reacted + 3], [0, 1])} />
              <Shot
                src="app-assignments.png"
                opacity={1 - ramp(f, [F.reacted + 8, F.reacted + 13], [0, 1])}
                style={{clipPath: 'inset(214px 0 2380px 0)'}}
              />
              <Shot
                src="app-reacted.png"
                y={(1 - toast) * -320}
                opacity={Math.min(1, toast * 2)}
                style={{clipPath: 'inset(222px 24px 2384px 24px)'}}
              />
            </>
          )}
          {P.taps
            .filter((t) => t.phone === 'freelancer')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
            ))}
        </Card>
      )}

      {/* 4. see the reaction, contact directly */}
      <Title f={f} from={S.contact.from} to={C.tapContact + 2} title="Zie wie er reageert" sub="alle reacties op één plek" accent={GREEN} />
      <Title f={f} from={C.tapContact + 2} to={S.contact.to} title="Direct contact" sub="bel of app in één tik" accent={GREEN} />
      {f >= S.contact.from && f < S.contact.to && (
        <Card f={f} from={S.contact.from} to={S.contact.to} top={180}>
          <Sequence from={S.contact.from} layout="none">
            <OffthreadVideo
              src={staticFile('footage/rec-reactions.mp4')}
              startFrom={C.videoStartFrom}
              muted
              style={{width: 1320, height: 2868, display: 'block'}}
            />
          </Sequence>
          {P.taps
            .filter((t) => t.phone === 'contact')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
            ))}
        </Card>
      )}

      {/* end */}
      {f >= S.end.from && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <div style={{opacity: end, transform: `scale(${0.94 + 0.06 * end})`}}>
            <Logo size={76} />
          </div>
          <div
            style={{
              marginTop: 70,
              fontSize: 58,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.25,
              opacity: endQ,
              transform: `translateY(${(1 - endQ) * 20}px)`,
            }}
          >
            Personeel nodig?
            <br />
            <span style={{color: '#cfe0ff'}}>Of beschikbaar voor werk?</span>
          </div>
        </AbsoluteFill>
      )}

      <Audio src={staticFile(P.audioOut)} />
    </AbsoluteFill>
  );
};

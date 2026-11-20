import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {Finish} from '../components/Finish';
import {Phone} from '../components/Phone';
import {Highlight, ScrollSwap, SentBubble, Shot, Tap, TypingField} from '../components/ScreenUI';

import {camera, CamKey, cameraSpeed, easeIn, easeInOut, easeOut, fadeIn, ramp, shake} from '../lib/anim';
import T from './timeline.json';

/**
 * CrewingMarket — 35-second launch cut (1080x1920, 30 fps).
 * Story: problem → CrewingMarket → request (WhatsApp or platform) → freelancers react → direct contact → CTA.
 * All timing lives in ./timeline.json; every scene cut lands on a beat (120 BPM).
 */

const FONT = 'Inter, sans-serif';
const BLUE = '#3b74ff';
const GREEN = '#21c063';
const ORANGE = '#ff8a3d';
const S = T.scenes;
const credit = 'see CREDITS.md';


const whipBlur = (f: number, keys: CamKey[]) => Math.min(26, Math.max(0, cameraSpeed(f, keys) - 140) * 0.1);

/** Dark, blurred maritime footage behind the phones. */
/** Clean dark studio set behind the phones: deep navy, a soft light in the accent colour, faint water. */
const PhoneBackdrop: React.FC<{t: number; src: string; start: number; tint: string}> = ({t, src, start, tint}) => {
  const breathe = 0.85 + 0.15 * Math.sin(t / 22);
  const sweep = ((t * 9) % 2600) - 800;
  return (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 90% at 50% 40%, #0d1d3a 0%, #061024 45%, #02050c 100%)'}} />
      <AbsoluteFill style={{opacity: 0.16, filter: 'blur(26px)', transform: 'scale(1.15)'}}>
        <Footage clip={{src, start, focusX: 0.55, credit}} t={t} length={150} push={0.05} grade="night" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 60%, ${tint} 0%, rgba(0,0,0,0) 46%)`,
          opacity: breathe,
          transform: 'scale(1.25)',
        }}
      />
      {/* floor glow under the device */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          bottom: 40,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${tint} 0%, rgba(0,0,0,0) 70%)`,
          opacity: 0.8,
          filter: 'blur(30px)',
        }}
      />
      {/* slow diagonal light streak */}
      <div
        style={{
          position: 'absolute',
          top: -400,
          left: sweep,
          width: 260,
          height: 2800,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(160,190,255,0.06) 50%, rgba(255,255,255,0) 100%)',
        }}
      />
    </>
  );
};

/** Words slide up out of a mask, one after another. */
const WordReveal: React.FC<{text: string; p: (i: number) => number; style?: React.CSSProperties}> = ({text, p, style}) => (
  <div style={style}>
    {text.split(' ').map((w, i, arr) => {
      const k = p(i);
      return (
        <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em'}}>
          <span style={{display: 'inline-block', transform: `translateY(${(1 - k) * 110}%)`, opacity: Math.min(1, k * 1.5)}}>
            {w}
            {i < arr.length - 1 ? '\u00a0' : ''}
          </span>
        </span>
      );
    })}
  </div>
);

// ────────────────────────────────────────────── captions (brand style)
type Cap = {route: string; from: number; to: number; title: string; sub: string; label: string};
const CAP_COLOR: Record<string, string> = {whatsapp: GREEN, app: BLUE, freelancer: ORANGE, company: GREEN};

/** Centered headline above the phone: accent bar, label, title, sub. Same system as the App Store screenshots. */
const Captions: React.FC<{frame: number}> = ({frame}) => {
  const caps = T.steps as unknown as Cap[];
  const active = caps.filter((c) => frame >= c.from - 2 && frame < c.to + 7);
  const band = Math.max(0, ...active.map((c) => ramp(frame, [c.from - 2, c.from + 6], [0, 1]) * (1 - ramp(frame, [c.to, c.to + 7], [0, 1]))));
  return (
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: FONT}}>
      <AbsoluteFill
        style={{
          height: 560,
          background: 'linear-gradient(180deg, rgba(3,8,18,0.96) 0%, rgba(3,8,18,0.9) 55%, rgba(3,8,18,0) 100%)',
          opacity: band,
        }}
      />
      {active.map((c) => {
        const idx = caps.indexOf(c);
        const prev = caps[idx - 1];
        const next = caps[idx + 1];
        const pin = ramp(frame, [c.from - 2, c.from + 8], [0, 1], easeOut);
        const pout = ramp(frame, [c.to, c.to + 7], [0, 1], easeIn);
        // the label stays put when the next caption keeps the same label
        const keepIn = prev && prev.label === c.label && prev.to === c.from;
        const keepOut = next && next.label === c.label && next.from === c.to;
        const labelOp = (keepIn ? 1 : pin) * (keepOut ? 1 : 1 - pout);
        const color = CAP_COLOR[c.route];
        return (
          <div key={idx} style={{position: 'absolute', left: 60, right: 60, top: 118, textAlign: 'center'}}>
            <div style={{opacity: keepOut && frame >= c.to ? 0 : labelOp}}>
              <div style={{width: 72, height: 8, borderRadius: 4, background: color, margin: '0 auto 22px'}} />
              <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '0.2em', color}}>{c.label}</div>
            </div>
            <div
              style={{
                marginTop: 18,
                opacity: pin * (1 - pout),
                transform: `translateY(${-pout * 14}px)`,
              }}
            >
              <WordReveal
                text={c.title}
                p={(i) => ramp(frame, [c.from + i * 2, c.from + i * 2 + 9], [0, 1], easeOut)}
                style={{fontSize: 70, fontWeight: 900, color: '#fff', lineHeight: 1.04, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}
              />
              <div style={{fontSize: 38, fontWeight: 500, color: '#b9c9ef', marginTop: 12}}>{c.sub}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────── 0–3s HOOK
const HOOK_SHOTS = [
  {from: 0, to: 20, push: 0.1, clip: {src: 'footage/helm-throttle.mp4', start: 0.45, rate: 0.85, focusX: 0.38, zoom: 1.12, credit}},
  {from: 20, to: 50, push: 0.08, clip: {src: 'footage/deck-crew.mp4', start: 0.3, focusX: 0.88, credit}},
  {from: 50, to: 75, push: 0.12, clip: {src: 'footage/tanker-storm.mp4', start: 2.6, rate: 0.9, focusX: 0.66, credit}},
];

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const sh = shake(f, [0, ...T.hookWords], 10);
  const flash = ramp(f, [0, 6], [0.55, 0], easeOut);
  const end = S.hook.to;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(1.04)`}}>
        {HOOK_SHOTS.map((s) => (
          <Sequence key={s.from} from={s.from} durationInFrames={s.to - s.from} layout="none">
            <Footage clip={s.clip} t={f - s.from} length={s.to - s.from} push={s.push} grade="night" />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.45) 100%)'}}
      />
      <AbsoluteFill style={{padding: '0 76px', paddingTop: 330}}>
        {T.copy.hook.map((w, i) => {
          const a = T.hookWords[i];
          // the first word is fully visible on frame 0, so the post thumbnail is never empty
          const p = a === 0 ? 1 : ramp(f, [a, a + 6], [0, 1], easeOut);
          const out = ramp(f, [end - 16 + i, end - 4 + i], [0, 1], easeIn);
          const key = i === 2;
          return (
            <div
              key={w}
              style={{
                alignSelf: 'flex-start',
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: key ? 178 : 158,
                lineHeight: key ? '186px' : '166px',
                letterSpacing: `${0.18 * (1 - p) - 0.02}em`,
                color: '#fff',
                background: key ? BLUE : undefined,
                padding: key ? '0 22px' : 0,
                marginLeft: key ? -22 : 0,
                borderRadius: key ? 16 : 0,
                opacity: p * (1 - out),
                filter: `blur(${(1 - p) * 14 + out * 16}px)`,
                transform: `translateY(${(1 - p) * 36 - out * 70}px) scale(${1 + (1 - p) * 0.28})`,
                transformOrigin: '0% 50%',
                textShadow: '0 6px 40px rgba(0,0,0,0.6)',
                boxShadow: key ? '0 10px 50px rgba(59,116,255,0.45)' : undefined,
                whiteSpace: 'nowrap',
              }}
            >
              {w}
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 55% 50%, rgba(255,255,255,${flash}) 0%, rgba(190,215,255,${
            flash * 0.8
          }) 30%, rgba(0,0,0,0) 75%)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────── 3–6.5s SOLUTION
const HERO = [
  {src: 'wa-online.png', tx: -330, ty: 420, ry: 26, rz: -6, delay: 6},
  {src: 'company-reactions.png', tx: 330, ty: 420, ry: -26, rz: 6, delay: 10},
  {src: 'app-assignments.png', tx: 0, ty: 350, ry: 0, rz: 0, delay: 2},
];

const Solution: React.FC = () => {
  const {from, to} = S.solution;
  const f = useCurrentFrame() + from;
  const t = f - from;
  const logo = ramp(f, [from, from + 12], [0, 1], easeOut);
  const roles = (i: number) => ramp(f, [from + 26 + i * 4, from + 36 + i * 4], [0, 1], easeOut);
  const out = ramp(f, [to - 8, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={t} src="footage/tug-vanino.mp4" start={2.2} tint="rgba(59,116,255,0.32)" />
      <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 + out * 0.05})`}}>
        {HERO.map((h) => {
          const p = ramp(t, [h.delay, h.delay + 22], [0, 1], easeOut);
          const float = Math.sin((t + h.delay * 7) / 18) * 10;
          return (
            <Phone
              key={h.src}
              cam={{
                f,
                s: h.tx === 0 ? 0.56 : 0.5,
                fx: 660,
                fy: 1434,
                tx: h.tx,
                ty: h.ty + (1 - p) * 700 + float,
                rx: 8,
                ry: h.ry + (1 - p) * h.ry * 0.8 + Math.sin(t / 40) * 3,
                rz: h.rz,
              }}
              shadow={0.9}
              glare={1.4}
              style={{opacity: Math.min(1, p * 1.6)}}
            >
              <Shot src={h.src} />
            </Phone>
          );
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: FONT}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              opacity: logo,
              transform: `translateY(${(1 - logo) * 20}px)`,
            }}
          >
            <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 92, height: 92}} />
            <div style={{fontSize: 68, fontWeight: 800, letterSpacing: '-0.02em'}}>
              <span style={{color: '#fff'}}>Crewing</span>
              <span style={{color: BLUE}}>Market</span>
            </div>
          </div>
          <WordReveal
            text="Vind maritieme professionals"
            p={(i) => ramp(t, [8 + i * 4, 18 + i * 4], [0, 1], easeOut)}
            style={{marginTop: 40, fontSize: 92, fontWeight: 900, color: '#fff', lineHeight: 1.04, letterSpacing: '-0.02em', padding: '0 70px'}}
          />
          <div style={{display: 'flex', gap: 16, marginTop: 40, justifyContent: 'center'}}>
            {T.copy.roles.map((r, i) => (
              <div
                key={r}
                style={{
                  padding: '12px 28px',
                  borderRadius: 999,
                  border: '2px solid rgba(255,255,255,0.22)',
                  background: 'rgba(59,116,255,0.16)',
                  color: '#dfe8ff',
                  fontSize: 34,
                  fontWeight: 700,
                  opacity: roles(i),
                  transform: `translateY(${(1 - roles(i)) * 18}px)`,
                }}
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────── 6.5–11.5s WAY 1: WHATSAPP
const W = T.whatsapp;
const WA_CAM: CamKey[] = [
  {f: 150, s: 0.42, fx: 660, fy: 1434, rx: 26, ry: -36, rz: -7, ty: 560},
  {f: 166, s: 1.28, fy: 1460, rx: 0, ry: 0, rz: 0, ty: 250},
  {f: 240, s: 1.28, fy: 1400},
  {f: 254, s: 1.08, fy: 1434},
  {f: 270, s: 1.22, fy: 1800},
  {f: 286, s: 1.08, fy: 1434},
  {f: 302, s: 1.4, fx: 560, fy: 1960},
  {f: 370, s: 1.46, fx: 560, fy: 1970},
  {f: 375, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const WhatsAppScreen: React.FC<{f: number}> = ({f}) => {
  const msg = T.copy.typedMessage;
  const bubble = (top: number, pop = 1) => <SentBubble top={top} text={msg} time={T.copy.messageTime} pop={pop} />;
  const up = ramp(f, [W.sheetUp, W.sheetUp + 10], [0, 1], easeOut);
  const down = ramp(f, [W.sheetDown, W.sheetDown + 8], [0, 1], easeInOut);
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
          b={{
            src: 'wa-online.png',
            children: <Highlight frame={f} at={W.online + 10} x={40} y={1470} w={1030} h={1110} color={GREEN} radius={44} />,
          }}
        />
      )}
      {sheet > 0 && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.45 * sheet})`}} />
          <Shot src="wa-form-complete.png" opacity={sheet} style={{clipPath: 'inset(0 0 2618px 0)'}} />
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - sheet) * 2640}px)`}}>
            <Shot src="wa-form-complete.png" style={{clipPath: 'inset(250px 0 0 0)'}} />
          </div>
        </>
      )}
      {T.taps
        .filter((t) => t.phone === 'company')
        .map((t) => (
          <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} />
        ))}
    </>
  );
};

const WhatsAppWay: React.FC = () => {
  const f = useCurrentFrame() + S.whatsapp.from;
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.whatsapp.from} src="footage/rotterdam-night.mp4" start={4} tint="rgba(33,192,99,0.16)" />
      <Phone cam={camera(f, WA_CAM)} blur={whipBlur(f, WA_CAM)}>
        <WhatsAppScreen f={f} />
      </Phone>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────── 11.5–16s WAY 2: THE PLATFORM
const A = T.app;
const APP_CAM: CamKey[] = [
  {f: 375, s: 0.5, fx: 660, fy: 1434, rx: -8, ry: 38, rz: 7, tx: 1600, ty: 250},
  {f: 390, s: 1.2, fy: 1480, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 420, s: 1.2, fy: 1480},
  {f: 436, s: 1.28, fy: 1560},
  {f: 534, s: 1.34, fy: 1580},
  {f: 540, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const PlatformWay: React.FC = () => {
  const f = useCurrentFrame() + S.app.from;
  const video = (
    <OffthreadVideo src={staticFile('footage/app-calm.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.app.from} src="footage/rotterdam-night.mp4" start={7} tint="rgba(59,116,255,0.2)" />
      <Phone cam={camera(f, APP_CAM)} blur={whipBlur(f, APP_CAM)} glare={1.3}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
          {f < A.clipStart ? (
            <Freeze frame={0}>{video}</Freeze>
          ) : (
            <Sequence from={A.clipStart - S.app.from} layout="none">
              {video}
            </Sequence>
          )}
          <Highlight frame={f} at={A.online + 10} x={44} y={1680} w={1232} h={530} color={BLUE} radius={40} />
        </div>
        {T.taps
          .filter((t) => t.phone === 'app')
          .map((t) => (
            <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
          ))}
      </Phone>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────── 16–17.5s THE CREW (real footage)
const Crew: React.FC = () => {
  const {from, to} = S.crew;
  const f = useCurrentFrame() + from;
  const a = ramp(f, [from + 2, from + 10], [0, 1], easeOut);
  const out = ramp(f, [to - 5, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Footage
        clip={{src: 'footage/deck-crew.mp4', start: 2.2, focusX: 0.86, credit}}
        t={f - from}
        length={to - from}
        push={0.1}
        grade="neutral"
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(2,6,13,0.88) 100%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 1380,
          fontFamily: FONT,
          opacity: a * (1 - out),
          transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        <div style={{fontSize: 84, fontWeight: 900, color: '#fff', lineHeight: 1.05}}>{T.copy.crew}</div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────── 17.5–23s FREELANCER REACTS
const FR = T.freelancer;
const FR_CAM: CamKey[] = [
  {f: 585, s: 0.55, fx: 660, fy: 1434, rx: -8, ry: 38, rz: 7, tx: 1600, ty: 250},
  {f: 600, s: 1.25, fy: 1380, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 642, s: 1.28, fy: 1460},
  {f: 668, s: 1.28, fy: 900},
  {f: 774, s: 1.34, fy: 880},
  {f: 780, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const FreelancerReacts: React.FC = () => {
  const f = useCurrentFrame() + S.freelancer.from;
  const toast = ramp(f, [FR.reacted, FR.reacted + 12], [0, 1], easeOut);
  return (
    <AbsoluteFill style={{background: '#06142a', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.freelancer.from} src="footage/rhine-barges.mp4" start={1} tint="rgba(255,138,61,0.16)" />
      <Phone cam={camera(f, FR_CAM)} blur={whipBlur(f, FR_CAM)} glare={1.5}>
        <Shot src="app-assignments.png" />
        {f >= FR.reacted && (
          <>
            <Shot src="app-reacted.png" opacity={fadeIn(f, FR.reacted, 3)} />
            <Shot
              src="app-assignments.png"
              opacity={1 - ramp(f, [FR.reacted + 8, FR.reacted + 13], [0, 1])}
              style={{clipPath: 'inset(214px 0 2380px 0)'}}
            />
            <Shot
              src="app-reacted.png"
              y={(1 - toast) * -320}
              opacity={Math.min(1, toast * 2)}
              style={{clipPath: 'inset(222px 24px 2384px 24px)'}}
            />
            <Highlight frame={f} at={FR.reacted + 14} x={40} y={226} w={1240} h={250} radius={30} color={ORANGE} />
            <Highlight frame={f} at={FR.reacted + 22} x={104} y={1574} w={478} h={88} color="#21a35a" radius={44} />
          </>
        )}
        {T.taps
          .filter((t) => t.phone === 'freelancer')
          .map((t) => (
            <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
          ))}
      </Phone>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────── 23–28.5s DIRECT CONTACT
const C = T.contact;
const C_CAM: CamKey[] = [
  {f: 780, s: 0.55, fx: 660, fy: 1434, rx: -6, ry: -38, rz: -6, tx: 1700, ty: 250},
  {f: 795, s: 1.3, fy: 2250, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 930, s: 1.38, fy: 2260},
];

const DirectContact: React.FC = () => {
  const {from, to} = S.contact;
  const f = useCurrentFrame() + from;
  const out = ramp(f, [to - 5, to], [0, 1], easeIn);
  const video = (
    <OffthreadVideo src={staticFile('footage/contact-calm.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - from} src="footage/rotterdam-night.mp4" start={9} tint="rgba(33,192,99,0.16)" />
      <AbsoluteFill style={{opacity: 1 - out}}>
        <Phone cam={camera(f, C_CAM)} blur={whipBlur(f, C_CAM)} glare={1.3}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
            {f < C.clipStart ? (
              <Freeze frame={0}>{video}</Freeze>
            ) : (
              <Sequence from={C.clipStart - from} layout="none">
                {video}
              </Sequence>
            )}
            {f < C.tapLink + 3 && <Highlight frame={f} at={C.clipStart + 4} x={36} y={2178} w={1010} h={396} radius={40} color={GREEN} />}
            {f >= C.pageOpen && f < C.tapContact + 1 && (
              <Highlight frame={f} at={C.pageOpen + 8} x={36} y={944} w={1248} h={776} radius={40} color={GREEN} />
            )}
            {f >= C.contactOpen && <Highlight frame={f} at={C.contactOpen + 4} x={40} y={840} w={1240} h={520} radius={40} color={GREEN} />}
          </div>
          {T.taps
            .filter((t) => t.phone === 'contact')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={t.frame === C.tapLink} />
            ))}
        </Phone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 30.5–37s CTA
const E = T.end;
const End: React.FC = () => {
  const {from, to} = S.end;
  const f = useCurrentFrame() + from;
  const sh = shake(f, [E.logo, E.cta], 8);
  const mark = ramp(f, [E.logo, E.logo + 14], [0, 1], easeOut);
  const bloom = ramp(f, [E.logo, E.logo + 4], [0, 1]) * ramp(f, [E.logo + 4, E.logo + 40], [1, 0.4]);
  const q1 = ramp(f, [E.q1, E.q1 + 10], [0, 1], easeOut);
  const q2 = ramp(f, [E.q2, E.q2 + 10], [0, 1], easeOut);
  const cta = ramp(f, [E.cta, E.cta + 10], [0, 1], easeOut);
  const live = ramp(f, [E.live, E.live + 12], [0, 1], easeOut);
  const pulse = 0.5 + 0.5 * Math.sin((f - E.cta) / 9);
  const word = 'CrewingMarket';
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      {/* maritime backdrop: a vessel underway, pushed into the brand's dark blue */}
      <AbsoluteFill style={{opacity: 0.9}}>
        <Footage
          clip={{src: 'footage/rotterdam-night.mp4', start: 5.0, focusX: 0.55, credit}}
          t={f - from}
          length={to - from}
          push={0.1}
          grade="night"
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(2,6,13,0.78) 0%, rgba(2,6,13,0.55) 40%, rgba(2,6,13,0.35) 70%, rgba(2,6,13,0.6) 100%)'}}
      />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + 0.035 * ramp(f, [from, to], [0, 1], (x) => x)})`, fontFamily: FONT, textAlign: 'center'}}>
        <div
          style={{
            position: 'absolute',
            left: 540 - 380,
            top: 470 - 380,
            width: 760,
            height: 760,
            borderRadius: 380,
            background: 'radial-gradient(circle, rgba(59,116,255,0.45) 0%, rgba(59,116,255,0) 65%)',
            opacity: bloom,
          }}
        />
        {/* light sweep across the logo, then across the call to action */}
        {[E.logo + 18, E.cta + 6].map((at, k) => {
          const x = ramp(f, [at, at + 22], [-500, 1500], easeInOut);
          const op = ramp(f, [at, at + 4], [0, 1]) * ramp(f, [at + 18, at + 22], [1, 0]);
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                top: k === 0 ? 330 : 1080,
                left: x,
                width: 180,
                height: k === 0 ? 440 : 220,
                transform: 'skewX(-20deg)',
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)',
                mixBlendMode: 'screen',
                opacity: op,
                zIndex: 5,
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 540 - 105,
            top: 360,
            width: 210,
            height: 210,
            clipPath: `inset(${(1 - mark) * 100}% 0 0 0)`,
            transform: `translateY(${(1 - mark) * 26}px) scale(${1.15 - 0.15 * mark})`,
          }}
        >
          <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 210, height: 210}} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 590,
            display: 'flex',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 112,
            letterSpacing: '-0.02em',
            lineHeight: '140px',
            height: 140,
            overflow: 'hidden',
          }}
        >
          {word.split('').map((ch, i) => {
            const p = ramp(f, [E.logo + 6 + i, E.logo + 16 + i], [0, 1], easeOut);
            return (
              <span key={i} style={{display: 'inline-block', color: i < 7 ? '#fff' : BLUE, transform: `translateY(${(1 - p) * 110}%)`}}>
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 850,
            fontSize: 72,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{opacity: q1, transform: `translateY(${(1 - q1) * 30}px)`}}>{T.copy.ctaQ1}</div>
          <div style={{opacity: q2, transform: `translateY(${(1 - q2) * 30}px)`, color: '#cfe0ff'}}>{T.copy.ctaQ2}</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              padding: '30px 64px',
              borderRadius: 999,
              background: BLUE,
              color: '#fff',
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              opacity: cta,
              transform: `scale(${(0.85 + 0.15 * cta) * (1 + 0.015 * pulse * cta)})`,
              boxShadow: `0 18px ${50 + 30 * pulse}px rgba(59,116,255,${0.45 + 0.2 * pulse})`,
            }}
          >
            {T.copy.url}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1310,
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: '0.3em',
            color: '#21c063',
            opacity: live,
            transform: `scale(${0.9 + 0.1 * live})`,
          }}
        >
          {T.copy.live}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────────────── assembly
const len = (k: keyof typeof S) => S[k].to - S[k].from;

export const ShortCommercial: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence name="1 · Hook" from={S.hook.from} durationInFrames={len('hook')}>
        <Hook />
      </Sequence>
      <Sequence name="2 · CrewingMarket" from={S.solution.from} durationInFrames={len('solution')}>
        <Solution />
      </Sequence>
      <Sequence name="3 · Via WhatsApp" from={S.whatsapp.from} durationInFrames={len('whatsapp')}>
        <WhatsAppWay />
      </Sequence>
      <Sequence name="4 · Via het platform" from={S.app.from} durationInFrames={len('app')}>
        <PlatformWay />
      </Sequence>
      <Sequence name="5 · De matroos" from={S.crew.from} durationInFrames={len('crew')}>
        <Crew />
      </Sequence>
      <Sequence name="6 · Zzp'er reageert" from={S.freelancer.from} durationInFrames={len('freelancer')}>
        <FreelancerReacts />
      </Sequence>
      <Sequence name="7 · Direct contact" from={S.contact.from} durationInFrames={len('contact')}>
        <DirectContact />
      </Sequence>
      <Sequence name="9 · CTA" from={S.end.from} durationInFrames={len('end')}>
        <End />
      </Sequence>
      <Captions frame={frame} />
      <Finish frame={frame} />
      <Audio src={staticFile(T.audioOut)} />
    </AbsoluteFill>
  );
};

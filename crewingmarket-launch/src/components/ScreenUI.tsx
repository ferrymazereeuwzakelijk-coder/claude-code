import React from 'react';
import {Img, staticFile} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {easeOut, ramp} from '../lib/anim';
import {NATIVE_H, NATIVE_W} from './Phone';

const FONT = 'Inter, "SF Pro Text", system-ui, sans-serif';

/** One real screenshot, full screen, in native pixels. */
export const Shot: React.FC<{
  src: string;
  opacity?: number;
  y?: number;
  clipTop?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({src, opacity = 1, y = 0, clipTop, style, children}) => {
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: NATIVE_W,
        height: NATIVE_H,
        opacity,
        transform: y ? `translateY(${y}px)` : undefined,
        clipPath: clipTop !== undefined ? `inset(${clipTop}px 0 0 0)` : undefined,
        ...style,
      }}
    >
      <Img src={staticFile(`screens/${src}`)} style={{width: NATIVE_W, height: NATIVE_H, display: 'block'}} />
      {children}
    </div>
  );
};

/** Finger tap: soft touch point that presses, then a ripple ring. */
export const Tap: React.FC<{frame: number; at: number; x: number; y: number; dark?: boolean}> = ({
  frame,
  at,
  x,
  y,
  dark = true,
}) => {
  const d = frame - at;
  if (d < -7 || d > 20) return null;
  const approach = ramp(d, [-7, 0], [0, 1]);
  const release = ramp(d, [3, 14], [1, 0]);
  const press = d < 0 ? 1.25 - 0.25 * approach : d < 3 ? 0.86 : ramp(d, [3, 8], [0.86, 1]);
  const ring = ramp(d, [0, 18], [0, 1]);
  const col = dark ? '255,255,255' : '20,40,80';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 70,
          top: y - 70,
          width: 140,
          height: 140,
          borderRadius: 70,
          background: `radial-gradient(circle, rgba(${col},0.55) 0%, rgba(${col},0.32) 55%, rgba(${col},0) 72%)`,
          opacity: approach * release,
          transform: `scale(${press})`,
          boxShadow: `0 0 0 3px rgba(${col},${0.25 * approach * release})`,
        }}
      />
      {d >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 60,
            top: y - 60,
            width: 120,
            height: 120,
            borderRadius: 60,
            border: `5px solid rgba(${col},${0.7 * (1 - ring)})`,
            transform: `scale(${1 + ring * 1.6})`,
          }}
        />
      )}
    </>
  );
};

const BUBBLE_FONT = 47;
const BUBBLE_H = 113;
const BUBBLE_RIGHT = 1272;

/** Double check mark as drawn by WhatsApp. */
const Ticks: React.FC<{color: string}> = ({color}) => (
  <svg width={46} height={26} viewBox="0 0 46 26" style={{display: 'block'}}>
    <path d="M2 14 L9 21 L24 4" stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" />
    <path d="M17 20 L19 21 L34 4" stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" />
  </svg>
);

/**
 * Outgoing WhatsApp bubble, matched to the real one in the screenshots
 * (colour #154330, 113px tall, right edge at x=1272). `pop` animates it in.
 */
export const SentBubble: React.FC<{top: number; text: string; time: string; pop?: number}> = ({
  top,
  text,
  time,
  pop = 1,
}) => {
  const tw = measureText({text, fontFamily: FONT, fontSize: BUBBLE_FONT, fontWeight: '400'}).width;
  const w = Math.min(tw + 34 + 30 + 160, 1000);
  const s = 0.6 + 0.4 * pop;
  return (
    <div
      style={{
        position: 'absolute',
        left: BUBBLE_RIGHT - w,
        top,
        width: w + 14,
        height: BUBBLE_H,
        opacity: Math.min(1, pop * 1.6),
        transform: `translateY(${(1 - pop) * 60}px) scale(${s})`,
        transformOrigin: '100% 100%',
      }}
    >
      <svg width={w + 14} height={BUBBLE_H} style={{position: 'absolute', left: 0, top: 0}}>
        <path
          d={`M34 0 H${w - 6} Q${w + 4} 0 ${w + 14} 0 Q${w + 2} 10 ${w} 22 V${BUBBLE_H - 34} Q${w} ${BUBBLE_H} ${
            w - 34
          } ${BUBBLE_H} H34 Q0 ${BUBBLE_H} 0 ${BUBBLE_H - 34} V34 Q0 0 34 0 Z`}
          fill="#154330"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 22,
          fontFamily: FONT,
          fontSize: BUBBLE_FONT,
          color: '#e9edef',
          whiteSpace: 'nowrap',
          letterSpacing: -0.2,
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 30,
          bottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: FONT,
          fontSize: 30,
          color: 'rgba(233,237,239,0.62)',
        }}
      >
        {time}
        <Ticks color="rgba(233,237,239,0.62)" />
      </div>
    </div>
  );
};

/** Text being typed into the WhatsApp composer of the empty chat screenshot. */
export const TypingField: React.FC<{frame: number; text: string; start: number; end: number; sent: number}> = ({
  frame,
  text,
  start,
  end,
  sent,
}) => {
  const n = frame >= sent ? 0 : Math.round(ramp(frame, [start, end], [0, text.length], (t) => t));
  const shown = text.slice(0, n);
  const tw = measureText({text: shown || ' ', fontFamily: FONT, fontSize: 46, fontWeight: '400'}).width;
  const boxW = 610;
  const shift = Math.min(0, boxW - tw - 12);
  const typing = n > 0;
  const cursorOn = typing ? true : Math.floor(frame / 14) % 2 === 0;
  return (
    <>
      {/* hide the static cursor baked into the screenshot */}
      <div style={{position: 'absolute', left: 222, top: 1716, width: 26, height: 84, background: '#161616'}} />
      <div style={{position: 'absolute', left: 236, top: 1718, width: boxW, height: 80, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: shift,
            top: 10,
            fontFamily: FONT,
            fontSize: 46,
            color: '#e9edef',
            whiteSpace: 'nowrap',
          }}
        >
          {shown}
        </div>
        <div
          style={{
            position: 'absolute',
            left: shift + (typing ? tw + 3 : 0),
            top: 12,
            width: 4,
            height: 58,
            borderRadius: 2,
            background: '#21c063',
            opacity: cursorOn ? 1 : 0,
          }}
        />
      </div>
      {typing && (
        <>
          {/* camera icon hides while typing, mic turns into send */}
          <div style={{position: 'absolute', left: 1008, top: 1694, width: 120, height: 124, background: '#0e0e0e'}} />
          <div
            style={{
              position: 'absolute',
              left: 1211 - 62,
              top: 1756 - 62,
              width: 124,
              height: 124,
              borderRadius: 62,
              background: '#21c063',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${ramp(frame, [start, start + 5], [0.6, 1])})`,
            }}
          >
            <svg width={56} height={56} viewBox="0 0 24 24">
              <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z" fill="#0b0b0b" />
            </svg>
          </div>
        </>
      )}
    </>
  );
};

/** Pulsing focus frame drawn around a region of the real UI. */
export const Highlight: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  radius?: number;
}> = ({frame, at, x, y, w, h, color = '#3b74ff', radius = 36}) => {
  const p = ramp(frame, [at, at + 12], [0, 1], easeOut);
  if (p <= 0) return null;
  const pulse = 0.5 + 0.5 * Math.sin((frame - at) / 5);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        border: `7px solid ${color}`,
        opacity: p,
        transform: `scale(${1.08 - 0.08 * p})`,
        boxShadow: `0 0 ${30 + 30 * pulse}px ${color}88, inset 0 0 ${20 + 20 * pulse}px ${color}44`,
      }}
    />
  );
};

type ShotSpec = {src: string; children?: React.ReactNode};

/**
 * Realistic chat scroll between two screenshots of the same conversation:
 * header, composer and keyboard stay fixed; the message list moves by `dy`
 * native px while the new state slides in underneath.
 */
export const ScrollSwap: React.FC<{
  frame: number;
  start: number;
  dur: number;
  dy: number;
  a: ShotSpec;
  b: ShotSpec;
  top: number;
  bottom: number;
}> = ({frame, start, dur, dy, a, b, top, bottom}) => {
  if (frame < start) return <Shot src={a.src}>{a.children}</Shot>;
  if (frame >= start + dur) return <Shot src={b.src}>{b.children}</Shot>;
  const p = ramp(frame, [start, start + dur], [0, 1], easeOut);
  const clip = `inset(${top}px 0 ${NATIVE_H - bottom}px 0)`;
  return (
    <>
      <Shot src={b.src} />
      <div style={{position: 'absolute', inset: 0, clipPath: clip}}>
        <Shot src={a.src} y={-dy * p} style={{clipPath: `inset(0 0 ${NATIVE_H - bottom}px 0)`}}>
          {a.children}
        </Shot>
        <Shot src={b.src} y={dy * (1 - p)} style={{clipPath: `inset(${top}px 0 0 0)`}}>
          {b.children}
        </Shot>
      </div>
    </>
  );
};

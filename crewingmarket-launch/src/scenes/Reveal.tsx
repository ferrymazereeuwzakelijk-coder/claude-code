import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {PALETTES, SeaScene} from '../components/SeaScene';
import {Footage} from '../components/Footage';
import {FOOTAGE} from '../footage';
import {easeInOut, easeOut, ramp, shake, TL} from '../lib/anim';

const FONT = 'Inter, sans-serif';
const R = TL.reveal;

/** 0:24.5 – 0:26.5  A vessel underway at golden hour. */
export const Underway: React.FC = () => {
  const from = TL.scenes.underway.from;
  const to = TL.scenes.underway.to;
  const f = useCurrentFrame() + from;
  const fadeInA = ramp(f, [from, from + 8], [0, 1], easeInOut);
  const fadeOut = ramp(f, [to - 9, to], [0, 1], easeInOut);
  return (
    <AbsoluteFill style={{background: '#02060d'}}>
      <AbsoluteFill style={{opacity: fadeInA * (1 - fadeOut)}}>
        {FOOTAGE.underway ? (
          <Footage clip={FOOTAGE.underway} t={f - from} length={to - from} push={0.12} grade="gold" />
        ) : (
          <SeaScene
              frame={f}
              palette={PALETTES.dusk}
              horizon={0.54}
              zoom={1 + ramp(f, [from, to], [0, 0.1], (t) => t)}
              vessel={{x: 470 - from * 1.3, y: 1300, scale: 2.0, speed: 1.3}}
              glowX={560}
            />
        )}
        <AbsoluteFill
          style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45) 100%)'}}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 0:26.5 – 0:30  CrewingMarket logo reveal + launch date. */
export const Reveal: React.FC = () => {
  const from = TL.scenes.reveal.from;
  const f = useCurrentFrame() + from;
  const sh = shake(f, [R.logoHit, R.live], 9);

  const mark = ramp(f, [R.logoHit, R.logoHit + 16], [0, 1], easeOut);
  const bloom = ramp(f, [R.logoHit, R.logoHit + 4], [0, 1]) * ramp(f, [R.logoHit + 4, R.logoHit + 40], [1, 0.45]);
  const line = ramp(f, [R.date - 4, R.date + 14], [0, 1], easeOut);
  const date = ramp(f, [R.date, R.date + 14], [0, 1], easeOut);
  const live = ramp(f, [R.live, R.live + 8], [0, 1], easeOut);
  const url = ramp(f, [R.url, R.url + 12], [0, 1], easeOut);
  const sweep = ramp(f, [R.live + 2, R.live + 26], [-0.3, 1.3], easeInOut);
  const drift = ramp(f, [from, TL.durationInFrames], [1.0, 1.035], (t) => t);

  const word = 'CrewingMarket';

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 80% 55% at 50% 40%, #0f2242 0%, #081427 45%, #02060d 100%)',
        overflow: 'hidden',
      }}
    >
      {/* soft light sweep across the backdrop */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, rgba(255,255,255,0) ${30 + (f - from) * 0.4}%, rgba(120,160,255,0.06) ${
            40 + (f - from) * 0.4
          }%, rgba(255,255,255,0) ${50 + (f - from) * 0.4}%)`,
        }}
      />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${drift})`}}>
        {/* bloom behind the mark */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 420,
            top: 660 - 420,
            width: 840,
            height: 840,
            borderRadius: 420,
            background: 'radial-gradient(circle, rgba(59,116,255,0.45) 0%, rgba(59,116,255,0.12) 35%, rgba(59,116,255,0) 70%)',
            opacity: bloom,
          }}
        />
        {/* logo mark: wipes up out of the "water" */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 130,
            top: 520,
            width: 260,
            height: 260,
            clipPath: `inset(${(1 - mark) * 100}% 0 0 0)`,
            transform: `translateY(${(1 - mark) * 30}px) scale(${1.15 - 0.15 * mark})`,
            filter: `blur(${(1 - mark) * 8}px) drop-shadow(0 0 30px rgba(59,116,255,${0.5 * bloom}))`,
          }}
        >
          <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 260, height: 260}} />
        </div>
        {/* wordmark, letter by letter */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 820,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 120,
            letterSpacing: '-0.02em',
            lineHeight: '150px',
            height: 150,
            overflow: 'hidden',
          }}
        >
          {word.split('').map((ch, i) => {
            const p = ramp(f, [R.wordmark + i * 1.2, R.wordmark + i * 1.2 + 12], [0, 1], easeOut);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: i < 7 ? '#ffffff' : '#3b74ff',
                  transform: `translateY(${(1 - p) * 110}%)`,
                  opacity: p,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        {/* divider */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 170 * line,
            width: 340 * line,
            top: 1032,
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(90deg, rgba(59,116,255,0), #3b74ff, rgba(59,116,255,0))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1072,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 42,
            letterSpacing: `${0.6 - 0.28 * date}em`,
            color: '#c9d6ec',
            opacity: date,
          }}
        >
          {TL.copy.launchDate}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1150,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 118,
            letterSpacing: '-0.01em',
            color: '#fff',
            opacity: live,
            transform: `scale(${1.25 - 0.25 * live})`,
            filter: `blur(${(1 - live) * 10}px)`,
            backgroundImage: `linear-gradient(100deg, #fff ${sweep * 100 - 12}%, #9cc0ff ${sweep * 100}%, #fff ${
              sweep * 100 + 12
            }%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {TL.copy.launchLine}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1318,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: '0.04em',
            color: '#8fb0ff',
            opacity: url,
            transform: `translateY(${(1 - url) * 16}px)`,
          }}
        >
          {TL.copy.url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

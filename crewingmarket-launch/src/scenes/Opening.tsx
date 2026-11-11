import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {PALETTES, SeaScene} from '../components/SeaScene';
import {OPENING_SHOTS} from '../footage';
import {easeIn, easeOut, ramp, shake, TL} from '../lib/anim';

const BLUE = '#3b74ff';

/** 0:00 – 0:04.5  "MORGEN EEN MATROOS NODIG?" over a tug at night. */
export const Opening: React.FC = () => {
  const f = useCurrentFrame(); // scene starts at 0
  const words = TL.copy.hook;
  const at = TL.hookWords;
  const end = TL.scenes.opening.to;

  const sh = shake(f, [0, ...at], 10);
  const zoom = 1 + ramp(f, [0, end], [0, 0.14], (t) => t) + ramp(f, [0, 10], [0.12, 0]);
  const flash = ramp(f, [0, 12], [1, 0], easeOut);
  const cutPop = OPENING_SHOTS.slice(1).reduce((a, sh) => Math.max(a, ramp(f, [sh.from, sh.from + 4], [0.35, 0])), 0);

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(1.04)`}}>
        {OPENING_SHOTS.length === 0 ? (
          <SeaScene
            frame={f + 40}
            palette={PALETTES.night}
            horizon={0.62}
            zoom={zoom}
            vessel={{x: 470, y: 1190 + 150, scale: 1.55, speed: 0.55}}
            rain={1}
            searchlight={0.9}
            glowX={720}
          />
        ) : (
          OPENING_SHOTS.map((shot) => (
            <Sequence key={shot.from} from={shot.from} durationInFrames={shot.to - shot.from} layout="none">
              <Footage clip={shot.clip} t={f - shot.from} length={shot.to - shot.from} push={shot.push} grade="night" />
            </Sequence>
          ))
        )}
      </AbsoluteFill>

      {/* top/bottom shade for legibility */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* hook typography */}
      <AbsoluteFill style={{padding: '0 84px', justifyContent: 'flex-start', paddingTop: 300}}>
        {words.map((w, i) => {
          const a = at[i];
          const p = ramp(f, [a, a + 8], [0, 1], easeOut);
          const out = ramp(f, [end - 26 + i * 2, end - 10 + i * 2], [0, 1], easeIn);
          const isKey = i === 2;
          if (p <= 0) return <div key={w} style={{height: 158}} />;
          return (
            <div
              key={w}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontSize: isKey ? 172 : 150,
                lineHeight: isKey ? '176px' : '158px',
                letterSpacing: `${0.2 * (1 - p) - 0.02}em`,
                color: isKey ? BLUE : '#fff',
                opacity: p * (1 - out),
                filter: `blur(${(1 - p) * 16 + out * 18}px)`,
                transform: `translateY(${(1 - p) * 40 - out * 80}px) scale(${1 + (1 - p) * 0.3})`,
                transformOrigin: '0% 50%',
                textShadow: isKey ? `0 0 60px rgba(59,116,255,0.55)` : '0 6px 40px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
              }}
            >
              {w}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* lens flash: the searchlight hits the camera on frame 0 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 55% 52%, rgba(255,255,255,${flash}) 0%, rgba(190,215,255,${
            flash * 0.8
          }) 30%, rgba(0,0,0,0) 75%)`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill style={{background: '#fff', opacity: f > 0 ? cutPop : 0, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

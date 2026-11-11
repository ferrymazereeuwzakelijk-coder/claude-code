import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {rand} from '../lib/anim';

/** Film grain + vignette applied over the whole spot. */
export const Finish: React.FC<{frame: number; grain?: number; vignette?: number}> = ({
  frame,
  grain = 0.07,
  vignette = 0.55,
}) => {
  const i = frame % 4;
  const ox = Math.floor(rand(frame) * 512);
  const oy = Math.floor(rand(frame + 99) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill style={{opacity: grain, mixBlendMode: 'overlay', overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: -ox,
            top: -oy,
            width: 1080 + 1024,
            height: 1920 + 1024,
            backgroundImage: `url(${staticFile(`fx/grain${i}.png`)})`,
            backgroundSize: '512px 512px',
          }}
        />
      </AbsoluteFill>
      {/* preload all grain tiles */}
      <div style={{display: 'none'}}>
        {[0, 1, 2, 3].map((k) => (
          <Img key={k} src={staticFile(`fx/grain${k}.png`)} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Small frosted label used to name the two sides of the marketplace. */
export const RoleLabel: React.FC<{text: string; sub?: string; opacity: number; y?: number; dark?: boolean}> = ({
  text,
  sub,
  opacity,
  y = 0,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 16,
      padding: '16px 30px',
      borderRadius: 999,
      background: 'rgba(12,24,41,0.55)',
      border: '1px solid rgba(255,255,255,0.14)',
      backdropFilter: 'blur(14px)',
      opacity,
      transform: `translateY(${y}px)`,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{width: 12, height: 12, borderRadius: 6, background: '#3b74ff', boxShadow: '0 0 12px #3b74ff'}} />
    <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '0.16em'}}>{text}</span>
    {sub && <span style={{fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.7)'}}>{sub}</span>}
  </div>
);

import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {CamKey} from '../lib/anim';

/** Native size of the supplied iPhone screenshots. */
export const NATIVE_W = 1320;
export const NATIVE_H = 2868;

/** On-screen size of the display at scale 1 (iPhone 15/16 Pro proportions). */
const SW = 640;
const K = SW / NATIVE_W;
const SH = NATIVE_H * K;
const BEZEL = 15;
const W = SW + BEZEL * 2;
const H = SH + BEZEL * 2;
const R_SCREEN = 92;
const R_BODY = R_SCREEN + BEZEL;
const DEPTH = 26;

type Props = {
  cam: Required<CamKey>;
  children: React.ReactNode;
  /** Gaussian blur in px (motion blur on whips). */
  blur?: number;
  /** 0..1 strength of the soft floor shadow. */
  shadow?: number;
  /** Light UI apps reflect more of the glare. */
  glare?: number;
  style?: React.CSSProperties;
};

/**
 * Photoreal-ish 3D smartphone. The screen content is laid out in native
 * screenshot pixels (1320 x 2868) and scaled into the display, so overlays such
 * as taps and chat bubbles line up exactly with the real UI underneath.
 */
export const Phone: React.FC<Props> = ({cam, children, blur = 0, shadow = 1, glare = 1, style}) => {
  const dx = (cam.fx - NATIVE_W / 2) * K;
  const dy = (cam.fy - NATIVE_H / 2) * K;

  const transform = [
    `translate3d(${cam.tx - dx}px, ${cam.ty - dy}px, 0)`,
    `scale(${cam.s})`,
    `rotateX(${cam.rx}deg)`,
    `rotateY(${cam.ry}deg)`,
    `rotateZ(${cam.rz}deg)`,
  ].join(' ');

  // Glare position follows the yaw so reflections slide across the glass.
  const glarePos = 50 + cam.ry * 2.2 + cam.rx * 0.8;

  const layers = [];
  for (let i = 1; i <= 8; i++) {
    const z = -(DEPTH / 8) * i;
    layers.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: R_BODY,
          transform: `translateZ(${z}px)`,
          background:
            i === 8
              ? 'linear-gradient(160deg, #2a2e35 0%, #0d0f12 55%, #22262c 100%)'
              : `linear-gradient(90deg, #5d636c 0%, #1b1e23 6%, #121418 50%, #1b1e23 94%, #5d636c 100%)`,
          boxShadow: i === 8 ? `0 ${70 * shadow}px ${140 * shadow}px rgba(0,0,0,${0.6 * shadow})` : undefined,
        }}
      />,
    );
  }

  return (
    <AbsoluteFill style={{perspective: 2800, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, ...style}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: W,
          height: H,
          marginLeft: -W / 2,
          marginTop: -H / 2,
          transformOrigin: `${W / 2 + dx}px ${H / 2 + dy}px`,
          transform,
          transformStyle: 'preserve-3d',
        }}
      >
        {layers}
        {/* side buttons */}
        {[
          {side: 'left', top: 250, h: 70},
          {side: 'left', top: 360, h: 120},
          {side: 'left', top: 500, h: 120},
          {side: 'right', top: 400, h: 190},
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: b.top,
              [b.side]: -5,
              width: 8,
              height: b.h,
              borderRadius: 4,
              transform: `translateZ(${-DEPTH / 2}px)`,
              background: 'linear-gradient(90deg,#1a1d22,#6b7079,#1a1d22)',
            }}
          />
        ))}
        {/* front titanium frame */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: R_BODY,
            background: 'linear-gradient(135deg,#8a9099 0%,#3b4048 18%,#1c1f24 50%,#454a52 82%,#9aa0a8 100%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.18)',
          }}
        />
        {/* black bezel */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: R_BODY - 4,
            background: '#030303',
          }}
        />
        {/* display */}
        <div
          style={{
            position: 'absolute',
            left: BEZEL,
            top: BEZEL,
            width: SW,
            height: SH,
            borderRadius: R_SCREEN,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: NATIVE_W,
              height: NATIVE_H,
              transform: `scale(${K})`,
              transformOrigin: '0 0',
            }}
          >
            {children}
          </div>
          {/* glass reflections */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(115deg, rgba(255,255,255,0) ${glarePos - 22}%, rgba(255,255,255,${
                0.07 * glare
              }) ${glarePos - 6}%, rgba(255,255,255,${0.02 * glare}) ${glarePos + 4}%, rgba(255,255,255,0) ${
                glarePos + 14
              }%)`,
              mixBlendMode: 'screen',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: R_SCREEN,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 2px 14px rgba(255,255,255,0.05)',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {rand} from '../lib/anim';

/**
 * Stylised maritime environment rendered on canvas (deterministic per frame).
 *
 * This is a FALLBACK for real footage: no maritime video was supplied, and the
 * brief forbids AI-generated footage. Drop licensed clips into public/footage and
 * reference them in src/footage.ts — <Footage> then plays the real clip instead.
 */

export type Palette = {
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  glow: string; // r,g,b
  glowAlpha: number;
  seaTop: string;
  seaBottom: string;
  glitterWarm: string; // r,g,b
  glitterCool: string; // r,g,b
  glitterGain: number;
  silhouette: string;
  haze: string; // r,g,b
  rim: string; // r,g,b
  lights: number; // vessel light intensity
};

export const PALETTES: Record<'night' | 'dusk' | 'blue', Palette> = {
  night: {
    skyTop: '#02050b',
    skyMid: '#07111e',
    skyHorizon: '#1a2533',
    glow: '255,140,60',
    glowAlpha: 0.28,
    seaTop: '#0b1622',
    seaBottom: '#010306',
    glitterWarm: '255,176,110',
    glitterCool: '120,150,190',
    glitterGain: 0.85,
    silhouette: '#03070c',
    haze: '60,74,92',
    rim: '255,160,100',
    lights: 1,
  },
  dusk: {
    skyTop: '#0b1526',
    skyMid: '#2b3550',
    skyHorizon: '#c4744d',
    glow: '255,190,120',
    glowAlpha: 0.65,
    seaTop: '#3a3036',
    seaBottom: '#06080d',
    glitterWarm: '255,200,140',
    glitterCool: '150,160,200',
    glitterGain: 1.25,
    silhouette: '#07080c',
    haze: '200,130,100',
    rim: '255,190,130',
    lights: 0.7,
  },
  blue: {
    skyTop: '#06142a',
    skyMid: '#163257',
    skyHorizon: '#6f8fb3',
    glow: '170,200,255',
    glowAlpha: 0.35,
    seaTop: '#1d3552',
    seaBottom: '#030a14',
    glitterWarm: '200,220,255',
    glitterCool: '120,160,210',
    glitterGain: 0.9,
    silhouette: '#040a14',
    haze: '110,140,180',
    rim: '170,200,255',
    lights: 0.8,
  },
};

type Props = {
  frame: number;
  palette: Palette;
  /** Horizon height as fraction of frame. */
  horizon?: number;
  /** Camera push-in (1 = none). */
  zoom?: number;
  vessel?: {x: number; y: number; scale: number; speed?: number} | null;
  rain?: number;
  /** Searchlight sweep strength 0..1 (opening shot). */
  searchlight?: number;
  glowX?: number;
};

const W = 1080;
const H = 1920;

export const SeaScene: React.FC<Props> = (props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    draw(ctx, props);
  });
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, width: W, height: H}} />;
};

function draw(ctx: CanvasRenderingContext2D, p: Props) {
  const {frame: t, palette: P} = p;
  const hz = (p.horizon ?? 0.5) * H;
  const zoom = p.zoom ?? 1;
  const gx = p.glowX ?? W * 0.62;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // camera push around the horizon
  ctx.translate(W / 2, hz);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -hz);

  // ---- sky
  const sky = ctx.createLinearGradient(0, -200, 0, hz);
  sky.addColorStop(0, P.skyTop);
  sky.addColorStop(0.6, P.skyMid);
  sky.addColorStop(1, P.skyHorizon);
  ctx.fillStyle = sky;
  ctx.fillRect(-300, -300, W + 600, hz + 300);

  const glow = ctx.createRadialGradient(gx, hz, 0, gx, hz, 900);
  glow.addColorStop(0, `rgba(${P.glow},${P.glowAlpha})`);
  glow.addColorStop(0.35, `rgba(${P.glow},${P.glowAlpha * 0.35})`);
  glow.addColorStop(1, `rgba(${P.glow},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-300, -300, W + 600, hz + 300);

  // ---- slow clouds
  for (let i = 0; i < 16; i++) {
    const cx = ((rand(i * 3.1) * 1.6 - 0.3) * W + t * (0.15 + rand(i) * 0.25)) % (W * 1.6) - W * 0.3;
    const cy = hz * (0.1 + rand(i * 7.7) * 0.8);
    const rx = 260 + rand(i * 5.3) * 420;
    const ry = rx * (0.18 + rand(i * 2.9) * 0.12);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, `rgba(0,0,0,${0.18 + rand(i * 1.3) * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- distant coastline: port + wind turbines (Groningen coast)
  ctx.fillStyle = P.silhouette;
  ctx.beginPath();
  ctx.moveTo(-300, hz + 2);
  for (let x = -300; x <= W + 300; x += 18) {
    const bump = 3 + rand(Math.floor(x / 18) * 1.7) * 9 + (x > 120 && x < 520 ? rand(x) * 16 : 0);
    ctx.lineTo(x, hz - bump);
  }
  ctx.lineTo(W + 300, hz + 2);
  ctx.fill();
  // cranes
  ctx.strokeStyle = P.silhouette;
  ctx.lineWidth = 3;
  for (const [x, h] of [
    [170, 64],
    [260, 82],
    [410, 58],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, hz - 8);
    ctx.lineTo(x, hz - h);
    ctx.lineTo(x + h * 0.9, hz - h + 6);
    ctx.moveTo(x - 18, hz - h + 2);
    ctx.lineTo(x, hz - h);
    ctx.stroke();
  }
  // turbines
  for (let i = 0; i < 7; i++) {
    const x = 620 + i * 95 + rand(i * 9) * 40;
    const th = 70 + rand(i * 4) * 40;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, hz - 4);
    ctx.lineTo(x, hz - th);
    ctx.stroke();
    const a0 = t * 0.045 + i * 1.3;
    ctx.lineWidth = 1.8;
    for (let b = 0; b < 3; b++) {
      const a = a0 + (b * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(x, hz - th);
      ctx.lineTo(x + Math.cos(a) * th * 0.55, hz - th + Math.sin(a) * th * 0.55);
      ctx.stroke();
    }
    // aviation light
    if ((t + i * 7) % 40 < 20) {
      dot(ctx, x, hz - th - 2, 2.2, `rgba(255,40,30,0.95)`, 10);
    }
  }
  // harbour lights
  for (let i = 0; i < 26; i++) {
    const x = 80 + rand(i * 2.3) * 560;
    const y = hz - 3 - rand(i * 6.1) * 12;
    dot(ctx, x, y, 1.6, `rgba(${P.glitterWarm},0.9)`, 6);
  }

  // ---- haze band on horizon
  const haze = ctx.createLinearGradient(0, hz - 120, 0, hz + 140);
  haze.addColorStop(0, `rgba(${P.haze},0)`);
  haze.addColorStop(0.5, `rgba(${P.haze},0.22)`);
  haze.addColorStop(1, `rgba(${P.haze},0)`);
  ctx.fillStyle = haze;
  ctx.fillRect(-300, hz - 120, W + 600, 260);

  // ---- sea
  const sea = ctx.createLinearGradient(0, hz, 0, H + 300);
  sea.addColorStop(0, P.seaTop);
  sea.addColorStop(1, P.seaBottom);
  ctx.fillStyle = sea;
  ctx.fillRect(-300, hz, W + 600, H - hz + 400);

  // wave structure + glitter (perspective rows)
  const rows = 150;
  for (let r = 0; r < rows; r++) {
    const d = (r + 1) / rows;
    const dd = d * d;
    const y = hz + 2 + dd * (H - hz + 300);
    const thick = 0.8 + dd * 7;
    const per = 26;
    for (let i = 0; i < per; i++) {
      const seed = r * 97.13 + i * 13.7;
      const drift = t * (0.25 + dd * 2.2) * (rand(seed + 4) > 0.5 ? 1 : -0.6);
      let x = ((rand(seed) * 1.6 - 0.3) * W + drift) % (W * 1.6);
      if (x < -0.3 * W) x += W * 1.6;
      x -= 0.3 * W;
      const len = 4 + dd * 120 * (0.4 + rand(seed + 1));
      const yy = y + Math.sin(t * 0.07 + seed) * dd * 6;
      // trough
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${0.18 + dd * 0.22})`;
      ctx.fillRect(x - len * 0.2, yy + thick * 0.6, len * 1.3, thick * 1.6);
      // highlight
      const refl = Math.exp(-Math.pow((x - gx) / (180 + dd * 520), 2));
      const shimmer = 0.5 + 0.5 * Math.sin(t * (0.12 + rand(seed + 2) * 0.25) + seed);
      const a = (0.06 + refl * 0.6) * shimmer * P.glitterGain * (1 - dd * 0.45);
      if (a < 0.015) continue;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${refl > 0.3 ? P.glitterWarm : P.glitterCool},${Math.min(1, a)})`;
      ctx.fillRect(x, yy, len, Math.max(0.8, thick * 0.45));
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // ---- vessel
  if (p.vessel) drawTug(ctx, t, p.vessel, P, hz, p.searchlight ?? 0);

  // ---- rain
  if (p.rain) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(200,215,235,${0.09 * p.rain})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 260; i++) {
      const x = (rand(i * 1.9) * (W + 400) + t * 9) % (W + 400) - 200;
      const y = (rand(i * 4.7) * (H + 200) + t * 62) % (H + 200) - 100;
      const l = 26 + rand(i) * 40;
      ctx.moveTo(x, y);
      ctx.lineTo(x - l * 0.18, y - l);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glow: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function reflection(ctx: CanvasRenderingContext2D, t: number, x: number, y0: number, len: number, color: string, w: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    const y = y0 + k * len;
    const jit = Math.sin(t * 0.3 + i * 1.7) * (4 + k * 18);
    const ww = w * (0.6 + k * 1.8) * (0.5 + rand(i + Math.floor(t / 3)) * 0.8);
    ctx.fillStyle = `rgba(${color},${0.45 * (1 - k)})`;
    ctx.fillRect(x - ww / 2 + jit, y, ww, 2 + k * 4);
  }
  ctx.restore();
}

/** Harbour tug in profile (bow to the right), built from simple shapes. */
function drawTug(
  ctx: CanvasRenderingContext2D,
  t: number,
  v: {x: number; y: number; scale: number; speed?: number},
  P: Palette,
  hz: number,
  searchlight: number,
) {
  const s = v.scale;
  const x0 = v.x + (v.speed ?? 0) * t;
  const y0 = v.y + Math.sin(t * 0.085) * 3 * s;
  const roll = Math.sin(t * 0.06) * 0.012;

  // reflections of lights (drawn before hull)
  const L = P.lights;
  reflection(ctx, t, x0 + 60 * s, y0 + 8 * s, 330 * s, `255,205,150`, 26 * s * L);
  reflection(ctx, t, x0 + 92 * s, y0 + 8 * s, 260 * s, `60,255,140`, 10 * s * L);
  reflection(ctx, t, x0 - 120 * s, y0 + 8 * s, 300 * s, `255,230,200`, 22 * s * L);

  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(roll);
  ctx.scale(s, s);

  // wake & bow wave
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    const k = rand(i * 3.3);
    const age = ((t * 1.6 + i * 9) % 160) / 160;
    const wx = -200 - age * 520 + rand(i) * 30;
    const wy = 2 + (rand(i * 1.1) - 0.5) * (8 + age * 50);
    ctx.fillStyle = `rgba(230,240,255,${0.16 * (1 - age)})`;
    ctx.fillRect(wx, wy, 20 + k * 50, 2.4);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    const r = 18 + rand(i + Math.floor(t / 2)) * 16;
    ctx.fillStyle = `rgba(235,242,255,${0.32})`;
    ctx.fillRect(205 + Math.cos(a) * r * 0.5 - 6, 2 + Math.sin(a) * 6 - 3, 16, 2.4);
  }
  ctx.restore();

  // hull
  ctx.fillStyle = P.silhouette;
  ctx.beginPath();
  ctx.moveTo(-205, 8);
  ctx.lineTo(-210, -38);
  ctx.lineTo(150, -44);
  ctx.quadraticCurveTo(200, -48, 222, -66);
  ctx.lineTo(214, -20);
  ctx.quadraticCurveTo(205, 8, 150, 10);
  ctx.closePath();
  ctx.fill();
  // fender band
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-206, -30);
  ctx.lineTo(150, -36);
  ctx.quadraticCurveTo(196, -40, 214, -56);
  ctx.stroke();
  // rim light on sheer line
  ctx.strokeStyle = `rgba(${P.rim},0.55)`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-210, -39);
  ctx.lineTo(150, -45);
  ctx.quadraticCurveTo(200, -49, 222, -67);
  ctx.stroke();

  // deckhouse
  const house = ctx.createLinearGradient(0, -140, 0, -40);
  house.addColorStop(0, '#121b27');
  house.addColorStop(1, P.silhouette);
  ctx.fillStyle = house;
  ctx.fillRect(-70, -88, 160, 46);
  // wheelhouse with raked front
  ctx.beginPath();
  ctx.moveTo(0, -88);
  ctx.lineTo(0, -140);
  ctx.lineTo(112, -140);
  ctx.lineTo(122, -88);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0a0f16';
  ctx.fillRect(-6, -146, 132, 7);
  // windows
  ctx.save();
  ctx.shadowColor = `rgba(255,200,130,${0.9 * L})`;
  ctx.shadowBlur = 18;
  for (let i = 0; i < 6; i++) {
    const flick = 0.85 + 0.15 * Math.sin(t * 0.21 + i);
    ctx.fillStyle = `rgba(255,${205 + i * 4},${140 + i * 6},${0.85 * flick * L})`;
    ctx.fillRect(8 + i * 18, -132, 13, 22);
  }
  ctx.fillStyle = `rgba(255,190,120,${0.55 * L})`;
  ctx.fillRect(-60, -76, 10, 12);
  ctx.fillRect(-40, -76, 10, 12);
  ctx.restore();
  // rim on wheelhouse roof
  ctx.strokeStyle = `rgba(${P.rim},0.45)`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -146);
  ctx.lineTo(126, -146);
  ctx.stroke();

  // exhaust stacks
  ctx.fillStyle = P.silhouette;
  ctx.fillRect(-40, -150, 13, 62);
  ctx.fillRect(-22, -150, 13, 62);
  // mast
  ctx.fillRect(56, -238, 5, 92);
  ctx.fillRect(38, -205, 42, 4);
  // aft winch + towing arch
  ctx.fillRect(-170, -62, 50, 22);
  ctx.strokeStyle = P.silhouette;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-110, -40);
  ctx.quadraticCurveTo(-110, -105, -80, -105);
  ctx.lineTo(-80, -88);
  ctx.stroke();

  // floodlight cone onto the aft deck
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(40, -200, -150, -40);
  cone.addColorStop(0, `rgba(255,236,200,${0.22 * L})`);
  cone.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(42, -203);
  ctx.lineTo(-205, -40);
  ctx.lineTo(-40, -40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // nav lights
  ctx.restore();
  const lx = (ux: number, uy: number) => [
    x0 + (ux * Math.cos(roll) - uy * Math.sin(roll)) * s,
    y0 + (ux * Math.sin(roll) + uy * Math.cos(roll)) * s,
  ];
  const [mx, my] = lx(58, -240);
  dot(ctx, mx, my, 2.6 * s, `rgba(255,255,240,${L})`, 22 * s);
  const [fx, fy] = lx(42, -203);
  dot(ctx, fx, fy, 3 * s, `rgba(255,245,220,${L})`, 30 * s);
  const [gx, gy] = lx(118, -118);
  dot(ctx, gx, gy, 2.4 * s, `rgba(60,255,140,${L})`, 18 * s);
  const [sx, sy] = lx(-205, -44);
  dot(ctx, sx, sy, 2 * s, `rgba(255,250,235,${L})`, 14 * s);

  // searchlight sweeping toward camera
  if (searchlight > 0) {
    const [ox, oy] = lx(60, -150);
    const ang = -0.25 + Math.sin(t * 0.045) * 0.9;
    const len = 2600;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(ox, oy);
    ctx.rotate(ang + Math.PI / 2.6);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, `rgba(255,250,235,${0.55 * searchlight})`);
    g.addColorStop(0.3, `rgba(220,235,255,${0.16 * searchlight})`);
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(len, -260);
    ctx.lineTo(len, 260);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    dot(ctx, ox, oy, 5 * s, `rgba(255,255,245,${searchlight})`, 60 * s);
  }
  void hz;
}

/** Plays a real clip if one is configured, otherwise the canvas fallback. */
export const Footage: React.FC<{
  src: string | null;
  startFrom?: number;
  fallback: React.ReactNode;
  style?: React.CSSProperties;
}> = ({src, startFrom = 0, fallback, style}) => {
  if (!src) return <>{fallback}</>;
  return (
    <AbsoluteFill style={style}>
      <OffthreadVideo
        src={staticFile(src)}
        startFrom={startFrom}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </AbsoluteFill>
  );
};

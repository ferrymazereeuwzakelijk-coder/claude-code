import {Easing, interpolate} from 'remotion';
import timelineJson from '../timeline.json';

export const TL = timelineJson;

/** Premium "expo-out" curve used for most entrances. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** Smooth camera move between two holds. */
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** Fast acceleration — whips and exits. */
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

/** Clamped interpolate with easing. */
export const ramp = (
  frame: number,
  [a, b]: [number, number],
  [from, to]: [number, number],
  easing: (t: number) => number = easeOut,
) =>
  interpolate(frame, [a, b], [from, to], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** 0 -> 1 fade beginning at `start` and lasting `dur` frames. */
export const fadeIn = (frame: number, start: number, dur = 6) =>
  ramp(frame, [start, start + dur], [0, 1], easeInOut);

export type CamKey = {
  f: number;
  s?: number; // phone scale
  fx?: number; // focus point (native screenshot px) brought to frame centre
  fy?: number;
  rx?: number; // degrees
  ry?: number;
  rz?: number;
  tx?: number; // extra translation in frame px
  ty?: number;
};

const DEFAULTS: Required<Omit<CamKey, 'f'>> = {
  s: 1,
  fx: 660,
  fy: 1434,
  rx: 0,
  ry: 0,
  rz: 0,
  tx: 0,
  ty: 0,
};

/**
 * Keyframed virtual camera. Each key inherits unspecified values from the
 * previous key, and every segment is eased in/out — like a motion-control rig.
 */
export const camera = (frame: number, keys: CamKey[]) => {
  const filled: Required<CamKey>[] = [];
  let prev = {...DEFAULTS};
  for (const k of keys) {
    prev = {...prev, ...k} as Required<CamKey>;
    filled.push(prev as Required<CamKey>);
  }
  if (frame <= filled[0].f) return filled[0];
  if (frame >= filled[filled.length - 1].f) return filled[filled.length - 1];
  let i = 0;
  while (filled[i + 1].f < frame) i++;
  const a = filled[i];
  const b = filled[i + 1];
  const t = easeInOut((frame - a.f) / (b.f - a.f));
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    f: frame,
    s: lerp(a.s, b.s),
    fx: lerp(a.fx, b.fx),
    fy: lerp(a.fy, b.fy),
    rx: lerp(a.rx, b.rx),
    ry: lerp(a.ry, b.ry),
    rz: lerp(a.rz, b.rz),
    tx: lerp(a.tx, b.tx),
    ty: lerp(a.ty, b.ty),
  };
};

/** Velocity of a camera (px/frame of the focus point) for motion blur. */
export const cameraSpeed = (frame: number, keys: CamKey[]) => {
  const a = camera(frame - 1, keys);
  const b = camera(frame, keys);
  return Math.hypot((b.fx - a.fx) * b.s, (b.fy - a.fy) * b.s, b.tx - a.tx, b.ty - a.ty) +
    Math.abs(b.s - a.s) * 600 + Math.abs(b.ry - a.ry) * 6;
};

/** Deterministic pseudo random in [0,1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Small, decaying camera shake after an impact frame. */
export const shake = (frame: number, impacts: number[], amp = 18) => {
  let x = 0;
  let y = 0;
  for (const f of impacts) {
    const d = frame - f;
    if (d < 0 || d > 18) continue;
    const k = Math.exp(-d / 4) * amp;
    x += Math.sin(d * 2.7 + f) * k;
    y += Math.cos(d * 3.3 + f) * k * 0.7;
  }
  return {x, y};
};

/**
 * Deterministic story timeline for the homepage scroll scene.
 *
 * Everything here is a pure function of scroll progress p ∈ [0, 1]: the same p
 * always gives the same vessel poses, towline and camera, so scrolling back
 * reverses every step exactly. No three.js imports, so it can be unit-checked
 * in plain Node (see scripts/check-story.mts).
 *
 * World: an inland waterway along +X. +Z is the right bank (quay side),
 * −Z the left bank. Yaw follows three.js: rotation.y = yaw, heading = (cos yaw, −sin yaw).
 */

export type Pose = { x: number; z: number; yaw: number; speed: number };
export type Vec3 = { x: number; y: number; z: number };

/* ------------------------------------------------------------------ */
/* Dimensions (metres)                                                 */
/* ------------------------------------------------------------------ */
export const TUG = {
  halfLength: 8.5,
  halfBeam: 2.3,
  nose: 8.75, // stem + bow fenders
  fairlead: { x: -8.35, y: 1.8 }, // towline leaves over the stern rail
  hook: { x: -1.9, y: 1.47 }, // towing bitt on the aft deck
};
export const BARGE1 = { length: 36, beam: 9, freeboard: 0.75, depth: 2.4 }; // empty deck pontoon
export const BARGE2 = { length: 48, beam: 12, freeboard: 0.9, depth: 3.0 }; // pontoon with ship sections
export const BRIDLE = 6; // bridle apex ahead of barge 2's bow
export const TOWLINE = 30; // towline length, fairlead → bridle apex

export const RIVER = { quayZ: 47, leftBankZ: -72 };
export const B1_START = { x: 90, z: -8 };
export const B1_END = { x: 222, z: RIVER.quayZ - BARGE1.beam / 2 - 1.2 };
export const B2_START = { x: 272, z: -16 };

/* Chapter boundaries */
export const CHAPTERS = [
  { id: "intro", from: 0, to: 0.18 },
  { id: "push", from: 0.18, to: 0.4 },
  { id: "transition", from: 0.4, to: 0.48 },
  { id: "tow", from: 0.48, to: 0.74 },
  { id: "brokerage", from: 0.74, to: 0.91 },
  { id: "cta", from: 0.91, to: 1 },
] as const;
export type ChapterId = (typeof CHAPTERS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Math helpers                                                        */
/* ------------------------------------------------------------------ */
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Cubic Hermite on [0,1] with end values a,b and tangents ma, mb (in value units per unit t). */
function hermite(a: number, b: number, ma: number, mb: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * ma + (-2 * t3 + 3 * t2) * b + (t3 - t2) * mb;
}
/** Smooth max(a, b) with blend width k. */
function smax(a: number, b: number, k: number) {
  const h = clamp01(0.5 + (0.5 * (a - b)) / k);
  return lerp(b, a, h) + k * h * (1 - h);
}
const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);
const headingOf = (yaw: number) => ({ x: Math.cos(yaw), z: -Math.sin(yaw) });

/* Arc-length parameterised path through cubic Bézier segments */
type P2 = { x: number; z: number };
function bezier(a: P2, b: P2, c: P2, d: P2, t: number): P2 {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    z: u * u * u * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t * t * t * d.z,
  };
}
class Path {
  pts: P2[] = [];
  cum: number[] = [];
  constructor(segments: [P2, P2, P2, P2][], samples = 400) {
    for (const [a, b, c, d] of segments) {
      for (let i = this.pts.length ? 1 : 0; i <= samples; i++) this.pts.push(bezier(a, b, c, d, i / samples));
    }
    this.cum.push(0);
    for (let i = 1; i < this.pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].z - this.pts[i - 1].z));
    }
  }
  get length() {
    return this.cum[this.cum.length - 1];
  }
  /** Position and yaw at fraction s of arc length. */
  at(s: number) {
    const d = clamp01(s) * this.length;
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < d) lo = mid;
      else hi = mid;
    }
    const span = this.cum[hi] - this.cum[lo] || 1;
    const t = (d - this.cum[lo]) / span;
    const a = this.pts[lo], b = this.pts[hi];
    const f = this.point(Math.min(this.length, d + 1.5)), r = this.point(Math.max(0, d - 1.5));
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), yaw: yawOf(f.x - r.x, f.z - r.z) };
  }
  private point(d: number): P2 {
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < d) lo = mid;
      else hi = mid;
    }
    const t = (d - this.cum[lo]) / (this.cum[hi] - this.cum[lo] || 1);
    return { x: lerp(this.pts[lo].x, this.pts[hi].x, t), z: lerp(this.pts[lo].z, this.pts[hi].z, t) };
  }
  /** Arc-length fraction of the sample nearest to point q. */
  fractionAt(q: P2) {
    let best = 0, bd = Infinity;
    this.pts.forEach((pt, i) => {
      const d = Math.hypot(pt.x - q.x, pt.z - q.z);
      if (d < bd) { bd = d; best = i; }
    });
    return this.cum[best] / this.length;
  }
}

/* ------------------------------------------------------------------ */
/* Choreography                                                        */
/* ------------------------------------------------------------------ */
const T = {
  introEnd: 0.18,
  contact: 0.3,
  pushStart: 0.32,
  pushEnd: 0.46,
  reverseEnd: 0.5,
  transitEnd: 0.64,
  towEnd: 0.74,
};
const INTRO_FROM = -75, INTRO_TO = 20, LANE_Z = B1_START.z;
const V_INTRO = (INTRO_TO - INTRO_FROM) / T.introEnd; // m per unit p
const CONTACT_X = B1_START.x - BARGE1.length / 2 - TUG.nose; // tug centre when its bow fenders touch
const PUSH_OFFSET = BARGE1.length / 2 + TUG.nose; // tug centre behind barge 1 centre while pushing

// Barge 1 is pushed along an S-curve to the quay (path of the barge's centre)
const pushPath = new Path([[
  B1_START,
  { x: B1_START.x + 45, z: B1_START.z },
  { x: B1_END.x - 85, z: B1_END.z },
  B1_END,
]]);
const TUG_AT_QUAY = { x: B1_END.x - PUSH_OFFSET, z: B1_END.z };
// Backing off the quay: astern while the bow swings to port, away from the quay wall
const REVERSE_YAW = 0.35;
const REVERSED = { x: TUG_AT_QUAY.x - 12, z: TUG_AT_QUAY.z - 5 };

// Transit to barge 2: swing to port across the river, pass the barge's bow, then line up ahead of it
const B2_BOW = B2_START.x + BARGE2.length / 2;
const APEX_START = { x: B2_BOW + BRIDLE, z: B2_START.z };
const PASS = { x: B2_BOW + 4, z: B2_START.z + BARGE2.beam / 2 + 7 };
const CHORD_AT_START = 27.5; // line not yet taut when the tug reaches its tow position
const TOW_READY = { x: APEX_START.x + CHORD_AT_START - TUG.fairlead.x, z: B2_START.z };
const transitPath = new Path([
  [
    REVERSED,
    { x: REVERSED.x + 28 * Math.cos(REVERSE_YAW), z: REVERSED.z - 28 * Math.sin(REVERSE_YAW) },
    { x: PASS.x - 60, z: PASS.z },
    PASS,
  ],
  [PASS, { x: PASS.x + 14, z: PASS.z }, { x: TOW_READY.x - 14, z: TOW_READY.z }, TOW_READY],
]);
const ATTACH_S = transitPath.fractionAt(PASS);
const TOW_TAUT = 29.4; // chord at which the line takes the load and barge 2 starts to move
const TOW_STEADY = TOW_READY.x + 90; // tug x at the end of the tow chapter
const END_X = TOW_STEADY + 140;
const V_TOW = 110; // tangent at the end of the tow chapter (m per unit t)

/** Transit easing: starts from rest, ends at rest, arc-length parameter. */
const transitS = (p: number) => smoothstep(seg(p, T.reverseEnd, T.transitEnd));

export function tugPose(p: number): Pose {
  if (p <= T.introEnd) {
    return { x: lerp(INTRO_FROM, INTRO_TO, p / T.introEnd), z: LANE_Z, yaw: 0, speed: 1 };
  }
  if (p <= T.contact) {
    const t = seg(p, T.introEnd, T.contact);
    const dt = T.contact - T.introEnd;
    const x = hermite(INTRO_TO, CONTACT_X, V_INTRO * dt, 0, t);
    return { x, z: LANE_Z, yaw: 0, speed: 1 - smoothstep(t) };
  }
  if (p <= T.pushStart) return { x: CONTACT_X, z: LANE_Z, yaw: 0, speed: 0 };
  if (p <= T.pushEnd) {
    const b = barge1Pose(p);
    const h = headingOf(b.yaw);
    return { x: b.x - h.x * PUSH_OFFSET, z: b.z - h.z * PUSH_OFFSET, yaw: b.yaw, speed: b.speed };
  }
  if (p <= T.reverseEnd) {
    const t = easeInOut(seg(p, T.pushEnd, T.reverseEnd));
    return {
      x: lerp(TUG_AT_QUAY.x, REVERSED.x, t),
      z: lerp(TUG_AT_QUAY.z, REVERSED.z, smoothstep(t)),
      yaw: REVERSE_YAW * smoothstep(t),
      speed: 0.25 * Math.sin(Math.PI * t),
    };
  }
  if (p <= T.transitEnd) {
    const t = seg(p, T.reverseEnd, T.transitEnd);
    const q = transitPath.at(transitS(p));
    return { ...q, speed: Math.sin(Math.PI * t) * 0.9 };
  }
  if (p <= TOW_START) return { ...TOW_READY, yaw: 0, speed: 0.1 };
  if (p <= T.towEnd) {
    // Accelerate from rest with the tow
    const t = seg(p, TOW_START, T.towEnd);
    const x = hermite(TOW_READY.x, TOW_STEADY, 0, V_TOW, t);
    return { x, z: TOW_READY.z, yaw: 0, speed: 0.4 + 0.4 * smoothstep(t) };
  }
  const t = seg(p, T.towEnd, 1);
  const x = hermite(TOW_STEADY, END_X, V_TOW * ((1 - T.towEnd) / (T.towEnd - TOW_START)), 30, t);
  return { x, z: TOW_READY.z, yaw: 0, speed: 0.8 - 0.3 * t };
}

export function barge1Pose(p: number): Pose {
  if (p <= T.pushStart) return { ...B1_START, yaw: 0, speed: 0 };
  if (p >= T.pushEnd) return { ...B1_END, yaw: 0, speed: 0 };
  const t = seg(p, T.pushStart, T.pushEnd);
  const q = pushPath.at(smoothstep(t));
  return { ...q, speed: Math.sin(Math.PI * t) * 0.7 };
}

/** Chord from tug fairlead to bridle apex if barge 2 stood still. */
function towChord(tug: Pose, apex: P2) {
  const h = headingOf(tug.yaw);
  const fx = tug.x + h.x * TUG.fairlead.x, fz = tug.z + h.z * TUG.fairlead.x;
  return Math.hypot(fx - apex.x, fz - apex.z);
}

export function barge2Pose(p: number): Pose {
  const tug = tugPose(p);
  if (p <= T.transitEnd) return { ...B2_START, yaw: 0, speed: 0 };
  // Barge starts moving smoothly once the line is (almost) taut, then follows at the taut distance
  const pull = tug.x - (TOW_READY.x + (TOW_TAUT - CHORD_AT_START));
  const dx = smax(pull, 0, 3);
  return { x: B2_START.x + dx, z: B2_START.z, yaw: 0, speed: clamp01(pull / 20) * 0.6 };
}

/* ------------------------------------------------------------------ */
/* Towline                                                             */
/* ------------------------------------------------------------------ */
export type Towline = {
  visible: boolean;
  /** 0..1: how much of the line has been passed from the barge to the tug. */
  reach: number;
  points: Vec3[];
  bridle: [Vec3, Vec3, Vec3]; // port corner, apex, starboard corner
};

const attachStartP = (() => {
  for (let p = T.reverseEnd; p <= T.transitEnd; p += 0.0005) {
    const t = tugPose(p);
    const h = headingOf(t.yaw);
    const fx = t.x + h.x * TUG.fairlead.x, fz = t.z + h.z * TUG.fairlead.x;
    const dx = APEX_START.x - fx, dz = APEX_START.z - fz, len = Math.hypot(dx, dz);
    // line must lead aft, within ~45° of the centreline, so it clears the stern bulwark
    if (fx > APEX_START.x + 3 && (-(dx * h.x + dz * h.z)) / len > Math.cos(0.8)) return p;
  }
  return T.transitEnd;
})();
const attachEndP = attachStartP + 0.025;
/** The tug waits on station until the line is made fast, then takes the strain. */
const TOW_START = Math.max(T.transitEnd, attachEndP + 0.008);
function inverseEase(s: number) {
  // invert easeInOut numerically (monotonic)
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (smoothstep(m) < s) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export const STORY_MARKS = { attachStartP, attachEndP, towStart: TOW_START, ...T };

export function towline(p: number, n = 40): Towline {
  const b2 = barge2Pose(p);
  const tug = tugPose(p);
  const bow = b2.x + BARGE2.length / 2;
  const deck = BARGE2.freeboard + 0.25;
  const apex: Vec3 = { x: bow + BRIDLE, y: 0.95, z: b2.z };
  const bridle: [Vec3, Vec3, Vec3] = [
    { x: bow - 0.6, y: deck, z: b2.z - BARGE2.beam / 2 + 0.8 },
    apex,
    { x: bow - 0.6, y: deck, z: b2.z + BARGE2.beam / 2 - 0.8 },
  ];
  if (p < attachStartP) return { visible: false, reach: 0, points: [], bridle };
  const h = headingOf(tug.yaw);
  const fair: Vec3 = { x: tug.x + h.x * TUG.fairlead.x, y: TUG.fairlead.y, z: tug.z + h.z * TUG.fairlead.x };
  const hook: Vec3 = { x: tug.x + h.x * TUG.hook.x, y: TUG.hook.y, z: tug.z + h.z * TUG.hook.x };
  const chord = Math.hypot(fair.x - apex.x, fair.z - apex.z);
  // Parabolic catenary: sag from slack length, minimum sag under tension
  const slack = Math.max(0, TOWLINE - chord);
  let sag = Math.sqrt((3 * chord * slack) / 8);
  sag = Math.min(Math.max(sag, 0.55), 2.6);
  const reach = smoothstep(seg(p, attachStartP, attachEndP));
  const pts: Vec3[] = [hook];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push({
      x: lerp(fair.x, apex.x, u),
      z: lerp(fair.z, apex.z, u),
      // a slack line floats at the surface rather than hanging deep
      y: Math.max(-0.12, lerp(fair.y, apex.y, u) - 4 * sag * u * (1 - u)),
    });
  }
  return { visible: true, reach, points: pts, bridle };
}

/* ------------------------------------------------------------------ */
/* Partner fleet (third-party resources, moored along the quay)        */
/* ------------------------------------------------------------------ */
export const FLEET = {
  harbourTug: { x: 470, z: RIVER.quayZ - 4.6, yaw: Math.PI },
  workboat: { x: 512, z: RIVER.quayZ - 4.2, yaw: Math.PI },
  cranePontoon: { x: 560, z: RIVER.quayZ - 7.5, yaw: 0 },
  centre: { x: 520, z: 5 },
};

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */
type Focus = "tug" | "push" | "attach" | "tow" | "fleet";
type CamKey = { p: number; focus: Focus; az: number; el: number; r: number; sx: number; sy: number };
// Camera works from the left (polder) bank side (−Z), so the quay, the industrial
// site and the partner fleet form the background of the story. Vessels head to
// screen-left; negative sx shifts the scene left so the copy can sit on the right.
const KEYS: CamKey[] = [
  { p: 0, focus: "tug", az: -0.5, el: 0.075, r: 40, sx: -0.15, sy: 0.1 },
  { p: 0.12, focus: "tug", az: -1.0, el: 0.09, r: 33, sx: -0.14, sy: 0.08 },
  { p: 0.22, focus: "push", az: -1.5, el: 0.15, r: 66, sx: -0.27, sy: 0.07 },
  { p: 0.31, focus: "push", az: -2.05, el: 0.21, r: 60, sx: -0.27, sy: 0.06 },
  { p: 0.4, focus: "push", az: -2.15, el: 0.3, r: 88, sx: -0.08, sy: 0.04 },
  { p: 0.47, focus: "tug", az: -1.65, el: 0.22, r: 58, sx: -0.14, sy: 0.04 },
  { p: 0.54, focus: "tug", az: -1.1, el: 0.2, r: 52, sx: -0.2, sy: 0.05 },
  { p: 0.6, focus: "attach", az: -0.75, el: 0.24, r: 74, sx: -0.22, sy: 0.05 },
  { p: 0.67, focus: "tow", az: -0.45, el: 0.2, r: 112, sx: -0.2, sy: 0.04 },
  { p: 0.74, focus: "tow", az: -0.7, el: 0.26, r: 135, sx: -0.18, sy: 0.04 },
  { p: 0.86, focus: "fleet", az: -1.68, el: 0.5, r: 240, sx: -0.12, sy: 0.02 },
  { p: 0.95, focus: "fleet", az: -1.32, el: 0.24, r: 185, sx: -0.12, sy: -0.02 },
  { p: 1, focus: "fleet", az: -1.25, el: 0.235, r: 180, sx: -0.12, sy: -0.02 },
];

function focusPoint(f: Focus, p: number): Vec3 {
  const tug = tugPose(p);
  if (f === "tug") return { x: tug.x, y: 1.6, z: tug.z };
  if (f === "push") {
    const b = barge1Pose(p);
    return { x: (tug.x + b.x) / 2, y: 1.4, z: (tug.z + b.z) / 2 };
  }
  const b2 = barge2Pose(p);
  if (f === "attach") return { x: (tug.x + b2.x + BARGE2.length / 2) / 2, y: 1.4, z: (tug.z + b2.z) / 2 };
  if (f === "tow") return { x: (tug.x + b2.x) / 2, y: 1.6, z: (tug.z + b2.z) / 2 };
  return { x: lerp((tug.x + b2.x) / 2, FLEET.centre.x, 0.55), y: 2, z: lerp(tug.z, FLEET.centre.z, 0.55) };
}

/** Cardinal-spline tangent for a numeric key channel (non-uniform spacing). */
function channel(p: number, get: (k: CamKey) => number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const dt = b.p - a.p;
  const t = seg(p, a.p, b.p);
  const prev = KEYS[i - 1], next = KEYS[i + 2];
  const ma = prev ? ((get(b) - get(prev)) / (b.p - prev.p)) * dt : 0;
  const mb = next ? ((get(next) - get(a)) / (next.p - a.p)) * dt : 0;
  return hermite(get(a), get(b), ma * 0.8, mb * 0.8, t);
}

export type CameraState = { position: Vec3; target: Vec3; sx: number; sy: number };
export function cameraState(p: number): CameraState {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const w = smoothstep(seg(p, a.p, b.p));
  const fa = focusPoint(a.focus, p), fb = focusPoint(b.focus, p);
  const target = { x: lerp(fa.x, fb.x, w), y: lerp(fa.y, fb.y, w), z: lerp(fa.z, fb.z, w) };
  const az = channel(p, (k) => k.az);
  const el = channel(p, (k) => k.el);
  const r = channel(p, (k) => k.r);
  const position = {
    x: target.x + Math.cos(az) * Math.cos(el) * r,
    y: target.y + Math.sin(el) * r,
    z: target.z + Math.sin(az) * Math.cos(el) * r,
  };
  return { position, target, sx: channel(p, (k) => k.sx), sy: channel(p, (k) => k.sy) };
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */
/** Opacity of each chapter's text (0..1), with short cross-fades and no overlap. */
export function chapterAlpha(p: number) {
  const fade = 0.025;
  const out: Record<ChapterId, number> = { intro: 0, push: 0, transition: 0, tow: 0, brokerage: 0, cta: 0 };
  for (const c of CHAPTERS) {
    const start = c.from === 0 ? -1 : c.from + 0.01;
    const end = c.to === 1 ? 2 : c.to - 0.012;
    out[c.id] = Math.min(clamp01((p - start) / fade), clamp01((end - p) / fade));
  }
  return out;
}

/** Visibility of the partner labels in the brokerage chapter. */
export const partnerLabelAlpha = (p: number) => Math.min(clamp01((p - 0.8) / 0.03), clamp01((0.93 - p) / 0.03));

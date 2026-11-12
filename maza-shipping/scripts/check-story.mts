/**
 * Geometry checks for the homepage scroll story (run: node --experimental-strip-types scripts/check-story.mts).
 * Samples the pure timeline at fine steps and fails on jumps, collisions, a
 * towline through a hull, or a camera under water / inside the bank.
 */
import {
  tugPose, barge1Pose, barge2Pose, towline, cameraState, TUG, BARGE1, BARGE2, RIVER, FLEET, STORY_MARKS, type Pose,
} from "../components/three/story/timeline.ts";

const problems: string[] = [];
const fail = (m: string) => { if (problems.length < 40) problems.push(m); };
type Box = { x: number; z: number; yaw: number; hl: number; hb: number };
const corners = (b: Box) => {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw); // heading (c, -s); starboard normal (s, c)
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, d]) => ({
    x: b.x + c * a * b.hl + s * d * b.hb,
    z: b.z - s * a * b.hl + c * d * b.hb,
  }));
};
// Separating-axis overlap depth of two oriented boxes (negative = gap)
function overlap(a: Box, b: Box) {
  const ca = corners(a), cb = corners(b);
  let min = Infinity;
  for (const box of [a, b]) {
    const c = Math.cos(box.yaw), s = Math.sin(box.yaw);
    for (const ax of [{ x: c, z: -s }, { x: s, z: c }]) {
      const pa = ca.map((p) => p.x * ax.x + p.z * ax.z), pb = cb.map((p) => p.x * ax.x + p.z * ax.z);
      const o = Math.min(Math.max(...pa) - Math.min(...pb), Math.max(...pb) - Math.min(...pa));
      min = Math.min(min, o);
    }
  }
  return min;
}
const tugBox = (t: Pose): Box => ({ ...t, hl: TUG.nose, hb: TUG.halfBeam + 0.35 });
const b1Box = (b: Pose): Box => ({ ...b, hl: BARGE1.length / 2, hb: BARGE1.beam / 2 });
const b2Box = (b: Pose): Box => ({ ...b, hl: BARGE2.length / 2 + 6, hb: BARGE2.beam / 2 });
const fleetBoxes: Box[] = [
  { ...FLEET.harbourTug, hl: 13, hb: 4.6 },
  { ...FLEET.workboat, hl: 11, hb: 4.2 },
  { ...FLEET.cranePontoon, hl: 15, hb: 7.5 },
];

const N = 4000;
let prev: { t: Pose; b1: Pose; b2: Pose } | null = null;
let maxStep = { tug: 0, b1: 0, b2: 0, at: 0 };
let minPushGap = Infinity, minCamY = Infinity, minLineY = Infinity;
for (let i = 0; i <= N; i++) {
  const p = i / N;
  const t = tugPose(p), b1 = barge1Pose(p), b2 = barge2Pose(p);
  for (const [name, v] of Object.entries({ tug: t, b1, b2 })) {
    if (![v.x, v.z, v.yaw].every(Number.isFinite)) fail(`${name} NaN at p=${p}`);
  }
  if (prev) {
    const d = (a: Pose, b: Pose) => Math.hypot(a.x - b.x, a.z - b.z);
    const st = d(t, prev.t), s1 = d(b1, prev.b1), s2 = d(b2, prev.b2);
    if (st > maxStep.tug) maxStep = { ...maxStep, tug: st, at: p };
    maxStep.b1 = Math.max(maxStep.b1, s1);
    maxStep.b2 = Math.max(maxStep.b2, s2);
    if (st > 0.6 || s1 > 0.6 || s2 > 0.6) fail(`jump at p=${p.toFixed(4)}: tug ${st.toFixed(2)} b1 ${s1.toFixed(2)} b2 ${s2.toFixed(2)} m`);
    if (Math.abs(t.yaw - prev.t.yaw) > 0.05) fail(`tug yaw jump at p=${p.toFixed(4)}`);
  }
  prev = { t, b1, b2 };

  // Collisions (contact while pushing is allowed: gap ≈ 0)
  const o1 = overlap(tugBox(t), b1Box(b1));
  const pushing = p >= STORY_MARKS.contact - 0.002 && p <= STORY_MARKS.pushEnd + 0.002;
  if (pushing) minPushGap = Math.min(minPushGap, -o1);
  else if (o1 > 0) fail(`tug overlaps barge 1 by ${o1.toFixed(2)} m at p=${p.toFixed(4)}`);
  if (overlap(tugBox(t), b2Box(b2)) > 0) fail(`tug overlaps barge 2 at p=${p.toFixed(4)}`);
  if (overlap(b1Box(b1), b2Box(b2)) > 0) fail(`barges overlap at p=${p.toFixed(4)}`);
  for (const f of fleetBoxes) for (const [n, bx] of [["tug", tugBox(t)], ["b1", b1Box(b1)], ["b2", b2Box(b2)]] as const)
    if (overlap(bx, f) > 0) fail(`${n} hits partner vessel at p=${p.toFixed(4)}`);
  // Banks
  for (const [n, bx] of [["tug", tugBox(t)], ["b1", b1Box(b1)], ["b2", b2Box(b2)]] as const) {
    for (const c of corners(bx)) {
      if (c.z > RIVER.quayZ - 0.3) fail(`${n} hits the quay at p=${p.toFixed(4)} (z=${c.z.toFixed(2)})`);
      if (c.z < RIVER.leftBankZ + 1) fail(`${n} hits the left bank at p=${p.toFixed(4)}`);
    }
  }
  // Towline: above water-ish, never through the tug or barge hull
  const line = towline(p);
  if (line.visible) {
    const tb = tugBox(t), c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    line.points.slice(2).forEach((q) => {
      minLineY = Math.min(minLineY, q.y);
      const lx = (q.x - t.x) * c - (q.z - t.z) * s, lz = (q.x - t.x) * s + (q.z - t.z) * c;
      if (Math.abs(lx) < TUG.halfLength - 0.5 && Math.abs(lz) < TUG.halfBeam && q.y < 1.55) fail(`towline through tug at p=${p.toFixed(4)}`);
      const bx = q.x - b2.x;
      if (Math.abs(bx) < BARGE2.length / 2 && Math.abs(q.z - b2.z) < BARGE2.beam / 2 && q.y < BARGE2.freeboard + 0.1) fail(`towline through barge 2 at p=${p.toFixed(4)}`);
    });
  }
  // Camera above water / ground
  const cam = cameraState(p);
  minCamY = Math.min(minCamY, cam.position.y);
  const overLand = cam.position.z > RIVER.quayZ || cam.position.z < RIVER.leftBankZ;
  if (cam.position.y < (overLand ? 4 : 2)) fail(`camera too low at p=${p.toFixed(4)} (y=${cam.position.y.toFixed(1)})`);
  const dTug = Math.hypot(cam.position.x - t.x, cam.position.z - t.z);
  if (dTug < 12) fail(`camera inside/too close to tug at p=${p.toFixed(4)}`);
}

console.log("max step per 1/4000 p (m):", Object.fromEntries(Object.entries(maxStep).map(([k, v]) => [k, +v.toFixed(3)])));
console.log("push contact gap (m, ≥ -0.05 ok):", minPushGap.toFixed(3));
console.log("lowest towline point y (m):", minLineY.toFixed(2), "| lowest camera y:", minCamY.toFixed(1));
console.log("marks:", Object.fromEntries(Object.entries(STORY_MARKS).map(([k, v]) => [k, +(+v).toFixed(4)])));
if (minPushGap < -0.05) fail(`tug pushes into barge 1 by ${(-minPushGap).toFixed(2)} m`);
if (problems.length) { console.log("PROBLEMS:\n" + problems.join("\n")); process.exit(1); }
console.log("All story checks passed.");

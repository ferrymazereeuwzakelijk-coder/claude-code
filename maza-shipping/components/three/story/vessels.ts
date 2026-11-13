import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BARGE1, BARGE2, BRIDLE } from "./timeline";

/**
 * Representative 3D models for the scroll story: two deck pontoons (empty, and
 * loaded with ship sections) and third-party partner vessels. None of these
 * carry names or logos; they are illustrations, not specific real vessels.
 * Units: metres, +X forward, waterline at y = 0.
 */

/**
 * Merge a static vessel's plain meshes per material into single meshes (fewer
 * draw calls). Instanced meshes and meshes whose attributes differ are kept.
 */
export function mergeStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.Mesh[]>();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return;
    const list = buckets.get(m.material) ?? [];
    list.push(m);
    buckets.set(m.material, list);
  });
  for (const [material, meshes] of buckets) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv" && k !== "color") g.deleteAttribute(k);
      return g;
    });
    const keys = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().join();
    if (!geos.every((g) => keys(g) === keys(geos[0]))) continue;
    const merged = mergeGeometries(geos);
    if (!merged) continue;
    meshes.forEach((m) => m.parent?.remove(m));
    const out = new THREE.Mesh(merged, material);
    out.castShadow = out.receiveShadow = true;
    group.add(out);
  }
  return group;
}

const mat = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.08, ...o });

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}
function cyl(r: number, h: number, m: THREE.Material, seg = 14) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
}

/** Weathered steel deck: welded plate seams, scuffs and rust streaks. */
function deckTexture(base: string, seams: string, rust: string, lengthM: number, beamM: number) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round((1024 * beamM) / lengthM);
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // mottling
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.02 + rnd() * 0.04})`;
    const r = 2 + rnd() * 14;
    g.beginPath();
    g.arc(rnd() * c.width, rnd() * c.height, r, 0, Math.PI * 2);
    g.fill();
  }
  // rust patches
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rust.replace("A", (0.05 + rnd() * 0.12).toFixed(2));
    g.beginPath();
    g.ellipse(rnd() * c.width, rnd() * c.height, 4 + rnd() * 30, 2 + rnd() * 10, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // plate seams every ~2 m across, ~6 m along
  g.strokeStyle = seams;
  g.lineWidth = 1.2;
  const pxPerM = c.width / lengthM;
  for (let x = 0; x < c.width; x += 6 * pxPerM) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
  for (let y = 0; y < c.height; y += 2 * pxPerM) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Deck pontoon: flat deck, raked ("spoon") ends, coaming, bollards. */
function pontoon(opts: {
  length: number; beam: number; freeboard: number; depth: number;
  hull: number; deck: [string, string, string]; stripe?: number;
}) {
  const { length: L, beam: B, freeboard: F, depth: D } = opts;
  const g = new THREE.Group();
  const rake = Math.min(5, L * 0.12);
  const bottom = F - D;
  // Side profile, extruded across the beam
  const s = new THREE.Shape();
  s.moveTo(-L / 2, F);
  s.lineTo(L / 2, F);
  s.lineTo(L / 2, F - 0.7);
  s.lineTo(L / 2 - rake, bottom);
  s.lineTo(-L / 2 + rake, bottom);
  s.lineTo(-L / 2, F - 0.7);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: B, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 });
  geo.translate(0, 0, -B / 2);
  const hull = new THREE.Mesh(geo, mat(opts.hull, { roughness: 0.7, metalness: 0.2 }));
  g.add(hull);
  // Deck plate on top with texture
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(L - 0.2, B - 0.2),
    mat(0xffffff, { map: deckTexture(...opts.deck, L, B), roughness: 0.92 }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = F + 0.09;
  g.add(deck);
  // Coaming along the deck edge
  const coam = mat(opts.hull, { roughness: 0.6 });
  g.add(box(L, 0.22, 0.18, coam, 0, F + 0.18, B / 2 - 0.09), box(L, 0.22, 0.18, coam, 0, F + 0.18, -B / 2 + 0.09));
  g.add(box(0.18, 0.22, B, coam, L / 2 - 0.09, F + 0.18, 0), box(0.18, 0.22, B, coam, -L / 2 + 0.09, F + 0.18, 0));
  if (opts.stripe !== undefined) {
    const stripe = mat(opts.stripe, { roughness: 0.55 });
    g.add(box(L - 0.4, 0.28, 0.04, stripe, 0, F - 0.25, B / 2 + 0.07), box(L - 0.4, 0.28, 0.04, stripe, 0, F - 0.25, -B / 2 - 0.07));
  }
  // Bollard pairs along both sides (instanced)
  const bmat = mat(0x1d1f22, { roughness: 0.55, metalness: 0.4 });
  const posts: THREE.Vector3[] = [];
  const nx = Math.max(2, Math.round(L / 12));
  for (let i = 0; i < nx; i++) {
    const x = -L / 2 + 2.2 + (i * (L - 4.4)) / (nx - 1);
    for (const z of [B / 2 - 0.7, -B / 2 + 0.7]) posts.push(new THREE.Vector3(x - 0.25, F + 0.3, z), new THREE.Vector3(x + 0.25, F + 0.3, z));
  }
  const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 12), bmat, posts.length);
  posts.forEach((p, i) => inst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  g.add(inst);
  return g;
}

/** Barge 1: empty deck pontoon, dark hull, like the pontoons the Ferry-Jo pushes. */
export function createBarge1() {
  const g = pontoon({ ...BARGE1, hull: 0x26292c, deck: ["#4a4c4d", "rgba(0,0,0,0.28)", "rgba(120,70,40,A)"] });
  // Old tyres hung as fenders along the sides
  const tmat = mat(0x111111, { roughness: 0.95 });
  for (const side of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 8, 18), tmat);
      t.position.set(-BARGE1.length / 2 + 4 + i * 7, BARGE1.freeboard - 0.45, side * (BARGE1.beam / 2 + 0.15));
      g.add(t);
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** A prefabricated ship section in primer, with internal frames visible at the open end. */
function blockSection(len: number, w: number, h: number, color: number) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.75, metalness: 0.15 });
  const t = 0.12;
  // shell: bottom, two sides, one closed end (open aft end shows the frames)
  g.add(box(len, t, w, m, 0, t / 2, 0));
  g.add(box(len, h, t, m, 0, h / 2, w / 2 - t / 2), box(len, h, t, m, 0, h / 2, -w / 2 + t / 2));
  g.add(box(t, h, w, m, len / 2 - t / 2, h / 2, 0));
  // tank top / deck
  g.add(box(len, t, w, m, 0, h - t / 2, 0));
  // transverse web frames every ~1.6 m, seen through the open end
  const frameMat = mat(color, { roughness: 0.8 });
  for (let x = -len / 2 + 0.8; x < len / 2 - 0.5; x += 1.6) {
    g.add(box(0.08, h - 0.4, w - 0.6, frameMat, x, h / 2, 0));
  }
  // longitudinal stiffeners on the outer sides
  const stiff = mat(color, { roughness: 0.7 });
  for (let y = 0.6; y < h - 0.3; y += 0.7) {
    g.add(box(len - 0.3, 0.1, 0.1, stiff, 0, y, w / 2 + 0.05), box(len - 0.3, 0.1, 0.1, stiff, 0, y, -w / 2 - 0.05));
  }
  // lifting lugs on top
  const lug = mat(0x6a6f72, { metalness: 0.5, roughness: 0.4 });
  for (const [x, z] of [[-len / 3, w / 3], [-len / 3, -w / 3], [len / 3, w / 3], [len / 3, -w / 3]]) g.add(box(0.5, 0.35, 0.08, lug, x, h + 0.17, z));
  return g;
}

/** Bow section: narrowing, rising forward, with a bulb; open aft end. */
function bowSection(len: number, w: number, h: number, color: number) {
  const S = 24, R = 14;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S; // 0 = aft (open), 1 = stem
    const halfW = (w / 2) * Math.pow(1 - u, 0.55);
    const keel = 0.6 * Math.pow(u, 3); // forefoot rises a little
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      const z = halfW * Math.sign(c) * Math.pow(Math.abs(c), 0.45);
      const y = h - (h - keel) * Math.pow(Math.abs(s), 0.5);
      pos.push(-len / 2 + u * len, y, z);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) {
    const a = i * (R + 1) + j, b = a + R + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.72, metalness: 0.15, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(geo, m));
  // bulbous bow
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), m);
  bulb.scale.set(2.2, 1.1, 1.1);
  bulb.position.set(len / 2 - 0.9, 1.2, 0);
  g.add(bulb);
  // decks visible from the open aft end
  for (const y of [h * 0.35, h * 0.68]) g.add(box(len * 0.55, 0.1, w * 0.85, mat(color, { roughness: 0.85 }), -len / 2 + len * 0.27, y, 0));
  return g;
}

/** Sea-fastening: stools under the cargo and diagonal braces down to the deck. */
function seaFastening(len: number, w: number, deckY: number, at: number, height: number) {
  const g = new THREE.Group();
  const stool = mat(0x2a2c2e, { metalness: 0.4, roughness: 0.5 });
  const brace = mat(0xd9a400, { metalness: 0.3, roughness: 0.5 });
  for (let x = -len / 2 + 1; x <= len / 2 - 1; x += (len - 2) / 3) {
    for (const z of [w / 2 - 0.8, -w / 2 + 0.8]) g.add(box(0.8, 0.5, 0.8, stool, at + x, deckY + 0.25, z));
  }
  const brTop = deckY + 0.5 + height * 0.45;
  for (let x = -len / 2 + 1.5; x <= len / 2 - 1.5; x += (len - 3) / 2) {
    for (const side of [1, -1]) {
      const a = new THREE.Vector3(at + x, deckY + 0.1, side * (w / 2 + 1.6));
      const b = new THREE.Vector3(at + x, brTop, side * (w / 2));
      const d = new THREE.Vector3().subVectors(b, a);
      const c = cyl(0.09, d.length(), brace, 8);
      c.position.copy(a).addScaledVector(d, 0.5);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      g.add(c, box(0.5, 0.06, 0.5, stool, a.x, deckY + 0.03, a.z));
    }
  }
  return g;
}

/** Barge 2: larger deck pontoon carrying two ship sections, with a towing bridle forward. */
export function createBarge2() {
  const { length: L, beam: B, freeboard: F } = BARGE2;
  const g = pontoon({ ...BARGE2, hull: 0x2b2f33, deck: ["#6f7375", "rgba(0,0,0,0.22)", "rgba(130,75,40,A)"], stripe: 0xb3261e });
  const deckY = F + 0.09;
  // Aft: double-bottom block section (grey primer). Forward: bow section (red-brown primer)
  const block = blockSection(15, 9.2, 3.6, 0x8d958f);
  block.position.set(-L / 2 + 11, deckY + 0.5, 0);
  g.add(block, seaFastening(15, 9.2, deckY, -L / 2 + 11, 3.6));
  const bow = bowSection(14, 9.6, 6.2, 0x8a3b2b);
  bow.position.set(L / 2 - 14, deckY + 0.5, 0);
  g.add(bow, seaFastening(12, 9.0, deckY, L / 2 - 15, 5));
  // Bridle bitts at the bow corners
  const bitt = mat(0x1d1f22, { metalness: 0.4, roughness: 0.5 });
  for (const z of [B / 2 - 0.8, -B / 2 + 0.8]) {
    const b = cyl(0.2, 0.7, bitt);
    b.position.set(L / 2 - 0.6, deckY + 0.35, z);
    g.add(b);
  }
  // Recovery buoy on the bridle apex lies on deck until rigged (drawn by the scene)
  g.userData.bridleLength = BRIDLE;
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ------------------------------------------------------------------ */
/* Partner fleet                                                       */
/* ------------------------------------------------------------------ */

/** Lofted displacement hull with sheer, for generic partner vessels. */
function loftHull(L: number, B: number, top: (u: number) => number, keel: (u: number) => number, hb: (u: number) => number, colors: { top: number; boot: number }) {
  const S = 48, R = 18;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const cTop = new THREE.Color(colors.top), cBoot = new THREE.Color(colors.boot);
  for (let i = 0; i <= S; i++) {
    const u = i / S;
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      const z = Math.max(0.02, hb(u)) * (B / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.6);
      const y = top(u) - (top(u) - keel(u)) * Math.pow(Math.abs(s), 0.65);
      pos.push(-L / 2 + u * L, y, z);
      const k = y < 0.15 ? cBoot : cTop;
      col.push(k.r, k.g, k.b);
    }
  }
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) {
    const a = i * (R + 1) + j, b = a + R + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide })));
  // flat deck
  const deckPts: number[] = [], deckIdx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S, w = Math.max(0.02, hb(u)) * (B / 2) * 0.96;
    deckPts.push(-L / 2 + u * L, top(u) - 0.05, w, -L / 2 + u * L, top(u) - 0.05, -w);
  }
  for (let i = 0; i < S; i++) { const a = i * 2; deckIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(deckPts, 3));
  dg.setIndex(deckIdx);
  dg.computeVertexNormals();
  g.add(new THREE.Mesh(dg, mat(0x5b5f62, { side: THREE.DoubleSide, roughness: 0.9 })));
  return g;
}

function windows(len: number, h: number, w: number, y: number, glass: THREE.Material, n: number) {
  const g = new THREE.Group();
  for (const side of [1, -1]) for (let i = 0; i < n; i++) {
    g.add(box(len / n - 0.25, h, 0.04, glass, -len / 2 + (i + 0.5) * (len / n), y, side * (w / 2 + 0.01)));
  }
  g.add(box(0.04, h, w - 0.5, glass, len / 2 + 0.01, y, 0));
  return g;
}

/** Partner harbour tug: navy hull, white two-tier superstructure, bow fender. */
export function createHarbourTug() {
  const L = 26, B = 9.2;
  const g = loftHull(
    L, B,
    (u) => 2.2 + 1.2 * Math.pow(Math.max(0, (u - 0.5) / 0.5), 2),
    (u) => -3 + 1.6 * Math.pow(Math.max(0, (u - 0.75) / 0.25), 2) + 1.4 * Math.pow(Math.max(0, (0.12 - u) / 0.12), 2),
    (u) => (u < 0.15 ? 0.55 + 0.45 * Math.sqrt(u / 0.15) : u > 0.6 ? Math.sqrt(Math.max(0, 1 - ((u - 0.6) / 0.4) ** 2)) : 1),
    { top: 0x1f3550, boot: 0x5d1a16 },
  );
  const white = mat(0xf2f2ee, { roughness: 0.5 });
  const glass = mat(0x14212b, { roughness: 0.1, metalness: 0.7 });
  g.add(box(9, 2.4, 6.8, white, 1.5, 3.4, 0));
  g.add(windows(9, 0.8, 6.8, 3.9, glass, 4));
  g.add(box(5.2, 2.2, 6.2, white, 2.4, 5.7, 0));
  g.add(windows(5.2, 1.0, 6.2, 5.9, glass, 3));
  g.add(box(5.6, 0.18, 6.6, mat(0xd9581f), 2.4, 6.9, 0));
  const mast = cyl(0.12, 5, mat(0xd9dde0, { metalness: 0.6 }));
  mast.position.set(2.2, 9.4, 0);
  g.add(mast);
  g.add(box(0.2, 0.2, 3, mat(0xd9dde0), 2.2, 10.5, 0));
  // funnels
  for (const z of [1.6, -1.6]) {
    const f = box(1.0, 2.4, 0.9, mat(0x1f3550), -2.2, 5.6, z);
    g.add(f, box(1.02, 0.4, 0.92, mat(0x111111), -2.2, 6.95, z));
  }
  // bow pudding fender and side fenders
  const rub = mat(0x111111, { roughness: 0.95 });
  const pud = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.45, 10, 24, Math.PI), rub);
  pud.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  pud.position.set(L / 2 - 1.6, 2.6, 0);
  g.add(pud);
  g.add(box(L * 0.8, 0.5, 0.5, rub, -1, 2.4, B / 2 + 0.1), box(L * 0.8, 0.5, 0.5, rub, -1, 2.4, -B / 2 - 0.1));
  // towing winch aft
  g.add(box(2.2, 1.2, 3.5, mat(0x4a5057), -8, 2.9, 0));
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Partner multicat-style workboat: forward wheelhouse, open aft deck, crane and spud legs. */
export function createWorkboat() {
  const L = 22, B = 8.4;
  const g = loftHull(
    L, B,
    (u) => 1.9 + 0.5 * Math.pow(Math.max(0, (u - 0.6) / 0.4), 2),
    (u) => -1.8 + 1.0 * Math.pow(Math.max(0, (u - 0.85) / 0.15), 2),
    (u) => (u > 0.82 ? Math.max(0.3, 1 - ((u - 0.82) / 0.18) ** 2 * 0.7) : 1),
    { top: 0x3b4146, boot: 0x5d1a16 },
  );
  const yellow = mat(0xf2b705, { roughness: 0.5 });
  const glass = mat(0x14212b, { roughness: 0.1, metalness: 0.7 });
  g.add(box(5, 2.6, 7.2, yellow, 6.5, 3.2, 0));
  g.add(box(4, 2.2, 6, yellow, 6.8, 5.6, 0));
  g.add(windows(4, 1.0, 6, 5.9, glass, 3));
  g.add(box(4.2, 0.12, 6.2, mat(0xf2f2ee), 6.8, 6.8, 0));
  // spud legs aft
  for (const z of [3.2, -3.2]) {
    const sp = cyl(0.45, 14, yellow, 16);
    sp.position.set(-9.6, 5, z);
    g.add(sp, box(1.6, 2.2, 1.6, mat(0x3b4146), -9.6, 2.9, z));
  }
  // knuckle-boom crane (stowed)
  const crane = mat(0xf2b705, { roughness: 0.45 });
  const base = cyl(0.7, 2, crane);
  base.position.set(2.5, 2.9, 2.2);
  g.add(base);
  const boom = box(7.5, 0.6, 0.6, crane, -1.2, 4.6, 2.2);
  boom.rotation.z = 0.28;
  g.add(boom);
  const jib = box(5, 0.45, 0.45, crane, -3.6, 4.2, 2.2);
  jib.rotation.z = -0.35;
  g.add(jib);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Partner crane pontoon with a long-reach excavator (as seen on real pushing jobs). */
export function createCranePontoon() {
  const g = pontoon({ length: 30, beam: 15, freeboard: 1.0, depth: 2.4, hull: 0x2b2f33, deck: ["#5f6264", "rgba(0,0,0,0.25)", "rgba(130,75,40,A)"] });
  const y = 1.1;
  const yel = mat(0xf2b705, { roughness: 0.5 });
  const dark = mat(0x222426, { roughness: 0.7 });
  // tracks
  for (const z of [1.6, -1.6]) g.add(box(5.2, 1.0, 0.9, dark, 2, y + 0.5, z));
  // upper body + cab + counterweight
  g.add(box(4.2, 1.6, 3.2, yel, 2.2, y + 1.9, 0));
  g.add(box(1.6, 1.7, 1.2, yel, 3.6, y + 3.4, -1.0));
  g.add(box(1.4, 1.1, 1.0, mat(0x14212b, { metalness: 0.6, roughness: 0.15 }), 3.6, y + 3.5, -1.0));
  g.add(box(1.2, 1.4, 3.0, yel, 0.1, y + 2.1, 0));
  // long-reach boom resting forward
  const boom = box(12, 0.55, 0.55, yel, 8.6, y + 5.2, 0.4);
  boom.rotation.z = 0.32;
  g.add(boom);
  const stick = box(10, 0.4, 0.4, yel, 13.6, y + 4.6, 0.4);
  stick.rotation.z = -0.95;
  g.add(stick);
  g.add(box(0.9, 0.8, 1.0, dark, 11.4, y + 0.8, 0.4));
  // spud
  const sp = cyl(0.5, 12, yel, 16);
  sp.position.set(-13.5, 4.5, 6);
  g.add(sp);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

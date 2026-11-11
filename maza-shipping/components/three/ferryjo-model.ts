import * as THREE from "three";

/**
 * Procedural model of the Ferry-Jo (17.40 m × 4.60 m tug), measured from side-on
 * photos of the vessel: a very low, rounded stern and long aft deck, a strong
 * sheer up to a high bow, the white wheelhouse just forward of midships with a
 * red roof band, radar forward and mast aft on the roof, a low white casing aft
 * of the wheelhouse, two life rings, tyre fenders and a rope swag along the bow.
 *
 * Units are metres. +X points to the bow, +Y up, +Z to port. Waterline is y = 0.
 */

export const HULL = { length: 17.4, beam: 4.6 } as const;
const L = HULL.length;
const HB = HULL.beam / 2;
const xAt = (t: number) => -L / 2 + L * t; // t: 0 = stern, 1 = bow

const COLORS = {
  hull: 0x0e1013,
  bottom: 0x6e1c16,
  deck: 0x3a3d40,
  white: 0xf3f3ef,
  red: 0xd9261c,
  glass: 0x0a141c,
  rubber: 0x121212,
  steel: 0xd9dde0,
  rope: 0xcbb68a,
  ring: 0xff5a2c,
};

/** Plan view: rounded tug stern, parallel body, full rounded bow. */
function halfBeam(t: number) {
  if (t < 0.12) {
    const u = 1 - t / 0.12;
    return HB * (0.12 + 0.88 * Math.sqrt(Math.max(0, 1 - u * u)));
  }
  if (t > 0.62) {
    const u = (t - 0.62) / 0.38;
    return HB * Math.max(0.05, 1 - Math.pow(u, 2.1));
  }
  return HB;
}
/** Top edge of the hull (sheer line): ~0.35 m aft, ~3 m at the stem. */
function sheerY(t: number) {
  return 0.35 + 2.65 * Math.pow(Math.max(0, t), 1.8);
}
/** Bulwark height above the walking deck. */
function bulwark(t: number) {
  return 0.12 + 0.68 * t * t;
}
function deckY(t: number) {
  return sheerY(t) - bulwark(t);
}
function keelY(t: number) {
  const fore = Math.max(0, (t - 0.8) / 0.2);
  const aft = Math.max(0, (0.12 - t) / 0.12);
  return -1.9 + 1.5 * fore * fore + 0.9 * aft * aft;
}

/** Lofted hull shell: black topsides, red antifouling below the waterline. */
function buildHull() {
  const S = 80;
  const R = 26;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const black = new THREE.Color(COLORS.hull);
  const red = new THREE.Color(COLORS.bottom);
  const n = 3.2; // superellipse exponent → hard bilge, near-vertical sides

  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const hb = Math.max(halfBeam(t), 0.03);
    const top = sheerY(t);
    const bot = keelY(t);
    const depth = top - bot;
    // Slight forward rake of the stem above the waterline
    const rake = t > 0.9 ? ((t - 0.9) / 0.1) * 0.5 : 0;
    for (let j = 0; j <= R; j++) {
      const th = (j / R) * Math.PI;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const z = hb * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = top - depth * Math.pow(Math.abs(s), 2 / n);
      const x = xAt(t) + rake * Math.max(0, y / top);
      pos.push(x, y, z);
      const k = y < -0.35 ? red : black; // black boot-top a little below the waterline
      col.push(k.r, k.g, k.b);
    }
  }
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j;
      const b = a + R + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // Transom cap at the stern
  const c0 = pos.length / 3;
  pos.push(xAt(0), (sheerY(0) + keelY(0)) / 2, 0);
  col.push(black.r, black.g, black.b);
  for (let j = 0; j < R; j++) idx.push(c0, j + 1, j);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.2, side: THREE.DoubleSide }),
  );
}

/** Walking deck (sits below the sheer, inside the bulwark). */
function buildDeck() {
  const S = 60;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const t = (i / S) * 0.975;
    const hb = halfBeam(t) * 0.94;
    const y = deckY(t);
    pos.push(xAt(t), y, hb, xAt(t), y, -hb);
  }
  for (let i = 0; i < S; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: COLORS.deck, roughness: 0.92, side: THREE.DoubleSide }));
}

/** Rubbing strake along the sheer line, and the stern fender. */
function buildStrakes() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 });
  // One continuous strake around the stern and along both sides
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = 0.97 - (i / 60) * 0.97;
    pts.push(new THREE.Vector3(xAt(t), sheerY(t), halfBeam(t) + 0.03));
  }
  for (let i = 1; i <= 60; i++) {
    const t = (i / 60) * 0.97;
    pts.push(new THREE.Vector3(xAt(t), sheerY(t), -(halfBeam(t) + 0.03)));
  }
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.08, 8, false), mat));
  // Heavy rubber fender around the stern just above the waterline
  const fp: THREE.Vector3[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = -Math.PI / 2 + (i / 30) * Math.PI;
    const t = 0.13 * (1 - Math.cos(a));
    fp.push(new THREE.Vector3(xAt(t) - 0.12, 0.12, Math.sin(a) * (halfBeam(t) + 0.12)));
  }
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 60, 0.16, 8, false),
      new THREE.MeshStandardMaterial({ color: COLORS.rubber, roughness: 0.95 }),
    ),
  );
  return group;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...opts });
}
function box(w: number, h: number, d: number, color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
}
function cyl(rt: number, rb: number, h: number, color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}, seg = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function decal(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, px = 160) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: canvasTexture(Math.round(w * px), Math.round(h * px), draw), transparent: true, roughness: 0.5 }),
  );
}

function tyre(scale = 1) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.3 * scale, 0.12 * scale, 10, 20), mat(COLORS.rubber, { roughness: 0.95 }));
  return m;
}

/** White wheelhouse with window band, red roof band, radar forward, mast aft. */
function wheelhouse() {
  const g = new THREE.Group();
  const len = 3.6;
  const wid = 2.9;
  const h = 2.35;
  const white = { roughness: 0.35 };

  const cabin = box(len, h, wid, COLORS.white, white);
  cabin.position.y = h / 2;
  g.add(cabin);
  // Plinth down to the sloping deck (the sheer rises under the wheelhouse)
  const plinth = box(len, 0.8, wid, COLORS.white, white);
  plinth.position.y = -0.4;
  g.add(plinth);

  // Windows: dark glass panes set into the upper part of each face
  const glass = mat(COLORS.glass, { roughness: 0.06, metalness: 0.7, envMapIntensity: 1.8 });
  const winH = 0.72;
  const winY = h - 0.62;
  const addPane = (w: number, x: number, z: number, ry: number) => {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, winH), glass);
    pane.position.set(x, winY, z);
    pane.rotation.y = ry;
    g.add(pane);
  };
  for (const side of [1, -1]) {
    const n = 4;
    const pw = (len - 0.5) / n - 0.14;
    for (let k = 0; k < n; k++) addPane(pw, -len / 2 + 0.25 + pw / 2 + 0.07 + k * ((len - 0.5) / n), side * (wid / 2 + 0.006), side > 0 ? 0 : Math.PI);
  }
  for (const end of [1, -1]) {
    const n = 4;
    const pw = (wid - 0.4) / n - 0.12;
    for (let k = 0; k < n; k++) addPane(pw, end * (len / 2 + 0.006), -wid / 2 + 0.2 + pw / 2 + 0.06 + k * ((wid - 0.4) / n), end > 0 ? Math.PI / 2 : -Math.PI / 2);
  }

  // Roof with red band
  const roof = box(len + 0.3, 0.1, wid + 0.3, COLORS.white, white);
  roof.position.y = h + 0.2;
  g.add(roof);
  const band = box(len + 0.32, 0.22, wid + 0.32, COLORS.red, { roughness: 0.45 });
  band.position.y = h + 0.05;
  g.add(band);

  // Side markings: EU number, MAZA logo, door, two life rings
  for (const side of [1, -1]) {
    const marks = decal(1.6, 0.7, (ctx, W, H) => {
      ctx.fillStyle = "#111";
      ctx.font = `600 ${H * 0.2}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText("02203689", W * 0.05, H * 0.24);
      ctx.font = `900 ${H * 0.34}px Arial Black, Arial, sans-serif`;
      ctx.fillText("MAZA", W * 0.05, H * 0.66);
      ctx.fillStyle = "#00A2E0";
      ctx.font = `700 ${H * 0.13}px Arial, sans-serif`;
      ctx.fillText("S H I P P I N G", W * 0.05, H * 0.84);
    });
    marks.position.set(-0.2, 1.05, side * (wid / 2 + 0.008));
    if (side < 0) marks.rotation.y = Math.PI;
    g.add(marks);

    const door = box(0.7, 1.75, 0.03, 0xe6e7e3, { roughness: 0.3 });
    door.position.set(-len / 2 + 0.55, 0.95, side * (wid / 2 + 0.02));
    g.add(door);
    const doorWin = box(0.42, 0.45, 0.035, COLORS.glass, { roughness: 0.1, metalness: 0.6 });
    doorWin.position.set(-len / 2 + 0.55, 1.45, side * (wid / 2 + 0.025));
    g.add(doorWin);

    for (const dx of [0.75, 1.3]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 10, 24), mat(COLORS.ring, { roughness: 0.6 }));
      ring.position.set(dx, 1.05, side * (wid / 2 + 0.08));
      g.add(ring);
      for (let q = 0; q < 4; q++) {
        const tape = box(0.05, 0.16, 0.16, 0xffffff);
        const a = (q * Math.PI) / 2 + Math.PI / 4;
        tape.position.set(dx + Math.cos(a) * 0.26, 1.05 + Math.sin(a) * 0.26, side * (wid / 2 + 0.08));
        tape.rotation.z = a;
        g.add(tape);
      }
    }
  }

  // Radar on the forward half of the roof
  const radar = new THREE.Group();
  radar.add(box(0.24, 0.14, 1.9, COLORS.white, { roughness: 0.3 }));
  const ped = cyl(0.13, 0.15, 0.3, COLORS.white);
  ped.position.y = -0.2;
  radar.add(ped);
  radar.position.set(0.85, h + 0.6, 0);
  radar.name = "radar";
  g.add(radar);

  // Mast on the aft part of the roof with yard and lights
  const mast = cyl(0.05, 0.07, 3.0, COLORS.steel, { metalness: 0.7, roughness: 0.3 });
  mast.position.set(-1.1, h + 1.7, 0);
  g.add(mast);
  const yard = box(0.06, 0.06, 1.2, COLORS.steel, { metalness: 0.7 });
  yard.position.set(-1.1, h + 2.4, 0);
  g.add(yard);
  for (const yy of [1.2, 1.9, 2.8]) {
    const lamp = cyl(0.07, 0.07, 0.14, 0x9a8a50, { metalness: 0.6 });
    lamp.position.set(-1.05, h + yy, 0);
    g.add(lamp);
  }
  // Search lights on the front corners, orange beacon
  for (const z of [1.15, -1.15]) {
    const sl = cyl(0.14, 0.14, 0.24, COLORS.steel, { metalness: 0.85, roughness: 0.2 });
    sl.rotation.z = Math.PI / 2;
    sl.position.set(len / 2 - 0.1, h + 0.42, z);
    g.add(sl);
  }
  const beacon = cyl(0.08, 0.08, 0.16, 0xff8a00, { emissive: 0xff6a00, emissiveIntensity: 2 });
  beacon.position.set(-1.6, h + 0.4, 0.9);
  beacon.name = "beacon";
  g.add(beacon);
  return g;
}

/** Low white casing aft of the wheelhouse with the stainless exhaust. */
function casing() {
  const g = new THREE.Group();
  const c = box(1.9, 1.3, 2.4, COLORS.white, { roughness: 0.4 });
  c.position.y = 0.35;
  g.add(c);
  const vent = box(0.8, 0.35, 0.05, 0x8d9397);
  for (const z of [1.22, -1.22]) {
    const v = vent.clone();
    v.position.set(0.1, 0.6, z);
    g.add(v);
  }
  const ex = cyl(0.12, 0.12, 2.6, COLORS.steel, { metalness: 0.95, roughness: 0.15 });
  ex.position.set(0.7, 1.3, 0.75);
  g.add(ex);
  const bend = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.12, 10, 16, Math.PI / 2), mat(COLORS.steel, { metalness: 0.95, roughness: 0.15 }));
  bend.position.set(0.44, 2.6, 0.75);
  g.add(bend);
  return g;
}

function bollard() {
  const g = new THREE.Group();
  for (const dz of [-0.2, 0.2]) {
    const b = cyl(0.11, 0.12, 0.38, 0x16181b, { metalness: 0.4 });
    b.position.set(0, 0.19, dz);
    const cap = cyl(0.15, 0.15, 0.05, 0x16181b, { metalness: 0.4 });
    cap.position.set(0, 0.4, dz);
    g.add(b, cap);
  }
  return g;
}

function handWheel() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 24), mat(COLORS.white, { roughness: 0.4 }));
  g.add(rim);
  for (let k = 0; k < 3; k++) {
    const s = box(0.56, 0.03, 0.03, COLORS.white);
    s.rotation.z = (k * Math.PI) / 3;
    g.add(s);
  }
  const post = cyl(0.04, 0.05, 0.5, 0x222222);
  post.position.y = -0.4;
  g.add(post);
  return g;
}

function flag(colors: string[], w: number, h: number, poleLen: number) {
  const g = new THREE.Group();
  const pole = cyl(0.025, 0.03, poleLen, 0xa07a4a, { roughness: 0.6 });
  pole.position.y = poleLen / 2;
  g.add(pole);
  const tex = canvasTexture(96, 64, (ctx) => {
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, (64 / colors.length) * i, 96, 64 / colors.length + 1);
    });
  });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 12, 4), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(-w / 2, poleLen - h / 2 - 0.05, 0);
  g.add(cloth);
  return { group: g, cloth };
}

export type FerryJo = {
  group: THREE.Group;
  /** Named anchor points (local coords) for HTML callouts. */
  anchors: Record<"bow" | "stern" | "engine" | "wheelhouse" | "length", THREE.Vector3>;
  update: (time: number) => void;
};

export function createFerryJo(): FerryJo {
  const group = new THREE.Group();
  group.add(buildHull(), buildDeck(), buildStrakes());

  const whT = 0.625;
  const wh = wheelhouse();
  wh.position.set(xAt(whT), deckY(whT) - 0.05, 0);
  group.add(wh);

  const csT = 0.47;
  const cs = casing();
  cs.position.set(xAt(csT), deckY(csT), 0);
  group.add(cs);

  // Aft deck: towing bitt, hand wheels, bollards
  const bitt = cyl(0.13, 0.17, 0.9, 0x16181b, { metalness: 0.5 });
  bitt.position.set(xAt(0.36), deckY(0.36) + 0.45, 0);
  group.add(bitt);
  for (const dz of [0.45, -0.45]) {
    const w = handWheel();
    w.position.set(xAt(0.22), deckY(0.22) + 0.85, dz);
    w.rotation.y = Math.PI / 2;
    group.add(w);
  }
  for (const [t, dz] of [
    [0.07, 1.1], [0.07, -1.1], [0.27, 1.75], [0.27, -1.75], [0.84, 1.0], [0.84, -1.0],
  ] as const) {
    const b = bollard();
    b.position.set(xAt(t), deckY(t), dz);
    group.add(b);
  }

  // Tyre fenders along both sides, hanging just below the sheer
  const flare = (t: number) => Math.atan2(halfBeam(t + 0.02) - halfBeam(t - 0.02), L * 0.04);
  for (const side of [1, -1]) {
    for (const t of [0.34, 0.45, 0.56, 0.67, 0.78]) {
      const tr = tyre();
      tr.position.set(xAt(t), sheerY(t) - 0.42, side * (halfBeam(t) + 0.15));
      tr.rotation.y = side * flare(t);
      group.add(tr);
    }
    // Rope swag along the bow
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = 0.62 + (i / 24) * 0.35;
      const sag = Math.sin((i / 24) * Math.PI * 2) * 0.25 + Math.sin((i / 24) * Math.PI) * 0.35;
      pts.push(new THREE.Vector3(xAt(t), sheerY(t) - 0.1 - Math.abs(sag), side * (halfBeam(t) + 0.06)));
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 6, false), mat(COLORS.rope, { roughness: 0.9 })));

    // Name on the bow
    const t = 0.88;
    const name = decal(2.1, 0.5, (ctx, W, H) => {
      ctx.fillStyle = "#f3f3ef";
      ctx.font = `bold ${H * 0.62}px Georgia, "Times New Roman", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("FERRY-JO", W / 2, H / 2);
    });
    name.position.set(xAt(t), sheerY(t) - 0.38, side * (halfBeam(t) + 0.04));
    name.rotation.y = side > 0 ? flare(t) : Math.PI - flare(t);
    group.add(name);
  }
  // Stem fender (stacked tyres at the bow)
  for (let k = 0; k < 3; k++) {
    const bt = tyre(1.1);
    bt.position.set(xAt(1) + 0.55, sheerY(0.99) - 0.6 - k * 0.55, 0);
    bt.rotation.y = Math.PI / 2;
    group.add(bt);
  }

  // Dutch ensign on a raked pole on the aft deck, pennant on the bow
  const ensign = flag(["#ae1c28", "#ffffff", "#21468b"], 1.0, 0.66, 2.6);
  ensign.group.position.set(xAt(0.3), deckY(0.3), 1.3);
  ensign.group.rotation.z = 0.42;
  group.add(ensign.group);
  const pennant = flag(["#d9261c", "#ffffff", "#d9261c"], 0.5, 0.34, 1.6);
  pennant.group.position.set(xAt(0.95), sheerY(0.95), 0);
  group.add(pennant.group);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const radar = wh.getObjectByName("radar")!;
  const beacon = wh.getObjectByName("beacon") as THREE.Mesh;
  const cloths = [ensign.cloth, pennant.cloth].map((c) => ({
    mesh: c,
    base: (c.geometry.attributes.position.array as Float32Array).slice(),
    w: (c.geometry as THREE.PlaneGeometry).parameters.width,
  }));

  return {
    group,
    anchors: {
      bow: new THREE.Vector3(xAt(0.97), sheerY(0.97) + 0.2, 0),
      stern: new THREE.Vector3(xAt(0.36), deckY(0.36) + 0.9, 0),
      engine: new THREE.Vector3(xAt(csT), deckY(csT) + 1.0, 0),
      wheelhouse: new THREE.Vector3(xAt(whT) + 0.85, deckY(whT) + 2.95, 0),
      length: new THREE.Vector3(0, -0.1, HB + 0.3),
    },
    update(time: number) {
      radar.rotation.y = time * 1.6;
      (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.max(0, Math.sin(time * 6)) * 3;
      for (const c of cloths) {
        const p = c.mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = c.base[i * 3];
          p.setZ(i, Math.sin(x * 6 + time * 7) * 0.06 * (c.w / 2 - x) * 2);
        }
        p.needsUpdate = true;
      }
    },
  };
}

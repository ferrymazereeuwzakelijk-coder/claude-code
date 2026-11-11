import * as THREE from "three";

/**
 * Procedural low-poly model of the Ferry-Jo (17.40 m × 4.60 m tug), built from
 * reference photos: black hull with a strong sheer to the bow, rounded stern with
 * tyre fenders, white wheelhouse with an orange-red roof trim and red/white
 * chevrons, grey engine casing, stainless exhaust, radar mast and Dutch flag.
 *
 * Units are metres. +X points to the bow, +Y up, +Z to port. Waterline is y = 0.
 */

export const HULL = { length: 17.4, beam: 4.6 } as const;
const L = HULL.length;
const HB = HULL.beam / 2;
const xAt = (t: number) => -L / 2 + L * t; // t: 0 = stern, 1 = bow

const COLORS = {
  hull: 0x0d0f12,
  bottom: 0x7a1d17,
  deck: 0x2b2f33,
  white: 0xf2f2ee,
  grey: 0xbfc4c7,
  trim: 0xff4d2e,
  glass: 0x0b1620,
  rubber: 0x111111,
  steel: 0xd9dde0,
};

function halfBeam(t: number) {
  if (t < 0.13) {
    const u = 1 - t / 0.13;
    return HB * Math.sqrt(Math.max(0, 1 - u * u)) * 0.92 + HB * 0.08;
  }
  if (t > 0.58) {
    const u = (t - 0.58) / 0.42;
    return HB * Math.max(0, 1 - Math.pow(u, 1.9));
  }
  return HB;
}
function deckY(t: number) {
  const bow = Math.max(0, (t - 0.45) / 0.55);
  const stern = Math.max(0, (0.18 - t) / 0.18);
  return 0.85 + 1.05 * bow * bow + 0.18 * stern;
}
function keelY(t: number) {
  const fore = Math.max(0, (t - 0.78) / 0.22);
  const aft = Math.max(0, (0.1 - t) / 0.1);
  return -1.75 + 1.3 * fore * fore + 0.55 * aft;
}

/** Lofted hull shell with vertex colours (black topsides, red antifouling below water). */
function buildHull() {
  const S = 64; // stations
  const R = 24; // points per cross-section
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const black = new THREE.Color(COLORS.hull);
  const red = new THREE.Color(COLORS.bottom);
  const n = 3; // superellipse exponent → boxy, rounded bilge

  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const hb = Math.max(halfBeam(t), 0.02);
    const top = deckY(t);
    const bot = keelY(t);
    const depth = top - bot;
    for (let j = 0; j <= R; j++) {
      const th = (j / R) * Math.PI;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const z = hb * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = top - depth * Math.pow(Math.abs(s), 2 / n);
      pos.push(xAt(t), y, z);
      const k = y < 0.02 ? red : black;
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
  // Close the stern with a fan
  const sternCenter = pos.length / 3;
  pos.push(xAt(0), (deckY(0) + keelY(0)) / 2, 0);
  col.push(black.r, black.g, black.b);
  for (let j = 0; j < R; j++) idx.push(sternCenter, j + 1, j);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25, side: THREE.DoubleSide }),
  );
}

/** Flat deck surface following the sheer. */
function buildDeck() {
  const S = 48;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const t = (i / S) * 0.985;
    const hb = halfBeam(t) * 0.97;
    const y = deckY(t) - 0.02;
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
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: COLORS.deck, roughness: 0.9, side: THREE.DoubleSide }));
}

/** Rubbing strake / gunwale rope fender along both sides. */
function buildGunwale() {
  const group = new THREE.Group();
  for (const side of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(new THREE.Vector3(xAt(t), deckY(t) + 0.02, side * (halfBeam(t) + 0.04)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 120, 0.09, 8, false),
        new THREE.MeshStandardMaterial({ color: COLORS.grey, roughness: 0.7 }),
      ),
    );
  }
  return group;
}

function box(w: number, h: number, d: number, color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...opts }));
}
function cyl(rt: number, rb: number, h: number, color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}, seg = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...opts }));
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function chevronTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#f2f2ee";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#ff3b22";
    for (let x = -256; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.lineTo(x + 32, 256);
      ctx.lineTo(x + 32 + 256, 0);
      ctx.lineTo(x + 256, 0);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function textPlane(text: string, w: number, h: number, opts: { bg?: string; fg: string; font: string; border?: string }) {
  const scale = 128;
  const tex = canvasTexture(Math.round(w * scale), Math.round(h * scale), (ctx) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(0, 0, W, H);
    }
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, W - 6, H - 6);
    }
    ctx.fillStyle = opts.fg;
    ctx.font = opts.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = text.split("\n");
    lines.forEach((l, i) => ctx.fillText(l, W / 2, (H / (lines.length + 1)) * (i + 1) + 4));
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: !opts.bg, roughness: 0.6 }),
  );
}

function tyre() {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.13, 10, 20),
    new THREE.MeshStandardMaterial({ color: COLORS.rubber, roughness: 0.95 }),
  );
  return m;
}

function wheelhouse() {
  const g = new THREE.Group();
  const white = { roughness: 0.4 };
  const len = 3.1;
  const wid = 3.0;
  const h = 2.25;
  // Main white cabin
  const cabin = box(len, h, wid, COLORS.white, white);
  cabin.position.y = h / 2;
  g.add(cabin);
  // Window band
  const glassMat = new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.6 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.75, wid + 0.02), glassMat);
  band.position.y = h - 0.62;
  g.add(band);
  // Window mullions (white posts in the band)
  for (const zSide of [1, -1]) {
    for (let k = 0; k < 4; k++) {
      const p = box(0.12, 0.76, 0.04, COLORS.white, white);
      p.position.set(-len / 2 + 0.2 + k * ((len - 0.4) / 3), h - 0.62, zSide * (wid / 2 + 0.02));
      g.add(p);
    }
  }
  for (const xSide of [1, -1]) {
    for (let k = 0; k < 4; k++) {
      const p = box(0.04, 0.76, 0.12, COLORS.white, white);
      p.position.set(xSide * (len / 2 + 0.02), h - 0.62, -wid / 2 + 0.2 + k * ((wid - 0.4) / 3));
      g.add(p);
    }
  }
  // Roof with orange-red trim
  const roof = box(len + 0.35, 0.12, wid + 0.35, COLORS.white, white);
  roof.position.y = h + 0.06;
  g.add(roof);
  const trim = box(len + 0.42, 0.16, wid + 0.42, COLORS.trim, { roughness: 0.5, emissive: 0x2a0500 });
  trim.position.y = h + 0.0;
  g.add(trim);
  // Chevron panel on the aft face and both sides of the lower aft corner
  const chev = new THREE.MeshStandardMaterial({ map: chevronTexture(), roughness: 0.5 });
  const aft = new THREE.Mesh(new THREE.PlaneGeometry(wid * 0.92, 1.2), chev);
  aft.rotation.y = -Math.PI / 2;
  aft.position.set(-len / 2 - 0.011, 0.75, 0);
  g.add(aft);
  for (const zSide of [1, -1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.2), chev);
    side.position.set(-len / 2 + 0.5, 0.75, zSide * (wid / 2 + 0.011));
    if (zSide < 0) side.rotation.y = Math.PI;
    g.add(side);
  }
  // Door
  for (const zSide of [1, -1]) {
    const door = box(0.75, 1.55, 0.03, 0xdedfdb, { roughness: 0.35 });
    door.position.set(0.55, 0.85, zSide * (wid / 2 + 0.02));
    g.add(door);
  }
  // Mast + radar
  const mast = cyl(0.06, 0.08, 3.2, COLORS.grey, { metalness: 0.6, roughness: 0.3 });
  mast.position.set(0.4, h + 1.6, 0);
  g.add(mast);
  const yard = box(0.08, 0.08, 1.4, COLORS.grey, { metalness: 0.6 });
  yard.position.set(0.4, h + 2.5, 0);
  g.add(yard);
  const radar = new THREE.Group();
  const radarBar = box(0.22, 0.14, 1.9, COLORS.white, { roughness: 0.3 });
  radar.add(radarBar);
  const radarBase = cyl(0.12, 0.14, 0.25, COLORS.white);
  radarBase.position.y = -0.18;
  radar.add(radarBase);
  radar.position.set(-0.6, h + 0.48, 0);
  radar.name = "radar";
  g.add(radar);
  // Search lights + beacon
  for (const zSide of [0.9, -0.9]) {
    const sl = cyl(0.13, 0.13, 0.22, COLORS.steel, { metalness: 0.8, roughness: 0.2 });
    sl.rotation.z = Math.PI / 2;
    sl.position.set(len / 2 - 0.2, h + 0.3, zSide);
    g.add(sl);
  }
  const beacon = cyl(0.09, 0.09, 0.18, 0xff8a00, { emissive: 0xff6a00, emissiveIntensity: 2.2 });
  beacon.position.set(0.4, h + 3.25, 0);
  beacon.name = "beacon";
  g.add(beacon);
  return g;
}

function engineCasing() {
  const g = new THREE.Group();
  const casing = box(2.6, 1.0, 2.6, COLORS.grey, { roughness: 0.5 });
  casing.position.y = 0.5;
  g.add(casing);
  const top = box(2.0, 0.5, 2.1, 0xcfd3d5);
  top.position.y = 1.25;
  g.add(top);
  // Louvres
  for (const zSide of [1, -1]) {
    for (let k = 0; k < 5; k++) {
      const l = box(0.9, 0.04, 0.04, 0x7d8489);
      l.position.set(0.2, 0.35 + k * 0.1, zSide * 1.31);
      g.add(l);
    }
  }
  // Stainless exhaust with bend
  const ex = cyl(0.13, 0.13, 2.2, COLORS.steel, { metalness: 0.95, roughness: 0.18 });
  ex.position.set(-0.95, 1.7, 0.55);
  g.add(ex);
  const bend = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.13, 10, 16, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: COLORS.steel, metalness: 0.95, roughness: 0.18 }),
  );
  bend.position.set(-1.23, 2.8, 0.55);
  g.add(bend);
  return g;
}

function bollard() {
  const g = new THREE.Group();
  for (const dz of [-0.22, 0.22]) {
    const b = cyl(0.12, 0.13, 0.42, 0x15181b, { metalness: 0.4 });
    b.position.set(0, 0.21, dz);
    const cap = cyl(0.16, 0.16, 0.05, 0x15181b, { metalness: 0.4 });
    cap.position.set(0, 0.44, dz);
    g.add(b, cap);
  }
  return g;
}

function handWheel() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.025, 6, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 0.4 }),
  );
  g.add(rim);
  for (let k = 0; k < 3; k++) {
    const s = box(0.6, 0.03, 0.03, COLORS.white);
    s.rotation.z = (k * Math.PI) / 3;
    g.add(s);
  }
  const post = cyl(0.04, 0.05, 0.5, 0x222222);
  post.position.y = -0.4;
  g.add(post);
  return g;
}

function flag() {
  const g = new THREE.Group();
  const pole = cyl(0.025, 0.03, 2.4, COLORS.steel, { metalness: 0.8 });
  pole.position.y = 1.2;
  g.add(pole);
  const tex = canvasTexture(96, 64, (ctx) => {
    ["#ae1c28", "#ffffff", "#21468b"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, (64 / 3) * i, 96, 64 / 3 + 1);
    });
  });
  const geo = new THREE.PlaneGeometry(0.9, 0.6, 12, 4);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(-0.45, 2.05, 0);
  cloth.name = "flag";
  g.add(cloth);
  return g;
}

export type FerryJo = {
  group: THREE.Group;
  /** Named anchor points (local coords) for HTML callouts. */
  anchors: Record<"bow" | "stern" | "engine" | "wheelhouse" | "length", THREE.Vector3>;
  update: (time: number) => void;
};

export function createFerryJo(): FerryJo {
  const group = new THREE.Group();
  const hull = buildHull();
  hull.castShadow = true;
  group.add(hull, buildDeck(), buildGunwale());

  // Bulwark at the stern (low rounded wall)
  const wh = wheelhouse();
  const whT = 0.3;
  wh.position.set(xAt(whT), deckY(whT), 0);
  group.add(wh);

  const eng = engineCasing();
  const engT = 0.47;
  eng.position.set(xAt(engT), deckY(engT), 0);
  group.add(eng);

  // Foredeck: hand wheels, bollards
  for (const dz of [0.5, -0.5]) {
    const w = handWheel();
    const t = 0.6;
    w.position.set(xAt(t), deckY(t) + 0.9, dz);
    w.rotation.y = Math.PI / 2;
    group.add(w);
  }
  for (const [t, dz] of [
    [0.8, 0.9], [0.8, -0.9], [0.06, 0.8], [0.06, -0.8], [0.16, 1.6], [0.16, -1.6],
  ] as const) {
    const b = bollard();
    b.position.set(xAt(t), deckY(t), dz);
    group.add(b);
  }
  // Towing hook post aft of the wheelhouse
  const hook = cyl(0.12, 0.16, 1.1, 0x15181b, { metalness: 0.5 });
  hook.position.set(xAt(0.14), deckY(0.14) + 0.55, 0);
  group.add(hook);

  // Tyre fenders hanging along both sides
  for (const side of [1, -1]) {
    for (const t of [0.04, 0.1, 0.17, 0.24, 0.34, 0.5]) {
      const tr = tyre();
      const hb = halfBeam(t);
      tr.position.set(xAt(t), deckY(t) - 0.45, side * (hb + 0.18));
      tr.rotation.y = Math.atan2(halfBeam(t + 0.01) - hb, L * 0.01) * side;
      group.add(tr);
    }
    // Bow tyre (pushing knee)
    const bowTyre = tyre();
    bowTyre.scale.setScalar(1.25);
    bowTyre.position.set(xAt(0.995), deckY(0.99) - 0.6, 0);
    bowTyre.rotation.y = Math.PI / 2;
    group.add(bowTyre);
  }

  // Hull flare angle (plan view) at station t, used to lay decals flat on the side
  const flare = (t: number) => Math.atan2(halfBeam(t + 0.02) - halfBeam(t - 0.02), L * 0.04);

  // Name on the bow + side sign
  for (const side of [1, -1]) {
    const name = textPlane("FERRY-JO\nURK", 1.3, 0.62, { fg: "#f2f2ee", font: "bold 30px Arial, sans-serif" });
    const t = 0.86;
    name.position.set(xAt(t), deckY(t) - 0.38, side * (halfBeam(t) + 0.12));
    name.rotation.y = side > 0 ? flare(t) : Math.PI - flare(t);
    group.add(name);
    const sign = textPlane("SCHEEPVAARTBEGELEIDING", 3.3, 0.36, {
      bg: "#f7f7f4",
      fg: "#111",
      font: "bold 40px Arial, sans-serif",
      border: "#111",
    });
    const st = 0.6;
    sign.position.set(xAt(st), deckY(st) - 0.36, side * (halfBeam(st) + 0.12));
    sign.rotation.y = side > 0 ? flare(st) : Math.PI - flare(st);
    group.add(sign);
  }

  const fl = flag();
  fl.position.set(xAt(0.015), deckY(0.015), 0);
  group.add(fl);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const radar = wh.getObjectByName("radar")!;
  const beacon = wh.getObjectByName("beacon") as THREE.Mesh;
  const flagMesh = fl.getObjectByName("flag") as THREE.Mesh;
  const flagBase = (flagMesh.geometry.attributes.position.array as Float32Array).slice();

  return {
    group,
    anchors: {
      bow: new THREE.Vector3(xAt(0.97), deckY(0.97) + 0.2, 0),
      stern: new THREE.Vector3(xAt(0.14), deckY(0.14) + 1.1, 0),
      engine: new THREE.Vector3(xAt(engT), deckY(engT) + 1.4, 0),
      wheelhouse: new THREE.Vector3(xAt(whT), deckY(whT) + 2.6, 0),
      length: new THREE.Vector3(0, -0.2, HB + 0.4),
    },
    update(time: number) {
      radar.rotation.y = time * 1.6;
      (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.max(0, Math.sin(time * 6)) * 3;
      const p = flagMesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = flagBase[i * 3];
        const wave = Math.sin(x * 6 + time * 7) * 0.06 * (0.45 - x) * 2;
        p.setZ(i, wave);
      }
      p.needsUpdate = true;
    },
  };
}

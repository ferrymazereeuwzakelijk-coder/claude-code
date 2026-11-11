import * as THREE from "three";

/**
 * The Ferry-Jo, from the owner's 3D model (claude.ai artifact "Ferry-Jo 3D").
 * Procedural model, units in metres. +X = bow, +Y = up, +Z = starboard,
 * waterline at y = 0. Ported to TypeScript with three additions for the site:
 * named anchor points for the spec callouts, a per-frame update (radar, flags)
 * and the export shape the scene expects.
 */

export type FerryJo = {
  group: THREE.Group;
  /** Named anchor points (local coords) for HTML callouts. */
  anchors: Record<"bow" | "stern" | "engine" | "wheelhouse" | "length", THREE.Vector3>;
  update: (time: number) => void;
};

type MatOpts = Partial<THREE.MeshStandardMaterialParameters>;

export function createFerryJo(): FerryJo {
  const boat = new THREE.Group();
  boat.name = "Ferry-Jo";

  const L = 17, B = 2.3, DRAFT = 1.5, BULW = 0.6;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const sstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const std = (color: number, o: MatOpts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...o });
  const M = {
    hullInner: std(0x8f979c, { side: THREE.DoubleSide }),
    deck: std(0x7d868c, { side: THREE.DoubleSide, roughness: 0.9 }),
    black: std(0x17191c, { roughness: 0.6 }),
    strake: std(0x24272b, { roughness: 0.55 }),
    grey: std(0xa3abb0),
    greyLight: std(0xc3c9cc),
    white: std(0xf1f1ec, { roughness: 0.55 }),
    red: std(0xe0431d, { roughness: 0.5 }),
    redDeep: std(0xb3271b),
    glass: std(0x16242c, { roughness: 0.12, metalness: 0.7 }),
    tire: std(0x101112, { roughness: 0.95 }),
    rope: std(0xd9b63a, { roughness: 0.95 }),
    ropePale: std(0xcbc5b2, { roughness: 0.95 }),
    exhaust: std(0xb5a587, { roughness: 0.6, metalness: 0.3 }),
    steel: std(0xd9dde0, { roughness: 0.4, metalness: 0.5 }),
    orange: std(0xf0641e, { roughness: 0.6 }),
    blue: std(0x2f7fc4, { roughness: 0.5 }),
    lamp: std(0xfff4c8, { emissive: 0x554a20, roughness: 0.3 }),
  };

  /* ---------- hull shape functions (u: 0 = stern, 1 = bow) ---------- */
  const xOf = (u: number) => -L / 2 + u * L;
  const uOf = (x: number) => (x + L / 2) / L;
  const halfBeam = (u: number) => {
    if (u < 0.32) { const k = (0.32 - u) / 0.32; return B * Math.pow(Math.max(0, 1 - Math.pow(k, 2.4)), 0.5); }
    if (u > 0.52) { const k = (u - 0.52) / 0.48; return B * Math.pow(Math.max(0, 1 - k * k), 0.85); }
    return B;
  };
  const topY = (u: number) => 1.45 + 1.0 * Math.pow(Math.max(0, (u - 0.45) / 0.55), 2.2) + 0.2 * Math.pow(Math.max(0, (0.4 - u) / 0.4), 2);
  const keelY = (u: number) => lerp(lerp(0.25, -DRAFT, sstep(0, 0.3, u)), -DRAFT * 0.55, sstep(0.9, 1, u));
  const deckY = (u: number) => topY(u) - BULW;
  const section = (s: number, u: number) => {
    // 0..1 fullness at depth s (0 = rail, 1 = keel)
    const n = lerp(3.6, 1.7, sstep(0.6, 1, u));
    return Math.pow(Math.max(0, 1 - Math.pow(s, n)), 0.6);
  };
  const hullZ = (u: number, y: number) => {
    const s = Math.min(1, Math.max(0, (topY(u) - y) / (topY(u) - keelY(u))));
    return halfBeam(u) * section(s, u);
  };
  const deckAt = (x: number) => deckY(uOf(x));

  /* ---------- hull texture with the name on the bow ---------- */
  function hullTexture(port: boolean) {
    const c = document.createElement("canvas");
    c.width = 4096;
    c.height = 1024;
    const g = c.getContext("2d")!;
    g.fillStyle = "#17191c";
    g.fillRect(0, 0, c.width, c.height);
    const uText = 0.892;
    const cx = (port ? 1 - uText : uText) * c.width;
    g.save();
    g.translate(cx, 0.105 * c.height);
    g.scale(0.84, 1);
    g.fillStyle = "#f4f4f0";
    g.font = 'bold 92px Georgia, "Times New Roman", serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("FERRY-JO", 0, 0);
    g.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  /* ---------- hull shell ---------- */
  const NU = 96, NS = 22;
  const us = Array.from({ length: NU + 1 }, (_, i) => 0.5 - 0.5 * Math.cos((Math.PI * i) / NU));
  function hullSide(side: number) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = us[i], x = xOf(u), ty = topY(u), ky = keelY(u), hb = halfBeam(u);
      for (let j = 0; j <= NS; j++) {
        const s = j / NS;
        pos.push(x, lerp(ty, ky, s), side * hb * section(s, u));
        uv.push(side > 0 ? u : 1 - u, 1 - s);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + NS + 1, c = a + 1, d = b + 1;
      if (side > 0) idx.push(a, c, b, c, d, b);
      else idx.push(a, b, c, c, b, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = std(0xffffff, { map: hullTexture(side < 0), roughness: 0.6, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.name = side > 0 ? "hull-starboard" : "hull-port";
    return m;
  }
  boat.add(hullSide(1), hullSide(-1));

  /* ---------- deck and inner bulwark ---------- */
  const INSET = 0.05;
  {
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = us[i], w = Math.max(0, halfBeam(u) - INSET);
      pos.push(xOf(u), deckY(u), w, xOf(u), deckY(u), -w);
    }
    for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const deck = new THREE.Mesh(geo, M.deck);
    deck.name = "deck";
    boat.add(deck);
  }
  for (const side of [1, -1]) {
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = us[i], w = side * Math.max(0, halfBeam(u) - INSET);
      pos.push(xOf(u), deckY(u), w, xOf(u), topY(u), w);
    }
    for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    boat.add(new THREE.Mesh(geo, M.hullInner));
  }

  /* ---------- rail cap and rubbing strake ---------- */
  function ringCurve(yFn: (u: number) => number, zFn: (u: number) => number) {
    const pts: THREE.Vector3[] = [];
    const N = 70;
    for (let i = 0; i <= N; i++) { const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / N); pts.push(new THREE.Vector3(xOf(u), yFn(u), zFn(u))); }
    for (let i = N - 1; i >= 1; i--) { const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / N); pts.push(new THREE.Vector3(xOf(u), yFn(u), -zFn(u))); }
    return new THREE.CatmullRomCurve3(pts, true, "centripetal");
  }
  const rail = new THREE.Mesh(new THREE.TubeGeometry(ringCurve(topY, (u) => Math.max(0.02, halfBeam(u) - 0.02)), 300, 0.055, 8, true), M.black);
  rail.name = "rail";
  boat.add(rail);
  const strake = new THREE.Mesh(
    new THREE.TubeGeometry(ringCurve((u) => deckY(u) - 0.08, (u) => Math.max(0.03, hullZ(u, deckY(u) - 0.08))), 300, 0.085, 8, true),
    M.strake,
  );
  strake.name = "rubbing-strake";
  boat.add(strake);

  /* ---------- small helpers ---------- */
  const box = (lx: number, ly: number, lz: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = boat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const cyl = (r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = boat, seg = 16) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const tube = (pts: THREE.Vector3[], r: number, mat: THREE.Material, parent: THREE.Object3D = boat) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 8, r, 8, false), mat);
    parent.add(m);
    return m;
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // stem bar
  box(0.14, topY(1) - keelY(1) + 0.15, 0.14, M.black, L / 2 - 0.03, (topY(1) + keelY(1)) / 2 + 0.07, 0);

  /* ---------- wheelhouse ---------- */
  const wh = new THREE.Group();
  wh.name = "wheelhouse";
  boat.add(wh);
  const WX0 = 2.2, WX1 = 4.8, WW = 2.5, WBASE = 0.9, WTOP = 3.3;
  const WCX = (WX0 + WX1) / 2, WH = WTOP - WBASE;
  box(WX1 - WX0, WH, WW, M.white, WCX, WBASE + WH / 2, 0, wh);
  box(WX1 - WX0 + 0.34, 0.17, WW + 0.34, M.red, WCX, WTOP + 0.02, 0, wh); // red roof band
  box(WX1 - WX0 + 0.24, 0.06, WW + 0.24, M.greyLight, WCX, WTOP + 0.13, 0, wh); // roof
  const WINY = 2.72, WINH = 0.62;
  for (const side of [1, -1]) {
    for (const x of [3.3, 3.88, 4.46]) box(0.46, WINH, 0.03, M.glass, x, WINY, (side * WW) / 2, wh);
    box(0.34, 0.4, 0.03, M.glass, 2.62, WINY + 0.1, (side * WW) / 2, wh);
    box(0.66, 1.75, 0.035, M.grey, 2.62, deckAt(2.6) + 0.95, (side * WW) / 2, wh); // door
    const port = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20), M.glass);
    port.rotation.x = Math.PI / 2;
    port.position.set(2.62, deckAt(2.6) + 1.3, (side * WW) / 2);
    wh.add(port);
  }
  for (const z of [-0.8, 0, 0.8]) box(0.03, WINH, 0.62, M.glass, WX1, WINY, z, wh);
  for (const z of [-0.6, 0.6]) box(0.03, 0.5, 0.6, M.glass, WX0, WINY + 0.05, z, wh);

  // company lettering on both sides
  {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const g = c.getContext("2d")!;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#3d4348";
    g.font = '600 58px "Arial Narrow", Arial, sans-serif';
    g.fillText("02203689", 256, 60);
    g.fillStyle = "#16384f";
    g.font = "bold 104px Arial, sans-serif";
    g.fillText("MAZA", 256, 170);
    g.fillStyle = "#2aa3b8";
    g.font = "600 44px Arial, sans-serif";
    "SHIPPING".split("").forEach((ch, i) => g.fillText(ch, 256 + (i - 3.5) * 40, 258));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 });
    for (const side of [1, -1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.69), mat);
      p.position.set(3.88, 1.92, side * (WW / 2 + 0.012));
      if (side < 0) p.rotation.y = Math.PI;
      p.name = "lettering";
      wh.add(p);
    }
  }
  // lifebuoys
  const buoy = (x: number, y: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 10, 28), M.orange);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    wh.add(m);
  };
  buoy(WX1 + 0.08, 1.95, -0.55, Math.PI / 2);
  buoy(WX0 - 0.08, 2.0, 0.0, Math.PI / 2);

  // roof gear
  const ROOF = WTOP + 0.16;
  cyl(0.045, 2.5, M.steel, 2.55, ROOF + 1.25, 0, wh); // mast
  box(0.04, 0.04, 1.0, M.steel, 2.55, ROOF + 1.55, 0, wh);
  box(0.04, 0.04, 0.6, M.steel, 2.55, ROOF + 2.05, 0, wh);
  for (const [y, z] of [[1.62, 0.45], [1.62, -0.45], [2.12, 0.25], [2.12, -0.25], [2.55, 0]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.lamp);
    l.position.set(2.55, ROOF + y, z);
    wh.add(l);
  }
  cyl(0.08, 0.3, M.white, 4.2, ROOF + 0.15, 0, wh); // radar pedestal
  box(0.34, 0.16, 0.3, M.white, 4.2, ROOF + 0.36, 0, wh);
  const scanner = box(0.13, 0.1, 1.7, M.white, 4.2, ROOF + 0.5, 0, wh);
  scanner.rotation.y = 0.5;
  scanner.name = "radar";
  for (const z of [-0.95, 0.95]) {
    // searchlights
    cyl(0.025, 0.25, M.steel, 4.6, ROOF + 0.12, z, wh);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 16), M.steel);
    s.rotation.z = Math.PI / 2;
    s.position.set(4.62, ROOF + 0.3, z);
    wh.add(s);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), M.lamp);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(4.71, ROOF + 0.3, z);
    wh.add(lens);
  }
  for (const [x, z] of [[3.6, -0.5], [3.35, 0.2], [3.05, -0.75]]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white);
    d.position.set(x, ROOF, z);
    wh.add(d);
  }
  box(0.55, 0.04, 0.4, M.blue, 3.2, ROOF + 0.03, 0.7, wh); // blue roof panel

  /* ---------- forward trunk ---------- */
  box(1.6, 0.95, 1.8, M.grey, 5.6, 1.325, 0);
  box(0.6, 0.06, 0.6, M.greyLight, 5.6, 1.83, 0);

  /* ---------- engine casing (sloped aft) ---------- */
  {
    const s = new THREE.Shape();
    s.moveTo(-1.1, 0.8);
    s.lineTo(2.2, 0.8);
    s.lineTo(2.2, 2.3);
    s.lineTo(1.0, 2.3);
    s.lineTo(0.2, 1.75);
    s.lineTo(-1.1, 1.55);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 2.0, bevelEnabled: false });
    geo.translate(0, 0, -1.0);
    const m = new THREE.Mesh(geo, M.grey);
    m.name = "engine-casing";
    boat.add(m);
    const hatch = box(0.75, 0.05, 0.9, M.greyLight, 0.6, 2.05, 0);
    hatch.rotation.z = Math.atan2(0.55, 0.8);
  }
  // exhausts
  tube([V(1.85, 2.2, 0.6), V(1.85, 3.2, 0.6), V(1.8, 3.6, 0.6), V(1.55, 3.78, 0.6), V(1.2, 3.8, 0.6)], 0.115, M.exhaust);
  tube([V(1.9, 2.2, 0.25), V(1.9, 3.3, 0.25), V(1.8, 3.5, 0.25), V(1.55, 3.55, 0.25)], 0.06, M.steel);

  /* ---------- aft deck ---------- */
  {
    const y = deckAt(-1.9);
    for (const z of [-0.32, 0.32]) cyl(0.1, 0.85, M.black, -1.9, y + 0.42, z); // towing bitt
    box(0.1, 0.1, 1.0, M.black, -1.9, y + 0.62, 0);
    for (let i = 0; i < 5; i++) {
      // yellow rope coil
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 20), M.rope);
      t.rotation.x = Math.PI / 2;
      t.position.set(-1.9, y + 0.12 + i * 0.1, 0.32);
      boat.add(t);
    }
    const yb = deckAt(-3.8);
    box(1.7, 0.45, 1.5, M.grey, -3.8, yb + 0.22, 0); // deck box
    box(0.75, 0.04, 1.2, M.greyLight, -3.4, yb + 0.47, 0);
    box(0.5, 0.04, 0.5, M.greyLight, -4.25, yb + 0.47, -0.3);
    box(1.0, 0.1, 1.2, M.greyLight, -6.4, deckAt(-6.4) + 0.05, 0); // aft hatch
  }
  // bollards
  const bollard = (x: number, z: number, capMat: THREE.Material = M.redDeep) => {
    const y = deckAt(x);
    for (const dx of [-0.17, 0.17]) {
      cyl(0.075, 0.36, M.black, x + dx, y + 0.18, z);
      cyl(0.095, 0.05, capMat, x + dx, y + 0.38, z);
    }
  };
  for (const s of [1, -1]) {
    bollard(6.5, s * 0.8);
    bollard(1.0, s * 1.75, M.rope);
    bollard(-5.6, s * 1.55);
  }
  bollard(7.35, 0);

  /* ---------- flags ---------- */
  function flag(stripes: string[], w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 64;
    const g = c.getContext("2d")!;
    stripes.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(0, (i * 64) / stripes.length, 96, 64 / stripes.length + 1);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(w, h, 8, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin(p.getX(i) * 7));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
  }
  const staff = new THREE.Group();
  staff.position.set(-8.0, deckAt(-8.0), 0);
  staff.rotation.z = 0.45;
  boat.add(staff);
  cyl(0.03, 2.6, M.steel, 0, 1.3, 0, staff);
  const ensign = flag(["#ae1c28", "#ffffff", "#21468b"], 0.9, 0.6);
  ensign.position.set(-0.47, 2.25, 0);
  ensign.name = "flag-nl";
  staff.add(ensign);
  cyl(0.02, 1.0, M.steel, 8.15, topY(uOf(8.15)) + 0.4, 0);
  const pennant = flag(["#c8102e", "#ffffff", "#c8102e"], 0.34, 0.24);
  pennant.position.set(7.96, topY(uOf(8.15)) + 0.75, 0);
  boat.add(pennant);

  /* ---------- tyre fenders ---------- */
  const tires = new THREE.Group();
  tires.name = "fenders";
  boat.add(tires);
  const tireGeo = new THREE.TorusGeometry(0.25, 0.125, 10, 24);
  for (const x of [-5.4, 0.6, 2.2, 3.8, 5.4, 6.7, 7.6, 8.15]) {
    const u = uOf(x), y = deckY(u) - 0.12;
    const slope = (hullZ(u + 0.004, y) - hullZ(u - 0.004, y)) / (0.008 * L);
    for (const side of [1, -1]) {
      const n = V(-slope, 0, side).normalize();
      const t = new THREE.Mesh(tireGeo, M.tire);
      t.position.set(x + n.x * 0.15, y, side * hullZ(u, y) + n.z * 0.15);
      t.rotation.y = Math.atan2(n.x, n.z);
      tires.add(t);
      const hang = topY(u) - (y + 0.3);
      cyl(0.015, hang, M.ropePale, t.position.x, y + 0.3 + hang / 2, t.position.z, tires, 6);
    }
  }

  /* ---------- rope draped round the bow ---------- */
  for (const side of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = lerp(8.38, 5.9, t), u = uOf(x);
      const y = topY(u) + 0.03 - 0.95 * Math.pow(Math.sin(Math.PI * t), 0.8);
      pts.push(V(x, y, side * (hullZ(u, y) + 0.07)));
    }
    tube(pts, 0.035, M.ropePale).name = "bow-rope";
  }

  boat.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // Animated cloth: ripple travels along the flags
  const cloths = [ensign, pennant].map((m) => {
    const geo = m.geometry as THREE.PlaneGeometry;
    return { m, base: (geo.attributes.position.array as Float32Array).slice(), w: geo.parameters.width };
  });

  return {
    group: boat,
    anchors: {
      bow: V(L / 2, topY(1) + 0.2, 0),
      stern: V(-1.9, deckAt(-1.9) + 0.85, 0), // towing bitt
      engine: V(0.6, 2.3, 0), // engine casing
      wheelhouse: V(4.2, ROOF + 0.55, 0), // radar
      length: V(0, -0.1, B + 0.3),
    },
    update(time: number) {
      scanner.rotation.y = time * 2.2;
      for (const c of cloths) {
        const p = c.m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = c.base[i * 3];
          p.setZ(i, Math.sin(x * 7 + time * 6) * 0.07 * (0.5 + (c.w / 2 - x) / c.w));
        }
        p.needsUpdate = true;
      }
    },
  };
}

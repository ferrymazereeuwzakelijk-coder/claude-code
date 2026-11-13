import * as THREE from "three";
import { RIVER } from "./timeline";

/**
 * Daylight inland-waterway environment: sky with soft clouds, a flat river with
 * wakes for up to four vessels, a steel-piled quay on the right bank with a
 * small industrial site, and a green polder bank with trees on the left.
 */

export const SUN_DIR = new THREE.Vector3(0.45, 0.62, -0.64).normalize(); // sun behind the camera (polder side)
const SKY_TOP = new THREE.Color(0x3f87d4);
const SKY_HORIZON = new THREE.Color(0xc9dcea);
export const FOG_COLOR = new THREE.Color(0xc4d6e3);

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */
const skyFrag = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun;
  varying vec3 vDir;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
  void main(){
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, h), 0.8));
    // sun glow
    float s = max(dot(d, normalize(uSun)), 0.0);
    col += vec3(1.0, 0.93, 0.8) * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.18);
    // soft fair-weather clouds on a plane above
    if (d.y > 0.01) {
      vec2 uv = d.xz / d.y * 0.6;
      float c = smoothstep(0.52, 0.78, fbm(uv * 0.9 + vec2(3.0, 7.0)));
      c *= smoothstep(0.02, 0.18, d.y);
      col = mix(col, vec3(0.97, 0.98, 1.0), c * 0.85);
    }
    // below the horizon: haze (hidden by terrain)
    if (d.y < 0.0) col = uHorizon;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;
export function createSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(2400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTop: { value: SKY_TOP }, uHorizon: { value: SKY_HORIZON }, uSun: { value: SUN_DIR } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }",
      fragmentShader: skyFrag,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Water                                                               */
/* ------------------------------------------------------------------ */
export const MAX_WAKES = 4;
const waterFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uSun; uniform vec3 uFog;
  uniform vec4 uBoat[${MAX_WAKES}];   // x, z, yaw, speed (0..1)
  uniform vec3 uSize[${MAX_WAKES}];   // half length, half beam, propeller wash (0/1)
  varying vec3 vWorld;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  void main(){
    vec2 p = vWorld.xz;
    float t = uTime;
    // small wind ripples
    float n1 = noise(p * 0.55 + vec2(t * 0.25, t * 0.1));
    float n2 = noise(p * 1.9 - vec2(t * 0.35, -t * 0.15));
    float n3 = noise(p * 6.0 + vec2(t * 0.6, 0.0));
    vec3 nrm = normalize(vec3((n1 - 0.5) * 0.12 + (n2 - 0.5) * 0.08 + (n3 - 0.5) * 0.04, 1.0, (n2 - 0.5) * 0.12 + (n3 - 0.5) * 0.05));

    float foam = 0.0;
    float churn = 0.0;
    for (int i = 0; i < ${MAX_WAKES}; i++) {
      vec4 b = uBoat[i]; vec3 sz = uSize[i];
      if (sz.x <= 0.0) continue;
      vec2 hd = vec2(cos(b.z), -sin(b.z));          // heading
      vec2 sd = vec2(-hd.y, hd.x);                   // side
      vec2 d = p - b.xy;
      float a = dot(d, hd);                          // along (+ forward)
      float l = dot(d, sd);                          // lateral
      float sp = b.w;
      // hull-hugging foam line where the hull meets the water
      vec2 q = vec2(a / (sz.x + 0.6), l / (sz.y + 0.5));
      float r = length(q);
      float ring = smoothstep(1.12, 1.0, r) * smoothstep(0.86, 1.0, r);
      foam += ring * (0.12 + 0.55 * sp) * smoothstep(0.35, 0.75, noise(p * 3.0 + t));
      // bow wave
      float bow = smoothstep(sz.x + 4.0, sz.x, a) * smoothstep(sz.x - 3.0, sz.x, a) * smoothstep(sz.y + 2.5, sz.y * 0.4, abs(l));
      foam += bow * sp * 0.6 * smoothstep(0.3, 0.7, noise(p * 4.0 - t * 2.0));
      // Kelvin wake arms behind the stern (19.5°)
      float behind = -a - sz.x;
      if (behind > 0.0) {
        float arm = abs(abs(l) - sz.y - behind * 0.36);
        float w = 0.6 + behind * 0.045;
        float fade = exp(-behind / (25.0 + 70.0 * sp));
        foam += smoothstep(w, 0.0, arm) * fade * sp * 0.85 * smoothstep(0.3, 0.7, noise(p * 1.6 + vec2(t, 0.0)));
        // propeller wash (centreline turbulence)
        float wash = smoothstep(sz.y * 0.9 + behind * 0.08, 0.0, abs(l)) * exp(-behind / (12.0 + 40.0 * sp)) * sz.z;
        churn += wash * (0.25 + sp);
      }
    }
    churn = clamp(churn, 0.0, 1.0);
    nrm = normalize(nrm + vec3((n3 - 0.5), 0.0, (n1 - 0.5)) * churn * 0.6);

    vec3 view = normalize(cameraPosition - vWorld);
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(view, nrm), 0.0), 5.0);
    vec3 col = mix(uDeep, uSky, clamp(0.08 + fres * 1.25, 0.0, 1.0));
    // sun glitter
    vec3 refl = reflect(-view, nrm);
    float spec = pow(max(dot(refl, uSun), 0.0), 220.0);
    col += vec3(1.0, 0.95, 0.85) * spec * 2.2;
    // churned water is lighter and greener
    col = mix(col, vec3(0.42, 0.52, 0.5), churn * 0.45);
    col = mix(col, vec3(0.93, 0.96, 0.97), clamp(foam, 0.0, 0.9));
    // aerial perspective
    float dist = length(vWorld - cameraPosition);
    col = mix(col, uFog, smoothstep(220.0, 1500.0, dist));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;
export function createWater() {
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(0x2a4b58) },
    uSky: { value: new THREE.Color(0xc2d8ea) },
    uSun: { value: SUN_DIR },
    uFog: { value: FOG_COLOR },
    uBoat: { value: Array.from({ length: MAX_WAKES }, () => new THREE.Vector4()) },
    uSize: { value: Array.from({ length: MAX_WAKES }, () => new THREE.Vector3()) },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 2400),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: "varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: waterFrag,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(400, 0, 0);
  return { mesh, uniforms };
}

/* ------------------------------------------------------------------ */
/* Banks, quay and land                                                */
/* ------------------------------------------------------------------ */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: string, dots: [string, number][], n: number) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const [c, s] = dots[Math.floor(rnd() * dots.length)];
    g.fillStyle = c;
    g.fillRect(rnd() * w, rnd() * h, s * (0.5 + rnd()), s * (0.5 + rnd()));
  }
}

/** Place a mesh at x, y, z and return it. */
function at(m: THREE.Mesh, x: number, y: number, z: number) {
  m.position.set(x, y, z);
  return m;
}

/** Deterministic pseudo-random generator for scenery placement. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function createLand(quality: "high" | "low") {
  const g = new THREE.Group();
  const grassTex = canvasTex(256, 256, (c) => speckle(c, 256, 256, "#5d8a3c", [["#577f37", 2], ["#64913f", 2], ["#6c9746", 1], ["#52793a", 3]], 2600), [160, 80]);
  const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
  const pavingTex = canvasTex(256, 256, (c) => {
    speckle(c, 256, 256, "#9a9b97", [["#8a8b87", 2], ["#a9aaa6", 2], ["#7d7e7a", 3]], 3000);
    c.strokeStyle = "rgba(60,60,60,0.25)";
    for (let i = 0; i <= 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); }
  }, [60, 8]);
  const paving = new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.95 });
  const pilingTex = canvasTex(512, 64, (c) => {
    c.fillStyle = "#3b332d";
    c.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 16) {
      const grd = c.createLinearGradient(x, 0, x + 16, 0);
      grd.addColorStop(0, "#2a2420"); grd.addColorStop(0.5, "#5a4a3c"); grd.addColorStop(1, "#2a2420");
      c.fillStyle = grd;
      c.fillRect(x, 0, 16, 64);
    }
    c.fillStyle = "rgba(20,30,25,0.55)";
    c.fillRect(0, 44, 512, 20); // waterline staining
  }, [200, 1]);
  const piling = new THREE.MeshStandardMaterial({ map: pilingTex, roughness: 0.8, metalness: 0.2 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb7b6b0, roughness: 0.9 });

  // Right bank: steel sheet piling with concrete capping beam, paved quay, then grass
  const QZ = RIVER.quayZ, LAND_Y = 1.6;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(3000, 4), piling);
  wall.position.set(400, LAND_Y - 2, QZ);
  wall.rotation.y = Math.PI; // faces the river (−Z)
  g.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(3000, 0.5, 0.9), concrete);
  cap.position.set(400, LAND_Y - 0.15, QZ + 0.45);
  g.add(cap);
  // paved industrial quay only around the site; grass verge elsewhere
  const quay = new THREE.Mesh(new THREE.PlaneGeometry(420, 80), paving);
  quay.rotation.x = -Math.PI / 2;
  quay.position.set(470, LAND_Y + 0.01, QZ + 40.9);
  g.add(quay);
  const rightField = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1400), grass);
  rightField.rotation.x = -Math.PI / 2;
  rightField.position.set(400, LAND_Y - 0.02, QZ + 700);
  g.add(rightField);
  // quay bollards
  const bol = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.6 }), 60);
  for (let i = 0; i < 60; i++) bol.setMatrixAt(i, new THREE.Matrix4().makeTranslation(150 + i * 10, LAND_Y + 0.35, QZ + 1.3));
  g.add(bol);

  // Left bank: grass slope down to the water, then flat polder
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(3000, 9), grass);
  slope.position.set(400, 0.55, RIVER.leftBankZ - 4);
  slope.rotation.x = -Math.PI / 2 - Math.atan2(LAND_Y + 0.6, 9);
  g.add(slope);
  const leftField = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1400), grass);
  leftField.rotation.x = -Math.PI / 2;
  leftField.position.set(400, LAND_Y - 0.05, RIVER.leftBankZ - 8.5 - 700);
  g.add(leftField);

  // Trees: rounded deciduous and Dutch poplar rows (instanced)
  const rnd = rng(42);
  const n = quality === "high" ? 520 : 260;
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ roughness: 1 }), n);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 1, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let k = 0;
  const place = (x: number, z: number, poplar: boolean) => {
    if (k >= n) return;
    const s = poplar ? 2.2 + rnd() * 0.8 : 3.2 + rnd() * 2.6;
    const h = poplar ? 14 + rnd() * 6 : 4 + rnd() * 3;
    trunks.setMatrixAt(k, m.compose(new THREE.Vector3(x, LAND_Y + h / 2, z), q, new THREE.Vector3(1, h, 1)));
    crowns.setMatrixAt(k, m.compose(new THREE.Vector3(x, LAND_Y + h + (poplar ? 2 : s * 0.6), z), q, new THREE.Vector3(s, poplar ? s * 4.2 : s * 0.9, s)));
    crowns.setColorAt(k, c.setHSL(0.24 + rnd() * 0.06, 0.38 + rnd() * 0.15, 0.24 + rnd() * 0.1));
    k++;
  };
  // left bank: scattered trees and a poplar row along a field edge
  // near the water only upstream (the wide shots look across the left bank further on)
  for (let i = 0; i < n * 0.12; i++) place(-300 + rnd() * 520, RIVER.leftBankZ - 12 - rnd() * 20, false);
  for (let i = 0; i < n * 0.12; i++) place(-300 + rnd() * 1500, RIVER.leftBankZ - 300 - rnd() * 200, false);
  for (let x = -300; x < 1200; x += 9) place(x, RIVER.leftBankZ - 260 + rnd() * 2, true);
  // right bank: behind the industrial quay and outside it
  for (let i = 0; i < n * 0.3; i++) {
    const x = -300 + rnd() * 1500;
    const inSite = x > 250 && x < 690;
    place(x, RIVER.quayZ + (inSite ? 100 + rnd() * 200 : 14 + rnd() * 260), false);
  }
  // poplar windbreak behind the industrial site
  for (let x = -300; x < 1200; x += 10) place(x, RIVER.quayZ + 130 + rnd() * 2, true);
  trunks.count = crowns.count = k;
  crowns.castShadow = true;
  g.add(trunks, crowns);

  // Polder farmhouses on the left bank (gabled)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b2b26, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9 });
  for (const [x, z, s] of [[60, -330, 1], [330, -380, 1.3], [640, -350, 1.1], [-120, -360, 0.9]] as const) {
    const h = new THREE.Group();
    h.add(at(new THREE.Mesh(new THREE.BoxGeometry(14, 5, 9), wallMat), 0, 2.5, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.6, 6, 4, 1), roofMat);
    roof.rotation.set(0, Math.PI / 4, 0);
    roof.scale.set(1.35, 1, 0.85);
    roof.position.y = 8;
    h.add(roof);
    h.position.set(x, LAND_Y, z);
    h.scale.setScalar(s);
    g.add(h);
  }
  return g;
}

/** Small industrial quay: two sheds, stacked containers, lamp posts. */
export function createIndustrialSite() {
  const g = new THREE.Group();
  const y = 1.6, QZ = RIVER.quayZ;
  const shed = (x: number, z: number, w: number, d: number, h: number, band: number) => {
    const s = new THREE.Group();
    s.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.7, metalness: 0.2 })), 0, h / 2, 0));
    s.add(at(new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h * 0.35, d + 0.1), new THREE.MeshStandardMaterial({ color: band, roughness: 0.6, metalness: 0.2 })), 0, h * 0.82, 0));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.5, d + 1.2), new THREE.MeshStandardMaterial({ color: 0x5f6468, roughness: 0.6 }));
    roof.position.y = h + 0.25;
    s.add(roof);
    // big door facing the quay
    s.add(at(new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h * 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a9196, roughness: 0.6 })), 0, h * 0.3, -d / 2 - 0.05));
    s.position.set(x, y, z);
    s.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(s);
  };
  shed(330, QZ + 52, 60, 34, 13, 0x4f7fa8);
  shed(470, QZ + 58, 46, 30, 11, 0x9aa3a8);
  shed(610, QZ + 54, 56, 32, 14, 0x4f7fa8);
  // containers
  const colors = [0x8c3b2f, 0x2f5f86, 0x7b8085, 0x406b4f, 0xa8742e];
  const cont = new THREE.InstancedMesh(new THREE.BoxGeometry(12.2, 2.6, 2.45), new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.3 }), 40);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  const rnd = rng(9);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const stack = 1 + Math.floor(rnd() * 2.2);
    for (let l = 0; l < stack && k < 40; l++) {
      cont.setMatrixAt(k, m.makeTranslation(395 + row * 13, y + 1.3 + l * 2.6, QZ + 22 + i * 2.7));
      cont.setColorAt(k, col.setHex(colors[Math.floor(rnd() * colors.length)]));
      k++;
    }
  }
  cont.count = k;
  cont.castShadow = cont.receiveShadow = true;
  g.add(cont);
  return g;
}

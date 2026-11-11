import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createFerryJo, type FerryJo } from "./ferryjo-model";

export type AnchorName = keyof FerryJo["anchors"];

type Options = {
  /** Drag-to-orbit viewer instead of the scroll-driven camera path. */
  interactive?: boolean;
  /** Freeze idle motion (prefers-reduced-motion). */
  still?: boolean;
  onFrame?: () => void;
};

/* Camera path: spherical keyframes around the vessel, driven by scroll progress 0..1 */
// sx / sy shift the vessel on screen (fraction of the viewport) to leave room for copy
type Key = { p: number; az: number; el: number; r: number; tx: number; ty: number; sx: number; sy: number };
const PATH: Key[] = [
  { p: 0.0, az: 0.7, el: 0.13, r: 29, tx: 0.5, ty: 1.3, sx: 0.15, sy: 0.16 },
  { p: 0.3, az: 1.52, el: 0.07, r: 22, tx: 0, ty: 1.2, sx: 0, sy: 0 },
  { p: 0.58, az: 2.35, el: 0.28, r: 18, tx: -1.2, ty: 1.6, sx: 0, sy: 0 },
  { p: 0.82, az: 3.05, el: 0.18, r: 19, tx: -2.0, ty: 1.4, sx: 0, sy: 0 },
  { p: 1.0, az: 3.75, el: 0.5, r: 31, tx: 0, ty: 0.5, sx: 0.22, sy: 0 },
];
const smooth = (x: number) => x * x * (3 - 2 * x);

function sampleCamera(p: number) {
  const c = Math.min(1, Math.max(0, p));
  let i = 0;
  while (i < PATH.length - 2 && c > PATH[i + 1].p) i++;
  const a = PATH[i];
  const b = PATH[i + 1];
  const k = smooth((c - a.p) / (b.p - a.p));
  const lerp = (x: number, y: number) => x + (y - x) * k;
  return {
    az: lerp(a.az, b.az), el: lerp(a.el, b.el), r: lerp(a.r, b.r), tx: lerp(a.tx, b.tx), ty: lerp(a.ty, b.ty),
    sx: lerp(a.sx, b.sx), sy: lerp(a.sy, b.sy),
  };
}

const waterVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;
  float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
    return sin(dot(p, dir) * freq + uTime * speed) * amp;
  }
  void main() {
    vec3 p = position;
    float h = 0.0;
    h += wave(p.xy, normalize(vec2(1.0, 0.35)), 0.32, 1.1, 0.16);
    h += wave(p.xy, normalize(vec2(-0.4, 1.0)), 0.55, 1.6, 0.08);
    h += wave(p.xy, normalize(vec2(0.8, -0.7)), 1.3, 2.3, 0.03);
    p.z += h;
    vWave = h;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uGlint;
  uniform vec3 uFog;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  varying float vWave;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    // Analytic-ish normal from the wave sum
    float t = uTime;
    vec2 p = vWorld.xz;
    float n1 = noise(p * 0.9 + vec2(t * 0.35, t * 0.12));
    float n2 = noise(p * 2.7 - vec2(t * 0.5, -t * 0.2));
    vec3 normal = normalize(vec3((n1 - 0.5) * 0.55 + (n2 - 0.5) * 0.25, 1.0, (n2 - 0.5) * 0.55));

    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(view, normal), 0.0), 3.0);
    vec3 col = mix(uDeep, uShallow, clamp(vWave * 2.0 + 0.45, 0.0, 1.0) * 0.6 + fresnel * 0.5);

    // Sun glints
    vec3 refl = reflect(-view, normal);
    float spec = pow(max(dot(refl, normalize(uSunDir)), 0.0), 140.0);
    col += uGlint * spec * 1.6 * (0.35 + 0.65 * fresnel);

    // Foam and wake around the hull (ellipse ~ 17.4 x 4.6 m)
    vec2 q = vec2(vWorld.x / 9.6, vWorld.z / 3.0);
    float d = length(q);
    d *= 1.0 + 0.25 * smoothstep(4.0, 9.0, vWorld.x); // narrower toward the pointed bow
    float hullFoam = smoothstep(1.1, 0.97, d) * smoothstep(0.82, 0.97, d) * smoothstep(0.3, 0.8, noise(p * 3.0 + t * 1.5));
    // Wake trailing aft (-X), spreading with distance
    float aft = max(0.0, -vWorld.x - 8.0);
    float wakeWidth = 1.8 + aft * 0.32;
    float wake = smoothstep(wakeWidth, wakeWidth * 0.35, abs(vWorld.z)) * smoothstep(60.0, 0.0, aft) * step(0.001, aft);
    wake *= smoothstep(0.35, 0.75, noise(vec2(vWorld.x * 0.8 + t * 2.0, vWorld.z * 1.6)));
    col = mix(col, vec3(0.8, 0.88, 0.92), clamp(hullFoam * 0.6 + wake * 0.4, 0.0, 1.0));

    // Distance fog into the horizon
    float dist = length(vWorld - cameraPosition);
    float fog = smoothstep(25.0, 170.0, dist);
    col = mix(col, uFog, fog);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  varying vec3 vDir;
  void main() {
    float h = normalize(vDir).y;
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.45, h));
    // Low band of brand-blue light along the horizon
    col += uGlow * exp(-abs(h - 0.01) * 38.0) * 0.55;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class FerryJoScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private boat: FerryJo;
  private boatRoot = new THREE.Group();
  private water: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private controls?: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private progress = 0;
  private smoothProgress = 0;
  private pointer = new THREE.Vector2();
  private smoothPointer = new THREE.Vector2();
  private visible = true;
  private ro: ResizeObserver;
  private tmp = new THREE.Vector3();

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: Options = {},
  ) {
    const small = window.innerWidth < 768;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !small;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(small ? 48 : 36, 1, 0.1, 600);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const fog = new THREE.Color(0x0d1c27);
    this.scene.background = fog;

    // Sky dome
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(0x04070a) },
          uHorizon: { value: fog },
          uGlow: { value: new THREE.Color(0x00a2e0) },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: skyFragment,
      }),
    );
    this.scene.add(sky);

    // Lights: cool sky fill + warm low sun + brand-blue rim
    this.scene.add(new THREE.HemisphereLight(0x9cc9e6, 0x0a0f14, 0.9));
    const sun = new THREE.DirectionalLight(0xffe2c4, 2.6);
    sun.position.set(18, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -12;
    sc.right = 12;
    sc.top = 10;
    sc.bottom = -10;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x3cc3ff, 1.6);
    rim.position.set(-20, 6, -14);
    this.scene.add(rim);

    // Water
    const seg = small ? 140 : 220;
    const waterGeo = new THREE.PlaneGeometry(420, 420, seg, seg);
    this.water = new THREE.Mesh(
      waterGeo,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color(0x041018) },
          uShallow: { value: new THREE.Color(0x0e3a52) },
          uGlint: { value: new THREE.Color(0xffe9cf) },
          uFog: { value: fog },
          uSunDir: { value: sun.position.clone().normalize() },
        },
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);

    // Vessel
    this.boat = createFerryJo();
    this.boatRoot.add(this.boat.group);
    this.scene.add(this.boatRoot);

    if (opts.interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.enableZoom = false;
      this.controls.minPolarAngle = 0.6;
      this.controls.maxPolarAngle = 1.48;
      this.controls.autoRotate = !opts.still;
      this.controls.autoRotateSpeed = 0.6;
      this.controls.target.set(0, 1.4, 0);
      this.camera.position.set(14, 6, 16);
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.loop();
  }

  setProgress(p: number) {
    this.progress = p;
  }
  /** Eased progress the camera is actually at (use it to sync overlays). */
  get currentProgress() {
    return this.smoothProgress;
  }
  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }
  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    if (v) {
      this.clock.getDelta();
      this.loop();
    } else cancelAnimationFrame(this.raf);
  }

  /** Screen position (CSS px within the canvas) of a named anchor on the vessel. */
  project(name: AnchorName) {
    const v = this.tmp.copy(this.boat.anchors[name]);
    this.boat.group.localToWorld(v);
    v.project(this.camera);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, front: v.z < 1 };
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the whole hull in frame on tall phone screens
    this.camera.fov = w / h < 0.8 ? 58 : w / h < 1.2 ? 46 : 36;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const still = this.opts.still;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = still ? 0 : this.clock.elapsedTime;
    this.water.material.uniforms.uTime.value = time;
    this.boat.update(time);

    // Gentle roll / pitch / heave
    this.boatRoot.position.y = Math.sin(time * 0.9) * 0.08 - 0.02;
    this.boatRoot.rotation.x = Math.sin(time * 0.7) * 0.018;
    this.boatRoot.rotation.z = Math.sin(time * 0.55 + 1) * 0.012;

    if (this.controls) {
      this.controls.update();
    } else {
      this.smoothProgress += (this.progress - this.smoothProgress) * Math.min(1, dt * 4);
      this.smoothPointer.lerp(this.pointer, Math.min(1, dt * 2.5));
      const c = sampleCamera(this.smoothProgress);
      const az = c.az + this.smoothPointer.x * 0.12;
      const el = Math.max(0.03, c.el + this.smoothPointer.y * 0.05);
      this.camera.position.set(
        c.tx + Math.cos(az) * Math.cos(el) * c.r,
        c.ty + Math.sin(el) * c.r,
        Math.sin(az) * Math.cos(el) * c.r,
      );
      this.camera.lookAt(c.tx, c.ty, 0);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      const narrow = w < 768;
      this.camera.setViewOffset(w, h, -(narrow ? 0 : c.sx) * w, (narrow ? c.sy * 1.9 : c.sy) * h, w, h);
    }
    this.renderer.render(this.scene, this.camera);
    this.opts.onFrame?.();
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => (v as THREE.Texture | undefined)?.isTexture && (v as THREE.Texture).dispose());
          mat.dispose();
        });
      }
    });
    this.renderer.dispose();
  }
}

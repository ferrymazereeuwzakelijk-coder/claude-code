import * as THREE from "three";

/**
 * Scroll-driven particle world behind the homepage.
 *
 * One cloud of points morphs between five shapes as the visitor scrolls:
 *   0 sphere    (hero: the idea)
 *   1 tunnel    (warp: you fly into it)
 *   2 terrain   (services/work: a digital landscape)
 *   3 helix     (process: structure, step by step)
 *   4 galaxy    (closing CTA: everything comes together)
 *
 * Sections mark where each shape takes over with `data-world="<index>"`.
 * The morph is done on the GPU; the CPU only computes one scroll value per frame.
 *
 * Performance: fewer points on small screens, DPR capped, paused when the tab
 * is hidden. Reduced motion: no ambient animation, the scene only redraws on scroll.
 * No WebGL: renders nothing, the page keeps its normal background.
 */

const SHAPES = 5;

function buildShapes(n: number) {
  const shapes = Array.from({ length: SHAPES }, () => new Float32Array(n * 3));
  const rand = new Float32Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const r0 = Math.random();
    rand[i] = r0;
    const o = i * 3;

    // 0: Fibonacci sphere with a little surface depth
    {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const R = 2.3 + (Math.random() - 0.5) * 0.12;
      shapes[0]![o] = Math.cos(th) * rad * R;
      shapes[0]![o + 1] = y * R;
      shapes[0]![o + 2] = Math.sin(th) * rad * R;
    }
    // 1: tunnel along -z. Half the points form rails that run to the vanishing
    // point, the rest form rings. Together they read as speed and depth.
    {
      const R = 2.7 + (Math.random() - 0.5) * 0.08;
      let a: number;
      let z: number;
      if (Math.random() < 0.5) {
        const rails = 18;
        a = (Math.floor(Math.random() * rails) / rails) * Math.PI * 2;
        z = 4 - Math.random() * 45;
      } else {
        a = Math.random() * Math.PI * 2;
        z = 4 - Math.floor(Math.random() * 30) * 1.5;
      }
      shapes[1]![o] = Math.cos(a) * R;
      shapes[1]![o + 1] = Math.sin(a) * R;
      shapes[1]![o + 2] = z;
    }
    // 2: terrain grid below the camera
    {
      const cols = Math.ceil(Math.sqrt(n * 1.6));
      const gx = (i % cols) / cols;
      const gz = Math.floor(i / cols) / (n / cols);
      const x = (gx - 0.5) * 26;
      const z = -gz * 30 + 4;
      const y = Math.sin(x * 0.45) * 0.6 + Math.cos(z * 0.35 + x * 0.2) * 0.8 - 2.6;
      shapes[2]![o] = x;
      shapes[2]![o + 1] = y;
      shapes[2]![o + 2] = z;
    }
    // 3: double helix
    {
      const t = (i / n) * Math.PI * 14;
      const strand = i % 2 === 0 ? 0 : Math.PI;
      const R = 1.6 + (Math.random() - 0.5) * 0.25;
      const spread = Math.random() < 0.18 ? Math.random() : 1; // some points form the rungs
      shapes[3]![o] = Math.cos(t + strand) * R * spread;
      shapes[3]![o + 1] = (i / n - 0.5) * 11;
      shapes[3]![o + 2] = Math.sin(t + strand) * R * spread;
    }
    // 4: spiral galaxy
    {
      const arms = 3;
      const arm = i % arms;
      const d = Math.pow(Math.random(), 0.7) * 6;
      const a = d * 1.1 + (arm / arms) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      shapes[4]![o] = Math.cos(a) * d;
      shapes[4]![o + 1] = (Math.random() - 0.5) * 0.35 * (1 - d / 7);
      shapes[4]![o + 2] = Math.sin(a) * d;
    }
  }
  return { shapes, rand };
}

const vertexShader = /* glsl */ `
  attribute vec3 p1;
  attribute vec3 p2;
  attribute vec3 p3;
  attribute vec3 p4;
  attribute float aRand;
  uniform float uStage;
  uniform float uTime;
  uniform float uSize;
  uniform float uFly;
  uniform vec2 uOffset;
  varying float vRand;
  varying float vFade;

  vec3 shapeAt(int i) {
    if (i == 0) return position;
    if (i == 1) return p1;
    if (i == 2) return p2;
    if (i == 3) return p3;
    return p4;
  }

  // Shapes 0 and 3 sit to the side on wide screens; others are centred.
  vec3 place(int i, vec3 p) {
    if (i == 0 || i == 3) p.xy += uOffset;
    if (i == 1) p.z = mod(p.z + uFly, 45.0) - 41.0;  // tunnel streams towards the camera
    if (i == 2) p.z = mod(p.z + uFly * 0.35, 30.0) - 26.0; // terrain scrolls under the camera
    return p;
  }

  void main() {
    float s = clamp(uStage, 0.0, 3.999);
    int a = int(floor(s));
    float f = s - float(a);
    // Each point leaves at a slightly different moment: the shape dissolves and re-forms.
    float t = smoothstep(0.0, 1.0, clamp((f - aRand * 0.35) / 0.65, 0.0, 1.0));

    vec3 from = place(a, shapeAt(a));
    vec3 to = place(a + 1, shapeAt(a + 1));
    vec3 p = mix(from, to, t);

    // Scatter outwards mid-transition, plus a gentle ambient drift.
    float burst = sin(t * 3.14159);
    p += normalize(p + vec3(0.001)) * burst * (0.6 + aRand * 1.8);
    p += vec3(sin(uTime * 0.6 + aRand * 40.0), cos(uTime * 0.5 + aRand * 30.0), sin(uTime * 0.4 + aRand * 20.0)) * 0.04;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = uSize * (0.6 + aRand * 0.9) * (8.0 / max(depth, 0.5));
    vRand = aRand;
    vFade = smoothstep(42.0, 6.0, depth) * smoothstep(0.2, 1.5, depth);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uDim;
  varying float vRand;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    vec3 blue = vec3(0.294, 0.482, 1.0);
    vec3 violet = vec3(0.502, 0.4, 1.0);
    vec3 white = vec3(0.85, 0.9, 1.0);
    vec3 col = mix(blue, violet, smoothstep(0.3, 0.8, vRand));
    col = mix(col, white, step(0.93, vRand));
    gl_FragColor = vec4(col, glow * vFade * uDim);
  }
`;

/** Start the world on a canvas. Returns a cleanup function. Framework-free. */
export function createWorld(canvas: HTMLCanvasElement): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {}; // No WebGL: keep the plain background.
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 768;
  const N = small ? 7000 : 16000;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const { shapes, rand } = buildShapes(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(shapes[0]!, 3));
  geo.setAttribute("p1", new THREE.BufferAttribute(shapes[1]!, 3));
  geo.setAttribute("p2", new THREE.BufferAttribute(shapes[2]!, 3));
  geo.setAttribute("p3", new THREE.BufferAttribute(shapes[3]!, 3));
  geo.setAttribute("p4", new THREE.BufferAttribute(shapes[4]!, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100); // morphs leave the base shape: never cull

  const uniforms = {
    uStage: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: small ? 3.4 : 3.2 },
    uFly: { value: 0 },
    uDim: { value: 1 },
    uOffset: { value: new THREE.Vector2(small ? 1.3 : 2.2, small ? 2.4 : 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const narrow = w < 768;
    uniforms.uOffset.value.set(narrow ? 1.3 : 2.2, narrow ? 2.4 : 0);
  };
  resize();

  // Scroll -> stage. Markers are read every frame (a handful of rects is cheap).
  const markers = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-world]"))
      .map((el) => ({ i: Number(el.dataset.world), top: el.getBoundingClientRect().top + window.scrollY }))
      .sort((a, b) => a.i - b.i);
  let marks = markers();
  const targetStage = () => {
    const y = window.scrollY + window.innerHeight * 0.6;
    if (marks.length === 0) return 0;
    if (y <= marks[0]!.top) return marks[0]!.i;
    for (let k = 0; k < marks.length - 1; k++) {
      const a = marks[k]!;
      const b = marks[k + 1]!;
      if (y < b.top) {
        // Marker i is where shape i starts to dissolve. The morph finishes within
        // about one screen (or half the section), then the new shape holds.
        const span = Math.min((b.top - a.top) * 0.55, window.innerHeight * 0.9);
        return a.i + Math.min((y - a.top) / Math.max(span, 1), 1) * (b.i - a.i);
      }
    }
    return marks[marks.length - 1]!.i;
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  let stage = targetStage();
  let lastScroll = window.scrollY;
  let flyVel = 0;
  let raf = 0;
  let running = true;
  const clock = new THREE.Clock();

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const target = targetStage();
    stage += (target - stage) * (reduce ? 1 : Math.min(dt * 4, 1));
    uniforms.uStage.value = stage;

    // Flying speed follows scroll velocity, with a calm baseline.
    const sy = window.scrollY;
    const vel = sy - lastScroll;
    lastScroll = sy;
    flyVel += (vel * 0.02 - flyVel) * 0.1;
    if (!reduce) {
      uniforms.uTime.value += dt;
      uniforms.uFly.value += dt * 1.2 + flyVel;
    }

    // Content sections dim the world so text stays readable.
    // On phones the hero text sits on top of the sphere, so it is dimmer there.
    const narrow = window.innerWidth < 768;
    const bright = stage < 0.5 ? (narrow ? 0.5 : 1) : stage < 1.2 ? 1 : stage > 3.6 ? 0.9 : 0.55;
    uniforms.uDim.value += (bright - uniforms.uDim.value) * 0.05;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const spin = reduce ? 0 : uniforms.uTime.value * 0.05;
    // Sphere, helix and galaxy rotate; tunnel and terrain stay aligned with the camera.
    const rotWeight = Math.max(0, 1 - Math.min(Math.abs(stage - 0), Math.abs(stage - 3), Math.abs(stage - 4)));
    points.rotation.y = spin * rotWeight + pointer.x * 0.25;
    points.rotation.x = pointer.y * 0.12 + (stage > 3.5 ? 0.45 * (stage - 3.5) * 2 : 0);

    renderer.render(scene, camera);
    if (running && !reduce) raf = requestAnimationFrame(frame);
  };

  const onScroll = () => {
    if (reduce) frame();
  };
  const onResize = () => {
    resize();
    marks = markers();
    if (reduce) frame();
  };
  const onVisibility = () => {
    running = !document.hidden;
    cancelAnimationFrame(raf);
    if (running && !reduce) {
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    }
  };
  // Layout can shift after fonts/images load.
  const remark = window.setTimeout(() => (marks = markers()), 1200);

  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  frame();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.clearTimeout(remark);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}

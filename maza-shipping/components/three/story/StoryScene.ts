import * as THREE from "three";
import { createFerryJo, type FerryJo } from "../ferryjo-model";
import {
  BARGE1, BARGE2, FLEET, TUG, barge1Pose, barge2Pose, cameraState, tugPose, towline, STORY_MARKS, clamp01, type Pose, type Vec3,
} from "./timeline";
import { createBarge1, createBarge2, createCranePontoon, createHarbourTug, createWorkboat, mergeStatic } from "./vessels";
import { FOG_COLOR, MAX_WAKES, SUN_DIR, createIndustrialSite, createLand, createSky, createWater } from "./world";

export type PartnerId = "harbourTug" | "workboat" | "cranePontoon";
type Options = { still?: boolean; onFrame?: (p: number) => void };

const V = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);

/**
 * One persistent WebGL scene for the homepage story. All motion comes from
 * updateScene(progress); only water ripples, flags and radar use clock time.
 */
export class StoryScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.5, 6000);
  private sun = new THREE.DirectionalLight(0xfff1dc, 3.1);
  private clock = new THREE.Clock();
  private raf = 0;
  private running = true;
  private ro: ResizeObserver;
  private target = 0;
  private current = 0;
  private narrow = false;

  private tug: FerryJo;
  private tugRoot = new THREE.Group();
  private barge1: THREE.Group;
  private barge2: THREE.Group;
  private water: ReturnType<typeof createWater>;
  private towMesh: THREE.Mesh;
  private bridleMesh: THREE.Mesh;
  private pushWires: THREE.Mesh;
  private ropeMat = new THREE.MeshStandardMaterial({ color: 0xe9e2c9, roughness: 0.9 });
  private wireMat = new THREE.MeshStandardMaterial({ color: 0x55595d, roughness: 0.45, metalness: 0.7 });
  private partnerAnchors: Record<PartnerId, THREE.Vector3>;
  private tmp = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, private opts: Options = {}) {
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.4 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene;
    scene.fog = new THREE.Fog(FOG_COLOR, 380, 2200);
    scene.background = FOG_COLOR;

    // Daylight: sky dome, its reflections as environment, sun with shadows
    const sky = createSky();
    scene.add(sky);
    const envScene = new THREE.Scene();
    envScene.add(createSky());
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.75;
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xd6e8f7, 0x6b7a52, 1.15));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.near = 1;
    sc.far = 600;
    scene.add(this.sun, this.sun.target);

    this.water = createWater();
    scene.add(this.water.mesh, createLand(small ? "low" : "high"), createIndustrialSite());

    // Vessels
    this.tug = createFerryJo();
    this.tugRoot.add(this.tug.group);
    this.barge1 = mergeStatic(createBarge1());
    this.barge2 = mergeStatic(createBarge2());
    scene.add(this.tugRoot, this.barge1, this.barge2);

    const fleet: [PartnerId, THREE.Group, { x: number; z: number; yaw: number }, number][] = [
      ["harbourTug", mergeStatic(createHarbourTug()), FLEET.harbourTug, 13],
      ["workboat", mergeStatic(createWorkboat()), FLEET.workboat, 11],
      ["cranePontoon", mergeStatic(createCranePontoon()), FLEET.cranePontoon, 14],
    ];
    this.partnerAnchors = {} as Record<PartnerId, THREE.Vector3>;
    for (const [id, g, pose, h] of fleet) {
      g.position.set(pose.x, 0, pose.z);
      g.rotation.y = pose.yaw;
      scene.add(g);
      this.partnerAnchors[id] = new THREE.Vector3(pose.x, h, pose.z);
    }

    // Lines (geometry rebuilt from the timeline each frame they are visible)
    this.towMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.ropeMat);
    this.bridleMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.wireMat);
    this.pushWires = new THREE.Mesh(new THREE.BufferGeometry(), this.wireMat);
    for (const m of [this.towMesh, this.bridleMesh, this.pushWires]) {
      m.castShadow = true;
      m.frustumCulled = false;
      scene.add(m);
    }

    // Test hook: ?storydebug exposes render stats for automated checks
    if (typeof location !== "undefined" && location.search.includes("storydebug")) {
      (window as unknown as { __story: unknown }).__story = { info: this.renderer.info, scene };
    }
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.updateScene(0);
    this.loop();
  }

  /** Scroll target; the scene eases toward it (or jumps for reduced motion). */
  setProgress(p: number, immediate = false) {
    this.target = clamp01(p);
    if (immediate || this.opts.still) this.current = this.target;
  }
  get progress() {
    return this.current;
  }
  setVisible(v: boolean) {
    if (v === this.running) return;
    this.running = v;
    if (v) {
      this.clock.getDelta();
      this.loop();
    } else cancelAnimationFrame(this.raf);
  }
  /** Screen position (CSS px) of a partner vessel's label anchor. */
  projectPartner(id: PartnerId) {
    const v = this.tmp.copy(this.partnerAnchors[id]).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
  }

  private place(obj: THREE.Object3D, pose: Pose) {
    obj.position.x = pose.x;
    obj.position.z = pose.z;
    obj.rotation.y = pose.yaw;
  }

  private tube(mesh: THREE.Mesh, paths: THREE.Vector3[][], radius: number) {
    mesh.geometry.dispose();
    const geos = paths.filter((p) => p.length > 1).map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), radius, 6, false));
    if (!geos.length) {
      mesh.visible = false;
      mesh.geometry = new THREE.BufferGeometry();
      return;
    }
    mesh.visible = true;
    mesh.geometry = geos.length === 1 ? geos[0] : mergeTubes(geos);
  }

  /** Pure scene state for a given progress (deterministic). */
  updateScene(p: number) {
    const tug = tugPose(p), b1 = barge1Pose(p), b2 = barge2Pose(p);
    this.place(this.tugRoot, tug);
    this.place(this.barge1, b1);
    this.place(this.barge2, b2);

    // Wakes: tug (with propeller wash) and both barges
    const u = this.water.uniforms;
    const set = (i: number, pose: Pose, hl: number, hb: number, wash: number) => {
      u.uBoat.value[i].set(pose.x, pose.z, pose.yaw, pose.speed);
      u.uSize.value[i].set(hl, hb, wash);
    };
    set(0, tug, TUG.halfLength, TUG.halfBeam, 1);
    set(1, b1, BARGE1.length / 2, BARGE1.beam / 2, 0);
    set(2, b2, BARGE2.length / 2, BARGE2.beam / 2, 0);
    for (let i = 3; i < MAX_WAKES; i++) u.uSize.value[i].set(0, 0, 0);

    // Push wires: tug bow bitts to the pontoon's aft corners while pushing
    const pushing = p >= STORY_MARKS.contact + 0.006 && p <= STORY_MARKS.pushEnd + 0.004;
    if (pushing) {
      const at = (pose: Pose, along: number, side: number, y: number) => {
        const hh = { x: Math.cos(pose.yaw), z: -Math.sin(pose.yaw) }, ss = { x: -hh.z, z: hh.x };
        return new THREE.Vector3(pose.x + hh.x * along + ss.x * side, y, pose.z + hh.z * along + ss.z * side);
      };
      // bow bitt → over the bow bulwark → pontoon's aft corner bollard
      const wires = [1, -1].map((side) => [
        at(tug, 6.5, side * 0.8, 1.85),
        at(tug, 7.9, side * 0.95, 2.48),
        at(b1, -BARGE1.length / 2 + 0.9, side * (BARGE1.beam / 2 - 0.7), BARGE1.freeboard + 0.45),
      ]);
      this.tube(this.pushWires, wires, 0.035);
    } else this.tube(this.pushWires, [], 0);

    // Bridle (always rigged on barge 2) and towline
    const line = towline(p);
    const [c1, apex, c2] = line.bridle.map(V);
    if (!line.visible) apex.y = BARGE2.freeboard + 0.2; // apex resting on deck before the line is passed
    const sagMid = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.25, 0));
    this.tube(this.bridleMesh, [[c1, sagMid(c1, apex), apex], [c2, sagMid(c2, apex), apex]], 0.05);
    if (line.visible && line.reach > 0.001) {
      // Line is passed from the barge toward the tug: show the barge end first
      const pts = line.points.map(V);
      const keep = Math.max(2, Math.ceil(pts.length * line.reach));
      this.tube(this.towMesh, [pts.slice(pts.length - keep)], 0.11);
    } else this.tube(this.towMesh, [], 0);

    // Camera
    const cam = cameraState(p);
    this.camera.position.copy(V(cam.position));
    // Phones (portrait): pull the camera back so long arrangements fit the narrow frame
    if (this.narrow) this.camera.position.sub(V(cam.target)).multiplyScalar(1.3).add(V(cam.target));
    this.camera.lookAt(V(cam.target));
    const w = this.canvas.clientWidth, hgt = this.canvas.clientHeight;
    this.camera.setViewOffset(w, hgt, -(this.narrow ? 0 : cam.sx) * w, (this.narrow ? cam.sy * 2.2 : cam.sy) * hgt, w, hgt);

    // Shadows follow the camera target
    const tgt = V(cam.target);
    const size = Math.min(160, 40 + cam.position.y * 0.9 + this.camera.position.distanceTo(tgt) * 0.25);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size;
    sc.updateProjectionMatrix();
    this.sun.target.position.copy(tgt);
    this.sun.position.copy(tgt).addScaledVector(SUN_DIR, 300);
  }

  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w / h < 0.9;
    this.camera.fov = w / h < 0.7 ? 58 : w / h < 1.1 ? 46 : 36;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.opts.still ? 0 : this.clock.elapsedTime;
    // Ease toward the scroll target (converges to the same state from either direction)
    const diff = this.target - this.current;
    this.current = Math.abs(diff) < 0.00005 ? this.target : this.current + diff * Math.min(1, dt * 5);
    this.updateScene(this.current);
    // Ambient motion only: gentle heave, radar, flags, ripples
    this.water.uniforms.uTime.value = time;
    this.tug.update(time);
    if (!this.opts.still) {
      this.tug.group.position.y = Math.sin(time * 0.9) * 0.04;
      this.tug.group.rotation.x = Math.sin(time * 0.7) * 0.006;
    }
    this.renderer.render(this.scene, this.camera);
    this.opts.onFrame?.(this.current);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.ro.disconnect();
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
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}

/** Merge tube geometries (same attributes) into one. */
function mergeTubes(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nrm.push(n[i]); }
    const ix = g.index!.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + offset);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  out.setIndex(idx);
  return out;
}

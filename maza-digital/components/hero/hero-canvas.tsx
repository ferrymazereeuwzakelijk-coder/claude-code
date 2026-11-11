"use client";

import { useEffect, useRef } from "react";

/**
 * "Idea → reality": a loose cloud of points assembles into a structured
 * 3D lattice, then slowly rotates and follows the pointer.
 *
 * Performance: plain 2D canvas (no WebGL/three.js dependency), DPR capped at 2,
 * fewer points on small screens, paused when off-screen or the tab is hidden.
 * Reduced motion: draws the assembled lattice once, without animation.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const N = small ? 180 : 380;
    const K = 3; // neighbours per point

    // Target: Fibonacci sphere. Start: scattered cloud.
    const golden = Math.PI * (3 - Math.sqrt(5));
    const target = new Float32Array(N * 3);
    const start = new Float32Array(N * 3);
    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      target[i * 3] = Math.cos(th) * r;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = Math.sin(th) * r;

      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      const d = 1.8 + Math.random() * 2.2;
      start[i * 3] = Math.sin(v) * Math.cos(u) * d * 1.4;
      start[i * 3 + 1] = Math.cos(v) * d * 0.8;
      start[i * 3 + 2] = Math.sin(v) * Math.sin(u) * d;
      delay[i] = Math.random();
    }

    // Nearest-neighbour edges on the target shape (computed once).
    const edges: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < N; i++) {
      const best: { j: number; d: number }[] = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const dx = target[i * 3]! - target[j * 3]!;
        const dy = target[i * 3 + 1]! - target[j * 3 + 1]!;
        const dz = target[i * 3 + 2]! - target[j * 3 + 2]!;
        const d = dx * dx + dy * dy + dz * dz;
        if (best.length < K) {
          best.push({ j, d });
          best.sort((a, b) => a.d - b.d);
        } else if (d < best[K - 1]!.d) {
          best[K - 1] = { j, d };
          best.sort((a, b) => a.d - b.d);
        }
      }
      for (const { j } of best) {
        const key = i < j ? i * N + j : j * N + i;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(i, j);
        }
      }
    }

    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const pz = new Float32Array(N);
    const pa = new Float32Array(N); // per-point assembly progress

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let t0 = performance.now();
    let rotY = 0.6;
    let tiltX = 0;
    let tiltY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(performance.now());
    };

    const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);

    function draw(now: number) {
      if (!ctx) return;
      const t = (now - t0) / 1000;
      const global = reduce ? 1 : Math.min(Math.max((t - 0.15) / 2.8, 0), 1);

      if (!reduce) {
        rotY += 0.0018;
        tiltX += (targetTiltX - tiltX) * 0.04;
        tiltY += (targetTiltY - tiltY) * 0.04;
      }

      const wide = w > 960;
      const cx = wide ? w * 0.7 : w * 0.5;
      const cy = wide ? h * 0.5 : h * 0.42;
      const R = Math.min(w, h) * (wide ? 0.36 : 0.44);
      const cosY = Math.cos(rotY + tiltY);
      const sinY = Math.sin(rotY + tiltY);
      const ax = 0.35 + tiltX;
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);

      for (let i = 0; i < N; i++) {
        const a = ease(global * 1.6 - delay[i]! * 0.6);
        pa[i] = a;
        const breathe = reduce ? 1 : 1 + 0.018 * Math.sin(t * 1.1 + i * 0.7);
        let x = start[i * 3]! + (target[i * 3]! * breathe - start[i * 3]!) * a;
        let y = start[i * 3 + 1]! + (target[i * 3 + 1]! * breathe - start[i * 3 + 1]!) * a;
        let z = start[i * 3 + 2]! + (target[i * 3 + 2]! * breathe - start[i * 3 + 2]!) * a;
        // rotate Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        x = x1;
        y = y2;
        z = z2;
        const persp = 3.2 / Math.max(3.2 + z, 0.8);
        px[i] = cx + x * R * persp;
        py[i] = cy + y * R * persp;
        pz[i] = z;
      }

      ctx.clearRect(0, 0, w, h);

      // Edges appear as the structure locks into place.
      ctx.lineWidth = 1;
      for (let e = 0; e < edges.length; e += 2) {
        const i = edges[e]!;
        const j = edges[e + 1]!;
        const lock = Math.min(pa[i]!, pa[j]!);
        if (lock < 0.55) continue;
        const depth = clamp01(1 - ((pz[i]! + pz[j]!) / 2 + 1) / 2); // 1 = front
        const alpha = (lock - 0.55) / 0.45 * (0.05 + depth * 0.22);
        const mixY = (py[i]! - (cy - R)) / (2 * R);
        const r = Math.round(75 + (128 - 75) * mixY);
        const g = Math.round(123 + (102 - 123) * mixY);
        ctx.strokeStyle = `rgba(${r},${g},255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(px[i]!, py[i]!);
        ctx.lineTo(px[j]!, py[j]!);
        ctx.stroke();
      }

      for (let i = 0; i < N; i++) {
        const depth = clamp01(1 - (pz[i]! + 1) / 2);
        const a = pa[i]!;
        const size = (0.6 + depth * 1.5) * (0.7 + a * 0.3);
        const alpha = 0.25 + depth * 0.65;
        ctx.fillStyle = a > 0.98 && depth > 0.82 ? `rgba(255,255,255,${alpha})` : `rgba(180,195,255,${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(px[i]!, py[i]!, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointer = (e: PointerEvent) => {
      targetTiltY = (e.clientX / window.innerWidth - 0.5) * 0.7;
      targetTiltX = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    const onVisibility = () => (document.hidden ? pause() : play());

    const io = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? play() : pause()), { threshold: 0 });
    const ro = new ResizeObserver(resize);

    resize();
    ro.observe(canvas);
    io.observe(canvas);
    if (reduce) {
      draw(performance.now());
    } else {
      t0 = performance.now();
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

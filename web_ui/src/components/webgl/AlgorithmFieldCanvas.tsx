import { useCallback, useEffect, useRef, useState } from 'react';
import { MathFormula } from '../shared/MathFormula';
import { useRouteCurtain } from '../shared/RouteCurtain';

let cachedAlgoContourBackdrop: HTMLCanvasElement | null = null;

function getOrBuildAlgoContourBackdrop(): HTMLCanvasElement | null {
  if (cachedAlgoContourBackdrop) return cachedAlgoContourBackdrop;
  if (typeof document === 'undefined') return null;

  const off = document.createElement('canvas');
  const w = 480;
  const h = 360;
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (!octx) return null;

  const vals = new Float64Array(w * h);
  for (let py = 0; py < h; py += 1) {
    const y = 3.0 - ((py + 0.5) / h) * 6.0;
    for (let px = 0; px < w; px += 1) {
      const x = -4.0 + ((px + 0.5) / w) * 8.0;
      vals[py * w + px] = evalLandscape(x, y);
    }
  }

  const img = octx.createImageData(w, h);
  for (let i = 0; i < vals.length; i += 1) {
    const norm = Math.min(1, vals[i] / 1.45);
    const inv = 1 - norm;
    img.data[i * 4] = Math.round(16 + inv * 20);
    img.data[i * 4 + 1] = Math.round(17 + inv * 27);
    img.data[i * 4 + 2] = Math.round(16 + inv * 13);
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);

  const levels = [0.08, 0.16, 0.28, 0.42, 0.58, 0.76, 0.96, 1.16];
  for (let li = 0; li < levels.length; li += 1) {
    const lv = levels[li];
    octx.fillStyle =
      li < 2
        ? 'rgba(197, 232, 77, 0.32)'
        : li < 4
          ? 'rgba(182, 201, 110, 0.22)'
          : 'rgba(239, 239, 232, 0.11)';
    for (let py = 0; py < h - 1; py += 1) {
      for (let px = 0; px < w - 1; px += 1) {
        const v00 = vals[py * w + px];
        const v10 = vals[py * w + px + 1];
        const v01 = vals[(py + 1) * w + px];
        if ((v00 - lv) * (v10 - lv) <= 0 || (v00 - lv) * (v01 - lv) <= 0) {
          octx.fillRect(px, py, 1.05, 1.05);
        }
      }
    }
  }

  cachedAlgoContourBackdrop = off;
  return off;
}

export interface AlgorithmFieldCanvasProps {
  reducedMotion: boolean;
}

interface VectorFirefly {
  x: number; // [-4, 4]
  y: number; // [-3, 3]
  vx: number;
  vy: number;
  f: number;
  trail: Array<[number, number]>;
}

const GAMMA_PRESETS = [
  { value: 0.08, note: 'Tầm xa' },
  { value: 0.35, note: 'Cân bằng' },
  { value: 1.4, note: 'Tách cụm' },
] as const;

const ALPHA_PRESETS = [
  { value: 0.04 },
  { value: 0.16 },
  { value: 0.36 },
] as const;

function evalLandscape(x: number, y: number): number {
  const dx1 = x - 1.35;
  const dy1 = y - 0.35;
  const wellGlobal = 1.0 - 0.96 * Math.exp(-(dx1 * dx1 + dy1 * dy1) * 0.62);

  const dx2 = x + 1.65;
  const dy2 = y + 0.55;
  const wellLocal = -0.68 * Math.exp(-(dx2 * dx2 + dy2 * dy2) * 0.78);

  const bowl = 0.032 * (x * x + y * y);
  return Math.max(0.001, wellGlobal + wellLocal + bowl);
}

function createInitialSwarm(): VectorFirefly[] {
  const pts: Array<[number, number]> = [
    [-3.2, 2.1],
    [-2.4, 1.4],
    [-1.1, 2.2],
    [0.4, 2.0],
    [2.1, 2.1],
    [3.2, 1.5],
    [-3.3, 0.2],
    [-2.2, -0.3],
    [-0.6, 0.6],
    [0.8, 0.9],
    [2.5, 0.4],
    [3.3, -0.4],
    [-3.0, -1.9],
    [-1.8, -1.8],
    [-0.3, -1.5],
    [1.1, -1.7],
    [2.3, -1.6],
    [3.1, -2.1],
  ];

  return pts.map(([x, y]) => ({
    x,
    y,
    vx: 0,
    vy: 0,
    f: evalLandscape(x, y),
    trail: [[x, y]],
  }));
}

/**
 * Interactive 2D Mathematical Optimization Contour + Attraction Vector Field Canvas
 * v5 Upgrade: Silky tapered motion trails, crisp hairline contour rings, subtle vector force arrows,
 * #C5E84D global optimum beacon, and warm-ivory architectural segmented controls (zero green/purple clash).
 */
export function AlgorithmFieldCanvas({ reducedMotion }: AlgorithmFieldCanvasProps) {
  const { isTransitioning } = useRouteCurtain();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLCanvasElement | null>(cachedAlgoContourBackdrop);
  const swarmRef = useRef<VectorFirefly[]>(createInitialSwarm());
  const settledFramesRef = useRef<number>(0);

  const [gamma, setGamma] = useState<number>(0.35);
  const [alpha, setAlpha] = useState<number>(0.16);
  const paramsRef = useRef({ gamma, alpha, reducedMotion });
  paramsRef.current = { gamma, alpha, reducedMotion };

  const handleRescatter = useCallback(() => {
    settledFramesRef.current = 0;
    swarmRef.current = createInitialSwarm();
  }, []);

  // Pre-bake crisp concentric contour field once (deferred past RouteCurtain wipe & cached globally)
  useEffect(() => {
    if (backdropRef.current) return;
    if (isTransitioning) return;

    const raf = window.requestAnimationFrame(() => {
      backdropRef.current = getOrBuildAlgoContourBackdrop();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isTransitioning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let inView = false;
    let rafId = 0;
    let accum = 0;
    let lastNow = performance.now();
    let cachedW = Math.max(240, canvas.clientWidth || 480);
    let cachedH = Math.max(200, canvas.clientHeight || 360);

    const syncCanvasDims = () => {
      cachedW = Math.max(240, canvas.clientWidth || 480);
      cachedH = Math.max(200, canvas.clientHeight || 360);
    };
    syncCanvasDims();

    const ro = new ResizeObserver(() => {
      syncCanvasDims();
      renderFrame(performance.now());
    });
    ro.observe(canvas);

    let seedState = 0x51f7a321;
    const nextRandSym = () => {
      seedState = (seedState + 0x6d2b79f5) >>> 0;
      let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
    };

    const drawArrow = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      stroke: string,
      headLen = 5
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 7) return;
      const ux = dx / len;
      const uy = dy / len;
      const ex = x1 + ux * Math.min(len * 0.68, 42);
      const ey = y1 + uy * Math.min(len * 0.68, 42);

      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const angle = Math.atan2(dy, dx);
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - headLen * Math.cos(angle - Math.PI / 6),
        ey - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ex - headLen * Math.cos(angle + Math.PI / 6),
        ey - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = cachedW;
      const h = cachedH;
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (backdropRef.current) {
        ctx.drawImage(backdropRef.current, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#101110';
        ctx.fillRect(0, 0, w, h);
      }

      const toPx = (x: number, y: number): [number, number] => [
        ((x + 4.0) / 8.0) * w,
        ((3.0 - y) / 6.0) * h,
      ];

      const [ox, oy] = toPx(0, 0);
      ctx.strokeStyle = 'rgba(239, 239, 232, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, 0);
      ctx.lineTo(ox, h);
      ctx.moveTo(0, oy);
      ctx.lineTo(w, oy);
      ctx.stroke();

      const [gx, gy] = toPx(1.35, 0.35);
      const [lx, ly] = toPx(-1.65, -0.55);

      // Sight-range circle L = 1 / sqrt(gamma)
      const sightRadiusWorld =
        1 / Math.sqrt(Math.max(0.05, paramsRef.current.gamma));
      const sightPx = (sightRadiusWorld / 8.0) * w;
      ctx.strokeStyle = 'rgba(182, 201, 110, 0.28)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(gx, gy, Math.min(w * 0.48, sightPx), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Luminous global optimum beacon (#C5E84D)
      const beaconHalo = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22);
      beaconHalo.addColorStop(0, 'rgba(197, 232, 77, 0.32)');
      beaconHalo.addColorStop(1, 'rgba(197, 232, 77, 0)');
      ctx.fillStyle = beaconHalo;
      ctx.beginPath();
      ctx.arc(gx, gy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#C5E84D';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(gx, gy, 6.5, 0, Math.PI * 2);
      ctx.moveTo(gx - 10, gy);
      ctx.lineTo(gx + 10, gy);
      ctx.moveTo(gx, gy - 10);
      ctx.lineTo(gx, gy + 10);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(239, 239, 232, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.stroke();

      const swarm = swarmRef.current;
      const curGamma = paramsRef.current.gamma;
      const curAlpha = paramsRef.current.alpha;

      if (!paramsRef.current.reducedMotion) {
        accum += dt;
        const stepRate = 0.042;
        while (accum >= stepRate) {
          accum -= stepRate;
          let settledInWells = 0;

          for (let i = 0; i < swarm.length; i += 1) {
            const fi = swarm[i];
            let pullX = 0;
            let pullY = 0;
            for (let j = 0; j < swarm.length; j += 1) {
              const fj = swarm[j];
              if (fj.f < fi.f) {
                const dx = fj.x - fi.x;
                const dy = fj.y - fi.y;
                const r2 = dx * dx + dy * dy;
                const beta = Math.exp(-curGamma * r2);
                pullX += beta * dx * 0.085;
                pullY += beta * dy * 0.085;
              }
            }
            const noiseX = curAlpha * nextRandSym() * 0.42;
            const noiseY = curAlpha * nextRandSym() * 0.42;

            fi.vx = pullX + noiseX;
            fi.vy = pullY + noiseY;
            fi.x = Math.max(-3.8, Math.min(3.8, fi.x + fi.vx));
            fi.y = Math.max(-2.75, Math.min(2.75, fi.y + fi.vy));
            fi.f = evalLandscape(fi.x, fi.y);
            fi.trail.push([fi.x, fi.y]);
            if (fi.trail.length > 18) fi.trail.shift();

            const dGlobal = Math.hypot(fi.x - 1.35, fi.y - 0.35);
            const dLocal = Math.hypot(fi.x + 1.65, fi.y + 0.55);
            const speed = Math.hypot(fi.vx, fi.vy);
            if (Math.min(dGlobal, dLocal) <= 0.55 && speed < 0.24) {
              settledInWells += 1;
            }
          }

          if (settledInWells >= 15) {
            settledFramesRef.current += 1;
          } else {
            settledFramesRef.current = Math.max(0, settledFramesRef.current - 1);
          }

          // Hold settled clusters ~2.5s (60 steps * 0.042s) so audience sees convergence, then auto-rescatter
          if (settledFramesRef.current >= 60) {
            settledFramesRef.current = 0;
            swarmRef.current = createInitialSwarm();
            break;
          }
        }
      }

      const ranked = [...swarm].sort((a, b) => a.f - b.f);

      // Silky progressive-alpha motion trails behind the 18 fireflies
      ctx.lineCap = 'round';
      for (const ff of swarm) {
        const len = ff.trail.length;
        if (len < 2) continue;
        const isTop = ff === ranked[0] || ff === ranked[1];
        for (let seg = 1; seg < len; seg += 1) {
          const ratio = seg / (len - 1);
          const [x0, y0] = toPx(ff.trail[seg - 1][0], ff.trail[seg - 1][1]);
          const [x1, y1] = toPx(ff.trail[seg][0], ff.trail[seg][1]);
          ctx.strokeStyle = isTop
            ? `rgba(197, 232, 77, ${(ratio * 0.55).toFixed(3)})`
            : `rgba(239, 239, 232, ${(ratio * 0.28).toFixed(3)})`;
          ctx.lineWidth = 0.7 + ratio * (isTop ? 1.3 : 0.85);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }

      // Subtle vector force arrows
      for (const fi of swarm) {
        let bestTarget: VectorFirefly | null = null;
        let maxPull = 0.08;
        for (const fj of ranked) {
          if (fj.f < fi.f - 0.015) {
            const dx = fj.x - fi.x;
            const dy = fj.y - fi.y;
            const beta = Math.exp(-curGamma * (dx * dx + dy * dy));
            const pull = beta * Math.hypot(dx, dy);
            if (pull > maxPull) {
              maxPull = pull;
              bestTarget = fj;
            }
          }
        }
        if (bestTarget) {
          const [x1, y1] = toPx(fi.x, fi.y);
          const [x2, y2] = toPx(bestTarget.x, bestTarget.y);
          drawArrow(x1, y1, x2, y2, 'rgba(182, 201, 110, 0.52)', 4.8);
        }
      }

      // Draw 18 fireflies
      swarm.forEach((ff) => {
        const [px, py] = toPx(ff.x, ff.y);
        const isLeader = ff === ranked[0] || ff === ranked[1];
        if (isLeader) {
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
          grad.addColorStop(0, 'rgba(197, 232, 77, 0.58)');
          grad.addColorStop(1, 'rgba(197, 232, 77, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isLeader ? '#C5E84D' : '#EFEFE8';
        ctx.beginPath();
        ctx.arc(px, py, isLeader ? 4.8 : 3.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#101110';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      ctx.font = '500 10.5px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(239, 239, 232, 0.62)';
      ctx.fillText(
        `L = ${(1 / Math.sqrt(curGamma)).toFixed(2)}`,
        14,
        h - 12
      );
      ctx.fillStyle = '#C5E84D';
      ctx.fillText('x*', gx + 12, gy - 8);
    };

    renderFrame(performance.now());

    const stopLoop = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const loop = (now: number) => {
      if (!inView || document.hidden || paramsRef.current.reducedMotion) {
        rafId = 0;
        return;
      }
      renderFrame(now);
      rafId = window.requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (!inView || document.hidden || paramsRef.current.reducedMotion) return;
      if (rafId === 0) {
        lastNow = performance.now();
        rafId = window.requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        if (inView && !document.hidden) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (inView) {
        startLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onResize = () => {
      syncCanvasDims();
      renderFrame(performance.now());
    };
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    window.dispatchEvent(new Event('resize'));
  }, [alpha, gamma, reducedMotion]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = -4.0 + ((e.clientX - rect.left) / Math.max(1, rect.width)) * 8.0;
    const y = 3.0 - ((e.clientY - rect.top) / Math.max(1, rect.height)) * 6.0;
    const swarm = swarmRef.current;
    let worstIdx = 0;
    for (let i = 1; i < swarm.length; i += 1) {
      if (swarm[i].f > swarm[worstIdx].f) worstIdx = i;
    }
    swarm[worstIdx].x = x;
    swarm[worstIdx].y = y;
    swarm[worstIdx].f = evalLandscape(x, y);
    swarm[worstIdx].trail = [[x, y]];
    settledFramesRef.current = 0;
  };

  return (
    <div className="algo-field-card">
      <div className="algo-field-card__canvas-wrap">
        <button
          type="button"
          className="algo-field-card__reset algo-field-card__reset--floating"
          onClick={handleRescatter}
        >
          Phân bố lại ↻
        </button>
        <canvas
          ref={canvasRef}
          className="algo-field-card__canvas"
          onClick={handleCanvasClick}
          role="img"
          aria-label="Bản đồ đường đồng mức và trường vectơ lực hút của 18 đom đóm theo tham số gamma và alpha"
        />
      </div>

      {/* Recessed #101110 Architectural Segmented Controls — Warm Ivory #EFEFE8 Active Fill (ZERO Green/Purple Clash) */}
      <div className="algo-field-card__controls">
        <div
          className="segmented-track"
          role="group"
          aria-label="Chọn hệ số hấp thụ gamma"
        >
          {GAMMA_PRESETS.map((p) => {
            const active = Math.abs(gamma - p.value) < 1e-6;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                className={`segmented-btn ${active ? 'segmented-btn--active' : ''}`}
                onClick={() => setGamma(p.value)}
              >
                <MathFormula
                  tex={`\\gamma = ${p.value.toFixed(2)}`}
                  ariaLabel={`gamma = ${p.value.toFixed(2)}`}
                />{' '}
                · {p.note}
              </button>
            );
          })}
        </div>

        <div
          className="segmented-track"
          role="group"
          aria-label="Chọn bước nhiễu alpha"
        >
          {ALPHA_PRESETS.map((p) => {
            const active = Math.abs(alpha - p.value) < 1e-6;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                className={`segmented-btn ${active ? 'segmented-btn--active' : ''}`}
                onClick={() => setAlpha(p.value)}
              >
                <MathFormula
                  tex={`\\alpha = ${p.value.toFixed(2)}`}
                  ariaLabel={`alpha = ${p.value.toFixed(2)}`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

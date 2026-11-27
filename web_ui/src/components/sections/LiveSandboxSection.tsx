import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EXTENDED_SANDBOX_PROBLEMS,
  type ExtendedSandboxProblemId,
} from '../../engine/extraSandboxProblems';
import {
  createFireflyEngine,
  type FireflyEngineInstance,
  type FireflyGenerationSnapshot,
} from '../../engine/fireflyEngine';
import { SciNumber, formatFixed, formatVec } from '../../lib/formatters';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { BlockReveal } from '../shared/BlockReveal';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { KineticButton } from '../shared/KineticButton';
import { MathFormula } from '../shared/MathFormula';

export interface LiveSandboxSectionProps {
  reducedMotion: boolean;
  onRegisterSpaceToggle: (fn: (() => void) | null) => void;
}

interface SandboxFormConfig {
  problemId: ExtendedSandboxProblemId;
  n: number;
  gamma: number;
  theta: number;
  alpha0: number;
  seed: number;
  tMax: number;
}

const DEFAULT_CONFIG: SandboxFormConfig = {
  problemId: 'sphere2d',
  n: 25,
  gamma: 0.1,
  theta: 0.97,
  alpha0: 0.25,
  seed: 42,
  tMax: 200,
};

const LOG_GAMMA_MIN = -5;
const LOG_GAMMA_MAX = Math.log10(50);

const PROBLEM_TABS: ReadonlyArray<{
  id: ExtendedSandboxProblemId;
  label: string;
  headerTitle: string;
  formulaTex: string;
}> = [
  {
    id: 'sphere2d',
    label: 'Mặt cầu 2D',
    headerTitle: 'Hàm mặt cầu dịch tâm 2D · x* = (1, 1)',
    formulaTex: 'f(\\mathbf{x}) = (x_1 - 1)^2 + (x_2 - 1)^2, \\quad \\mathbf{x}^* = (1, 1)',
  },
  {
    id: 'sphere10d',
    label: 'Mặt cầu 10D',
    headerTitle: 'Hàm mặt cầu dịch tâm 10 chiều · Chiếu (x₁, x₂)',
    formulaTex: 'f(\\mathbf{x}) = \\sum_{k=1}^{10}(x_k - 1)^2, \\quad \\mathbf{x}^* = (1, \\dots, 1)',
  },
  {
    id: 'rosenbrock2d',
    label: 'Rosenbrock',
    headerTitle: 'Thung lũng Rosenbrock 2D · x* = (1, 1)',
    formulaTex: 'f(x_1, x_2) = (1 - x_1)^2 + 100(x_2 - x_1^2)^2, \\quad \\mathbf{x}^* = (1, 1)',
  },
  {
    id: 'rastrigin2d',
    label: 'Rastrigin',
    headerTitle: 'Đa cực trị Rastrigin 2D · x* = (0, 0)',
    formulaTex:
      'f(\\mathbf{x}) = 20 + \\sum_{k=1}^{2}\\!\\left[x_k^2 - 10\\cos(2\\pi x_k)\\right], \\quad \\mathbf{x}^* = (0, 0)',
  },
  {
    id: 'ackley2d',
    label: 'Ackley',
    headerTitle: 'Phễu sóng Ackley 2D · x* = (0, 0)',
    formulaTex:
      'f(\\mathbf{x}) = -20e^{-0.2\\sqrt{0.5(x_1^2+x_2^2)}} - e^{0.5(\\cos 2\\pi x_1 + \\cos 2\\pi x_2)} + e + 20',
  },
  {
    id: 'himmelblau2d',
    label: 'Himmelblau (4 đỉnh)',
    headerTitle: 'Hàm Himmelblau · 4 cực tiểu toàn cục',
    formulaTex:
      'f(x_1, x_2) = (x_1^2 + x_2 - 11)^2 + (x_1 + x_2^2 - 7)^2 \\;\\; (4\\text{ đỉnh } f^* = 0)',
  },
  {
    id: 'constrained2d',
    label: 'Có ràng buộc',
    headerTitle: 'Tối ưu có ràng buộc · Hàm phạt tĩnh',
    formulaTex:
      '\\Pi(\\mathbf{x}) = \\sum_{k=1}^{2}(x_k - 1)^2 + 10^5\\!\\left[(x_1+x_2-1)^2 + \\sum \\max(0, -x_k)^2\\right]',
  },
];

const QUICK_SCENARIOS: ReadonlyArray<{
  id: string;
  label: string;
  problemId: ExtendedSandboxProblemId;
  n: number;
  gamma: number;
  alpha0: number;
  theta: number;
}> = [
  {
    id: 'fast-converge',
    label: 'Chuẩn (hội tụ nhanh)',
    problemId: 'sphere2d',
    n: 25,
    gamma: 0.1,
    alpha0: 0.25,
    theta: 0.97,
  },
  {
    id: 'split-clusters',
    label: 'γ lớn (tách 4 cụm)',
    problemId: 'himmelblau2d',
    n: 40,
    gamma: 1.0,
    alpha0: 0.05,
    theta: 0.97,
  },
  {
    id: 'no-cooling',
    label: 'θ = 1.0 (không tắt nhiễu)',
    problemId: 'sphere2d',
    n: 25,
    gamma: 0.1,
    alpha0: 0.35,
    theta: 1.0,
  },
];

function buildEngineFromConfig(cfg: SandboxFormConfig): FireflyEngineInstance {
  return createFireflyEngine({
    problem: EXTENDED_SANDBOX_PROBLEMS[cfg.problemId],
    nFireflies: cfg.n,
    alpha0: cfg.alpha0,
    beta0: 1.0,
    gamma: cfg.gamma,
    theta: cfg.theta,
    tMax: cfg.tMax,
    seed: cfg.seed,
  });
}

export function LiveSandboxSection({
  reducedMotion,
  onRegisterSpaceToggle,
}: LiveSandboxSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [config, setConfig] = useState<SandboxFormConfig>(DEFAULT_CONFIG);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const engineRef = useRef<FireflyEngineInstance | null>(null);
  if (!engineRef.current) {
    engineRef.current = buildEngineFromConfig(DEFAULT_CONFIG);
  }

  const [snapshot, setSnapshot] = useState<FireflyGenerationSnapshot>(() =>
    engineRef.current!.getSnapshot()
  );
  const [fHistory, setFHistory] = useState<number[]>(() => [
    engineRef.current!.getSnapshot().fbest,
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropCacheRef = useRef<HTMLCanvasElement | null>(null);
  const playSessionRef = useRef<number>(0);

  useSectionReveal(sectionRef, reducedMotion);

  const applyConfigImmediate = useCallback((nextCfg: SandboxFormConfig) => {
    playSessionRef.current += 1;
    setIsPlaying(false);
    const fresh = buildEngineFromConfig(nextCfg);
    engineRef.current = fresh;
    const initSnap = fresh.getSnapshot();
    setConfig(nextCfg);
    setSnapshot(initSnap);
    setFHistory([initSnap.fbest]);
  }, []);

  const handleSelectProblem = useCallback(
    (pid: ExtendedSandboxProblemId) => {
      if (pid === 'himmelblau2d') {
        applyConfigImmediate({
          ...config,
          problemId: pid,
          n: 40,
          gamma: 1.0,
          alpha0: 0.05,
        });
      } else if (pid === 'rastrigin2d' || pid === 'ackley2d') {
        applyConfigImmediate({
          ...config,
          problemId: pid,
          n: 32,
          gamma: 0.35,
          alpha0: 0.25,
        });
      } else if (pid === 'sphere10d') {
        applyConfigImmediate({
          ...config,
          problemId: pid,
          n: 25,
          gamma: 0.05,
          alpha0: 0.3,
        });
      } else {
        applyConfigImmediate({
          ...config,
          problemId: pid,
          n: 25,
          gamma: 0.1,
          alpha0: 0.25,
        });
      }
    },
    [applyConfigImmediate, config]
  );

  const handleReset = useCallback(() => {
    applyConfigImmediate(config);
  }, [applyConfigImmediate, config]);

  const handleStepPlusOne = useCallback(() => {
    if (isPlaying) return;
    const eng = engineRef.current;
    if (!eng) return;
    const next = eng.stepOneGeneration();
    setSnapshot(next);
    setFHistory((prev) => [...prev, next.fbest]);
  }, [isPlaying]);

  const handleTogglePlay = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    if (isPlaying) {
      playSessionRef.current += 1;
      setIsPlaying(false);
      return;
    }
    if (eng.getSnapshot().completed) {
      const fresh = buildEngineFromConfig(config);
      engineRef.current = fresh;
      const initSnap = fresh.getSnapshot();
      setSnapshot(initSnap);
      setFHistory([initSnap.fbest]);
    }
    playSessionRef.current += 1;
    setIsPlaying(true);
  }, [config, isPlaying]);

  useEffect(() => {
    onRegisterSpaceToggle(handleTogglePlay);
    return () => onRegisterSpaceToggle(null);
  }, [handleTogglePlay, onRegisterSpaceToggle]);

  useEffect(() => {
    if (!isPlaying) return;
    const sessionId = playSessionRef.current;
    const stepMs = reducedMotion ? 110 : 54;
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (playSessionRef.current !== sessionId) return;
      if (document.hidden) {
        setIsPlaying(false);
        return;
      }
      if (now - lastTime >= stepMs) {
        lastTime = now;
        const eng = engineRef.current;
        if (eng) {
          const next = eng.stepOneGeneration();
          setSnapshot(next);
          setFHistory((prev) => [...prev, next.fbest]);
          if (next.completed) {
            setIsPlaying(false);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, reducedMotion]);

  useEffect(() => {
    const problem = EXTENDED_SANDBOX_PROBLEMS[config.problemId];
    const off = document.createElement('canvas');
    const res = 200;
    off.width = res;
    off.height = res;
    const octx = off.getContext('2d');
    if (!octx) return;

    const lbX = problem.Lb[0];
    const lbY = problem.Lb[1];
    const ubX = problem.Ub[0];
    const ubY = problem.Ub[1];
    const spanX = ubX - lbX;
    const spanY = ubY - lbY;

    const evalSlice = (x: number, y: number): number => {
      if (problem.d === 2) return problem.objective([x, y]);
      const vec = Array.from({ length: problem.d }, () => 1.0);
      vec[0] = x;
      vec[1] = y;
      return problem.objective(vec);
    };

    const vals = new Float64Array(res * res);
    for (let gy = 0; gy < res; gy += 1) {
      const y = ubY - ((gy + 0.5) / res) * spanY;
      for (let gx = 0; gx < res; gx += 1) {
        const x = lbX + ((gx + 0.5) / res) * spanX;
        vals[gy * res + gx] = evalSlice(x, y);
      }
    }

    const maxCap =
      config.problemId === 'rosenbrock2d'
        ? 450
        : config.problemId === 'himmelblau2d'
          ? 320
          : config.problemId === 'rastrigin2d'
            ? 75
            : config.problemId === 'ackley2d'
              ? 14
              : 50;

    const img = octx.createImageData(res, res);
    for (let i = 0; i < vals.length; i += 1) {
      const norm = Math.min(1, Math.sqrt(Math.max(0, vals[i]) / maxCap));
      const inv = 1 - norm;
      img.data[i * 4] = Math.round(16 + inv * 24);
      img.data[i * 4 + 1] = Math.round(17 + inv * 34);
      img.data[i * 4 + 2] = Math.round(16 + inv * 16);
      img.data[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);

    const levels =
      config.problemId === 'rosenbrock2d'
        ? [0.5, 3, 12, 40, 120, 280]
        : config.problemId === 'himmelblau2d'
          ? [1.5, 8, 25, 65, 140, 250]
          : config.problemId === 'rastrigin2d'
            ? [3, 10, 22, 38, 56]
            : config.problemId === 'ackley2d'
              ? [1.5, 3.5, 6, 8.5, 11]
              : [0.4, 1.5, 4, 9, 16, 28, 42];

    octx.fillStyle = 'rgba(239, 239, 232, 0.18)';
    for (const lv of levels) {
      for (let gy = 0; gy < res - 1; gy += 1) {
        for (let gx = 0; gx < res - 1; gx += 1) {
          const v00 = vals[gy * res + gx];
          const v10 = vals[gy * res + gx + 1];
          const v01 = vals[(gy + 1) * res + gx];
          if ((v00 - lv) * (v10 - lv) <= 0 || (v00 - lv) * (v01 - lv) <= 0) {
            octx.fillRect(gx, gy, 1, 1);
          }
        }
      }
    }

    backdropCacheRef.current = off;
  }, [config.problemId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#101110';
      ctx.fillRect(0, 0, w, h);

      const padX = 22;
      const padY = 22;
      const plotW = Math.max(160, w - padX * 2);
      const plotH = Math.max(160, h - padY * 2 - 4);
      const ox = padX;
      const oy = padY;

      if (backdropCacheRef.current) {
        ctx.drawImage(backdropCacheRef.current, ox, oy, plotW, plotH);
      }

      const problem = EXTENDED_SANDBOX_PROBLEMS[config.problemId];
      const lbX = problem.Lb[0];
      const lbY = problem.Lb[1];
      const ubX = problem.Ub[0];
      const ubY = problem.Ub[1];
      const toCanvas = (x: number, y: number): [number, number] => [
        ox + ((x - lbX) / (ubX - lbX)) * plotW,
        oy + ((ubY - y) / (ubY - lbY)) * plotH,
      ];

      const [zeroX, zeroY] = toCanvas(0, 0);
      ctx.strokeStyle = 'rgba(239, 239, 232, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, plotW, plotH);
      if (zeroX >= ox && zeroX <= ox + plotW) {
        ctx.beginPath();
        ctx.moveTo(zeroX, oy);
        ctx.lineTo(zeroX, oy + plotH);
        ctx.stroke();
      }
      if (zeroY >= oy && zeroY <= oy + plotH) {
        ctx.beginPath();
        ctx.moveTo(ox, zeroY);
        ctx.lineTo(ox + plotW, zeroY);
        ctx.stroke();
      }

      if (config.problemId === 'constrained2d') {
        const [pA1, pA2] = toCanvas(-4, 5);
        const [pB1, pB2] = toCanvas(5, -4);
        ctx.strokeStyle = '#8D7AE6';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pA1, pA2);
        ctx.lineTo(pB1, pB2);
        ctx.stroke();
        ctx.setLineDash([]);

        const [fA1, fA2] = toCanvas(0, 1);
        const [fB1, fB2] = toCanvas(1, 0);
        ctx.strokeStyle = '#C5E84D';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(fA1, fA2);
        ctx.lineTo(fB1, fB2);
        ctx.stroke();
      }

      for (const opt of problem.referenceOptima) {
        const [rx, ry] = toCanvas(opt[0], opt[1]);
        ctx.strokeStyle = '#EFEFE8';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.moveTo(rx - 10, ry);
        ctx.lineTo(rx + 10, ry);
        ctx.moveTo(rx, ry - 10);
        ctx.lineTo(rx, ry + 10);
        ctx.stroke();
      }

      if (!reducedMotion && snapshot.visualLinks.length > 0) {
        ctx.lineWidth = 1;
        for (const lk of snapshot.visualLinks) {
          const [fx, fy] = toCanvas(lk.from[0], lk.from[1]);
          const [tx, ty] = toCanvas(lk.to[0], lk.to[1]);
          const alpha = Math.min(0.36, lk.beta * 0.34);
          ctx.strokeStyle = `rgba(182, 201, 110, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }

      const trailCap = Math.min(18, snapshot.trails.length);
      for (let i = 0; i < trailCap; i += 1) {
        const tr = snapshot.trails[i];
        if (tr.length < 2) continue;
        ctx.strokeStyle =
          i === 0 ? 'rgba(197, 232, 77, 0.72)' : 'rgba(239, 239, 232, 0.22)';
        ctx.lineWidth = i === 0 ? 1.7 : 0.95;
        ctx.beginPath();
        tr.forEach((pt, idx) => {
          const [px, py] = toCanvas(pt[0], pt[1]);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      const total = snapshot.positions.length;
      for (let i = total - 1; i >= 0; i -= 1) {
        const pos = snapshot.positions[i];
        const [px, py] = toCanvas(pos[0], pos[1]);
        const isBest = i === 0;
        const rankRatio = 1 - i / Math.max(1, total - 1);

        if (isBest) {
          const halo = ctx.createRadialGradient(px, py, 0, px, py, 18);
          halo.addColorStop(0, 'rgba(197, 232, 77, 0.68)');
          halo.addColorStop(1, 'rgba(197, 232, 77, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isBest
          ? '#C5E84D'
          : rankRatio > 0.65
            ? '#B6C96E'
            : 'rgba(239, 239, 232, 0.88)';
        ctx.beginPath();
        ctx.arc(px, py, isBest ? 5.8 : 4.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#101110';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(239, 239, 232, 0.62)';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`x1 [${lbX}, ${ubX}]`, ox + 6, oy + plotH + 16);
      ctx.fillText(`x2 [${lbY}, ${ubY}]`, ox + 6, oy - 7);
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [config.problemId, reducedMotion, snapshot]);

  const sparklineD = useMemo(() => {
    if (fHistory.length < 2) return '';
    const logs = fHistory.map((v) => Math.log10(Math.max(1e-16, v)));
    const minL = Math.min(...logs);
    const maxL = Math.max(minL + 0.5, ...logs);
    return logs
      .map((lv, idx) => {
        const x = 10 + (idx / Math.max(1, logs.length - 1)) * 280;
        const y = 48 - ((lv - minL) / (maxL - minL)) * 38;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [fHistory]);

  const activeProblem = EXTENDED_SANDBOX_PROBLEMS[config.problemId];
  const activeTabMeta =
    PROBLEM_TABS.find((t) => t.id === config.problemId) ?? PROBLEM_TABS[0];
  const logGamma = Math.log10(Math.max(1e-5, config.gamma));
  const displayVec =
    snapshot.nbest.length > 3
      ? `[${snapshot.nbest
          .slice(0, 3)
          .map((v) => v.toFixed(2))
          .join(', ')}, …]`
      : formatVec(snapshot.nbest, 3);

  return (
    <section
      id="sandbox-sach"
      ref={sectionRef}
      className="section-sandbox surface-dark"
      data-surface="dark"
      aria-labelledby="sandbox-heading"
    >
      <ContourBackdrop variant="dark" />

      <div className="section-container">
        <div className="sandbox-grid">
          <div className="sandbox-left">
            <div>
              <span className="algo-chapter-eyebrow">
                MÔ PHỎNG TRỰC TIẾP · PHẦN 01 / 02
              </span>
              <h1 id="sandbox-heading" tabIndex={-1} className="sandbox-title">
                <span className="block-reveal-lines">
                  <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                    Thử nghiệm tham số
                  </BlockReveal>
                  <BlockReveal color="olive-lime" delay={0.18} reducedMotion={reducedMotion}>
                    <span className="editorial-serif editorial-serif--sage-gold">
                      trên 7 hàm chuẩn
                    </span>
                  </BlockReveal>
                </span>
              </h1>
            </div>

            <p className="sandbox-lead">
              Thay đổi cỡ đàn <MathFormula tex="n" ariaLabel="n" />, hệ số cản
              sáng <MathFormula tex="\gamma" ariaLabel="gamma" /> và tốc độ giảm
              bước nhảy <MathFormula tex="\theta" ariaLabel="theta" /> để xem đàn
              đom đóm hội tụ thế nào trên các hàm 2D và 10D (nhấn{' '}
              <code>Space</code> để chạy/dừng).
            </p>

            {/* Clean #EFEFE8 Ivory Active Fill with #101110 Dark Ink */}
            <div
              className="sandbox-problem-pills"
              role="group"
              aria-label="Chọn bài toán tối ưu"
            >
              {PROBLEM_TABS.map((pt) => {
                const active = config.problemId === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    aria-pressed={active}
                    className={`sandbox-pill ${active ? 'sandbox-pill--active' : ''}`}
                    onClick={() => handleSelectProblem(pt.id)}
                  >
                    {pt.label}
                  </button>
                );
              })}
            </div>

            <div
              className="sandbox-quick-presets"
              role="group"
              aria-label="Chọn nhanh kịch bản tham số"
            >
              <span className="sandbox-quick-presets__label">Thử nhanh:</span>
              {QUICK_SCENARIOS.map((sc) => {
                const isScenarioActive =
                  config.problemId === sc.problemId &&
                  config.n === sc.n &&
                  Math.abs(config.gamma - sc.gamma) < 1e-6 &&
                  Math.abs(config.alpha0 - sc.alpha0) < 1e-6 &&
                  Math.abs(config.theta - sc.theta) < 1e-6;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    aria-pressed={isScenarioActive}
                    className={`sandbox-quick-btn ${
                      isScenarioActive ? 'sandbox-quick-btn--active' : ''
                    }`}
                    onClick={() =>
                      applyConfigImmediate({
                        ...config,
                        problemId: sc.problemId,
                        n: sc.n,
                        gamma: sc.gamma,
                        alpha0: sc.alpha0,
                        theta: sc.theta,
                      })
                    }
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>

            <div className="sandbox-sliders-box">
              <div className="slider-row">
                <div className="slider-row__head">
                  <label htmlFor="sb-n">
                    Quy mô đàn <MathFormula tex="n" ariaLabel="n" />
                  </label>
                  <span className="slider-row__val">{config.n}</span>
                </div>
                <input
                  id="sb-n"
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={config.n}
                  onChange={(e) =>
                    applyConfigImmediate({ ...config, n: Number(e.target.value) })
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <label htmlFor="sb-gamma">
                    Hệ số hấp thụ <MathFormula tex="\gamma" ariaLabel="gamma" />
                  </label>
                  <span className="slider-row__val">
                    <SciNumber value={config.gamma} sigDigits={2} />
                  </span>
                </div>
                <input
                  id="sb-gamma"
                  type="range"
                  min={LOG_GAMMA_MIN}
                  max={LOG_GAMMA_MAX}
                  step={0.05}
                  value={logGamma}
                  onChange={(e) => {
                    const raw = Math.pow(10, Number(e.target.value));
                    const clamped = Math.min(
                      50,
                      Math.max(1e-5, Number(raw.toPrecision(3)))
                    );
                    applyConfigImmediate({ ...config, gamma: clamped });
                  }}
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <label htmlFor="sb-alpha0">
                    Biên độ nhiễu đầu{' '}
                    <MathFormula tex="\alpha_0" ariaLabel="alpha_0" />
                  </label>
                  <span className="slider-row__val">
                    {config.alpha0.toFixed(2)}
                  </span>
                </div>
                <input
                  id="sb-alpha0"
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={config.alpha0}
                  onChange={(e) =>
                    applyConfigImmediate({
                      ...config,
                      alpha0: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <label htmlFor="sb-theta">
                    Hệ số làm nguội <MathFormula tex="\theta" ariaLabel="theta" />
                  </label>
                  <span className="slider-row__val">
                    {config.theta.toFixed(2)}
                  </span>
                </div>
                <input
                  id="sb-theta"
                  type="range"
                  min={0.9}
                  max={1.0}
                  step={0.01}
                  value={config.theta}
                  onChange={(e) =>
                    applyConfigImmediate({
                      ...config,
                      theta: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div
              className="sandbox-actions"
              role="group"
              aria-label="Điều khiển chạy mô phỏng"
            >
              <KineticButton
                label={isPlaying ? 'TẠM DỪNG' : 'CHẠY'}
                icon={isPlaying ? '⏸' : '▶'}
                variant="lime"
                onClick={handleTogglePlay}
              />
              <button
                type="button"
                className="sandbox-btn"
                onClick={handleStepPlusOne}
                disabled={isPlaying || snapshot.completed}
              >
                Bước +1
              </button>
              <button
                type="button"
                className="sandbox-btn"
                onClick={handleReset}
              >
                Đặt lại
              </button>
            </div>
          </div>

          <div className="sandbox-right">
            <div className="sandbox-stage-card">
              <div className="sandbox-stage-card__bar">
                <strong>{activeTabMeta.headerTitle}</strong>
                <span
                  className={`sandbox-status-dot ${
                    isPlaying ? 'sandbox-status-dot--live' : ''
                  }`}
                >
                  {snapshot.completed
                    ? 'HOÀN TẤT'
                    : isPlaying
                      ? 'ĐANG CHẠY'
                      : 'SẴN SÀNG'}
                </span>
              </div>

              <div className="sandbox-formula-strip">
                <div className="sandbox-formula-strip__math">
                  <MathFormula
                    tex={activeTabMeta.formulaTex}
                    ariaLabel={activeProblem.subtitle}
                  />
                </div>
                <p className="sandbox-formula-strip__note">
                  {activeProblem.scopeNote}
                </p>
              </div>

              <div className="sandbox-canvas-box">
                <canvas
                  ref={canvasRef}
                  className="sandbox-canvas"
                  role="img"
                  aria-label={`Mô phỏng đàn đom đóm trên bài toán ${activeTabMeta.label} tại thế hệ t = ${snapshot.t}`}
                />
              </div>

              <div className="sandbox-bento-bar">
                <div className="sandbox-bento-cell">
                  <span>Thế hệ t</span>
                  <strong>
                    {snapshot.t} / {config.tMax}
                  </strong>
                </div>

                <div className="sandbox-bento-cell">
                  <span>Giá trị tốt nhất</span>
                  <strong style={{ color: 'var(--accent-lime)' }}>
                    {activeProblem.isConstrained && snapshot.constrainedBest ? (
                      formatFixed(snapshot.constrainedBest.objective, 4)
                    ) : (
                      <SciNumber value={snapshot.fbest} sigDigits={2} />
                    )}
                  </strong>
                </div>

                <div className="sandbox-bento-cell">
                  <span>
                    Nghiệm <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" />
                  </span>
                  <strong>{displayVec}</strong>
                </div>

                <div className="sandbox-bento-cell">
                  <span>
                    Bước nhiễu <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
                  </span>
                  <strong style={{ color: 'var(--accent-iris)' }}>
                    <SciNumber value={snapshot.alphaUsed} sigDigits={2} />
                  </strong>
                </div>
              </div>
            </div>

            <div className="sandbox-sparkline-card">
              <div className="sandbox-sparkline-card__head">
                <span>ĐƯỜNG HỘI TỤ TRỰC TIẾP log₁₀(f_best)</span>
                <code>{fHistory.length - 1} bước</code>
              </div>
              <svg
                viewBox="0 0 300 56"
                className="sandbox-sparkline-card__svg"
                aria-hidden="true"
              >
                <line
                  x1="10"
                  y1="48"
                  x2="290"
                  y2="48"
                  stroke="rgba(239,239,232,0.14)"
                />
                {sparklineD ? (
                  <path
                    d={sparklineD}
                    fill="none"
                    stroke="#C5E84D"
                    strokeWidth="2"
                  />
                ) : null}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

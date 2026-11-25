import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DATASET_PROVENANCE,
  SciNumber,
  SvgSciText,
  formatFixed,
  formatVec,
} from '../../lib/formatters';
import { MathFormula } from '../shared/MathFormula';
import type {
  ConvergenceIterationsData,
  MultimodalOptimizationData,
  ParameterSensitivityData,
  ScalabilityNdData,
  Tv10AlphaHybridData,
  Tv10ComplexityData,
} from '../../types/dataContracts';

export type ExperimentCardId =
  | 'convergence'
  | 'scalability'
  | 'complexity'
  | 'gamma'
  | 'cooling_hybrid'
  | 'multimodal';

export interface ExperimentModalProps {
  activeCard: ExperimentCardId | null;
  onClose: () => void;
  convergence: ConvergenceIterationsData | null;
  scalability: ScalabilityNdData | null;
  complexity: Tv10ComplexityData | null;
  sensitivity: ParameterSensitivityData | null;
  alphaHybrid: Tv10AlphaHybridData | null;
  multimodal: MultimodalOptimizationData | null;
}

const LOG_FLOOR = 1e-16;
function safeLog10(val: number): number {
  return Math.log10(Math.max(LOG_FLOOR, val));
}

function evalContourFn(fnName: 'Himmelblau' | 'Rastrigin', x1: number, x2: number): number {
  if (fnName === 'Himmelblau') {
    const a = x1 * x1 + x2 - 11;
    const b = x1 + x2 * x2 - 7;
    return a * a + b * b;
  }
  return (
    20 +
    (x1 * x1 - 10 * Math.cos(2 * Math.PI * x1)) +
    (x2 * x2 - 10 * Math.cos(2 * Math.PI * x2))
  );
}

export default function ExperimentModal({
  activeCard,
  onClose,
  convergence,
  scalability,
  complexity,
  sensitivity,
  alphaHybrid,
  multimodal,
}: ExperimentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contourCanvasRef = useRef<HTMLCanvasElement>(null);
  const titleId = useId();

  const [selectedThetaForGamma, setSelectedThetaForGamma] = useState<number>(0.97);
  const [coolingSubTab, setCoolingSubTab] = useState<'theta_sweep' | 'alpha_hybrid'>('alpha_hybrid');
  const [mmFunc, setMmFunc] = useState<'Himmelblau' | 'Rastrigin'>('Himmelblau');
  const [mmGamma, setMmGamma] = useState<number>(1.0);
  const [mmFrameIdx, setMmFrameIdx] = useState<number>(0);
  const [mmPlaying, setMmPlaying] = useState<boolean>(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeCard && !dialog.open) {
      dialog.showModal();
    } else if (!activeCard && dialog.open) {
      dialog.close();
    }
    setMmPlaying(false);
  }, [activeCard]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = '';
      setMmPlaying(false);
      onClose();
    };
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
      pressedOutside = false;
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, [onClose]);

  const activeReplay = useMemo(() => {
    if (!multimodal) return null;
    const exact = multimodal.replays.find(
      (r) => r.function_name === mmFunc && Math.abs(r.gamma - mmGamma) < 1e-9
    );
    if (exact) return exact;
    return multimodal.replays.find((r) => r.function_name === mmFunc) ?? multimodal.replays[0];
  }, [multimodal, mmFunc, mmGamma]);

  useEffect(() => {
    if (activeReplay) {
      setMmFrameIdx(activeReplay.history.length - 1);
    }
  }, [activeReplay]);

  useEffect(() => {
    if (!mmPlaying || !activeReplay) return;
    const id = window.setInterval(() => {
      setMmFrameIdx((prev) => {
        if (prev >= activeReplay.history.length - 1) {
          setMmPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [mmPlaying, activeReplay]);

  useEffect(() => {
    if (activeCard !== 'multimodal' || !activeReplay) return;
    const canvas = contourCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [lb, ub] = activeReplay.bounds;
    const gridN = 90;
    const cell = size / gridN;
    const maxCap = activeReplay.function_name === 'Himmelblau' ? 280 : 65;

    for (let gy = 0; gy < gridN; gy += 1) {
      const x2 = ub - ((gy + 0.5) / gridN) * (ub - lb);
      for (let gx = 0; gx < gridN; gx += 1) {
        const x1 = lb + ((gx + 0.5) / gridN) * (ub - lb);
        const f = evalContourFn(activeReplay.function_name, x1, x2);
        const norm = Math.min(1, Math.sqrt(Math.max(0, f) / maxCap));
        const r = Math.round(16 + (1 - norm) * 26);
        const g = Math.round(17 + (1 - norm) * 38);
        const b = Math.round(16 + (1 - norm) * 20);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(gx * cell, gy * cell, cell + 0.6, cell + 0.6);
      }
    }

    const levels =
      activeReplay.function_name === 'Himmelblau' ? [2, 12, 40, 100] : [3, 12, 26, 44];
    ctx.strokeStyle = 'rgba(239, 239, 232, 0.16)';
    ctx.lineWidth = 0.9;
    for (const lv of levels) {
      ctx.beginPath();
      for (let gy = 0; gy < gridN - 1; gy += 1) {
        const yA = ub - (gy / gridN) * (ub - lb);
        const yB = ub - ((gy + 1) / gridN) * (ub - lb);
        for (let gx = 0; gx < gridN - 1; gx += 1) {
          const xA = lb + (gx / gridN) * (ub - lb);
          const xB = lb + ((gx + 1) / gridN) * (ub - lb);
          const f00 = evalContourFn(activeReplay.function_name, xA, yA);
          const f10 = evalContourFn(activeReplay.function_name, xB, yA);
          const f01 = evalContourFn(activeReplay.function_name, xA, yB);
          if ((f00 - lv) * (f10 - lv) < 0 || (f00 - lv) * (f01 - lv) < 0) {
            ctx.rect(gx * cell, gy * cell, 1.1, 1.1);
          }
        }
      }
      ctx.stroke();
    }

    const toPx = (coordX: number, coordY: number): [number, number] => [
      ((coordX - lb) / (ub - lb)) * size,
      ((ub - coordY) / (ub - lb)) * size,
    ];

    for (const [ox, oy] of activeReplay.global_optima) {
      const [px, py] = toPx(ox, oy);
      ctx.strokeStyle = '#EFEFE8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.moveTo(px - 11, py);
      ctx.lineTo(px + 11, py);
      ctx.moveTo(px, py - 11);
      ctx.lineTo(px, py + 11);
      ctx.stroke();
    }

    const frame = activeReplay.history[Math.min(mmFrameIdx, activeReplay.history.length - 1)];
    const metric = activeReplay.metrics[Math.min(mmFrameIdx, activeReplay.metrics.length - 1)];

    if (metric?.clusters) {
      const epsPx = (0.6 / (ub - lb)) * size;
      ctx.strokeStyle = 'rgba(182, 201, 110, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      for (const c of metric.clusters) {
        const [cx, cy] = toPx(c.center[0], c.center[1]);
        ctx.beginPath();
        ctx.arc(cx, cy, epsPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    if (frame) {
      const clusterPalette = ['#C5E84D', '#8FB88D', '#B6C96E', '#8D7AE6', '#D98C4A'];
      frame.positions.forEach(([x, y], idx) => {
        const [px, py] = toPx(x, y);
        const lbl = metric?.labels?.[idx] ?? -1;
        ctx.fillStyle =
          lbl >= 0 ? clusterPalette[lbl % clusterPalette.length] : 'rgba(239, 239, 232, 0.62)';
        ctx.beginPath();
        ctx.arc(px, py, idx === 0 ? 5.0 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#101110';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [activeCard, activeReplay, mmFrameIdx]);

  const titles: Record<ExperimentCardId, string> = {
    convergence: '01 · Hội tụ theo thế hệ (Shifted Sphere 3D)',
    scalability: '02 · Quy mô đàn n & Số chiều D (D = 3 vs D = 10)',
    complexity: '03 · Độ phức tạp tính toán theo kích thước đàn',
    gamma: '04 · Độ nhạy hệ số hấp thụ ánh sáng γ',
    cooling_hybrid: '05 · Làm nguội θ & So sánh Fixed / Decaying / Hybrid',
    multimodal: '06 · Tự phân đàn đa cực trị (Himmelblau & Rastrigin)',
  };

  return (
    <dialog
      ref={dialogRef}
      className="exp-modal"
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {activeCard ? (
        <div className="exp-modal__inner">
          <header className="exp-modal__header">
            <div>
              <h2 id={titleId} className="exp-modal__title">
                {titles[activeCard]}
              </h2>
            </div>
            <button
              type="button"
              className="icon-square-btn"
              onClick={() => dialogRef.current?.close()}
              aria-label="Đóng cửa sổ thực nghiệm (Esc)"
            >
              ✕
            </button>
          </header>

          {/* 1. CONVERGENCE */}
          {activeCard === 'convergence' && convergence ? (
            <div className="exp-modal__body">
              <p className="exp-modal__takeaway">
                Trên lượt chạy chuẩn <code>seed = 42</code> (
                <MathFormula tex="n = 20, \; D = 3" ariaLabel="n = 20, D = 3" />),
                sai số mục tiêu giảm hơn 13 bậc độ lớn từ{' '}
                <MathFormula tex="t = 1" ariaLabel="t = 1" /> tới{' '}
                <MathFormula tex="t = 500" ariaLabel="t = 500" /> nhờ lực hút kết
                hợp bước nhiễu thu hẹp dần{' '}
                <MathFormula
                  tex="\alpha_t = \alpha_0 \cdot 0.97^t"
                  ariaLabel="alpha_t = alpha_0 * 0.97^t"
                />
                .
              </p>

              {(() => {
                const full = convergence.by_iterations[convergence.by_iterations.length - 1];
                const curve = full.curve;
                const logs = curve.map(safeLog10);
                const minL = Math.floor(Math.min(...logs));
                const maxL = Math.ceil(Math.max(...logs));
                const spanL = Math.max(1, maxL - minL);
                const pathD = logs
                  .map((lv, idx) => {
                    const x = 64 + (idx / Math.max(1, logs.length - 1)) * 610;
                    const y = 228 - ((lv - minL) / spanL) * 188;
                    return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');

                return (
                  <svg
                    viewBox="0 0 710 268"
                    className="modal-chart-svg"
                    role="img"
                    aria-label="Đồ thị hội tụ sai số log10 theo thế hệ t từ 1 đến 500"
                  >
                    {[-14, -10, -6, -2, 0].map((tick) => {
                      if (tick < minL || tick > maxL) return null;
                      const y = 228 - ((tick - minL) / spanL) * 188;
                      return (
                        <g key={tick}>
                          <line x1="64" y1={y} x2="674" y2={y} stroke="rgba(239,239,232,0.10)" />
                          <text x="14" y={y + 4} fill="#939889" fontSize="10" fontFamily="var(--font-mono)">
                            10^{tick}
                          </text>
                        </g>
                      );
                    })}
                    <line x1="64" y1="228" x2="674" y2="228" stroke="rgba(239,239,232,0.24)" />
                    <path d={pathD} fill="none" stroke="#C5E84D" strokeWidth="2.1" />

                    {convergence.by_iterations.map((m) => {
                      const x = 64 + ((m.t_max - 1) / Math.max(1, logs.length - 1)) * 610;
                      const y = 228 - ((safeLog10(m.fbest) - minL) / spanL) * 188;
                      return (
                        <g key={m.t_max}>
                          <line
                            x1={x}
                            y1="38"
                            x2={x}
                            y2="228"
                            stroke="#8D7AE6"
                            strokeDasharray="3 4"
                            strokeOpacity="0.55"
                          />
                          <circle cx={x} cy={y} r="5" fill="#C5E84D" stroke="#101110" strokeWidth="1.4" />
                          <text
                            x={Math.min(575, x - 24)}
                            y={Math.max(52, y - 10)}
                            fill="#EFEFE8"
                            fontSize="10"
                            fontFamily="var(--font-mono)"
                          >
                            t={m.t_max}: <SvgSciText value={m.fbest} sigDigits={2} />
                          </text>
                        </g>
                      );
                    })}
                    <text x="275" y="254" fill="#939889" fontSize="10.5" fontFamily="var(--font-mono)">
                      Thế hệ t (1 → 500) · Trục tung: log10(f_best)
                    </text>
                  </svg>
                );
              })()}

              <div className="qa-table-wrap">
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th>Mốc thế hệ</th>
                      <th>f_best(t)</th>
                      <th>Nghiệm nbest</th>
                      <th>Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convergence.by_iterations.map((row) => (
                      <tr key={row.t_max}>
                        <td>
                          <code>t = {row.t_max}</code>
                        </td>
                        <td>
                          <strong>
                            <SciNumber value={row.fbest} sigDigits={3} />
                          </strong>
                        </td>
                        <td>
                          <code>{formatVec(row.nbest, 6)}</code>
                        </td>
                        <td>
                          {row.t_max === 100
                            ? 'Định vị lân cận nghiệm (1, 1, 1)'
                            : row.t_max === 200
                              ? 'Khai thác sâu quanh tâm hố'
                              : 'Hội tụ sát giới hạn dấu chấm động'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="modal-provenance-foot">
                Nguồn: <code>{DATASET_PROVENANCE.convergence_iterations.file}</code> ·{' '}
                {DATASET_PROVENANCE.convergence_iterations.conditionNote}
              </p>
            </div>
          ) : null}

          {/* 2. SCALABILITY */}
          {activeCard === 'scalability' && scalability ? (
            <div className="exp-modal__body">
              <p className="exp-modal__takeaway">
                Khi tăng từ <code>D = 3</code> lên <code>D = 10</code>, đàn nhỏ <code>n = 5</code> hụt hơi rõ rệt, trong khi <code>n = 20</code> đạt sai số cỡ 10<sup>-12</sup> với thời gian chạy chỉ bằng ~1/7.7 so với <code>n = 50</code>.
              </p>

              <div className="dual-chart-row">
                <svg viewBox="0 0 345 230" className="modal-chart-svg" role="img" aria-label="Sai số trung bình log10 theo n ở D=3 và D=10">
                  <text x="16" y="22" fill="#B6C96E" fontSize="10" fontFamily="var(--font-mono)">
                    SAI SỐ TRUNG BÌNH fbest_mean (LOG10, 5 RUNS)
                  </text>
                  {[5, 10, 20, 50].map((nVal, idx) => {
                    const r3 = scalability.by_scale.find((r) => r.n === nVal && r.d === 3);
                    const r10 = scalability.by_scale.find((r) => r.n === nVal && r.d === 10);
                    const mapH = (v: number) => {
                      const cl = Math.max(-15, Math.min(2, safeLog10(v)));
                      return ((cl + 15) / 17) * 144 + 8;
                    };
                    const xBase = 48 + idx * 72;
                    const h3 = r3 ? mapH(r3.fbest_mean) : 10;
                    const h10 = r10 ? mapH(r10.fbest_mean) : 10;
                    return (
                      <g key={nVal}>
                        <rect x={xBase} y={192 - h3} width="20" height={h3} rx="1.5" fill="#5A5F52" />
                        <rect x={xBase + 24} y={192 - h10} width="20" height={h10} rx="1.5" fill={nVal === 20 ? '#C5E84D' : '#8D7AE6'} />
                        <text x={xBase + 8} y="210" fill="#EFEFE8" fontSize="10" fontFamily="var(--font-mono)">
                          n={nVal}
                        </text>
                      </g>
                    );
                  })}
                  <line x1="36" y1="192" x2="330" y2="192" stroke="rgba(239,239,232,0.24)" />
                  <text x="38" y="42" fill="#939889" fontSize="9.5" fontFamily="var(--font-mono)">
                    Xám đá: D=3 · Vàng cốm / Tím iris: D=10 (thấp = tốt hơn)
                  </text>
                </svg>

                <svg viewBox="0 0 345 230" className="modal-chart-svg" role="img" aria-label="Thời gian chạy trung bình ms theo n">
                  <text x="16" y="22" fill="#B6C96E" fontSize="10" fontFamily="var(--font-mono)">
                    THỜI GIAN TRUNG BÌNH (ms / LƯỢT 500 VÒNG)
                  </text>
                  {[5, 10, 20, 50].map((nVal, idx) => {
                    const r3 = scalability.by_scale.find((r) => r.n === nVal && r.d === 3);
                    const r10 = scalability.by_scale.find((r) => r.n === nVal && r.d === 10);
                    const maxMs = 19000;
                    const xBase = 48 + idx * 72;
                    const h3 = r3 ? Math.max(4, (r3.runtime_ms / maxMs) * 144) : 4;
                    const h10 = r10 ? Math.max(4, (r10.runtime_ms / maxMs) * 144) : 4;
                    return (
                      <g key={nVal}>
                        <rect x={xBase} y={192 - h3} width="20" height={h3} rx="1.5" fill="#5A5F52" />
                        <rect x={xBase + 24} y={192 - h10} width="20" height={h10} rx="1.5" fill={nVal === 20 ? '#C5E84D' : '#B6C96E'} />
                        <text x={xBase + 8} y="210" fill="#EFEFE8" fontSize="10" fontFamily="var(--font-mono)">
                          n={nVal}
                        </text>
                      </g>
                    );
                  })}
                  <line x1="36" y1="192" x2="330" y2="192" stroke="rgba(239,239,232,0.24)" />
                  <text x="38" y="42" fill="#939889" fontSize="9.5" fontFamily="var(--font-mono)">
                    n=20 (~2.3s) so với n=50 (~18.3s)
                  </text>
                </svg>
              </div>

              <div className="qa-table-wrap">
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th>Số chiều D</th>
                      <th>Quy mô đàn n</th>
                      <th>fbest_mean ± fbest_std</th>
                      <th>Thời gian TB (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scalability.by_scale.map((r) => (
                      <tr key={`${r.d}-${r.n}`}>
                        <td>
                          <code>D = {r.d}</code>
                        </td>
                        <td>
                          <code>n = {r.n}</code>
                        </td>
                        <td>
                          <strong>
                            <SciNumber value={r.fbest_mean} sigDigits={2} />
                          </strong>{' '}
                          ± <SciNumber value={r.fbest_std} sigDigits={2} />
                        </td>
                        <td>{formatFixed(r.runtime_ms, 1)} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* 3. COMPLEXITY */}
          {activeCard === 'complexity' && complexity ? (
            <div className="exp-modal__body">
              <p className="exp-modal__takeaway">
                Trên thang đo log–log với{' '}
                <MathFormula
                  tex="n \in \{10, 20, 40, 80, 160\}"
                  ariaLabel="n in {10, 20, 40, 80, 160}"
                />
                , trung vị thời gian mỗi thế hệ khớp với hệ số góc{' '}
                <strong>slope = {formatFixed(complexity.log_log_slope, 3)}</strong>,
                phản ánh xu hướng bậc hai <MathFormula tex="n^2" ariaLabel="n^2" />{' '}
                phép duyệt cặp mỗi vòng.
              </p>

              {(() => {
                const pts = complexity.summary.map((s) => ({
                  n: s.n,
                  ms: s.median_ms_per_generation,
                  lx: Math.log10(s.n),
                  ly: Math.log10(s.median_ms_per_generation),
                }));
                const minX = Math.min(...pts.map((p) => p.lx));
                const maxX = Math.max(...pts.map((p) => p.lx));
                const minY = Math.min(...pts.map((p) => p.ly));
                const maxY = Math.max(...pts.map((p) => p.ly));
                const mapPt = (lx: number, ly: number): [number, number] => [
                  72 + ((lx - minX) / Math.max(1e-6, maxX - minX)) * 560,
                  214 - ((ly - minY) / Math.max(1e-6, maxY - minY)) * 164,
                ];
                const linePath = pts
                  .map((p, i) => {
                    const [x, y] = mapPt(p.lx, p.ly);
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');

                return (
                  <svg viewBox="0 0 700 256" className="modal-chart-svg" role="img" aria-label="Đồ thị log-log độ phức tạp thời gian theo n">
                    <line x1="72" y1="214" x2="640" y2="214" stroke="rgba(239,239,232,0.24)" />
                    <line x1="72" y1="42" x2="72" y2="214" stroke="rgba(239,239,232,0.24)" />
                    <path d={linePath} fill="none" stroke="#B6C96E" strokeWidth="2.2" />
                    {complexity.runs.map((r, idx) => {
                      const [rx, ry] = mapPt(Math.log10(r.n), Math.log10(r.ms_per_generation));
                      return <circle key={idx} cx={rx} cy={ry} r="3.2" fill="rgba(239,239,232,0.48)" />;
                    })}
                    {pts.map((p) => {
                      const [px, py] = mapPt(p.lx, p.ly);
                      return (
                        <g key={p.n}>
                          <circle cx={px} cy={py} r="5.5" fill="#C5E84D" stroke="#101110" strokeWidth="1.5" />
                          <text x={px - 18} y={py - 12} fill="#EFEFE8" fontSize="10" fontFamily="var(--font-mono)">
                            n={p.n} ({p.ms.toFixed(1)}ms)
                          </text>
                        </g>
                      );
                    })}
                    <text x="82" y="56" fill="#C5E84D" fontSize="11" fontFamily="var(--font-mono)">
                      Slope log–log = {formatFixed(complexity.log_log_slope, 4)}
                    </text>
                  </svg>
                );
              })()}

              <div className="qa-table-wrap">
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th>Kích thước đàn n</th>
                      <th>
                        Kiểm tra cặp / vòng (n<sup>2</sup>)
                      </th>
                      <th>Trung vị ms / vòng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complexity.summary.map((s) => (
                      <tr key={s.n}>
                        <td>
                          <code>n = {s.n}</code>
                        </td>
                        <td>
                          <code>{(s.n * s.n).toLocaleString('en-US')}</code>
                        </td>
                        <td>
                          <strong>{formatFixed(s.median_ms_per_generation, 3)} ms</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* 4. GAMMA SENSITIVITY */}
          {activeCard === 'gamma' && sensitivity ? (
            <div className="exp-modal__body">
              <div className="modal-inline-controls">
                <span>
                  Chọn lát cắt <MathFormula tex="\theta" ariaLabel="theta" />:
                </span>
                {[0.9, 0.97, 1.0].map((th) => (
                  <button
                    key={th}
                    type="button"
                    aria-pressed={Math.abs(selectedThetaForGamma - th) < 1e-9}
                    className={`chip-btn ${
                      Math.abs(selectedThetaForGamma - th) < 1e-9 ? 'chip-btn--active' : ''
                    }`}
                    onClick={() => setSelectedThetaForGamma(th)}
                  >
                    <MathFormula
                      tex={`\\theta = ${th.toFixed(2)}`}
                      ariaLabel={`theta = ${th.toFixed(2)}`}
                    />
                  </button>
                ))}
              </div>

              <p className="exp-modal__takeaway">
                Tại{' '}
                <MathFormula
                  tex="D = 10, \; \theta = 0.97"
                  ariaLabel="D = 10, theta = 0.97"
                />
                : <MathFormula tex="\gamma \in \{0.01, 0.1\}" ariaLabel="gamma in {0.01, 0.1}" />{' '}
                duy trì vùng nhìn phù hợp để hội tụ sâu xuống cỡ{' '}
                <MathFormula tex="10^{-12}" ariaLabel="10^-12" />, trong khi{' '}
                <MathFormula tex="\gamma = 50" ariaLabel="gamma = 50" /> triệt
                tiêu lực hút tầm xa khiến độ phân tán{' '}
                <MathFormula tex="S_t" ariaLabel="S_t" /> và sai số{' '}
                <MathFormula tex="E_t" ariaLabel="E_t" /> đứng cao.
              </p>

              {(() => {
                const runs = sensitivity.grid.filter(
                  (g) => Math.abs(g.theta - selectedThetaForGamma) < 1e-9
                );
                const colors = ['#939889', '#C5E84D', '#B6C96E', '#8D7AE6', '#D98C4A'];
                const maxDisp = Math.max(
                  1,
                  ...runs.flatMap((r) => [r.dispersion[0] ?? 1, r.dispersion[r.dispersion.length - 1] ?? 1])
                );

                return (
                  <>
                    <div className="dual-chart-row">
                      <svg viewBox="0 0 345 220" className="modal-chart-svg" role="img" aria-label="Sai số hội tụ theo gamma">
                        <text x="14" y="20" fill="#B6C96E" fontSize="10" fontFamily="var(--font-mono)">
                          SAI SỐ MỤC TIÊU log10(E_t) · D=10
                        </text>
                        {runs.map((r, idx) => {
                          const d = r.curve
                            .filter((_, i) => i % 5 === 0 || i === r.curve.length - 1)
                            .map((val, k, arr) => {
                              const x = 36 + (k / Math.max(1, arr.length - 1)) * 292;
                              const lv = Math.max(-14, Math.min(3, safeLog10(val)));
                              const y = 194 - ((lv + 14) / 17) * 156;
                              return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                            })
                            .join(' ');
                          return (
                            <path
                              key={r.gamma}
                              d={d}
                              fill="none"
                              stroke={colors[idx % colors.length]}
                              strokeWidth="1.9"
                              strokeDasharray={r.gamma >= 50 ? '5 3' : undefined}
                            />
                          );
                        })}
                        <line x1="36" y1="194" x2="328" y2="194" stroke="rgba(239,239,232,0.24)" />
                      </svg>

                      <svg viewBox="0 0 345 220" className="modal-chart-svg" role="img" aria-label="Độ phân tán cặp trung bình theo gamma">
                        <text x="14" y="20" fill="#B6C96E" fontSize="10" fontFamily="var(--font-mono)">
                          ĐỘ PHÂN TÁN CẶP TRUNG BÌNH S_t
                        </text>
                        {runs.map((r, idx) => {
                          const d = r.dispersion
                            .filter((_, i) => i % 5 === 0 || i === r.dispersion.length - 1)
                            .map((val, k, arr) => {
                              const x = 36 + (k / Math.max(1, arr.length - 1)) * 292;
                              const y = 194 - (val / maxDisp) * 156;
                              return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                            })
                            .join(' ');
                          return (
                            <path
                              key={r.gamma}
                              d={d}
                              fill="none"
                              stroke={colors[idx % colors.length]}
                              strokeWidth="1.9"
                              strokeDasharray={r.gamma >= 50 ? '5 3' : undefined}
                            />
                          );
                        })}
                        <line x1="36" y1="194" x2="328" y2="194" stroke="rgba(239,239,232,0.24)" />
                      </svg>
                    </div>

                    <div className="qa-table-wrap">
                      <table className="qa-table">
                        <thead>
                          <tr>
                            <th>γ (θ = {selectedThetaForGamma.toFixed(2)})</th>
                            <th>
                              Sai số cuối E<sub>500</sub>
                            </th>
                            <th>
                              Phân tán S<sub>1</sub> → S<sub>500</sub>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((r, idx) => (
                            <tr key={r.gamma}>
                              <td>
                                <span style={{ color: colors[idx % colors.length] }}>●</span>{' '}
                                <code>γ = {r.gamma}</code>
                              </td>
                              <td>
                                <strong>
                                  <SciNumber value={r.fbest} sigDigits={3} />
                                </strong>
                              </td>
                              <td>
                                {formatFixed(r.dispersion[0], 3)} →{' '}
                                {formatFixed(r.dispersion[r.dispersion.length - 1], 4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}

          {/* 5. COOLING THETA & HYBRID */}
          {activeCard === 'cooling_hybrid' && sensitivity && alphaHybrid ? (
            <div className="exp-modal__body">
              <div className="modal-inline-controls">
                <button
                  type="button"
                  aria-pressed={coolingSubTab === 'alpha_hybrid'}
                  className={`chip-btn ${coolingSubTab === 'alpha_hybrid' ? 'chip-btn--active' : ''}`}
                  onClick={() => setCoolingSubTab('alpha_hybrid')}
                >
                  Fixed / Decaying / Hybrid (D=5, 5 seed)
                </button>
                <button
                  type="button"
                  aria-pressed={coolingSubTab === 'theta_sweep'}
                  className={`chip-btn ${coolingSubTab === 'theta_sweep' ? 'chip-btn--active' : ''}`}
                  onClick={() => setCoolingSubTab('theta_sweep')}
                >
                  Độ nhạy θ ∈ &#123;0.90, 0.97, 1.00&#125; (D=10)
                </button>
              </div>

              {coolingSubTab === 'alpha_hybrid' ? (
                <>
                  <p className="exp-modal__takeaway">
                    Với ngưỡng mục tiêu{' '}
                    <MathFormula tex="f \le 10^{-3}" ariaLabel="f <= 10^-3" /> trên
                    5 seed độc lập: giữ cố định{' '}
                    <MathFormula tex="\theta = 1.0" ariaLabel="theta = 1.0" /> đạt{' '}
                    <strong>0/5 (0%)</strong>, giảm hình học{' '}
                    <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" /> đạt{' '}
                    <strong>5/5 (100%)</strong>; nhánh Hybrid cộng thêm 201 lượt
                    tìm kiếm cục bộ Gaussian để tinh chỉnh sâu hơn.
                  </p>

                  {(() => {
                    const fixed0 = alphaHybrid.runs.find((r) => r.mode === 'fixed' && r.seed === 0);
                    const decay0 = alphaHybrid.runs.find((r) => r.mode === 'decaying' && r.seed === 0);
                    const toPath = (arr: number[]) =>
                      arr
                        .map((v, idx) => {
                          const x = 58 + (idx / Math.max(1, arr.length - 1)) * 590;
                          const lv = Math.max(-5, Math.min(2, safeLog10(v)));
                          const y = 198 - ((lv + 5) / 7) * 150;
                          return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ');
                    const targetY = 198 - ((-3 + 5) / 7) * 150;

                    return (
                      <svg viewBox="0 0 690 232" className="modal-chart-svg" role="img" aria-label="So sánh hội tụ alpha cố định và alpha giảm dần">
                        <line x1="58" y1={targetY} x2="648" y2={targetY} stroke="rgba(182,201,110,0.36)" strokeDasharray="3 3" />
                        <text x="64" y={targetY - 6} fill="#B6C96E" fontSize="9.5" fontFamily="var(--font-mono)">
                          Ngưỡng mục tiêu f &lt;= 1e-3
                        </text>
                        {fixed0 ? (
                          <path d={toPath(fixed0.curve)} fill="none" stroke="#8D7AE6" strokeWidth="1.9" strokeDasharray="6 4" />
                        ) : null}
                        {decay0 ? (
                          <path d={toPath(decay0.curve)} fill="none" stroke="#C5E84D" strokeWidth="2.2" />
                        ) : null}
                        <line x1="58" y1="198" x2="648" y2="198" stroke="rgba(239,239,232,0.24)" />
                      </svg>
                    );
                  })()}

                  <div className="qa-table-wrap">
                    <table className="qa-table">
                      <thead>
                        <tr>
                          <th>Phương thức</th>
                          <th>Sai số cuối TB (5 seed)</th>
                          <th>
                            Tỷ lệ đạt f ≤ 10<sup>-3</sup>
                          </th>
                          <th>Tổng lượt gọi f(x)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alphaHybrid.summary.map((s) => {
                          const sampleRun = alphaHybrid.runs.find((r) => r.mode === s.mode && r.seed === 0);
                          const hits = Math.round(s.target_success_rate * 5);
                          return (
                            <tr key={s.mode}>
                              <td>
                                <code>{s.mode === 'fixed' ? 'Fixed α (θ = 1.00)' : 'Decaying α (θ = 0.97)'}</code>
                              </td>
                              <td>
                                <strong>
                                  <SciNumber value={s.fbest_mean} sigDigits={3} />
                                </strong>
                              </td>
                              <td>
                                {hits} / 5 ({(s.target_success_rate * 100).toFixed(0)}%)
                              </td>
                              <td>{sampleRun ? `${sampleRun.evaluations.toLocaleString('en-US')} lượt` : '—'}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td>
                            <code>Hybrid FA + Local Search</code>
                          </td>
                          <td>
                            <strong>
                              <SciNumber
                                value={
                                  alphaHybrid.hybrid_runs.reduce((acc, r) => acc + r.fbest, 0) /
                                  alphaHybrid.hybrid_runs.length
                                }
                                sigDigits={3}
                              />
                            </strong>
                          </td>
                          <td>5 / 5 (100%)</td>
                          <td>
                            {alphaHybrid.hybrid_runs[0]?.total_evaluations.toLocaleString('en-US')} lượt (+201 local)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="qa-table-wrap">
                  <table className="qa-table">
                    <thead>
                      <tr>
                        <th>Hệ số làm nguội θ (γ = 0.1)</th>
                        <th>
                          Sai số cuối E<sub>500</sub>
                        </th>
                        <th>
                          α<sub>500</sub>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.theta_sweep.map((row) => (
                        <tr key={row.theta}>
                          <td>
                            <code>θ = {row.theta.toFixed(2)}</code>
                          </td>
                          <td>
                            <strong>
                              <SciNumber value={row.fbest} sigDigits={3} />
                            </strong>
                          </td>
                          <td>
                            <SciNumber value={Math.pow(row.theta, 500)} sigDigits={2} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* 6. MULTIMODAL SUB-SWARMING */}
          {activeCard === 'multimodal' && multimodal && activeReplay ? (
            <div className="exp-modal__body">
              <div className="modal-inline-controls">
                <div className="chip-group" role="group" aria-label="Chọn hàm đa cực trị">
                  {(['Himmelblau', 'Rastrigin'] as const).map((fn) => (
                    <button
                      key={fn}
                      type="button"
                      aria-pressed={mmFunc === fn}
                      className={`chip-btn ${mmFunc === fn ? 'chip-btn--active' : ''}`}
                      onClick={() => {
                        setMmFunc(fn);
                        setMmGamma(1.0);
                      }}
                    >
                      {fn} 2D
                    </button>
                  ))}
                </div>

                <div className="chip-group" role="group" aria-label="Chọn hệ số gamma cho replay">
                  {[1e-5, 0.01, 0.1, 1.0, 5.0].map((g) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={Math.abs(mmGamma - g) < 1e-9}
                      className={`chip-btn ${Math.abs(mmGamma - g) < 1e-9 ? 'chip-btn--active' : ''}`}
                      onClick={() => setMmGamma(g)}
                    >
                      γ = {g === 1e-5 ? (
                        <>
                          10<sup>-5</sup>
                        </>
                      ) : (
                        g
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <p className="exp-modal__takeaway">
                Trên <strong>Himmelblau</strong>, <code>γ = 1.0</code> cho tầm nhìn cục bộ L = 1 vừa khít khoảng cách giữa 4 hố nên chiếm lĩnh trọn <strong>4 / 4 cực tiểu toàn cục</strong>. Trên <strong>Rastrigin</strong> (<code>γ = 5.0</code>), đàn tách cụm nhưng bị bẫy ở hố cục bộ (số cụm khác số nghiệm toàn cục).
              </p>

              <div className="mm-replay-layout">
                <div className="mm-canvas-box">
                  <canvas
                    ref={contourCanvasRef}
                    className="mm-contour-canvas"
                    role="img"
                    aria-label={`Bản đồ đường đồng mức và vị trí đàn trên hàm ${activeReplay.function_name}`}
                  />
                  <div className="mm-scrubber">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="action-pill action-pill--ivory"
                        onClick={() => {
                          if (mmFrameIdx >= activeReplay.history.length - 1) setMmFrameIdx(0);
                          setMmPlaying((p) => !p);
                        }}
                      >
                        {mmPlaying ? '⏸ Tạm dừng' : '▶ Phát lại'}
                      </button>
                      <label htmlFor="mm-frame-range">
                        t = {activeReplay.history[mmFrameIdx]?.t ?? 0} / {activeReplay.t_max}
                      </label>
                    </div>
                    <input
                      id="mm-frame-range"
                      type="range"
                      min={0}
                      max={Math.max(0, activeReplay.history.length - 1)}
                      value={mmFrameIdx}
                      onChange={(e) => {
                        setMmPlaying(false);
                        setMmFrameIdx(Number(e.target.value));
                      }}
                    />
                  </div>
                </div>

                <div className="mm-stats-col">
                  {(() => {
                    const currFrame = activeReplay.history[mmFrameIdx];
                    const currMet = activeReplay.metrics[mmFrameIdx];
                    return (
                      <div className="hairline-bento">
                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">Đỉnh toàn cục xác nhận</span>
                          <span className="hairline-bento__val hairline-bento__val--lime">
                            {currMet?.global_optima_found ?? 0} / {activeReplay.global_optima.length}
                          </span>
                        </div>
                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">Số cụm bán kính (eps=0.6)</span>
                          <span className="hairline-bento__val">{currMet?.n_clusters ?? 0} cụm</span>
                        </div>
                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">f_best hiện tại</span>
                          <span className="hairline-bento__val">
                            <SciNumber value={currFrame?.fbest} sigDigits={3} />
                          </span>
                        </div>
                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">
                            Độ phân tán S<sub>t</sub>
                          </span>
                          <span className="hairline-bento__val">
                            {formatFixed(currMet?.dispersion, 3)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="qa-table-wrap">
                    <table className="qa-table">
                      <thead>
                        <tr>
                          <th>γ ({mmFunc})</th>
                          <th>Số cụm TB</th>
                          <th>Đỉnh toàn cục TB</th>
                          <th>fbest_mean</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multimodal.gamma_summary
                          .filter((s) => s.function_name === mmFunc)
                          .map((s) => (
                            <tr key={s.gamma}>
                              <td>
                                <code>γ = {s.gamma}</code>
                              </td>
                              <td>
                                {s.n_clusters_mean.toFixed(2)} ± {s.n_clusters_std.toFixed(2)}
                              </td>
                              <td>
                                <strong>{s.global_optima_found_mean.toFixed(2)}</strong> /{' '}
                                {mmFunc === 'Himmelblau' ? 4 : 1}
                              </td>
                              <td>
                                <SciNumber value={s.fbest_mean} sigDigits={2} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDataset } from '../../lib/dataStore';
import { SciNumber, formatFixed } from '../../lib/formatters';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { MathFormula } from '../shared/MathFormula';
import type { ExperimentCardId } from './ExperimentModal';

gsap.registerPlugin(ScrollTrigger);

const ExperimentModal = lazy(() => import('./ExperimentModal'));

export interface ExperimentsGridSectionProps {
  reducedMotion: boolean;
  viewMode?: 'grid' | 'table';
}

type FilterCategory = 'all' | 'convergence' | 'multimodal' | 'sensitivity';

const FILTER_PILLS: ReadonlyArray<{ id: FilterCategory; label: ReactNode }> = [
  { id: 'all', label: 'Tất cả (06)' },
  { id: 'convergence', label: 'Hội tụ & Bậc hai' },
  { id: 'multimodal', label: 'Phân đàn đa cực trị' },
  {
    id: 'sensitivity',
    label: (
      <>
        Độ nhạy <MathFormula tex="\gamma, \alpha" ariaLabel="gamma, alpha" />
      </>
    ),
  },
];

const SAFE_FLOOR = 1e-16;
function log10Safe(v: number): number {
  return Math.log10(Math.max(SAFE_FLOOR, v));
}

function ChamferedFrameSvg() {
  return (
    <svg
      className="exp-notch-card__frame"
      viewBox="0 0 380 304"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M12,1 H368 Q379,1 379,12 V262 H202 L176,303 H12 Q1,303 1,292 V12 Q1,1 12,1 Z"
        fill="none"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function ExperimentsGridSection({
  reducedMotion,
  viewMode = 'grid',
}: ExperimentsGridSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [activeCard, setActiveCard] = useState<ExperimentCardId | null>(null);

  const convState = useDataset('convergence_iterations', true);
  const scaleState = useDataset('scalability_nd', true);
  const compState = useDataset('tv10_complexity', true);
  const sensState = useDataset('parameter_sensitivity', true);
  const hybridState = useDataset('tv10_alpha_hybrid', true);
  const mmState = useDataset('multimodal_optimization', true);

  useGSAP(
    () => {
      const sec = sectionRef.current;
      if (!sec || reducedMotion || viewMode !== 'grid' || activeFilter !== 'all') {
        return;
      }

      const mm = gsap.matchMedia();
      mm.add('(min-width: 960px)', () => {
        const cols = sec.querySelectorAll<HTMLElement>('.notched-col');
        if (cols.length < 3) return;

        gsap.fromTo(
          cols[0],
          { y: 8 },
          {
            y: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: sec,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9,
            },
          }
        );
        gsap.fromTo(
          cols[1],
          { y: -6 },
          {
            y: 10,
            ease: 'none',
            scrollTrigger: {
              trigger: sec,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9,
            },
          }
        );
        gsap.fromTo(
          cols[2],
          { y: 8 },
          {
            y: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: sec,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.9,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [activeFilter, reducedMotion, viewMode] }
  );

  const convLast =
    convState.data?.by_iterations[convState.data.by_iterations.length - 1] ??
    null;
  const scaleN20D10 =
    scaleState.data?.by_scale.find((r) => r.n === 20 && r.d === 10) ?? null;
  const gammaBestRun =
    sensState.data?.grid.find(
      (g) => Math.abs(g.gamma - 0.01) < 1e-9 && Math.abs(g.theta - 0.97) < 1e-9
    ) ?? null;
  const decaySummary =
    hybridState.data?.summary.find((s) => s.mode === 'decaying') ?? null;

  const renderThumb = (id: ExperimentCardId): ReactNode => {
    if (id === 'convergence') {
      const data = convState.data;
      if (!data) return null;
      const curve = data.by_iterations[data.by_iterations.length - 1].curve;
      const logs = curve.map(log10Safe);
      const minL = Math.min(...logs);
      const maxL = Math.max(minL + 1, ...logs);
      const pathD = logs
        .filter((_, i) => i % 4 === 0 || i === logs.length - 1)
        .map((lv, k, arr) => {
          const x = 16 + (k / Math.max(1, arr.length - 1)) * 248;
          const y = 128 - ((lv - minL) / (maxL - minL)) * 98;
          return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[42, 72, 102].map((gy) => (
            <line key={gy} x1="16" y1={gy} x2="264" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="16" y1="128" x2="264" y2="128" stroke="rgba(239,239,232,0.16)" />
          <path d={pathD} stroke="#C5E84D" strokeWidth="1.9" />
          {data.by_iterations.map((m) => {
            const cx = 16 + ((m.t_max - 1) / Math.max(1, curve.length - 1)) * 248;
            const cy = 128 - ((log10Safe(m.fbest) - minL) / (maxL - minL)) * 98;
            return (
              <circle
                key={m.t_max}
                cx={cx}
                cy={cy}
                r="4"
                fill="#C5E84D"
                stroke="#101110"
                strokeWidth="1.3"
              />
            );
          })}
          <text x="16" y="16" fill="rgba(239,239,232,0.68)" fontSize="8.8" fontFamily="var(--font-mono)">
            log₁₀(f)
          </text>
          <text
            x="264"
            y="143"
            textAnchor="end"
            fill="rgba(239,239,232,0.68)"
            fontSize="8.8"
            fontFamily="var(--font-mono)"
          >
            t = 1 → 500
          </text>
        </svg>
      );
    }

    if (id === 'scalability') {
      const data = scaleState.data;
      if (!data) return null;
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[50, 88].map((gy) => (
            <line key={gy} x1="20" y1={gy} x2="260" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="20" y1="128" x2="260" y2="128" stroke="rgba(239,239,232,0.18)" />
          <text
            x="260"
            y="16"
            textAnchor="end"
            fill="rgba(239,239,232,0.72)"
            fontSize="8.8"
            fontFamily="var(--font-mono)"
          >
            <tspan fill="#8E9484">■</tspan> 3D  <tspan fill="#C5E84D">■</tspan> 10D
          </text>
          {[5, 10, 20, 50].map((nVal, idx) => {
            const r3 = data.by_scale.find((r) => r.n === nVal && r.d === 3);
            const r10 = data.by_scale.find((r) => r.n === nVal && r.d === 10);
            const accH = (v: number) => {
              const cl = Math.max(-15, Math.min(2, log10Safe(v)));
              return ((2 - cl) / 17) * 94 + 8;
            };
            const h3 = r3 ? accH(r3.fbest_mean) : 12;
            const h10 = r10 ? accH(r10.fbest_mean) : 12;
            const bx = 34 + idx * 56;
            return (
              <g key={nVal}>
                <rect
                  x={bx}
                  y={128 - h3}
                  width="14"
                  height={h3}
                  rx="1.5"
                  fill="#5A5F52"
                />
                <rect
                  x={bx + 17}
                  y={128 - h10}
                  width="14"
                  height={h10}
                  rx="1.5"
                  fill={nVal === 20 ? '#C5E84D' : '#B6C96E'}
                  opacity={nVal === 20 ? 1 : 0.72}
                />
                <text
                  x={bx + 15.5}
                  y="142"
                  textAnchor="middle"
                  fill="rgba(239,239,232,0.68)"
                  fontSize="8.6"
                  fontFamily="var(--font-mono)"
                >
                  {idx === 0 ? `n=${nVal}` : nVal}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    if (id === 'complexity') {
      const data = compState.data;
      if (!data) return null;
      const pts = data.summary.map((s) => ({
        lx: Math.log10(s.n),
        ly: Math.log10(s.median_ms_per_generation),
      }));
      const minX = Math.min(...pts.map((p) => p.lx));
      const maxX = Math.max(...pts.map((p) => p.lx));
      const minY = Math.min(...pts.map((p) => p.ly));
      const maxY = Math.max(...pts.map((p) => p.ly));
      const mapXY = (lx: number, ly: number): [number, number] => [
        26 + ((lx - minX) / Math.max(1e-6, maxX - minX)) * 228,
        126 - ((ly - minY) / Math.max(1e-6, maxY - minY)) * 96,
      ];
      const d = pts
        .map((p, i) => {
          const [x, y] = mapXY(p.lx, p.ly);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[50, 88].map((gy) => (
            <line key={gy} x1="26" y1={gy} x2="254" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="26" y1="126" x2="254" y2="126" stroke="rgba(239,239,232,0.16)" />
          <path d={d} stroke="#B6C96E" strokeWidth="1.9" />
          {data.runs.map((r, k) => {
            const [rx, ry] = mapXY(Math.log10(r.n), Math.log10(r.ms_per_generation));
            return <circle key={k} cx={rx} cy={ry} r="2.6" fill="rgba(239,239,232,0.38)" />;
          })}
          {pts.map((p, k) => {
            const [px, py] = mapXY(p.lx, p.ly);
            return (
              <circle
                key={k}
                cx={px}
                cy={py}
                r="4.2"
                fill="#C5E84D"
                stroke="#101110"
                strokeWidth="1.2"
              />
            );
          })}
          <text x="26" y="16" fill="rgba(239,239,232,0.68)" fontSize="8.8" fontFamily="var(--font-mono)">
            log t
          </text>
          <text
            x="254"
            y="142"
            textAnchor="end"
            fill="rgba(239,239,232,0.68)"
            fontSize="8.8"
            fontFamily="var(--font-mono)"
          >
            log n
          </text>
        </svg>
      );
    }

    if (id === 'gamma') {
      const data = sensState.data;
      if (!data) return null;
      const runs = data.grid.filter((g) => Math.abs(g.theta - 0.97) < 1e-9);
      const strokes = ['#5A5F52', '#C5E84D', '#B6C96E', '#8D7AE6', 'rgba(239,239,232,0.38)'];
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          <line x1="16" y1="132" x2="264" y2="132" stroke="rgba(239,239,232,0.16)" />
          {runs.map((r, idx) => {
            const pathD = r.curve
              .filter((_, i) => i % 10 === 0 || i === r.curve.length - 1)
              .map((v, k, arr) => {
                const x = 16 + (k / Math.max(1, arr.length - 1)) * 248;
                const lv = Math.max(-14, Math.min(3, log10Safe(v)));
                const y = 132 - ((lv + 14) / 17) * 102;
                return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <path
                key={r.gamma}
                d={pathD}
                stroke={strokes[idx % strokes.length]}
                strokeWidth={r.gamma === 0.01 || r.gamma === 0.1 ? '2' : '1.25'}
                strokeDasharray={r.gamma >= 50 ? '4 3' : undefined}
              />
            );
          })}
          <text x="16" y="16" fill="rgba(239,239,232,0.72)" fontSize="8.8" fontFamily="var(--font-mono)">
            <tspan fill="#C5E84D">── γ tốt</tspan> · <tspan fill="#8D7AE6">- - γ lớn</tspan>
          </text>
        </svg>
      );
    }

    if (id === 'cooling_hybrid') {
      const data = hybridState.data;
      if (!data) return null;
      const fixed0 = data.runs.find((r) => r.mode === 'fixed' && r.seed === 0);
      const decay0 = data.runs.find((r) => r.mode === 'decaying' && r.seed === 0);
      const toD = (arr: number[]) =>
        arr
          .filter((_, i) => i % 3 === 0 || i === arr.length - 1)
          .map((v, k, sub) => {
            const x = 16 + (k / Math.max(1, sub.length - 1)) * 248;
            const lv = Math.max(-5, Math.min(2, log10Safe(v)));
            const y = 132 - ((lv + 5) / 7) * 100;
            return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
      const targetY = 132 - ((-3 + 5) / 7) * 100;
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          <line
            x1="16"
            y1={targetY}
            x2="236"
            y2={targetY}
            stroke="rgba(182,201,110,0.34)"
            strokeDasharray="3 3"
          />
          <text
            x="264"
            y={targetY + 3}
            textAnchor="end"
            fill="rgba(182,201,110,0.88)"
            fontSize="8.6"
            fontFamily="var(--font-mono)"
          >
            10⁻³
          </text>
          {fixed0 ? (
            <path
              d={toD(fixed0.curve)}
              stroke="#8D7AE6"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          ) : null}
          {decay0 ? <path d={toD(decay0.curve)} stroke="#C5E84D" strokeWidth="2" /> : null}
          <text x="16" y="16" fill="rgba(239,239,232,0.72)" fontSize="8.8" fontFamily="var(--font-mono)">
            <tspan fill="#C5E84D">── θ=0.97</tspan> · <tspan fill="#8D7AE6">- - θ=1.0</tspan>
          </text>
        </svg>
      );
    }

    const mm = mmState.data;
    if (!mm) return null;
    const rep =
      mm.replays.find(
        (r) => r.function_name === 'Himmelblau' && Math.abs(r.gamma - 1.0) < 1e-9
      ) ?? mm.replays[0];
    const [lb, ub] = rep.bounds;
    const mapX = (x: number) => 92 + ((x - lb) / (ub - lb)) * 124;
    const mapY = (y: number) => 136 - ((y - lb) / (ub - lb)) * 120;
    const lastMet = rep.metrics[rep.metrics.length - 1];
    return (
      <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
        <text x="14" y="18" fill="rgba(239,239,232,0.72)" fontSize="8.8" fontFamily="var(--font-mono)">
          Himmelblau 2D
        </text>
        <rect x="92" y="16" width="124" height="120" rx="5" stroke="rgba(239,239,232,0.16)" />
        {rep.global_optima.map(([ox, oy], idx) => (
          <circle
            key={idx}
            cx={mapX(ox)}
            cy={mapY(oy)}
            r="9.5"
            stroke="rgba(239,239,232,0.36)"
            strokeDasharray="3 2"
          />
        ))}
        {rep.final_positions.map(([px, py], idx) => {
          const inCluster = (lastMet?.labels?.[idx] ?? -1) >= 0;
          return (
            <circle
              key={idx}
              cx={mapX(px)}
              cy={mapY(py)}
              r={inCluster ? 3.1 : 2.1}
              fill={inCluster ? '#C5E84D' : 'rgba(239,239,232,0.45)'}
            />
          );
        })}
      </svg>
    );
  };

  const cards: {
    id: ExperimentCardId;
    category: FilterCategory;
    index: string;
    code: string;
    ariaTitle: string;
    title: ReactNode;
    metric: ReactNode;
    cardNoteVi: ReactNode;
    problemCol: ReactNode;
    configCol: ReactNode;
    resultCol: ReactNode;
  }[] = [
    {
      id: 'convergence',
      category: 'convergence',
      index: '01',
      code: '01',
      ariaTitle: 'Tốc độ hội tụ theo thế hệ',
      title: 'Tốc độ hội tụ theo thế hệ',
      metric: convLast ? <SciNumber value={convLast.fbest} sigDigits={2} /> : '…',
      cardNoteVi: (
        <>
          Sai số giảm hơn 13 bậc độ lớn, đạt cỡ{' '}
          <MathFormula tex="10^{-14}" ariaLabel="10^-14" /> sau 500 vòng lặp (
          <MathFormula tex="n = 20" ariaLabel="n = 20" />).
        </>
      ),
      problemCol: 'Mặt cầu dịch tâm 3D',
      configCol: 'n = 20, γ = 0.1, θ = 0.97, t = 500',
      resultCol: convLast ? (
        <>
          <SciNumber value={convLast.fbest} sigDigits={3} /> (tại t = 500)
        </>
      ) : (
        '…'
      ),
    },
    {
      id: 'scalability',
      category: 'convergence',
      index: '02',
      code: '02',
      ariaTitle: 'Quy mô đàn và số chiều 10D',
      title: 'Quy mô đàn & số chiều 10D',
      metric: '20 ĐOM ĐÓM',
      cardNoteVi: (
        <>
          Ở 10 chiều, <MathFormula tex="n = 20" ariaLabel="n = 20" /> đạt sai số{' '}
          <MathFormula tex="\sim 10^{-12}" ariaLabel="~10^-12" /> mà nhanh gấp
          ~7.7 lần <MathFormula tex="n = 50" ariaLabel="n = 50" />.
        </>
      ),
      problemCol: 'Mặt cầu dịch tâm 3D & 10D',
      configCol: 'n ∈ {5, 10, 20, 50} × 5 seed',
      resultCol: scaleN20D10 ? (
        <>
          <SciNumber value={scaleN20D10.fbest_mean} sigDigits={2} /> ·{' '}
          {formatFixed(scaleN20D10.runtime_ms / 1000, 2)}s (n=20, 10D)
        </>
      ) : (
        '…'
      ),
    },
    {
      id: 'complexity',
      category: 'convergence',
      index: '03',
      code: '03',
      ariaTitle: 'Độ phức tạp bậc hai O(n^2)',
      title: (
        <>
          Độ phức tạp bậc hai{' '}
          <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />
        </>
      ),
      metric: compState.data
        ? `ĐỘ DỐC ${compState.data.log_log_slope.toFixed(2)}`
        : '…',
      cardNoteVi: (
        <>
          Hồi quy <MathFormula tex="\log n\text{–}\log t" ariaLabel="log n - log t" />{' '}
          cho độ dốc ~2.03, khớp sát chi phí duyệt cặp{' '}
          <MathFormula tex="n^2" ariaLabel="n^2" /> mỗi vòng.
        </>
      ),
      problemCol: 'Đo thời gian thực thi (10D)',
      configCol: 'n ∈ {10, 20, 40, 80, 160}',
      resultCol: compState.data
        ? `Độ dốc log–log = ${compState.data.log_log_slope.toFixed(3)}`
        : '…',
    },
    {
      id: 'gamma',
      category: 'sensitivity',
      index: '04',
      code: '04',
      ariaTitle: 'Độ nhạy hệ số hấp thụ gamma',
      title: (
        <>
          Độ nhạy hệ số hấp thụ <MathFormula tex="\gamma" ariaLabel="gamma" />
        </>
      ),
      metric: (
        <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />
      ),
      cardNoteVi: (
        <>
          <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />{' '}
          giữ tầm nhìn vừa đủ để hội tụ sâu; <MathFormula tex="\gamma = 50" ariaLabel="gamma = 50" />{' '}
          làm tắt lực hút xa.
        </>
      ),
      problemCol: 'Mặt cầu dịch tâm 10D',
      configCol: '15 tổ hợp (γ × θ), t = 500',
      resultCol: gammaBestRun ? (
        <>
          Tốt nhất: <SciNumber value={gammaBestRun.fbest} sigDigits={2} /> (γ=0.01)
        </>
      ) : (
        'γ ∈ [0.01, 0.1]'
      ),
    },
    {
      id: 'cooling_hybrid',
      category: 'sensitivity',
      index: '05',
      code: '05',
      ariaTitle: 'Làm nguội alpha_t và tinh chỉnh cục bộ',
      title: (
        <>
          Làm nguội <MathFormula tex="\alpha_t" ariaLabel="alpha_t" /> &amp; tinh
          chỉnh cục bộ
        </>
      ),
      metric: '5 / 5 ĐẠT',
      cardNoteVi: (
        <>
          Giảm dần theo <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />{' '}
          đạt 5/5 lượt qua ngưỡng <MathFormula tex="10^{-3}" ariaLabel="10^-3" />,
          trong khi <MathFormula tex="\theta = 1.0" ariaLabel="theta = 1.0" /> đạt 0/5.
        </>
      ),
      problemCol: 'Mặt cầu dịch tâm 5D',
      configCol: 'Fixed (θ=1.0) vs θ=0.97 vs Hybrid',
      resultCol: decaySummary ? (
        <>
          5 / 5 lượt đạt 10⁻³ (<SciNumber value={decaySummary.fbest_mean} sigDigits={2} />)
        </>
      ) : (
        '5 / 5 đạt ngưỡng'
      ),
    },
    {
      id: 'multimodal',
      category: 'multimodal',
      index: '06',
      code: '06',
      ariaTitle: 'Phân đàn đa cực trị',
      title: 'Phân đàn đa cực trị',
      metric: '4 / 4 ĐỈNH',
      cardNoteVi:
        'Đàn 40 đom đóm tự tách thành các cụm nhỏ, bắt trọn cả 4 cực tiểu toàn cục của hàm Himmelblau khi γ = 1.0.',
      problemCol: 'Himmelblau 2D & Rastrigin 2D',
      configCol: 'n = 40, γ ∈ {10⁻⁵..5}, 10 seed',
      resultCol: 'Tìm đủ 4.00 / 4 đỉnh Himmelblau (γ = 1.0)',
    },
  ];

  const visibleCards =
    activeFilter === 'all'
      ? cards
      : cards.filter((c) => c.category === activeFilter);

  const columns =
    activeFilter === 'all'
      ? [
          [cards[0], cards[3]],
          [cards[1], cards[4]],
          [cards[2], cards[5]],
        ]
      : visibleCards.map((c) => [c]);

  return (
    <section
      id="thuc-nghiem"
      ref={sectionRef}
      className="section-experiments surface-light"
      data-surface="light"
      aria-label="Danh mục kết quả thực nghiệm"
    >
      <ContourBackdrop variant="light" />

      <div className="section-container">
        <div className="exp-filter-bar">
          <div
            className="exp-filter-pills"
            role="group"
            aria-label="Lọc nhóm thực nghiệm"
          >
            {FILTER_PILLS.map((pill) => {
              const isActive = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={isActive}
                  className={`exp-filter-pill ${
                    isActive ? 'exp-filter-pill--active' : ''
                  }`}
                  onClick={() => setActiveFilter(pill.id)}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <span className="exp-filter-hint">
            {viewMode === 'table'
              ? 'Nhấp vào nút cuối dòng để mở biểu đồ chi tiết'
              : 'Nhấp vào từng thẻ để mở đồ thị và bảng số liệu chi tiết'}
          </span>
        </div>

        {viewMode === 'grid' ? (
          <div className="notched-grid">
            {columns.map((col, colIdx) => (
              <div
                key={colIdx}
                className={`notched-col ${
                  activeFilter === 'all' && colIdx === 1
                    ? 'notched-col--offset'
                    : ''
                }`}
              >
                {col.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="exp-notch-card"
                    onClick={() => setActiveCard(card.id)}
                    aria-label={`Mở phân tích ${card.ariaTitle}`}
                  >
                    <ChamferedFrameSvg />
                    <div className="exp-notch-card__surface">
                      <div className="exp-notch-card__top">
                        <span className="exp-notch-card__index">
                          {card.index}
                        </span>
                        <span className="exp-notch-card__arrow" aria-hidden="true">
                          ↗
                        </span>
                      </div>

                      <div className="exp-notch-card__chart-wrap">
                        {renderThumb(card.id)}
                      </div>

                      <div className="exp-notch-card__title">{card.title}</div>
                      <p className="exp-notch-card__summary">{card.cardNoteVi}</p>
                    </div>

                    <div className="exp-notch-card__cutout-badge">{card.metric}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Bảng tổng hợp kết quả 6 bài đo thực nghiệm"
            className="exp-summary-table-wrap"
          >
            <table className="exp-summary-table">
              <thead>
                <tr>
                  <th scope="col">STT</th>
                  <th scope="col">Nội dung đo</th>
                  <th scope="col">Bài toán</th>
                  <th scope="col">Cấu hình</th>
                  <th scope="col">Kết quả chính</th>
                  <th scope="col">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => (
                  <tr
                    key={card.id}
                    className="exp-summary-table__row"
                    onClick={() => setActiveCard(card.id)}
                  >
                    <td className="exp-summary-table__code">{card.code}</td>
                    <th scope="row" className="exp-summary-table__name">
                      <div>{card.title}</div>
                      <span className="exp-summary-table__subnote">
                        {card.cardNoteVi}
                      </span>
                    </th>
                    <td>{card.problemCol}</td>
                    <td>
                      <code className="exp-summary-table__cfg">{card.configCol}</code>
                    </td>
                    <td className="exp-summary-table__result">{card.resultCol}</td>
                    <td>
                      <button
                        type="button"
                        className="exp-summary-table__btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCard(card.id);
                        }}
                      >
                        Xem đồ thị ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Concise 3-Column Takeaways Strip on #F3F2EC Alabaster (Strictly 0% Neon on Light!) */}
        <div
          className="exp-takeaways-box"
          aria-labelledby="exp-takeaways-heading"
        >
          <div className="exp-takeaways-box__head">
            <h2 id="exp-takeaways-heading" className="exp-takeaways-box__title">
              Tổng kết thực nghiệm
            </h2>
            <span>Đối chiếu trực tiếp từ 6 tập dữ liệu JSON trên Python</span>
          </div>

          <div className="exp-takeaways-grid">
            <div className="exp-takeaway-col">
              <span className="exp-takeaway-col__tag">01 · LÀM TỐT</span>
              <p>
                Hội tụ tới <MathFormula tex="10^{-14}" ariaLabel="10^-14" /> trên
                mặt cầu dịch tâm; tự chia cụm tìm đủ <strong>4 / 4</strong> cực
                tiểu toàn cục của hàm Himmelblau.
              </p>
            </div>

            <div className="exp-takeaway-col">
              <span className="exp-takeaway-col__tag">02 · ĐIỂM CẦN LƯU Ý</span>
              <p>
                Thời gian chạy tăng theo{' '}
                <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> (độ dốc
                thực nghiệm ~2.03); với hàm quá nhiều hố cục bộ như Rastrigin,
                đàn dễ bị kẹt nếu chọn{' '}
                <MathFormula tex="\gamma" ariaLabel="gamma" /> quá lớn.
              </p>
            </div>

            <div className="exp-takeaway-col">
              <span className="exp-takeaway-col__tag">03 · THAM SỐ NÊN CHỌN</span>
              <p>
                Cỡ đàn <MathFormula tex="n \approx 20" ariaLabel="n ~ 20" />, hệ
                số cản sáng{' '}
                <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />{' '}
                (tăng lên <MathFormula tex="\gamma \approx 1" ariaLabel="gamma ~ 1" />{' '}
                khi cần tách cụm nhiều đỉnh), giảm bước nhảy{' '}
                <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ExperimentModal
          activeCard={activeCard}
          onClose={() => setActiveCard(null)}
          onNavigateCard={(nextId) => setActiveCard(nextId)}
          convergence={convState.data}
          scalability={scaleState.data}
          complexity={compState.data}
          sensitivity={sensState.data}
          alphaHybrid={hybridState.data}
          multimodal={mmState.data}
        />
      </Suspense>
    </section>
  );
}

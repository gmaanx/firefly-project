import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDataset } from '../../lib/dataStore';
import { SciNumber, formatFixed } from '../../lib/formatters';
import { CARD_TO_SLUG } from '../../pages/ExperimentDetailPage';
import { BlockReveal } from '../shared/BlockReveal';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { LandoSignatureFlourish } from '../shared/LandoSignatureFlourish';
import { MathFormula } from '../shared/MathFormula';
import { useRouteCurtain } from '../shared/RouteCurtain';
import type { ExperimentCardId } from './ExperimentModal';

gsap.registerPlugin(ScrollTrigger);

export interface ExperimentsGridSectionProps {
  reducedMotion: boolean;
  viewMode?: 'grid' | 'table';
}

type FilterCategory = 'all' | 'convergence' | 'multimodal' | 'sensitivity';

const FILTER_PILLS: ReadonlyArray<{ id: FilterCategory; label: ReactNode }> = [
  { id: 'all', label: 'Tất cả (06)' },
  {
    id: 'convergence',
    label: (
      <>
        Hội tụ &amp; Chi phí <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />
      </>
    ),
  },
  {
    id: 'sensitivity',
    label: (
      <>
        Tham số <MathFormula tex="\gamma" ariaLabel="gamma" /> &amp;{' '}
        <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
      </>
    ),
  },
  { id: 'multimodal', label: 'Đa cực trị (4 đỉnh)' },
];

const SAFE_FLOOR = 1e-16;
function log10Safe(v: number): number {
  return Math.log10(Math.max(SAFE_FLOOR, v));
}

function ChamferedFrameSvg() {
  return (
    <svg
      className="exp-notch-card__frame"
      viewBox="0 0 560 360"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M14,1 H546 Q559,1 559,14 V314 H338 L312,359 H14 Q1,359 1,346 V14 Q1,1 14,1 Z"
        fill="none"
        strokeWidth="1.2"
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
  const takeawaysRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const { navigateWithDarkZoom } = useRouteCurtain();

  const convState = useDataset('convergence_iterations', true);
  const scaleState = useDataset('scalability_nd', true);
  const compState = useDataset('tv10_complexity', true);
  const sensState = useDataset('parameter_sensitivity', true);
  const hybridState = useDataset('tv10_alpha_hybrid', true);
  const mmState = useDataset('multimodal_optimization', true);

  const dataReadySig = [
    convState.status,
    scaleState.status,
    compState.status,
    sensState.status,
    hybridState.status,
    mmState.status,
  ].join('|');

  // GSAP + Lenis ScrollTrigger Choreography: Card Stagger + Live SVG Stroke/Bar Self-Drawing + Scrubbed Depth
  useGSAP(
    () => {
      const sec = sectionRef.current;
      if (!sec || reducedMotion) return;

      if (viewMode === 'grid') {
        const cardEls = sec.querySelectorAll<HTMLElement>('.exp-notch-card');
        cardEls.forEach((cardEl, idx) => {
          gsap.fromTo(
            cardEl,
            { y: 42, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.78,
              delay: (idx % 2) * 0.1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: cardEl,
                start: 'top 86%',
                once: true,
              },
            }
          );

          // Live self-drawing line curves inside each card
          const strokes = cardEl.querySelectorAll<SVGPathElement>('.js-exp-stroke');
          strokes.forEach((p, sIdx) => {
            const len = p.getTotalLength?.() ?? 0;
            if (len > 0) {
              gsap.fromTo(
                p,
                { strokeDasharray: len, strokeDashoffset: len },
                {
                  strokeDashoffset: 0,
                  duration: 1.12,
                  delay: 0.14 + sIdx * 0.08,
                  ease: 'expo.out',
                  scrollTrigger: {
                    trigger: cardEl,
                    start: 'top 84%',
                    once: true,
                  },
                }
              );
            }
          });

          // Upward-growing bars in Card 02
          const bars = cardEl.querySelectorAll<SVGRectElement>('.js-exp-bar');
          if (bars.length > 0) {
            gsap.fromTo(
              bars,
              { scaleY: 0, transformOrigin: 'bottom center' },
              {
                scaleY: 1,
                duration: 0.72,
                stagger: 0.055,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: cardEl,
                  start: 'top 84%',
                  once: true,
                },
              }
            );
          }

          // Popping multimodal cluster rings in Card 06
          const rings = cardEl.querySelectorAll<SVGCircleElement>('.js-exp-cluster');
          if (rings.length > 0) {
            gsap.fromTo(
              rings,
              { scale: 0, opacity: 0, transformOrigin: 'center center' },
              {
                scale: 1,
                opacity: 1,
                duration: 0.65,
                stagger: 0.09,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                  trigger: cardEl,
                  start: 'top 84%',
                  once: true,
                },
              }
            );
          }
        });
      }
    },
    { scope: sectionRef, dependencies: [activeFilter, reducedMotion, viewMode, dataReadySig] }
  );

  // Takeaways Box Staggered Reveal
  useGSAP(
    () => {
      const box = takeawaysRef.current;
      if (!box || reducedMotion) return;
      const cols = box.querySelectorAll<HTMLElement>('.exp-takeaway-col');
      if (cols.length > 0) {
        gsap.fromTo(
          cols,
          { y: 26, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.72,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: box,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }
    },
    { scope: takeawaysRef, dependencies: [reducedMotion] }
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
          const x = 28 + (k / Math.max(1, arr.length - 1)) * 404;
          const y = 146 - ((lv - minL) / (maxL - minL)) * 110;
          return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

      return (
        <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[46, 82, 118].map((gy) => (
            <line key={gy} x1="28" y1={gy} x2="432" y2={gy} stroke="rgba(239,239,232,0.08)" />
          ))}
          <line x1="28" y1="146" x2="432" y2="146" stroke="rgba(239,239,232,0.2)" />
          <path d={pathD} stroke="#C5E84D" strokeWidth="2.4" className="js-exp-stroke" />
          {data.by_iterations.map((m) => {
            const cx = 28 + ((m.t_max - 1) / Math.max(1, curve.length - 1)) * 404;
            const cy = 146 - ((log10Safe(m.fbest) - minL) / (maxL - minL)) * 110;
            return (
              <circle
                key={m.t_max}
                cx={cx}
                cy={cy}
                r="4.8"
                fill="#C5E84D"
                stroke="#101110"
                strokeWidth="1.5"
              />
            );
          })}
          <text x="28" y="20" fill="rgba(239,239,232,0.78)" fontSize="11" fontFamily="var(--font-mono)">
            log₁₀(f_best)
          </text>
          <text
            x="432"
            y="162"
            textAnchor="end"
            fill="rgba(239,239,232,0.78)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            Thế hệ t = 1 → 500
          </text>
        </svg>
      );
    }

    if (id === 'scalability') {
      const data = scaleState.data;
      if (!data) return null;
      return (
        <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[54, 98].map((gy) => (
            <line key={gy} x1="28" y1={gy} x2="432" y2={gy} stroke="rgba(239,239,232,0.08)" />
          ))}
          <line x1="28" y1="144" x2="432" y2="144" stroke="rgba(239,239,232,0.2)" />
          <text
            x="432"
            y="20"
            textAnchor="end"
            fill="rgba(239,239,232,0.82)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            <tspan fill="#8E9484">■</tspan> 3D  ·  <tspan fill="#C5E84D">■</tspan> 10D
          </text>
          {[5, 10, 20, 50].map((nVal, idx) => {
            const r3 = data.by_scale.find((r) => r.n === nVal && r.d === 3);
            const r10 = data.by_scale.find((r) => r.n === nVal && r.d === 10);
            const accH = (v: number) => {
              const cl = Math.max(-15, Math.min(2, log10Safe(v)));
              return ((2 - cl) / 17) * 106 + 10;
            };
            const h3 = r3 ? accH(r3.fbest_mean) : 14;
            const h10 = r10 ? accH(r10.fbest_mean) : 14;
            const bx = 56 + idx * 96;
            return (
              <g key={nVal}>
                <rect
                  x={bx}
                  y={144 - h3}
                  width="22"
                  height={h3}
                  rx="2.5"
                  fill="#5A5F52"
                  className="js-exp-bar"
                />
                <rect
                  x={bx + 27}
                  y={144 - h10}
                  width="22"
                  height={h10}
                  rx="2.5"
                  fill={nVal === 20 ? '#C5E84D' : '#B6C96E'}
                  opacity={nVal === 20 ? 1 : 0.76}
                  className="js-exp-bar"
                />
                <text
                  x={bx + 24.5}
                  y="161"
                  textAnchor="middle"
                  fill={nVal === 20 ? '#C5E84D' : 'rgba(239,239,232,0.78)'}
                  fontSize="11"
                  fontWeight={nVal === 20 ? '600' : '400'}
                  fontFamily="var(--font-mono)"
                >
                  n = {nVal}
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
        36 + ((lx - minX) / Math.max(1e-6, maxX - minX)) * 388,
        144 - ((ly - minY) / Math.max(1e-6, maxY - minY)) * 108,
      ];
      const d = pts
        .map((p, i) => {
          const [x, y] = mapXY(p.lx, p.ly);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      return (
        <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[54, 98].map((gy) => (
            <line key={gy} x1="36" y1={gy} x2="424" y2={gy} stroke="rgba(239,239,232,0.08)" />
          ))}
          <line x1="36" y1="144" x2="424" y2="144" stroke="rgba(239,239,232,0.2)" />
          <path d={d} stroke="#B6C96E" strokeWidth="2.4" className="js-exp-stroke" />
          {data.runs.map((r, k) => {
            const [rx, ry] = mapXY(Math.log10(r.n), Math.log10(r.ms_per_generation));
            return <circle key={k} cx={rx} cy={ry} r="3.2" fill="rgba(239,239,232,0.42)" />;
          })}
          {pts.map((p, k) => {
            const [px, py] = mapXY(p.lx, p.ly);
            return (
              <circle
                key={k}
                cx={px}
                cy={py}
                r="5.2"
                fill="#C5E84D"
                stroke="#101110"
                strokeWidth="1.4"
              />
            );
          })}
          <text x="36" y="20" fill="rgba(239,239,232,0.78)" fontSize="11" fontFamily="var(--font-mono)">
            log₁₀(ms / vòng)
          </text>
          <text
            x="424"
            y="162"
            textAnchor="end"
            fill="rgba(239,239,232,0.78)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            log₁₀(n) · n = 10 → 160
          </text>
        </svg>
      );
    }

    if (id === 'gamma') {
      const data = sensState.data;
      if (!data) return null;
      const runs = data.grid.filter((g) => Math.abs(g.theta - 0.97) < 1e-9);
      const strokes = ['#5A5F52', '#C5E84D', '#B6C96E', '#8D7AE6', 'rgba(239,239,232,0.42)'];
      return (
        <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          <line x1="28" y1="146" x2="432" y2="146" stroke="rgba(239,239,232,0.2)" />
          {runs.map((r, idx) => {
            const pathD = r.curve
              .filter((_, i) => i % 10 === 0 || i === r.curve.length - 1)
              .map((v, k, arr) => {
                const x = 28 + (k / Math.max(1, arr.length - 1)) * 404;
                const lv = Math.max(-14, Math.min(3, log10Safe(v)));
                const y = 146 - ((lv + 14) / 17) * 112;
                return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            const isOptimal = r.gamma === 0.01 || r.gamma === 0.1;
            return (
              <path
                key={r.gamma}
                d={pathD}
                stroke={strokes[idx % strokes.length]}
                strokeWidth={isOptimal ? '2.5' : '1.4'}
                strokeDasharray={r.gamma >= 50 ? '5 4' : undefined}
                className={isOptimal ? 'js-exp-stroke' : undefined}
              />
            );
          })}
          <text x="28" y="20" fill="rgba(239,239,232,0.82)" fontSize="11" fontFamily="var(--font-mono)">
            <tspan fill="#C5E84D">── γ ∈ [0.01, 0.1] (tối ưu)</tspan>  ·  <tspan fill="#8D7AE6">- - γ lớn (tắt hút xa)</tspan>
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
            const x = 28 + (k / Math.max(1, sub.length - 1)) * 392;
            const lv = Math.max(-5, Math.min(2, log10Safe(v)));
            const y = 146 - ((lv + 5) / 7) * 110;
            return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
      const targetY = 146 - ((-3 + 5) / 7) * 110;
      return (
        <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          <line
            x1="28"
            y1={targetY}
            x2="388"
            y2={targetY}
            stroke="rgba(182,201,110,0.42)"
            strokeDasharray="4 4"
          />
          <text
            x="432"
            y={targetY + 4}
            textAnchor="end"
            fill="#B6C96E"
            fontSize="10.8"
            fontFamily="var(--font-mono)"
          >
            10⁻³
          </text>
          {fixed0 ? (
            <path
              d={toD(fixed0.curve)}
              stroke="#8D7AE6"
              strokeWidth="1.7"
              strokeDasharray="6 4"
            />
          ) : null}
          {decay0 ? (
            <path
              d={toD(decay0.curve)}
              stroke="#C5E84D"
              strokeWidth="2.5"
              className="js-exp-stroke"
            />
          ) : null}
          <text x="28" y="20" fill="rgba(239,239,232,0.82)" fontSize="11" fontFamily="var(--font-mono)">
            <tspan fill="#C5E84D">── θ = 0.97 (đạt 5/5)</tspan>  ·  <tspan fill="#8D7AE6">- - θ = 1.0 (0/5)</tspan>
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
    const mapX = (x: number) => 176 + ((x - lb) / (ub - lb)) * 144;
    const mapY = (y: number) => 154 - ((y - lb) / (ub - lb)) * 136;
    const lastMet = rep.metrics[rep.metrics.length - 1];
    return (
      <svg viewBox="0 0 460 168" className="exp-notch-card__svg" aria-hidden="true" fill="none">
        <text x="24" y="34" fill="#B6C96E" fontSize="11.2" fontWeight="600" fontFamily="var(--font-mono)">
          Himmelblau 2D
        </text>
        <text x="24" y="54" fill="rgba(239,239,232,0.72)" fontSize="10.4" fontFamily="var(--font-mono)">
          n = 40 · γ = 1.0
        </text>
        <text x="24" y="74" fill="#C5E84D" fontSize="10.8" fontFamily="var(--font-mono)">
          ✓ 4 / 4 đỉnh toàn cục
        </text>
        <rect x="176" y="18" width="144" height="136" rx="6" stroke="rgba(239,239,232,0.2)" />
        {rep.global_optima.map(([ox, oy], idx) => (
          <circle
            key={idx}
            cx={mapX(ox)}
            cy={mapY(oy)}
            r="12"
            stroke="#B6C96E"
            strokeWidth="1.4"
            strokeDasharray="3 2"
            className="js-exp-cluster"
          />
        ))}
        {rep.final_positions.map(([px, py], idx) => {
          const inCluster = (lastMet?.labels?.[idx] ?? -1) >= 0;
          return (
            <circle
              key={idx}
              cx={mapX(px)}
              cy={mapY(py)}
              r={inCluster ? 3.8 : 2.3}
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
    tagLabel: string;
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
      tagLabel: '01 · HỘI TỤ ĐƠN CỰC TRỊ',
      code: '01',
      ariaTitle: 'Tốc độ hội tụ theo thế hệ',
      title: 'Tốc độ hội tụ theo thế hệ',
      metric: convLast ? <SciNumber value={convLast.fbest} sigDigits={2} /> : '…',
      cardNoteVi: (
        <>
          Sai số giảm hơn 13 bậc độ lớn, đạt cỡ{' '}
          <MathFormula tex="10^{-14}" ariaLabel="10^-14" /> sau 500 vòng lặp với
          đàn <MathFormula tex="n = 20" ariaLabel="n = 20" /> cá thể.
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
      tagLabel: '02 · CỠ ĐÀN & SỐ CHIỀU',
      code: '02',
      ariaTitle: 'Quy mô đàn và số chiều 10D',
      title: 'Quy mô đàn & mở rộng lên 10 chiều',
      metric: '20 ĐOM ĐÓM',
      cardNoteVi: (
        <>
          Ở không gian 10 chiều, <MathFormula tex="n = 20" ariaLabel="n = 20" />{' '}
          đạt sai số <MathFormula tex="\sim 10^{-12}" ariaLabel="~10^-12" /> mà
          chạy nhanh gấp ~7.7 lần so với <MathFormula tex="n = 50" ariaLabel="n = 50" />.
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
      tagLabel: '03 · CHI PHÍ THỜI GIAN',
      code: '03',
      ariaTitle: 'Độ phức tạp bậc hai O(n^2)',
      title: (
        <>
          Độ phức tạp thực nghiệm{' '}
          <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />
        </>
      ),
      metric: compState.data
        ? `ĐỘ DỐC ${compState.data.log_log_slope.toFixed(2)}`
        : '…',
      cardNoteVi: (
        <>
          Hồi quy <MathFormula tex="\log n\text{–}\log t" ariaLabel="log n - log t" />{' '}
          cho độ dốc ~2.03, khớp sát với hai vòng lặp so sánh cặp{' '}
          <MathFormula tex="n^2" ariaLabel="n^2" /> mỗi thế hệ.
        </>
      ),
      problemCol: 'Mặt cầu dịch tâm 5D (CountingProblem)',
      configCol: 'n ∈ {10, 20, 40, 80, 160} · t = 8 · 3 seed',
      resultCol: compState.data
        ? `Độ dốc log–log = ${compState.data.log_log_slope.toFixed(3)}`
        : '…',
    },
    {
      id: 'gamma',
      category: 'sensitivity',
      tagLabel: '04 · TẦM NHÌN & CẢN SÁNG γ',
      code: '04',
      ariaTitle: 'Độ nhạy hệ số hấp thụ gamma',
      title: (
        <>
          Độ nhạy hệ số cản sáng <MathFormula tex="\gamma" ariaLabel="gamma" />
        </>
      ),
      metric: (
        <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />
      ),
      cardNoteVi: (
        <>
          <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />{' '}
          giữ tầm nhìn đủ rộng để hội tụ sâu; nếu chọn{' '}
          <MathFormula tex="\gamma = 50" ariaLabel="gamma = 50" /> lực hút xa bị tắt hẳn.
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
      tagLabel: '05 · LÀM NGUỘI NHIỄU αₜ',
      code: '05',
      ariaTitle: 'Làm nguội alpha_t và tinh chỉnh cục bộ',
      title: (
        <>
          Giảm dần bước nhảy <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />{' '}
          quanh đích
        </>
      ),
      metric: '5 / 5 ĐẠT',
      cardNoteVi: (
        <>
          Hạ dần theo <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />{' '}
          giúp 5/5 lượt vượt ngưỡng <MathFormula tex="10^{-3}" ariaLabel="10^-3" />,
          trong khi giữ cố định <MathFormula tex="\theta = 1.0" ariaLabel="theta = 1.0" />{' '}
          đạt 0/5.
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
      tagLabel: '06 · TỰ TÁCH NHÓM ĐA ĐỈNH',
      code: '06',
      ariaTitle: 'Phân đàn đa cực trị',
      title: 'Tự tách đàn tìm nhiều cực trị cùng lúc',
      metric: '4 / 4 ĐỈNH',
      cardNoteVi:
        'Đàn 40 đom đóm tự chia thành 4 nhóm riêng biệt, chiếm lĩnh trọn vẹn cả 4 cực tiểu toàn cục của hàm Himmelblau khi γ = 1.0.',
      problemCol: 'Himmelblau 2D & Rastrigin 2D',
      configCol: 'n = 40, γ ∈ {10⁻⁵..5}, 3 seed',
      resultCol: 'Tìm đủ 4.00 / 4 đỉnh Himmelblau (γ = 1.0)',
    },
  ];

  const visibleCards =
    activeFilter === 'all'
      ? cards
      : cards.filter((c) => c.category === activeFilter);

  // Clean 2-column reading order: Left [01, 03, 05] | Right [02, 04, 06] so rows read naturally 01-02, 03-04, 05-06!
  const leftColCards = visibleCards.filter((_, i) => i % 2 === 0);
  const rightColCards = visibleCards.filter((_, i) => i % 2 === 1);

  return (
    <section
      id="thuc-nghiem"
      ref={sectionRef}
      className="section-experiments surface-light"
      data-surface="light"
      aria-labelledby="exp-grid-heading"
    >
      <ContourBackdrop variant="light" />

      <div className="section-container">
        <div className="exp-section-intro">
          <div>
            <h2 id="exp-grid-heading" tabIndex={-1} className="flowchart-title">
              <BlockReveal color="olive-lime" reducedMotion={reducedMotion}>
                Sáu bài đo{' '}
                <span className="editorial-serif editorial-serif--olive">
                  kiểm chứng hội tụ &amp; tham số
                </span>
              </BlockReveal>
            </h2>
          </div>
        </div>

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
        </div>

        {viewMode === 'grid' ? (
          <div className="exp-bento-2col">
            <div className="exp-bento-col">
              {leftColCards.map((card) => {
                const detailPath = `/thuc-nghiem/${CARD_TO_SLUG[card.id]}`;
                return (
                  <Link
                    key={card.id}
                    to={detailPath}
                    className="exp-notch-card"
                    onClick={(e) =>
                      navigateWithDarkZoom(detailPath, e, {
                        returnPath: '/thuc-nghiem',
                      })
                    }
                    aria-label={`Mở trang phân tích ${card.ariaTitle}`}
                  >
                    <ChamferedFrameSvg />
                    <div className="exp-notch-card__surface">
                      <div className="exp-notch-card__top">
                        <span className="exp-notch-card__index">
                          {card.tagLabel}
                        </span>
                        <span className="exp-notch-card__open-pill" aria-hidden="true">
                          Chi tiết ↗
                        </span>
                      </div>

                      <div className="exp-notch-card__chart-wrap">
                        {renderThumb(card.id)}
                      </div>

                      <div className="exp-notch-card__title">{card.title}</div>
                      <p className="exp-notch-card__summary">{card.cardNoteVi}</p>
                    </div>

                    <div className="exp-notch-card__cutout-badge">{card.metric}</div>
                  </Link>
                );
              })}
            </div>

            {rightColCards.length > 0 ? (
              <div className="exp-bento-col exp-bento-col--offset">
                {rightColCards.map((card) => {
                  const detailPath = `/thuc-nghiem/${CARD_TO_SLUG[card.id]}`;
                  return (
                    <Link
                      key={card.id}
                      to={detailPath}
                      className="exp-notch-card"
                      onClick={(e) =>
                        navigateWithDarkZoom(detailPath, e, {
                          returnPath: '/thuc-nghiem',
                        })
                      }
                      aria-label={`Mở trang phân tích ${card.ariaTitle}`}
                    >
                      <ChamferedFrameSvg />
                      <div className="exp-notch-card__surface">
                        <div className="exp-notch-card__top">
                          <span className="exp-notch-card__index">
                            {card.tagLabel}
                          </span>
                          <span className="exp-notch-card__open-pill" aria-hidden="true">
                            Chi tiết ↗
                          </span>
                        </div>

                        <div className="exp-notch-card__chart-wrap">
                          {renderThumb(card.id)}
                        </div>

                        <div className="exp-notch-card__title">{card.title}</div>
                        <p className="exp-notch-card__summary">{card.cardNoteVi}</p>
                      </div>

                      <div className="exp-notch-card__cutout-badge">{card.metric}</div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
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
                {visibleCards.map((card) => {
                  const detailPath = `/thuc-nghiem/${CARD_TO_SLUG[card.id]}`;
                  return (
                    <tr
                      key={card.id}
                      className="exp-summary-table__row"
                      onClick={(e) =>
                        navigateWithDarkZoom(detailPath, e.currentTarget, {
                          returnPath: '/thuc-nghiem',
                        })
                      }
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
                        <Link
                          to={detailPath}
                          className="exp-summary-table__btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateWithDarkZoom(detailPath, e, {
                              returnPath: '/thuc-nghiem',
                            });
                          }}
                        >
                          Xem đồ thị ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Monumental 3-Column Takeaways Strip on #F3F2EC Alabaster (Strictly 0% Neon on Light!) */}
        <div
          ref={takeawaysRef}
          className="exp-takeaways-box"
          aria-labelledby="exp-takeaways-heading"
        >
          <div className="exp-takeaways-box__head">
            <div>
              <h2 id="exp-takeaways-heading" className="exp-takeaways-box__title">
                <BlockReveal color="olive-lime" reducedMotion={reducedMotion}>
                  Tổng kết{' '}
                  <span className="editorial-serif editorial-serif--olive">
                    ba kết luận thực nghiệm
                  </span>
                </BlockReveal>
              </h2>
              <LandoSignatureFlourish
                variant="editorial-signoff"
                triggerRef={takeawaysRef}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          <div className="exp-takeaways-grid">
            <div className="exp-takeaway-col">
              <div className="exp-takeaway-col__num" aria-hidden="true">
                01
              </div>
              <span className="exp-takeaway-col__tag">ĐIỂM MẠNH NỔI BẬT</span>
              <p>
                Hội tụ sâu tới <MathFormula tex="10^{-14}" ariaLabel="10^-14" />{' '}
                trên mặt cầu dịch tâm và tự chia cụm tìm đủ{' '}
                <strong>4 / 4</strong> cực tiểu toàn cục của hàm Himmelblau cùng lúc.
              </p>
            </div>

            <div className="exp-takeaway-col">
              <div className="exp-takeaway-col__num" aria-hidden="true">
                02
              </div>
              <span className="exp-takeaway-col__tag">GIỚI HẠN CẦN LƯU Ý</span>
              <p>
                Thời gian chạy tăng bậc hai{' '}
                <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> (độ dốc
                thực nghiệm ~2.03); với mặt hàm quá dày cực trị địa phương như
                Rastrigin, đàn dễ bị kẹt nếu đặt{' '}
                <MathFormula tex="\gamma" ariaLabel="gamma" /> quá lớn.
              </p>
            </div>

            <div className="exp-takeaway-col">
              <div className="exp-takeaway-col__num" aria-hidden="true">
                03
              </div>
              <span className="exp-takeaway-col__tag">BỘ THAM SỐ NÊN DÙNG</span>
              <p>
                Cỡ đàn <MathFormula tex="n \approx 20" ariaLabel="n ~ 20" />, hệ
                số cản sáng{' '}
                <MathFormula tex="\gamma \in [0.01, 0.1]" ariaLabel="gamma in [0.01, 0.1]" />{' '}
                (tăng lên <MathFormula tex="\gamma \approx 1" ariaLabel="gamma ~ 1" />{' '}
                khi cần tách cụm đa đỉnh), giảm nhiễu{' '}
                <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

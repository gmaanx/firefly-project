import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDataset } from '../../lib/dataStore';
import { SciNumber } from '../../lib/formatters';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { KineticButton } from '../shared/KineticButton';
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
      viewBox="0 0 380 280"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M12,1 H368 Q379,1 379,12 V238 H202 L176,279 H12 Q1,279 1,268 V12 Q1,1 12,1 Z"
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
  const [expandedRow, setExpandedRow] = useState<ExperimentCardId | null>(
    'convergence'
  );

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
          { y: 16 },
          {
            y: -16,
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
          { y: -12 },
          {
            y: 18,
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
          { y: 14 },
          {
            y: -14,
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

  // Museum Data-Visualization Styling inside dark #161815 notched cards:
  // Primary FA: #C5E84D / #B6C96E, Baseline Slate: #5A5F52 / #939889, Secondary Ablation: #8D7AE6
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
          const y = 132 - ((lv - minL) / (maxL - minL)) * 108;
          return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[42, 72, 102].map((gy) => (
            <line key={gy} x1="16" y1={gy} x2="264" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="16" y1="132" x2="264" y2="132" stroke="rgba(239,239,232,0.16)" />
          <path d={pathD} stroke="#C5E84D" strokeWidth="1.9" />
          {data.by_iterations.map((m) => {
            const cx = 16 + ((m.t_max - 1) / Math.max(1, curve.length - 1)) * 248;
            const cy = 132 - ((log10Safe(m.fbest) - minL) / (maxL - minL)) * 108;
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
        </svg>
      );
    }

    if (id === 'scalability') {
      const data = scaleState.data;
      if (!data) return null;
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[46, 88].map((gy) => (
            <line key={gy} x1="20" y1={gy} x2="260" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="20" y1="130" x2="260" y2="130" stroke="rgba(239,239,232,0.18)" />
          {[5, 10, 20, 50].map((nVal, idx) => {
            const r3 = data.by_scale.find((r) => r.n === nVal && r.d === 3);
            const r10 = data.by_scale.find((r) => r.n === nVal && r.d === 10);
            const accH = (v: number) => {
              const cl = Math.max(-15, Math.min(2, log10Safe(v)));
              return ((2 - cl) / 17) * 102 + 10;
            };
            const h3 = r3 ? accH(r3.fbest_mean) : 12;
            const h10 = r10 ? accH(r10.fbest_mean) : 12;
            const bx = 34 + idx * 56;
            return (
              <g key={nVal}>
                <rect
                  x={bx}
                  y={130 - h3}
                  width="14"
                  height={h3}
                  rx="1.5"
                  fill="#5A5F52"
                />
                <rect
                  x={bx + 17}
                  y={130 - h10}
                  width="14"
                  height={h10}
                  rx="1.5"
                  fill={nVal === 20 ? '#C5E84D' : '#B6C96E'}
                  opacity={nVal === 20 ? 1 : 0.72}
                />
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
        128 - ((ly - minY) / Math.max(1e-6, maxY - minY)) * 102,
      ];
      const d = pts
        .map((p, i) => {
          const [x, y] = mapXY(p.lx, p.ly);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          {[48, 88].map((gy) => (
            <line key={gy} x1="26" y1={gy} x2="254" y2={gy} stroke="rgba(239,239,232,0.07)" />
          ))}
          <line x1="26" y1="128" x2="254" y2="128" stroke="rgba(239,239,232,0.16)" />
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
                const y = 132 - ((lv + 14) / 17) * 108;
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
            const y = 130 - ((lv + 5) / 7) * 104;
            return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
      const targetY = 130 - ((-3 + 5) / 7) * 104;
      return (
        <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
          <line
            x1="16"
            y1={targetY}
            x2="264"
            y2={targetY}
            stroke="rgba(182,201,110,0.3)"
            strokeDasharray="3 3"
          />
          {fixed0 ? (
            <path
              d={toD(fixed0.curve)}
              stroke="#8D7AE6"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          ) : null}
          {decay0 ? <path d={toD(decay0.curve)} stroke="#C5E84D" strokeWidth="2" /> : null}
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
    const mapX = (x: number) => 66 + ((x - lb) / (ub - lb)) * 148;
    const mapY = (y: number) => 136 - ((y - lb) / (ub - lb)) * 124;
    const lastMet = rep.metrics[rep.metrics.length - 1];
    return (
      <svg viewBox="0 0 280 148" className="exp-notch-card__svg" aria-hidden="true" fill="none">
        <rect x="66" y="12" width="148" height="124" rx="5" stroke="rgba(239,239,232,0.14)" />
        {rep.global_optima.map(([ox, oy], idx) => (
          <circle
            key={idx}
            cx={mapX(ox)}
            cy={mapY(oy)}
            r="10.5"
            stroke="rgba(239,239,232,0.34)"
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
    summaryVi: ReactNode;
  }[] = [
    {
      id: 'convergence',
      category: 'convergence',
      index: '01',
      code: '01',
      ariaTitle: 'Tốc độ hội tụ theo thế hệ',
      title: 'Tốc độ hội tụ theo thế hệ',
      metric: convLast ? <SciNumber value={convLast.fbest} sigDigits={2} /> : '…',
      summaryVi: (
        <>
          Trên mặt cầu dịch tâm 3 chiều (<MathFormula tex="n = 20" ariaLabel="n = 20" />),
          sai số giảm liên tục hơn 14 bậc độ lớn khi nâng số thế hệ từ 100 lên
          500 vòng.
        </>
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
      summaryVi: (
        <>
          Khảo sát <MathFormula tex="D = 3" ariaLabel="D = 3" /> và{' '}
          <MathFormula tex="D = 10" ariaLabel="D = 10" /> trên{' '}
          <MathFormula tex="n \in \{5, 10, 20, 50\}" ariaLabel="n in {5, 10, 20, 50}" />:
          cỡ đàn <MathFormula tex="n = 20" ariaLabel="n = 20" /> cân bằng tốt
          nhất giữa độ chính xác{' '}
          <MathFormula tex="\sim 10^{-12}" ariaLabel="~10^-12" /> và thời gian
          chạy ~2.32s.
        </>
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
        ? `SLOPE ${compState.data.log_log_slope.toFixed(2)}`
        : '…',
      summaryVi: (
        <>
          Hồi quy tuyến tính <MathFormula tex="\log n" ariaLabel="log n" />–
          <MathFormula tex="\log t" ariaLabel="log t" /> cho hệ số góc thực
          nghiệm ~2.03, khớp chặt với chi phí duyệt cặp{' '}
          <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> mỗi vòng.
        </>
      ),
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
      summaryVi: (
        <>
          Quét 15 cấu hình{' '}
          <MathFormula tex="(\gamma \times \theta)" ariaLabel="(gamma x theta)" />{' '}
          trên không gian 10 chiều: vùng{' '}
          <MathFormula tex="\gamma" ariaLabel="gamma" /> từ 0.01 đến 0.1 duy trì
          bán kính tương tác vừa đủ để hội tụ sâu.
        </>
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
      summaryVi: (
        <>
          Giữ nhiễu cố định (<MathFormula tex="\theta = 1.0" ariaLabel="theta = 1.0" />)
          dừng quanh <MathFormula tex="10^{-2}" ariaLabel="10^-2" />, trong khi
          giảm dần theo <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" />{' '}
          và kết hợp tinh chỉnh cục bộ giúp đạt ngưỡng ở cả 5/5 lượt.
        </>
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
      summaryVi:
        'Nhờ lực hút suy giảm theo khoảng cách, quần thể 40 đom đóm tự tách thành các nhóm con bắt trọn 4 cực tiểu toàn cục của hàm Himmelblau.',
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
        {/* Filter Pills on #F3F2EC Alabaster — #141513 Charcoal Active Pill with #EFEFE8 Text (0% Neon on Light!) */}
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
            Nhấp vào từng thẻ để mở đồ thị và bảng số liệu chi tiết
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
                    </div>

                    <div className="exp-notch-card__cutout-badge">{card.metric}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="calendar-rows-list" role="list">
            {visibleCards.map((card) => {
              const isExpanded = expandedRow === card.id;
              return (
                <div key={card.id} className="calendar-row" role="listitem">
                  <button
                    type="button"
                    className="calendar-row__summary"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedRow((prev) => (prev === card.id ? null : card.id))
                    }
                  >
                    <span className="calendar-row__code">{card.code}</span>
                    <span className="calendar-row__name">{card.title}</span>
                    <span className="calendar-row__metric">{card.metric}</span>
                    <span className="calendar-row__toggle" aria-hidden="true">
                      {isExpanded ? '−' : '+'}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="calendar-row__detail">
                      <p style={{ maxWidth: '64ch' }}>{card.summaryVi}</p>
                      <KineticButton
                        label="MỞ BIỂU ĐỒ CHI TIẾT"
                        icon="↗"
                        variant="dark"
                        onClick={() => setActiveCard(card.id)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <ExperimentModal
          activeCard={activeCard}
          onClose={() => setActiveCard(null)}
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

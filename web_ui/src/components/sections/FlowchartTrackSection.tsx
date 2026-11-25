import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { MathFormula } from '../shared/MathFormula';
import type { QaTabId } from '../shared/QaDrawer';

export interface FlowchartTrackSectionProps {
  reducedMotion: boolean;
  onOpenQa: (tab?: QaTabId) => void;
}

interface PhaseItem {
  idx: number;
  code: string;
  shortLabel: string;
  fnName: string;
  title: ReactNode;
  desc: ReactNode;
  formulaTex: string;
  formulaSecondTex?: string;
  formulaAria: string;
}

const PHASES: readonly PhaseItem[] = [
  {
    idx: 0,
    code: '01',
    shortLabel: '01 Khởi tạo',
    fnName: 'init_population',
    title: 'Khởi tạo đàn ban đầu',
    desc: (
      <>
        Rải ngẫu nhiên <MathFormula tex="n" ariaLabel="n" /> đom đóm trong miền{' '}
        <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" /> và
        gán các tham số ban đầu.
      </>
    ),
    formulaTex: '\\mathbf{x}_i^0 \\sim \\mathcal{U}(\\mathbf{Lb}, \\mathbf{Ub})',
    formulaSecondTex: 'i = 1, \\dots, n',
    formulaAria: 'x_i^0 phan bo deu tren [Lb, Ub]',
  },
  {
    idx: 1,
    code: '02',
    shortLabel: '02 Tính độ sáng',
    fnName: 'evaluate_light',
    title: 'Tính độ sáng từng cá thể',
    desc: (
      <>
        Đánh giá <MathFormula tex="f(\mathbf{x}_i)" ariaLabel="f(x_i)" /> tại
        mỗi vị trí; với bài toán tìm cực tiểu,{' '}
        <MathFormula tex="f" ariaLabel="f" /> càng nhỏ thì đom đóm càng sáng.
      </>
    ),
    formulaTex:
      'I_i \\propto \\frac{1}{f(\\mathbf{x}_i)} \\iff \\min_{\\mathbf{x}} f(\\mathbf{x}_i)',
    formulaAria: 'Cuong do sang I_i gan voi cuc tieu hoa f(x_i)',
  },
  {
    idx: 2,
    code: '03',
    shortLabel: '03 So sánh cặp',
    fnName: 'compare_pairs',
    title: (
      <>
        So sánh từng cặp <MathFormula tex="(i, j)" ariaLabel="(i, j)" />
      </>
    ),
    desc: (
      <>
        Duyệt 2 vòng lặp <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />;
        nếu <MathFormula tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)" ariaLabel="f(x_j) < f(x_i)" />{' '}
        thì tính khoảng cách <MathFormula tex="r_{ij}" ariaLabel="r_ij" /> và lực
        hút <MathFormula tex="\beta" ariaLabel="beta" />.
      </>
    ),
    formulaTex: 'r_{ij} = \\|\\mathbf{x}_i - \\mathbf{x}_j\\|_2',
    formulaSecondTex: '\\beta(r_{ij}) = \\beta_0 e^{-\\gamma r_{ij}^2}',
    formulaAria: 'Khoang cach Euclid r_ij va do hap dan beta(r_ij)',
  },
  {
    idx: 3,
    code: '04',
    shortLabel: '04 Di chuyển & kẹp biên',
    fnName: 'move_and_clamp',
    title: 'Di chuyển & kẹp biên',
    desc: (
      <>
        Kéo <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> về phía{' '}
        <MathFormula tex="\mathbf{x}_j" ariaLabel="x_j" /> cộng nhiễu ngẫu
        nhiên, giữ trong{' '}
        <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" /> và
        cập nhật ngay độ sáng mới.
      </>
    ),
    formulaTex:
      '\\mathbf{x}_i \\leftarrow \\operatorname{clip}_{[\\mathbf{Lb},\\mathbf{Ub}]}\\!\\left(\\mathbf{x}_i + \\beta(r_{ij})(\\mathbf{x}_j - \\mathbf{x}_i) + \\alpha_t \\mathbf{S}\\boldsymbol{\\epsilon}_i\\right)',
    formulaAria: 'Cap nhat vi tri x_i va kep bien trong [Lb, Ub]',
  },
  {
    idx: 4,
    code: '05',
    shortLabel: '05 Giảm bước nhảy',
    fnName: 'update_alpha',
    title: (
      <>
        Giảm bước nhảy <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
      </>
    ),
    desc: (
      <>
        Cuối mỗi thế hệ, nhân <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />{' '}
        với <MathFormula tex="\theta" ariaLabel="theta" /> (thường lấy{' '}
        <MathFormula tex="0.97" ariaLabel="0.97" />) rồi xếp hạng tìm{' '}
        <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" />.
      </>
    ),
    formulaTex: '\\alpha_{t+1} = \\theta \\cdot \\alpha_t = \\alpha_0 \\theta^{t+1}',
    formulaSecondTex: '\\theta = 0.97',
    formulaAria: 'Giam dan buoc nhay ngau nhien alpha_(t+1) = alpha_0 * theta^(t+1)',
  },
];

interface PseudocodeLine {
  lineNo: string;
  indent: number;
  stepTag?: string;
  code: string;
}

const PSEUDOCODE_LINES: readonly PseudocodeLine[] = [
  {
    lineNo: '01',
    indent: 0,
    stepTag: 'B01',
    code: 'Khởi tạo ngẫu nhiên n đom đóm x_i ∈ [Lb, Ub] (i = 1..n)',
  },
  {
    lineNo: '02',
    indent: 0,
    stepTag: 'B02',
    code: 'Tính f(x_i) cho mọi cá thể; xác định nghiệm tốt nhất đầu tiên x*',
  },
  {
    lineNo: '03',
    indent: 0,
    code: 'for t = 1 to t_max do',
  },
  {
    lineNo: '04',
    indent: 1,
    stepTag: 'B03',
    code: 'for i = 1 to n do          // duyệt từng đom đóm nhận tín hiệu',
  },
  {
    lineNo: '05',
    indent: 2,
    stepTag: 'B03',
    code: 'for j = 1 to n do        // so sánh với mọi đom đóm j trong đàn',
  },
  {
    lineNo: '06',
    indent: 3,
    stepTag: 'B03',
    code: 'if f(x_j) < f(x_i) then   // j sáng hơn i (bài toán cực tiểu)',
  },
  {
    lineNo: '07',
    indent: 4,
    stepTag: 'B03',
    code: 'r_ij ← ||x_i − x_j||_2 ;  β ← β_0 · exp(−γ · r_ij²)',
  },
  {
    lineNo: '08',
    indent: 4,
    stepTag: 'B04',
    code: 'x_i ← clip(x_i + β(x_j − x_i) + α_t · S · ε_i, Lb, Ub)',
  },
  {
    lineNo: '09',
    indent: 4,
    stepTag: 'B02',
    code: 'Cập nhật lại ngay độ sáng f(x_i) tại vị trí vừa di chuyển',
  },
  {
    lineNo: '10',
    indent: 3,
    code: 'end if; end for; end for',
  },
  {
    lineNo: '11',
    indent: 1,
    stepTag: 'B05',
    code: 'α_{t+1} ← θ · α_t ;  Xếp hạng đàn và cập nhật nghiệm tốt nhất x*',
  },
  {
    lineNo: '12',
    indent: 0,
    code: 'end for; return x*, f(x*)',
  },
];

function PhaseMiniDiagram({ idx, active }: { idx: number; active: boolean }) {
  const strokeMain = active ? '#EFEFE8' : '#141513';
  const strokeSub = active ? 'rgba(239,239,232,0.42)' : 'rgba(20,21,19,0.55)';
  const accentFill = active ? '#C5E84D' : '#3A4620';
  const accentSoft = active ? '#B6C96E' : '#4A572A';

  if (idx === 0) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <rect
          x="18"
          y="8"
          width="204"
          height="56"
          rx="6"
          stroke={strokeSub}
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />
        {[
          [48, 26],
          [86, 48],
          [124, 22],
          [162, 44],
          [194, 28],
        ].map(([cx, cy], k) => (
          <g key={k}>
            {active && k === 2 ? (
              <circle
                cx={cx}
                cy={cy}
                r="11"
                stroke={accentFill}
                strokeOpacity="0.45"
                strokeWidth="1.4"
                className="phase-svg-halo"
              />
            ) : null}
            <circle
              cx={cx}
              cy={cy}
              r={k === 2 ? 6 : 4.2}
              fill={k === 2 ? accentFill : strokeMain}
            />
          </g>
        ))}
      </svg>
    );
  }
  if (idx === 1) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        {[16, 28, 42, 54].map((r, k) => (
          <ellipse
            key={r}
            cx="120"
            cy="36"
            rx={r * 1.65}
            ry={r * 0.54}
            stroke={k === 0 ? accentFill : strokeSub}
            strokeWidth={k === 0 ? 2.1 : 1.5}
            className={active ? 'phase-svg-iso-ring' : undefined}
            style={{ animationDelay: `${k * 160}ms` }}
          />
        ))}
        <circle cx="120" cy="36" r="5.5" fill={accentFill} />
      </svg>
    );
  }
  if (idx === 2) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <circle
          cx="172"
          cy="36"
          r="21"
          stroke={strokeSub}
          strokeWidth="1.7"
          strokeDasharray="4 3"
        />
        <path
          d="M54 52 Q112 22 162 36"
          stroke={accentFill}
          strokeWidth="2.2"
          className={active ? 'phase-svg-arc-draw' : undefined}
        />
        <circle cx="54" cy="52" r="4.6" fill={accentSoft} />
        <circle cx="172" cy="36" r="6.6" fill={accentFill} />
      </svg>
    );
  }
  if (idx === 3) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <line x1="186" y1="8" x2="186" y2="64" stroke={accentSoft} strokeWidth="2" />
        <path
          d="M56 52 L212 20"
          stroke={strokeSub}
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
        <path d="M56 52 L186 25" stroke={accentFill} strokeWidth="2.2" />
        <circle
          cx="186"
          cy="25"
          r="5.6"
          fill={accentFill}
          className={active ? 'phase-svg-clamp-glide' : undefined}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
      <line x1="24" y1="60" x2="216" y2="60" stroke={strokeSub} strokeWidth="1.8" />
      <path d="M24 14 Q92 52 216 58" stroke={accentFill} strokeWidth="2.2" />
      <circle cx="24" cy="14" r="4.2" fill={accentSoft} />
      <circle
        cx="216"
        cy="58"
        r="5.6"
        fill={accentFill}
        className={active ? 'phase-svg-cool-pulse' : undefined}
      />
    </svg>
  );
}

export function FlowchartTrackSection({
  reducedMotion,
  onOpenQa,
}: FlowchartTrackSectionProps) {
  const flowSectionRef = useRef<HTMLElement>(null);
  const pseudoSectionRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const formulaMathRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const prevPhaseRef = useRef<number>(0);
  const scrollDirRef = useRef<1 | -1>(1);

  const [activePhase, setActivePhase] = useState<number>(0);
  const [selectedPseudoLine, setSelectedPseudoLine] = useState<string | null>(null);

  useSectionReveal(flowSectionRef, reducedMotion);
  useSectionReveal(pseudoSectionRef, reducedMotion);

  // Pure native CSS `position: sticky` scroll tracker for `#so-do` ONLY
  useEffect(() => {
    if (reducedMotion) {
      segmentRefs.current.forEach((seg, k) => {
        if (seg) seg.style.transform = `scaleX(${k <= activePhase ? 1 : 0})`;
      });
      return;
    }

    const syncScroll = () => {
      const runway = runwayRef.current;
      if (!runway) return;

      if (window.innerWidth < 1024) {
        segmentRefs.current.forEach((seg, k) => {
          if (seg) seg.style.transform = `scaleX(${k <= prevPhaseRef.current ? 1 : 0})`;
        });
        return;
      }

      const rect = runway.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const rawProgress = Math.min(1, Math.max(0, -rect.top / scrollable));

      for (let k = 0; k < PHASES.length; k++) {
        const segEl = segmentRefs.current[k];
        if (!segEl) continue;
        const local = Math.min(1, Math.max(0, rawProgress * PHASES.length - k));
        segEl.style.transform = `scaleX(${local.toFixed(4)})`;
      }

      const nextIdx = Math.min(
        PHASES.length - 1,
        Math.max(0, Math.floor(rawProgress * PHASES.length))
      );

      if (nextIdx !== prevPhaseRef.current) {
        scrollDirRef.current = nextIdx > prevPhaseRef.current ? 1 : -1;
        prevPhaseRef.current = nextIdx;
        setActivePhase(nextIdx);
      }
    };

    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', syncScroll);
    return () => {
      window.removeEventListener('scroll', syncScroll);
      window.removeEventListener('resize', syncScroll);
    };
  }, [reducedMotion, activePhase]);

  // Directional kinetic formula transition when activePhase jumps
  useEffect(() => {
    if (reducedMotion) return;
    const mathEl = formulaMathRef.current;
    if (!mathEl) return;

    const dir = scrollDirRef.current;
    gsap.killTweensOf(mathEl);
    gsap.fromTo(
      mathEl,
      { y: dir * 13, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power3.out', overwrite: 'auto' }
    );
  }, [activePhase, reducedMotion]);

  const handleSelectPhase = useCallback(
    (idx: number) => {
      scrollDirRef.current = idx >= prevPhaseRef.current ? 1 : -1;
      prevPhaseRef.current = idx;
      setActivePhase(idx);

      const runway = runwayRef.current;
      if (runway && window.innerWidth >= 1024 && !reducedMotion) {
        const runwayTop = window.scrollY + runway.getBoundingClientRect().top;
        const scrollable = Math.max(0, runway.offsetHeight - window.innerHeight);
        const ratio =
          idx === 0
            ? 0.03
            : idx === PHASES.length - 1
              ? 0.92
              : (idx + 0.45) / PHASES.length;
        const targetY = runwayTop + ratio * scrollable;
        window.dispatchEvent(
          new CustomEvent('app:lenis-scroll', {
            detail: { top: targetY, duration: 0.52 },
          })
        );
      } else {
        segmentRefs.current.forEach((seg, k) => {
          if (seg) seg.style.transform = `scaleX(${k <= idx ? 1 : 0})`;
        });
      }
    },
    [reducedMotion]
  );

  const currentFormula = PHASES[activePhase] ?? PHASES[0];

  const getNodeStateClass = (idx: number): string => {
    if (activePhase === idx) return 'flowchart-node-btn--active';
    if (activePhase > idx) return 'flowchart-node-btn--done';
    return '';
  };

  return (
    <>
      {/* 2A. Sticky 5-Step Scrollytelling Flowchart Section (`#so-do`) */}
      <section
        id="so-do"
        ref={flowSectionRef}
        className="section-flowchart surface-light"
        data-surface="light"
        aria-labelledby="flowchart-heading"
      >
        <ContourBackdrop variant="light" />

        <div
          ref={runwayRef}
          className={!reducedMotion ? 'flowchart-scroll-runway' : 'flowchart-static-stage'}
        >
          <div
            className={!reducedMotion ? 'flowchart-sticky-stage' : 'flowchart-static-inner'}
          >
            <div className="section-container flowchart-stack">
              <div className="flowchart-header">
                <div>
                  <h2 id="flowchart-heading" tabIndex={-1} className="flowchart-title">
                    <span className="reveal-mask">
                      <span className="reveal-line">
                        Quy trình{' '}
                        <span className="editorial-serif editorial-serif--olive">
                          5 bước lặp chính
                        </span>
                      </span>
                    </span>
                  </h2>
                </div>

                <div className="flowchart-header__actions">
                  <button
                    type="button"
                    className="qa-text-link"
                    onClick={() => onOpenQa('comparison')}
                  >
                    Đối chiếu mã nguồn &amp; Q&amp;A →
                  </button>
                </div>
              </div>

              {/* Circuit Diagram: Step 01 outside loop -> Loop Frame [02 -> 03 -> Diamond f(x_j)<f(x_i)? -> 04/skip -> 05] -> Exit x* */}
              <div
                className="flowchart-circuit"
                role="group"
                aria-label="Sơ đồ mạch vòng lặp 5 bước của Thuật toán Đom đóm"
              >
                <div className="flowchart-circuit__entry">
                  <button
                    type="button"
                    aria-pressed={activePhase === 0}
                    className={`flowchart-node-btn ${getNodeStateClass(0)}`}
                    onClick={() => handleSelectPhase(0)}
                  >
                    <span className="flowchart-node-btn__dot" aria-hidden="true" />
                    01 Khởi tạo
                  </button>
                  <span
                    className={`flowchart-circuit__arrow ${
                      activePhase >= 1 ? 'flowchart-circuit__arrow--passed' : ''
                    }`}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>

                <div className="flowchart-loop-frame">
                  <span className="flowchart-loop-frame__tag">
                    Lặp <MathFormula tex="t = 1 \to t_{\max}" ariaLabel="t = 1 -> t_max" />
                  </span>

                  <div className="flowchart-loop-frame__row">
                    <button
                      type="button"
                      aria-pressed={activePhase === 1}
                      className={`flowchart-node-btn ${getNodeStateClass(1)}`}
                      onClick={() => handleSelectPhase(1)}
                    >
                      <span className="flowchart-node-btn__dot" aria-hidden="true" />
                      02 Tính độ sáng
                    </button>

                    <span
                      className={`flowchart-circuit__arrow ${
                        activePhase >= 2 ? 'flowchart-circuit__arrow--passed' : ''
                      }`}
                      aria-hidden="true"
                    >
                      →
                    </span>

                    <button
                      type="button"
                      aria-pressed={activePhase === 2}
                      className={`flowchart-node-btn ${getNodeStateClass(2)}`}
                      onClick={() => handleSelectPhase(2)}
                    >
                      <span className="flowchart-node-btn__dot" aria-hidden="true" />
                      03 So sánh cặp · <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />
                    </button>

                    <span
                      className={`flowchart-circuit__arrow ${
                        activePhase >= 2 ? 'flowchart-circuit__arrow--passed' : ''
                      }`}
                      aria-hidden="true"
                    >
                      →
                    </span>

                    {/* Branch Decision Node + True/False Paths */}
                    <div className="flowchart-branch-cluster">
                      <button
                        type="button"
                        className={`flowchart-diamond-btn ${
                          activePhase === 2 || activePhase === 3
                            ? 'flowchart-diamond-btn--active'
                            : activePhase > 3
                              ? 'flowchart-diamond-btn--done'
                              : ''
                        }`}
                        onClick={() => handleSelectPhase(3)}
                        title="Điều kiện rẽ nhánh: đom đóm j có sáng hơn i không?"
                      >
                        <span className="flowchart-diamond-btn__shape" aria-hidden="true">
                          ◇
                        </span>
                        <MathFormula
                          tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)?"
                          ariaLabel="f(x_j) < f(x_i)?"
                        />
                      </button>

                      <div className="flowchart-branch-paths">
                        <div className="flowchart-branch-true">
                          <span className="flowchart-branch-label flowchart-branch-label--true">
                            Đúng →
                          </span>
                          <button
                            type="button"
                            aria-pressed={activePhase === 3}
                            className={`flowchart-node-btn ${getNodeStateClass(3)}`}
                            onClick={() => handleSelectPhase(3)}
                          >
                            <span className="flowchart-node-btn__dot" aria-hidden="true" />
                            04 Di chuyển &amp; kẹp biên
                          </button>
                          <span
                            className={`flowchart-circuit__arrow ${
                              activePhase >= 4 ? 'flowchart-circuit__arrow--passed' : ''
                            }`}
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </div>

                        <div
                          className={`flowchart-branch-false ${
                            activePhase === 2 ? 'flowchart-branch-false--highlight' : ''
                          }`}
                          aria-hidden="true"
                        >
                          <span>↳ Sai: bỏ qua bước 04 ─────────↗</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-pressed={activePhase === 4}
                      className={`flowchart-node-btn ${getNodeStateClass(4)}`}
                      onClick={() => handleSelectPhase(4)}
                    >
                      <span className="flowchart-node-btn__dot" aria-hidden="true" />
                      05 Giảm bước nhảy <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
                    </button>
                  </div>

                  {/* Explicit Return Arrow from Step 05 back to Step 02 (NEVER back to Step 01!) */}
                  <div
                    className={`flowchart-return-rail ${
                      activePhase === 4 ? 'flowchart-return-rail--active' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 780 26"
                      preserveAspectRatio="none"
                      className="flowchart-return-rail__svg"
                    >
                      <path
                        d="M 748 3 V 19 H 42 V 5"
                        fill="none"
                        stroke="rgba(36, 40, 30, 0.28)"
                        strokeWidth="1.6"
                      />
                      {activePhase === 4 ? (
                        <path
                          d="M 748 3 V 19 H 42 V 5"
                          fill="none"
                          stroke="#24281E"
                          strokeWidth="2.4"
                          strokeDasharray="9 5"
                          className="flowchart-return-rail__flow"
                        />
                      ) : null}
                      <path
                        d="M 37 10 L 42 4 L 47 10"
                        fill="none"
                        stroke="#24281E"
                        strokeWidth={activePhase === 4 ? '2.4' : '1.6'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="flowchart-return-rail__caption">
                      Quay về Bước 02 khi{' '}
                      <MathFormula tex="t < t_{\max}" ariaLabel="t < t_max" /> (không
                      khởi tạo lại Bước 01)
                    </span>
                  </div>
                </div>

                <div className="flowchart-circuit__exit">
                  <span
                    className={`flowchart-circuit__arrow ${
                      activePhase === 4 ? 'flowchart-circuit__arrow--passed' : ''
                    }`}
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <span
                    className={`flowchart-exit-pill ${
                      activePhase === 4 ? 'flowchart-exit-pill--ready' : ''
                    }`}
                  >
                    Hết vòng → <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" />
                  </span>
                </div>
              </div>

              {/* Clean Formula Spotlight Bar + 5-Segment Scrubbed Progress Rail */}
              <div className="flowchart-formula-spotlight">
                <div className="flowchart-formula-spotlight__meta">
                  <span className="flowchart-formula-spotlight__badge">
                    BƯỚC {currentFormula.code} / 05
                  </span>
                  <code className="flowchart-formula-spotlight__fn">
                    {currentFormula.fnName}()
                  </code>
                </div>

                <div
                  ref={formulaMathRef}
                  className={`flowchart-formula-spotlight__math ${
                    currentFormula.formulaSecondTex
                      ? 'flowchart-formula-spotlight__math--pair'
                      : 'flowchart-formula-spotlight__math--single'
                  }`}
                >
                  <MathFormula
                    tex={currentFormula.formulaTex}
                    ariaLabel={currentFormula.formulaAria}
                  />
                  {currentFormula.formulaSecondTex ? (
                    <MathFormula tex={currentFormula.formulaSecondTex} />
                  ) : null}
                </div>

                <span className="flowchart-formula-spotlight__cue" aria-hidden="true">
                  {activePhase < PHASES.length - 1
                    ? `Cuộn tiếp → Bước 0${activePhase + 2}`
                    : 'Cuộn tiếp → Mã giả ↓'}
                </span>

                <div className="flowchart-step-segments" aria-hidden="true">
                  {PHASES.map((p, k) => (
                    <span key={p.code} className="flowchart-step-segments__track">
                      <span
                        ref={(el) => {
                          segmentRefs.current[k] = el;
                        }}
                        className={`flowchart-step-segments__fill ${
                          k === activePhase
                            ? 'flowchart-step-segments__fill--active'
                            : ''
                        }`}
                        style={{
                          transform: `scaleX(${k < activePhase ? 1 : k === activePhase ? 0.35 : 0})`,
                        }}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* 5-Column Full-Width Phase Grid (directional elevation + live animated mini-diagram!) */}
              <div className="flowchart-five-grid">
                {PHASES.map((p, idx) => {
                  const isActive = activePhase === idx;
                  const isDone = activePhase > idx;
                  return (
                    <article
                      key={p.code}
                      className={`phase-card ${
                        isActive
                          ? 'phase-card--active'
                          : isDone
                            ? 'phase-card--done'
                            : 'phase-card--upcoming'
                      }`}
                      onClick={() => handleSelectPhase(idx)}
                    >
                      <div>
                        <div className="phase-card__top">
                          <span className="phase-card__badge">
                            {isDone ? `✓ ${p.code}` : p.code}
                          </span>
                          <code className="phase-card__fn">{p.fnName}()</code>
                        </div>
                        <h3 className="phase-card__title">{p.title}</h3>
                        <p className="phase-card__desc">{p.desc}</p>
                      </div>

                      <PhaseMiniDiagram idx={idx} active={isActive} />
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2B. Standalone Static Pseudocode & Time Complexity Section (`#ma-gia`) — NO scroll-to-step lock! */}
      <section
        id="ma-gia"
        ref={pseudoSectionRef}
        className="section-pseudocode surface-light"
        data-surface="light"
        aria-labelledby="pseudocode-heading"
      >
        <ContourBackdrop variant="light" />

        <div className="section-container flowchart-stack">
          <div className="flowchart-header">
            <div>
              <h2 id="pseudocode-heading" tabIndex={-1} className="flowchart-title">
                <span className="reveal-mask">
                  <span className="reveal-line">
                    Mã giả{' '}
                    <span className="editorial-serif editorial-serif--olive">
                      &amp; độ phức tạp tính toán
                    </span>
                  </span>
                </span>
              </h2>
            </div>

            <div className="flowchart-header__actions">
              <button
                type="button"
                className="qa-text-link"
                onClick={() => onOpenQa('comparison')}
              >
                Đối chiếu mã Python thực tế →
              </button>
            </div>
          </div>

          <div className="flowchart-pseudocode-grid reveal-fade">
            <div
              className="flowchart-pseudocode-box"
              role="region"
              aria-label="Mã giả chuẩn của Thuật toán Đom đóm"
            >
              <div className="flowchart-pseudocode-box__head">
                <span>FIREFLY ALGORITHM (XIN-SHE YANG, 2008)</span>
                <span>12 dòng lệnh chuẩn · gắn nhãn bước B01–B05</span>
              </div>
              <ol className="flowchart-pseudocode-list">
                {PSEUDOCODE_LINES.map((ln) => {
                  const isSelected = selectedPseudoLine === ln.lineNo;
                  return (
                    <li
                      key={ln.lineNo}
                      className={`flowchart-pseudocode-line ${
                        isSelected ? 'flowchart-pseudocode-line--active' : ''
                      } flowchart-pseudocode-line--clickable`}
                      onClick={() =>
                        setSelectedPseudoLine((prev) =>
                          prev === ln.lineNo ? null : ln.lineNo
                        )
                      }
                    >
                      <span className="flowchart-pseudocode-line__num">
                        {ln.lineNo}
                      </span>
                      <span className="flowchart-pseudocode-line__tag">
                        {ln.stepTag ?? ''}
                      </span>
                      <code
                        className="flowchart-pseudocode-line__code"
                        style={{ paddingLeft: `${ln.indent * 1.15}rem` }}
                      >
                        {ln.code}
                      </code>
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside
              className="flowchart-spec-card"
              aria-label="Thông số đầu vào, đầu ra và độ phức tạp"
            >
              <div className="flowchart-spec-card__item">
                <span className="flowchart-spec-card__label">ĐẦU VÀO</span>
                <p>
                  Hàm mục tiêu <MathFormula tex="f(\mathbf{x})" ariaLabel="f(x)" />, miền{' '}
                  <MathFormula
                    tex="[\mathbf{Lb}, \mathbf{Ub}] \subset \mathbb{R}^d"
                    ariaLabel="[Lb, Ub] subset R^d"
                  />
                  , cỡ đàn <MathFormula tex="n" ariaLabel="n" />, tham số{' '}
                  <MathFormula
                    tex="\beta_0, \gamma, \alpha_0, \theta"
                    ariaLabel="beta_0, gamma, alpha_0, theta"
                  />{' '}
                  và số vòng <MathFormula tex="t_{\max}" ariaLabel="t_max" />.
                </p>
              </div>

              <div className="flowchart-spec-card__item">
                <span className="flowchart-spec-card__label">ĐẦU RA</span>
                <p>
                  Vị trí tốt nhất <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" /> và giá
                  trị tối ưu <MathFormula tex="f(\mathbf{x}^*)" ariaLabel="f(x*)" /> sau{' '}
                  <MathFormula tex="t_{\max}" ariaLabel="t_max" /> thế hệ.
                </p>
              </div>

              <div className="flowchart-spec-card__item">
                <span className="flowchart-spec-card__label">ĐỘ PHỨC TẠP THỜI GIAN</span>
                <div className="flowchart-spec-card__complexity">
                  <MathFormula
                    tex="\mathcal{O}(t_{\max} \cdot n^2 \cdot d)"
                    ariaLabel="O(t_max * n^2 * d)"
                  />
                </div>
                <p>
                  Hai vòng lặp lồng nhau duyệt qua mọi cặp{' '}
                  <MathFormula tex="(i, j)" ariaLabel="(i, j)" /> tốn{' '}
                  <MathFormula tex="n^2" ariaLabel="n^2" /> phép so sánh mỗi thế hệ (với{' '}
                  <MathFormula tex="n \approx 20\text{--}40" ariaLabel="n ~ 20-40" /> vẫn
                  chạy rất nhanh).
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

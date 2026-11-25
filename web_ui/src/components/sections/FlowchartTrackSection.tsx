import { useCallback, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { MathFormula } from '../shared/MathFormula';
import type { QaTabId } from '../shared/QaDrawer';

gsap.registerPlugin(ScrollTrigger);

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
        Rải ngẫu nhiên <MathFormula tex="n" ariaLabel="n" /> đom đóm trong miền
        tìm kiếm <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" />{' '}
        và gán các tham số ban đầu.
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
        Tính giá trị <MathFormula tex="f(\mathbf{x}_i)" ariaLabel="f(x_i)" /> tại
        mỗi vị trí; điểm có <MathFormula tex="f" ariaLabel="f" /> nhỏ hơn tương
        ứng với đom đóm sáng hơn.
      </>
    ),
    formulaTex: 'I_i \\propto \\frac{1}{f(\\mathbf{x}_i)} \\iff \\min_{\\mathbf{x}} f(\\mathbf{x}_i)',
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
        Duyệt hai vòng lặp <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />; nếu con{' '}
        <MathFormula tex="j" ariaLabel="j" /> sáng hơn (
        <MathFormula tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)" ariaLabel="f(x_j) < f(x_i)" />
        ) thì tính khoảng cách <MathFormula tex="r_{ij}" ariaLabel="r_ij" /> và
        lực hút <MathFormula tex="\beta" ariaLabel="beta" />.
      </>
    ),
    formulaTex: 'r_{ij} = \\|\\mathbf{x}_i - \\mathbf{x}_j\\|_2',
    formulaSecondTex: '\\beta(r_{ij}) = \\beta_0 e^{-\\gamma r_{ij}^2}',
    formulaAria: 'Khoang cach Euclid r_ij va do hap dan beta(r_ij)',
  },
  {
    idx: 3,
    code: '04',
    shortLabel: '04 Cập nhật vị trí',
    fnName: 'move_and_clamp',
    title: 'Di chuyển & giữ trong biên',
    desc: (
      <>
        Kéo <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> về phía{' '}
        <MathFormula tex="\mathbf{x}_j" ariaLabel="x_j" /> cộng thêm bước nhảy
        ngẫu nhiên, giữ tọa độ trong{' '}
        <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" /> và
        cập nhật nghiệm tốt nhất.
      </>
    ),
    formulaTex: '\\mathbf{x}_i \\leftarrow \\operatorname{clip}_{[\\mathbf{Lb},\\mathbf{Ub}]}\\!\\left(\\mathbf{x}_i + \\beta(r_{ij})(\\mathbf{x}_j - \\mathbf{x}_i) + \\alpha_t \\mathbf{S}\\boldsymbol{\\epsilon}_i\\right)',
    formulaAria: 'Cap nhat vi tri x_i va kep bien trong [Lb, Ub]',
  },
  {
    idx: 4,
    code: '05',
    shortLabel: '05 Giảm bước nhảy',
    fnName: 'update_alpha',
    title: (
      <>
        Giảm biên độ nhảy <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
      </>
    ),
    desc: (
      <>
        Sau mỗi vòng lặp, nhân <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />{' '}
        với hệ số <MathFormula tex="\theta" ariaLabel="theta" /> (thường chọn{' '}
        <MathFormula tex="0.97" ariaLabel="0.97" />) để đàn hội tụ ổn định về
        cuối.
      </>
    ),
    formulaTex: '\\alpha_{t+1} = \\theta \\cdot \\alpha_t = \\alpha_0 \\theta^{t+1}',
    formulaSecondTex: '\\theta = 0.97',
    formulaAria: 'Giam dan buoc nhay ngau nhien alpha_(t+1) = alpha_0 * theta^(t+1)',
  },
];

function PhaseMiniDiagram({ idx, active }: { idx: number; active: boolean }) {
  // Strictly 0% neon on Alabaster (#F3F2EC); botanical sage-gold / lime emerges ONLY inside dark #24281E active card
  const strokeMain = active ? '#EFEFE8' : '#24281E';
  const strokeSub = active ? 'rgba(239,239,232,0.26)' : 'rgba(20,21,19,0.22)';
  const accentFill = active ? '#C5E84D' : '#141513';
  const accentSoft = active ? '#B6C96E' : '#5F6358';

  if (idx === 0) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <rect x="18" y="8" width="204" height="56" rx="6" stroke={strokeSub} strokeDasharray="4 3" />
        {[
          [48, 26],
          [86, 48],
          [124, 22],
          [162, 44],
          [194, 28],
        ].map(([cx, cy], k) => (
          <circle
            key={k}
            cx={cx}
            cy={cy}
            r={k === 2 ? 5.6 : 3.8}
            fill={k === 2 ? accentFill : strokeMain}
          />
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
            strokeWidth={k === 0 ? 1.6 : 1.0}
          />
        ))}
        <circle cx="120" cy="36" r="5" fill={accentFill} />
      </svg>
    );
  }
  if (idx === 2) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <circle cx="172" cy="36" r="21" stroke={strokeSub} strokeDasharray="3 3" />
        <path d="M54 52 Q112 22 162 36" stroke={accentFill} strokeWidth="1.9" />
        <circle cx="54" cy="52" r="4.4" fill={accentSoft} />
        <circle cx="172" cy="36" r="6.4" fill={accentFill} />
      </svg>
    );
  }
  if (idx === 3) {
    return (
      <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
        <line x1="186" y1="8" x2="186" y2="64" stroke={accentSoft} strokeWidth="1.5" />
        <path d="M56 52 L212 20" stroke={strokeSub} strokeWidth="1.4" strokeDasharray="4 3" />
        <path d="M56 52 L186 25" stroke={accentFill} strokeWidth="2" />
        <circle cx="186" cy="25" r="5.4" fill={accentFill} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 72" className="phase-card__diagram" aria-hidden="true" fill="none">
      <line x1="24" y1="60" x2="216" y2="60" stroke={strokeSub} />
      <path d="M24 14 Q92 52 216 58" stroke={accentFill} strokeWidth="2" />
      <circle cx="24" cy="14" r="3.8" fill={accentSoft} />
      <circle cx="216" cy="58" r="5.2" fill={accentFill} />
    </svg>
  );
}

export function FlowchartTrackSection({
  reducedMotion,
  onOpenQa,
}: FlowchartTrackSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinShellRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [activePhase, setActivePhase] = useState<number>(0);

  useSectionReveal(sectionRef, reducedMotion);

  useGSAP(
    () => {
      const shell = pinShellRef.current;
      const track = trackRef.current;
      if (!shell || !track || reducedMotion) {
        stRef.current = null;
        if (track) gsap.set(track, { clearProps: 'transform' });
        return;
      }

      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const getMaxShift = () => {
          const parentW = track.parentElement?.clientWidth ?? window.innerWidth;
          return Math.max(0, track.scrollWidth - parentW + 64);
        };

        const tween = gsap.to(track, {
          x: () => -getMaxShift(),
          ease: 'none',
          scrollTrigger: {
            trigger: shell,
            pin: true,
            anticipatePin: 1,
            start: 'top top',
            end: () => `+=${Math.max(820, getMaxShift() * 1.45)}`,
            scrub: 0.9,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const idx = Math.min(
                PHASES.length - 1,
                Math.max(0, Math.round(self.progress * (PHASES.length - 1)))
              );
              setActivePhase((prev) => (prev === idx ? prev : idx));
              if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${self.progress.toFixed(3)})`;
              }
            },
          },
        });

        stRef.current = tween.scrollTrigger ?? null;
        return () => {
          stRef.current = null;
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  const handleJumpPhase = useCallback((idx: number) => {
    setActivePhase(idx);
    const st = stRef.current;
    if (st && st.isActive !== undefined) {
      const targetScroll =
        st.start + (idx / (PHASES.length - 1)) * (st.end - st.start);
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, []);

  const currentFormula = PHASES[activePhase] ?? PHASES[0];

  return (
    <section
      id="so-do"
      ref={sectionRef}
      className="section-flowchart surface-light"
      data-surface="light"
      aria-labelledby="flowchart-heading"
    >
      <ContourBackdrop variant="light" />

      <div ref={pinShellRef} className="flowchart-pin-shell">
        <div
          className="section-container"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
        >
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

            <button
              type="button"
              className="qa-text-link"
              onClick={() => onOpenQa('comparison')}
            >
              Đối chiếu mã nguồn &amp; Q&amp;A →
            </button>
          </div>

          <div
            className="flowchart-rail-bar"
            role="group"
            aria-label="Quy trình năm bước lặp"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div className="flowchart-nodes">
              {PHASES.map((p, i) => (
                <span
                  key={p.code}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={activePhase === i}
                    className={`flowchart-node-btn ${
                      activePhase === i ? 'flowchart-node-btn--active' : ''
                    }`}
                    onClick={() => handleJumpPhase(i)}
                  >
                    {p.shortLabel}
                  </button>
                  {i < PHASES.length - 1 ? (
                    <span className="flowchart-node-arrow" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </div>

            <span className="flowchart-loop-pill">
              <svg
                width="18"
                height="12"
                viewBox="0 0 20 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 6 H3 M3 6 L7 2 M3 6 L7 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Lặp <MathFormula tex="t < t_{\max}" ariaLabel="t < t_max" />
            </span>

            <div
              ref={progressBarRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '2px',
                background: '#24281E',
                transformOrigin: 'left center',
                transform: `scaleX(${(activePhase / (PHASES.length - 1)).toFixed(2)})`,
                transition: 'transform 0.2s ease-out',
              }}
            />
          </div>

          <div className="flowchart-formula-spotlight">
            <span className="flowchart-formula-spotlight__badge">
              Bước {currentFormula.code}
            </span>
            <div
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
          </div>
        </div>

        <div className="flowchart-track-viewport">
          <div ref={trackRef} className="flowchart-track">
            {PHASES.map((p, idx) => {
              const isActive = activePhase === idx;
              return (
                <article
                  key={p.code}
                  className={`phase-card ${
                    isActive ? 'phase-card--active' : 'phase-card--receded'
                  }`}
                  onClick={() => setActivePhase(idx)}
                >
                  <div>
                    <div className="phase-card__top">
                      <span className="phase-card__badge">{p.code}</span>
                      <code className="phase-card__fn">{p.fnName}()</code>
                    </div>
                    <h3
                      className="phase-card__title"
                      style={{ marginTop: '0.75rem' }}
                    >
                      {p.title}
                    </h3>
                    <p className="phase-card__desc">{p.desc}</p>
                  </div>

                  <PhaseMiniDiagram idx={idx} active={isActive} />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

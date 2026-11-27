import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BlockReveal } from '../shared/BlockReveal';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { LandoSignatureFlourish } from '../shared/LandoSignatureFlourish';
import { MathFormula } from '../shared/MathFormula';

gsap.registerPlugin(ScrollTrigger);

export interface FlowchartTrackSectionProps {
  reducedMotion: boolean;
}

interface PhaseItem {
  idx: number;
  code: string;
  mapTitle: string;
  mapSub: ReactNode;
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
    mapTitle: 'Khởi tạo đàn ban đầu',
    mapSub: (
      <>
        Rải đều <MathFormula tex="n" ariaLabel="n" /> cá thể trong{' '}
        <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" />
      </>
    ),
    fnName: 'init_population',
    title: 'Khởi tạo ngẫu nhiên quần thể đom đóm',
    desc: (
      <>
        Phân bố ngẫu nhiên <MathFormula tex="n" ariaLabel="n" /> đom đóm trên toàn
        miền tìm kiếm <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}] \subset \mathbb{R}^d" ariaLabel="[Lb, Ub]" />{' '}
        và khởi gán bộ tham số <MathFormula tex="\beta_0, \gamma, \alpha_0, \theta" ariaLabel="beta_0, gamma, alpha_0, theta" />.
      </>
    ),
    formulaTex: '\\mathbf{x}_i^0 \\sim \\mathcal{U}(\\mathbf{Lb}, \\mathbf{Ub})',
    formulaSecondTex: 'i = 1, \\dots, n',
    formulaAria: 'x_i^0 phan bo deu tren [Lb, Ub]',
  },
  {
    idx: 1,
    code: '02',
    mapTitle: 'Tính độ sáng từng cá thể',
    mapSub: (
      <>
        Đánh giá <MathFormula tex="f(\mathbf{x}_i)" ariaLabel="f(x_i)" /> trên toàn đàn
      </>
    ),
    fnName: 'problem.evaluate',
    title: 'Đánh giá hàm mục tiêu & cường độ sáng',
    desc: (
      <>
        Tính giá trị <MathFormula tex="f(\mathbf{x}_i)" ariaLabel="f(x_i)" /> tại vị trí
        của từng đom đóm. Trong bài toán cực tiểu hóa,{' '}
        <MathFormula tex="f(\mathbf{x}_i)" ariaLabel="f(x_i)" /> càng nhỏ thì cá thể
        đó phát sáng càng mạnh.
      </>
    ),
    formulaTex:
      'I_i \\propto \\frac{1}{f(\\mathbf{x}_i)} \\iff \\min_{\\mathbf{x}} f(\\mathbf{x}_i)',
    formulaAria: 'Cuong do sang I_i gan voi cuc tieu hoa f(x_i)',
  },
  {
    idx: 2,
    code: '03',
    mapTitle: 'So sánh mọi cặp đom đóm (i, j)',
    mapSub: (
      <>
        Duyệt 2 vòng lặp lồng nhau <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />
      </>
    ),
    fnName: 'move_firefly_pair',
    title: (
      <>
        Đối chiếu độ sáng từng cặp <MathFormula tex="(i, j)" ariaLabel="(i, j)" />
      </>
    ),
    desc: (
      <>
        Với mỗi cặp <MathFormula tex="(i, j)" ariaLabel="(i, j)" />, nếu đom đóm{' '}
        <MathFormula tex="j" ariaLabel="j" /> sáng hơn (
        <MathFormula tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)" ariaLabel="f(x_j) < f(x_i)" />
        ) thì tính khoảng cách Euclid <MathFormula tex="r_{ij}" ariaLabel="r_ij" /> và
        lực hấp dẫn <MathFormula tex="\beta(r_{ij})" ariaLabel="beta(r_ij)" />.
      </>
    ),
    formulaTex: 'r_{ij} = \\|\\mathbf{x}_i - \\mathbf{x}_j\\|_2',
    formulaSecondTex: '\\beta(r_{ij}) = \\beta_0 e^{-\\gamma r_{ij}^2}',
    formulaAria: 'Khoang cach Euclid r_ij va do hap dan beta(r_ij)',
  },
  {
    idx: 3,
    code: '04',
    mapTitle: 'Di chuyển về con sáng hơn & kẹp biên',
    mapSub: (
      <>
        Chỉ thực hiện khi <MathFormula tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)" ariaLabel="f(x_j) < f(x_i)" />
      </>
    ),
    fnName: 'find_limits',
    title: 'Dịch chuyển kết hợp nhiễu & giữ trong biên',
    desc: (
      <>
        Kéo <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> bay về phía{' '}
        <MathFormula tex="\mathbf{x}_j" ariaLabel="x_j" /> cộng bước nhiễu ngẫu nhiên,
        kẹp tọa độ trong <MathFormula tex="[\mathbf{Lb}, \mathbf{Ub}]" ariaLabel="[Lb, Ub]" />{' '}
        rồi cập nhật lại ngay độ sáng mới.
      </>
    ),
    formulaTex:
      '\\mathbf{x}_i \\leftarrow \\operatorname{clip}_{[\\mathbf{Lb},\\mathbf{Ub}]}\\!\\left(\\mathbf{x}_i + \\beta(r_{ij})(\\mathbf{x}_j - \\mathbf{x}_i) + \\alpha_t \\mathbf{S}\\boldsymbol{\\epsilon}_i\\right)',
    formulaAria: 'Cap nhat vi tri x_i va kep bien trong [Lb, Ub]',
  },
  {
    idx: 4,
    code: '05',
    mapTitle: 'Xếp hạng đàn & làm nguội bước nhảy',
    mapSub: (
      <>
        Hạ <MathFormula tex="\alpha_t = \alpha_0 \theta^t" ariaLabel="alpha_t = alpha_0 * theta^t" /> đầu vòng &amp; xếp hạng{' '}
        <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" /> cuối vòng
      </>
    ),
    fnName: 'rank_fireflies',
    title: (
      <>
        Xếp hạng đàn &amp; hạ bước nhảy <MathFormula tex="\alpha_t" ariaLabel="alpha_t" />
      </>
    ),
    desc: (
      <>
        Đầu mỗi thế hệ <MathFormula tex="t" ariaLabel="t" />,{' '}
        <code>update_alpha()</code> hạ biên độ nhiễu theo{' '}
        <MathFormula tex="\alpha_t = \alpha_0 \theta^t" ariaLabel="alpha_t = alpha_0 * theta^t" />{' '}
        (<MathFormula tex="\theta \approx 0.97" ariaLabel="theta ~ 0.97" />); cuối
        thế hệ, <code>rank_fireflies()</code> sắp xếp lại đàn và lưu nghiệm tốt nhất{' '}
        <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" />.
      </>
    ),
    formulaTex: '\\alpha_t = \\alpha_0 \\theta^t',
    formulaSecondTex: '\\theta = 0.97',
    formulaAria: 'Giam dan buoc nhay ngau nhien alpha_t = alpha_0 * theta^t',
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
    code: 'ns, Lightn ← init_population(n, problem)      // khởi tạo n đom đóm trong [Lb, Ub]',
  },
  {
    lineNo: '02',
    indent: 0,
    stepTag: 'B02',
    code: 'ns, Lightn, nbest, fbest ← rank_fireflies(ns, Lightn)',
  },
  {
    lineNo: '03',
    indent: 0,
    code: 'for t = 1 to t_max do',
  },
  {
    lineNo: '04',
    indent: 1,
    stepTag: 'B05',
    code: 'α ← update_alpha(α)                          // α_t = α_0 · θ^t ở đầu thế hệ t',
  },
  {
    lineNo: '05',
    indent: 1,
    stepTag: 'B03',
    code: 'for i = 1 to n do',
  },
  {
    lineNo: '06',
    indent: 2,
    stepTag: 'B03',
    code: 'for j = 1 to n do',
  },
  {
    lineNo: '07',
    indent: 3,
    stepTag: 'B03',
    code: 'if Lightn[j] < Lightn[i] then               // j sáng hơn i (bài toán cực tiểu)',
  },
  {
    lineNo: '08',
    indent: 4,
    stepTag: 'B03',
    code: 'new_pos ← move_firefly_pair(ns[i], ns[j], α, β_0, γ, scale)',
  },
  {
    lineNo: '09',
    indent: 4,
    stepTag: 'B04',
    code: 'ns[i] ← find_limits(new_pos, Lb, Ub) ; Lightn[i] ← problem.evaluate(ns[i])',
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
    code: 'ns, Lightn, nbest, fbest ← rank_fireflies(ns, Lightn)',
  },
  {
    lineNo: '12',
    indent: 0,
    code: 'end for; return nbest, fbest',
  },
];

function SpotlightIllustration({ idx, active }: { idx: number; active: boolean }) {
  const strokeSub = 'rgba(239, 239, 232, 0.28)';
  const strokeMain = '#EFEFE8';
  const lime = '#C5E84D';
  const sage = '#B6C96E';

  if (idx === 0) {
    return (
      <svg viewBox="0 0 520 124" className="spotlight-card__svg" aria-hidden="true" fill="none">
        <rect
          x="24"
          y="14"
          width="472"
          height="96"
          rx="8"
          stroke={strokeSub}
          strokeWidth="1.6"
          strokeDasharray="6 4"
        />
        <text x="38" y="34" fill={sage} fontSize="11" fontFamily="var(--font-mono)">
          Lb
        </text>
        <text x="466" y="100" fill={sage} fontSize="11" fontFamily="var(--font-mono)">
          Ub
        </text>
        {[
          [94, 48],
          [168, 84],
          [258, 38],
          [342, 78],
          [416, 46],
          [212, 62],
          [378, 36],
        ].map(([cx, cy], k) => (
          <g key={k}>
            {active && k === 2 ? (
              <circle
                cx={cx}
                cy={cy}
                r="16"
                stroke={lime}
                strokeOpacity="0.5"
                strokeWidth="1.6"
                className="phase-svg-halo"
              />
            ) : null}
            <circle cx={cx} cy={cy} r={k === 2 ? 7.5 : 5} fill={k === 2 ? lime : strokeMain} />
          </g>
        ))}
      </svg>
    );
  }

  if (idx === 1) {
    return (
      <svg viewBox="0 0 520 124" className="spotlight-card__svg" aria-hidden="true" fill="none">
        {[24, 46, 72, 98].map((r, k) => (
          <ellipse
            key={r}
            cx="260"
            cy="62"
            rx={r * 2.15}
            ry={r * 0.52}
            stroke={k === 0 ? lime : strokeSub}
            strokeWidth={k === 0 ? 2.2 : 1.4}
            className={active ? 'phase-svg-iso-ring' : undefined}
            style={{ animationDelay: `${k * 160}ms` }}
          />
        ))}
        <circle cx="260" cy="62" r="8" fill={lime} />
        <circle cx="146" cy="78" r="4.8" fill={strokeMain} fillOpacity="0.65" />
        <circle cx="382" cy="46" r="4.8" fill={strokeMain} fillOpacity="0.65" />
        <text x="276" y="58" fill={lime} fontSize="11.5" fontFamily="var(--font-mono)">
          f(x) nhỏ nhất → Sáng nhất
        </text>
      </svg>
    );
  }

  if (idx === 2) {
    return (
      <svg viewBox="0 0 520 124" className="spotlight-card__svg" aria-hidden="true" fill="none">
        <circle
          cx="376"
          cy="58"
          r="38"
          stroke={sage}
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeDasharray="5 4"
        />
        <path
          d="M124 86 Q246 26 364 58"
          stroke={lime}
          strokeWidth="2.6"
          className={active ? 'phase-svg-arc-draw' : undefined}
        />
        <circle cx="124" cy="86" r="6" fill={strokeMain} />
        <circle cx="376" cy="58" r="8.5" fill={lime} />
        <text x="108" y="108" fill={strokeMain} fontSize="11" fontFamily="var(--font-mono)">
          x_i (mờ hơn)
        </text>
        <text x="344" y="112" fill={lime} fontSize="11" fontFamily="var(--font-mono)">
          x_j (sáng hơn)
        </text>
        <text x="218" y="42" fill={sage} fontSize="11" fontFamily="var(--font-mono)">
          r_ij , β(r_ij)
        </text>
      </svg>
    );
  }

  if (idx === 3) {
    return (
      <svg viewBox="0 0 520 124" className="spotlight-card__svg" aria-hidden="true" fill="none">
        <line x1="398" y1="12" x2="398" y2="112" stroke={sage} strokeWidth="2.2" />
        <text x="408" y="30" fill={sage} fontSize="11" fontFamily="var(--font-mono)">
          Biên Ub
        </text>
        <path
          d="M108 92 L456 28"
          stroke={strokeSub}
          strokeWidth="1.8"
          strokeDasharray="5 4"
        />
        <path d="M108 92 L398 39" stroke={lime} strokeWidth="2.6" />
        <circle cx="108" cy="92" r="5.5" fill={strokeMain} />
        <circle
          cx="398"
          cy="39"
          r="7.5"
          fill={lime}
          className={active ? 'phase-svg-clamp-glide' : undefined}
        />
        <text x="216" y="86" fill={lime} fontSize="11" fontFamily="var(--font-mono)">
          clip(x_i mới, Lb, Ub)
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 520 124" className="spotlight-card__svg" aria-hidden="true" fill="none">
      <line x1="48" y1="98" x2="472" y2="98" stroke={strokeSub} strokeWidth="1.6" />
      <path d="M56 24 Q196 86 464 94" stroke={lime} strokeWidth="2.6" />
      <circle cx="56" cy="24" r="5.5" fill={sage} />
      <circle
        cx="464"
        cy="94"
        r="7.5"
        fill={lime}
        className={active ? 'phase-svg-cool-pulse' : undefined}
      />
      <text x="68" y="26" fill={sage} fontSize="11" fontFamily="var(--font-mono)">
        α₀ (đầu quá trình)
      </text>
      <text x="336" y="82" fill={lime} fontSize="11" fontFamily="var(--font-mono)">
        α_t = α₀·0.97^t → 0
      </text>
    </svg>
  );
}

export function FlowchartTrackSection({
  reducedMotion,
}: FlowchartTrackSectionProps) {
  const flowSectionRef = useRef<HTMLElement>(null);
  const pseudoSectionRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const deckStageRef = useRef<HTMLDivElement>(null);
  const spineFillRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const prevPhaseRef = useRef<number>(0);
  const lastAnimatedPhaseRef = useRef<number>(0);

  const [activePhase, setActivePhase] = useState<number>(0);
  const [selectedPseudoLine, setSelectedPseudoLine] = useState<string | null>(null);

  // Scroll-threshold step tracker + smooth vertical spine fill (`#so-do`) — ZERO scroll layout thrashing!
  useEffect(() => {
    if (reducedMotion) {
      if (spineFillRef.current) {
        spineFillRef.current.style.transform = `scaleY(${((activePhase + 1) / PHASES.length).toFixed(3)})`;
      }
    }
  }, [reducedMotion, activePhase]);

  useEffect(() => {
    if (reducedMotion) return;

    let cachedTop = 0;
    let cachedScrollable = 1;
    let isDesktopSticky = false;

    const measureRunway = () => {
      const runway = runwayRef.current;
      isDesktopSticky = Boolean(
        runway && window.innerWidth >= 1024 && window.innerHeight > 560
      );
      if (!runway || !isDesktopSticky) return;
      const rect = runway.getBoundingClientRect();
      cachedTop = window.scrollY + rect.top;
      cachedScrollable = Math.max(1, rect.height - window.innerHeight);
    };

    const syncScroll = () => {
      if (!isDesktopSticky) return;
      const sy = window.scrollY;
      // Skip DOM writes completely when far outside the runway
      if (sy < cachedTop - window.innerHeight || sy > cachedTop + cachedScrollable + window.innerHeight) {
        return;
      }

      const rawProgress = Math.min(1, Math.max(0, (sy - cachedTop) / cachedScrollable));

      if (spineFillRef.current) {
        spineFillRef.current.style.transform = `scaleY(${Math.max(0.08, rawProgress).toFixed(4)})`;
      }

      // 5 discrete zones [0..1) with hysteresis so cards NEVER freeze mid-way ("lưng chừng")
      const band = rawProgress * PHASES.length;
      const cur = prevPhaseRef.current;
      let nextIdx = cur;
      if (band >= cur + 1.06 && cur < PHASES.length - 1) {
        nextIdx = Math.min(PHASES.length - 1, Math.floor(band));
      } else if (band <= cur - 0.06 && cur > 0) {
        nextIdx = Math.max(0, Math.floor(band));
      }

      if (nextIdx !== cur) {
        prevPhaseRef.current = nextIdx;
        setActivePhase(nextIdx);
      }
    };

    const onResize = () => {
      measureRunway();
      syncScroll();
    };

    measureRunway();
    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion]);

  // Discrete GSAP 3D Deck Choreography: Always completes to 100% crisp, solid resting pose!
  useGSAP(
    () => {
      const cards = cardRefs.current.filter((c): c is HTMLElement => c !== null);
      if (cards.length === 0) return;

      if (reducedMotion || window.innerWidth < 1024 || window.innerHeight <= 560) {
        cards.forEach((el) => {
          gsap.set(el, {
            clearProps: 'transform,opacity,visibility,zIndex,pointerEvents',
          });
        });
        lastAnimatedPhaseRef.current = activePhase;
        return;
      }

      const prevIdx = lastAnimatedPhaseRef.current;
      const isInitial = prevIdx === activePhase;
      const goingForward = activePhase > prevIdx;

      cards.forEach((el, k) => {
        if (k === activePhase) {
          gsap.set(el, { zIndex: 30, pointerEvents: 'auto' });
          if (isInitial) {
            gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
          } else if (goingForward) {
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 38, scale: 0.965 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.48,
                ease: 'expo.out',
                overwrite: 'auto',
              }
            );
          } else {
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.46,
              ease: 'expo.out',
              overwrite: 'auto',
            });
          }
        } else if (k < activePhase) {
          const depth = activePhase - k;
          if (depth <= 2) {
            gsap.to(el, {
              autoAlpha: 1,
              y: -depth * 10,
              scale: 1 - depth * 0.032,
              zIndex: 30 - depth,
              pointerEvents: 'none',
              duration: isInitial ? 0 : 0.46,
              ease: 'expo.out',
              overwrite: 'auto',
            });
          } else {
            gsap.to(el, {
              autoAlpha: 0,
              y: -34,
              scale: 0.9,
              zIndex: 20 - depth,
              pointerEvents: 'none',
              duration: isInitial ? 0 : 0.3,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }
        } else {
          if (!isInitial && k === prevIdx && !goingForward) {
            gsap.to(el, {
              autoAlpha: 0,
              y: 36,
              scale: 0.965,
              zIndex: 34,
              pointerEvents: 'none',
              duration: 0.36,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          } else {
            gsap.set(el, {
              autoAlpha: 0,
              y: 38,
              scale: 0.965,
              zIndex: 10,
              pointerEvents: 'none',
            });
          }
        }
      });

      lastAnimatedPhaseRef.current = activePhase;
    },
    { scope: deckStageRef, dependencies: [activePhase, reducedMotion] }
  );

  // GSAP ScrollTrigger Staggered Entrance for Standalone Pseudocode Section (`#ma-gia`)
  useGSAP(
    () => {
      const sec = pseudoSectionRef.current;
      if (!sec || reducedMotion) return;

      const lines = sec.querySelectorAll<HTMLElement>('.flowchart-pseudocode-line');
      if (lines.length > 0) {
        gsap.fromTo(
          lines,
          { x: -16, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.55,
            stagger: 0.035,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 78%',
              once: true,
            },
          }
        );
      }

      const specItems = sec.querySelectorAll<HTMLElement>('.flowchart-spec-card__item');
      if (specItems.length > 0) {
        gsap.fromTo(
          specItems,
          { y: 22, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.68,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 76%',
              once: true,
            },
          }
        );
      }
    },
    { scope: pseudoSectionRef, dependencies: [reducedMotion] }
  );

  const handleSelectPhase = useCallback(
    (idx: number) => {
      prevPhaseRef.current = idx;
      setActivePhase(idx);

      const runway = runwayRef.current;
      if (
        runway &&
        window.innerWidth >= 1024 &&
        window.innerHeight > 560 &&
        !reducedMotion
      ) {
        const runwayTop = window.scrollY + runway.getBoundingClientRect().top;
        const scrollable = Math.max(0, runway.offsetHeight - window.innerHeight);
        const ratio =
          idx === 0
            ? 0.02
            : idx === PHASES.length - 1
              ? 0.96
              : (idx + 0.5) / PHASES.length;
        const targetY = runwayTop + ratio * scrollable;
        window.dispatchEvent(
          new CustomEvent('app:lenis-scroll', {
            detail: { top: targetY, duration: 0.62 },
          })
        );
      } else {
        const cardEl = cardRefs.current[idx];
        cardEl?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    },
    [reducedMotion]
  );

  return (
    <div className="flowchart-continuum surface-light">
      <ContourBackdrop variant="light" />

      {/* 2A. Split Sticky 5-Step Scrollytelling Section (`#so-do`) */}
      <section
        id="so-do"
        ref={flowSectionRef}
        className="section-flowchart surface-light"
        data-surface="light"
        aria-labelledby="flowchart-heading"
      >
        <div
          ref={runwayRef}
          className={!reducedMotion ? 'flowchart-scroll-runway' : 'flowchart-static-stage'}
        >
          <div
            className={!reducedMotion ? 'flowchart-sticky-stage' : 'flowchart-static-inner'}
          >
            <div className="section-container flowchart-stack">
              <div className="flowchart-header">
                <div className="flowchart-header__titles">
                  <h2 id="flowchart-heading" tabIndex={-1} className="flowchart-title">
                    <BlockReveal color="olive-lime" reducedMotion={reducedMotion}>
                      Quy trình{' '}
                      <span className="editorial-serif editorial-serif--olive">
                        5 bước lặp chính
                      </span>
                    </BlockReveal>
                  </h2>
                </div>

                <div className="flowchart-header__actions">
                  <div className="flowchart-live-counter" aria-live="polite">
                    <span className="flowchart-live-counter__cur">
                      0{activePhase + 1}
                    </span>
                    <span className="flowchart-live-counter__tot">/ 05</span>
                  </div>
                </div>
              </div>

              {/* Split 2-Column Stage: Left Vertical Flowchart Map | Right Scrubbed 3D Card Stack */}
              <div className="flowchart-split-stage">
                {/* LEFT: Crystal-Clear Vertical Flowchart Map + Continuous Scrubbed Spine */}
                <div
                  className="flowchart-vmap"
                  role="group"
                  aria-label="Sơ đồ khối dọc 5 bước của Thuật toán Đom đóm"
                >
                  <div className="flowchart-vmap__rail" aria-hidden="true">
                    <div ref={spineFillRef} className="flowchart-vmap__rail-fill" />
                  </div>

                  {/* Step 01: Outside Loop */}
                  <button
                    type="button"
                    aria-pressed={activePhase === 0}
                    className={`flowchart-vstep ${
                      activePhase === 0
                        ? 'flowchart-vstep--active'
                        : activePhase > 0
                          ? 'flowchart-vstep--done'
                          : ''
                    }`}
                    onClick={() => handleSelectPhase(0)}
                  >
                    <span className="flowchart-vstep__num">
                      {activePhase > 0 ? '✓' : '01'}
                    </span>
                    <div className="flowchart-vstep__copy">
                      <strong>{PHASES[0].mapTitle}</strong>
                      <span>{PHASES[0].mapSub}</span>
                    </div>
                    <span className="flowchart-vstep__tag">Ngoài vòng lặp</span>
                  </button>

                  {/* Loop Box: Steps 02 -> 05 + Condition Diamond + Return Rail */}
                  <div className="flowchart-vloop-box">
                    <div className="flowchart-vloop-box__header">
                      <span className="flowchart-vloop-box__badge">
                        VÒNG LẶP <MathFormula tex="t = 1 \to t_{\max}" ariaLabel="t = 1 -> t_max" />
                      </span>
                      <span className="flowchart-vloop-box__return">
                        ↺ Lặp Bước 02 → 05 khi{' '}
                        <MathFormula tex="t < t_{\max}" ariaLabel="t < t_max" />
                      </span>
                    </div>

                    {[1, 2].map((stepIdx) => {
                      const p = PHASES[stepIdx];
                      const isAct = activePhase === stepIdx;
                      const isDone = activePhase > stepIdx;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          aria-pressed={isAct}
                          className={`flowchart-vstep ${
                            isAct
                              ? 'flowchart-vstep--active'
                              : isDone
                                ? 'flowchart-vstep--done'
                                : ''
                          }`}
                          onClick={() => handleSelectPhase(stepIdx)}
                        >
                          <span className="flowchart-vstep__num">
                            {isDone ? '✓' : p.code}
                          </span>
                          <div className="flowchart-vstep__copy">
                            <strong>{p.mapTitle}</strong>
                            <span>{p.mapSub}</span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Explicit Branch Condition Strip between Step 03 and Step 04 */}
                    <div
                      className={`flowchart-vbranch ${
                        activePhase === 2 || activePhase === 3
                          ? 'flowchart-vbranch--active'
                          : ''
                      }`}
                    >
                      <span className="flowchart-vbranch__diamond">
                        ◇ <MathFormula tex="f(\mathbf{x}_j) < f(\mathbf{x}_i)?" ariaLabel="f(x_j) < f(x_i)?" />
                      </span>
                      <span className="flowchart-vbranch__yes">Đúng ↓ qua Bước 04</span>
                      <span className="flowchart-vbranch__no">Sai ↷ giữ nguyên, cặp kế</span>
                    </div>

                    {[3, 4].map((stepIdx) => {
                      const p = PHASES[stepIdx];
                      const isAct = activePhase === stepIdx;
                      const isDone = activePhase > stepIdx;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          aria-pressed={isAct}
                          className={`flowchart-vstep ${
                            isAct
                              ? 'flowchart-vstep--active'
                              : isDone
                                ? 'flowchart-vstep--done'
                                : ''
                          }`}
                          onClick={() => handleSelectPhase(stepIdx)}
                        >
                          <span className="flowchart-vstep__num">
                            {isDone ? '✓' : p.code}
                          </span>
                          <div className="flowchart-vstep__copy">
                            <strong>{p.mapTitle}</strong>
                            <span>{p.mapSub}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Loop Exit */}
                  <div
                    className={`flowchart-vexit ${
                      activePhase === 4 ? 'flowchart-vexit--ready' : ''
                    }`}
                  >
                    <span>↳ Khi đủ</span>
                    <MathFormula tex="t = t_{\max}" ariaLabel="t = t_max" />
                    <span>→ Xuất nghiệm tối ưu</span>
                    <MathFormula tex="\mathbf{x}^*, f(\mathbf{x}^*)" ariaLabel="x*, f(x*)" />
                  </div>
                </div>

                {/* RIGHT: Large Discrete GSAP 3D Spotlight Card Stack */}
                <div className="flowchart-deck-col">
                  <div
                    ref={deckStageRef}
                    className={`flowchart-deck-stage ${
                      reducedMotion ? 'flowchart-deck-stage--static' : ''
                    }`}
                  >
                    {PHASES.map((p, idx) => {
                      const isActive = activePhase === idx;
                      const deckRole = isActive
                        ? 'active'
                        : idx < activePhase
                          ? 'behind'
                          : 'upcoming';
                      return (
                        <article
                          key={p.code}
                          ref={(el) => {
                            cardRefs.current[idx] = el;
                          }}
                          data-deck-role={deckRole}
                          className={`spotlight-step-card ${
                            isActive ? 'spotlight-step-card--active' : ''
                          }`}
                          onClick={() => handleSelectPhase(idx)}
                        >
                          <div className="spotlight-step-card__top">
                            <div className="spotlight-step-card__step-lockup">
                              <span className="spotlight-step-card__num">{p.code}</span>
                              <code className="spotlight-step-card__fn">{p.fnName}()</code>
                            </div>
                          </div>

                          <div className="spotlight-step-card__body">
                            <h3 className="spotlight-step-card__title">{p.title}</h3>
                            <p className="spotlight-step-card__desc">{p.desc}</p>
                          </div>

                          <div
                            className={`spotlight-step-card__formula ${
                              p.formulaSecondTex
                                ? 'spotlight-step-card__formula--pair'
                                : 'spotlight-step-card__formula--single'
                            }`}
                          >
                            <MathFormula tex={p.formulaTex} ariaLabel={p.formulaAria} />
                            {p.formulaSecondTex ? (
                              <MathFormula tex={p.formulaSecondTex} />
                            ) : null}
                          </div>

                          <SpotlightIllustration idx={idx} active={isActive} />
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2B. Standalone Static Pseudocode & Time Complexity Section (`#ma-gia`) */}
      <section
        id="ma-gia"
        ref={pseudoSectionRef}
        className="section-pseudocode surface-light"
        data-surface="light"
        aria-labelledby="pseudocode-heading"
      >
        <div className="section-container flowchart-stack">
          <div className="flowchart-header">
            <div className="flowchart-header__titles">
              <h2 id="pseudocode-heading" tabIndex={-1} className="flowchart-title">
                <BlockReveal color="olive-lime" reducedMotion={reducedMotion}>
                  Mã giả{' '}
                  <span className="editorial-serif editorial-serif--olive">
                    &amp; độ phức tạp tính toán
                  </span>
                </BlockReveal>
              </h2>
              <LandoSignatureFlourish
                variant="editorial-signoff"
                triggerRef={pseudoSectionRef}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          <div className="flowchart-pseudocode-grid">
            <div
              className="flowchart-pseudocode-box"
              role="region"
              aria-label="Mã giả chuẩn của Thuật toán Đom đóm"
            >
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
                        style={{ paddingLeft: `${ln.indent * 0.82}rem` }}
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
    </div>
  );
}

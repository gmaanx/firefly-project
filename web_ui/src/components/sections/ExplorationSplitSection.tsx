import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { calcAttractiveness } from '../../engine/fireflyEngine';
import { SciNumber } from '../../lib/formatters';
import { useSectionReveal } from '../../lib/useEditorialMotion';
import { BlockReveal } from '../shared/BlockReveal';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { LandoSignatureFlourish } from '../shared/LandoSignatureFlourish';
import { MathFormula } from '../shared/MathFormula';

gsap.registerPlugin(ScrollTrigger);

export interface ExplorationSplitSectionProps {
  reducedMotion: boolean;
}

function buildTopoContourPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  warpA: number,
  warpB: number,
  phase: number
): string {
  const steps = 52;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const mod =
      1 +
      warpA * Math.cos(2 * a + phase) +
      warpB * Math.sin(3 * a - phase * 0.7);
    const x = cx + Math.cos(a) * rx * mod;
    const y = cy + Math.sin(a) * ry * mod;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `${pts.join(' ')} Z`;
}

/**
 * Bimodal 1D mountain cross-section objective curve `yScreen(u)` for Chapter 02 (`u in [0, 1]`):
 * - Left local minimum valley at `u = 0.22` (`y ~ 202`)
 * - Steep central saddle barrier crest at `u = 0.47` (`y ~ 68`)
 * - Deep global minimum canyon `f*` at `u = 0.78` (`y ~ 256`)
 */
function evalCrossSectionScreenY(u: number): number {
  const heightNorm =
    0.62 -
    0.34 * Math.exp(-Math.pow(u - 0.22, 2) / 0.011) +
    0.29 * Math.exp(-Math.pow(u - 0.47, 2) / 0.0095) -
    0.55 * Math.exp(-Math.pow(u - 0.78, 2) / 0.016) +
    0.34 * Math.pow(u - 0.52, 2);
  return 278 - heightNorm * 232;
}

const HOP_NOISE_SEQ: ReadonlyArray<number> = [
  0.54, -0.46, 0.95, 0.68, -0.62, 0.58, -0.66, 0.61, -0.54, 0.48, -0.57, 0.51,
  -0.44, 0.39, -0.36, 0.33, -0.29, 0.26,
];

function sliderCustomProps(
  value: number,
  min: number,
  max: number
): CSSProperties {
  return {
    '--control-value': String(value),
    '--attr-min': String(min),
    '--attr-max': String(max),
  } as CSSProperties;
}

export function ExplorationSplitSection({
  reducedMotion,
}: ExplorationSplitSectionProps) {
  const continuumRef = useRef<HTMLDivElement>(null);
  const exploitSecRef = useRef<HTMLElement>(null);
  const exploreSecRef = useRef<HTMLElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const paperMapRef = useRef<HTMLElement>(null);
  const cutawayStageRef = useRef<HTMLElement>(null);
  const ridgeStrokeRef = useRef<SVGPathElement>(null);
  const sparkStrokeRef = useRef<SVGPathElement>(null);
  const hopOrbGroupRef = useRef<SVGGElement>(null);

  const idPrefix = useId();

  // Raw UI slider values + GSAP-smoothed physical values for silky interactive glide
  const [distR, setDistR] = useState<number>(1.65);
  const [gammaVal, setGammaVal] = useState<number>(0.28);
  const [animDistR, setAnimDistR] = useState<number>(1.65);
  const [animGamma, setAnimGamma] = useState<number>(0.28);
  const [thetaVal, setThetaVal] = useState<number>(0.97);
  const [exploreEntered, setExploreEntered] = useState<boolean>(false);

  const smoothStateRef = useRef({ r: 1.65, g: 0.28 });

  useSectionReveal(continuumRef, reducedMotion);

  // GSAP-smoothed physical interpolation when dragging r or gamma sliders
  useEffect(() => {
    if (reducedMotion) {
      smoothStateRef.current.r = distR;
      smoothStateRef.current.g = gammaVal;
      setAnimDistR(distR);
      setAnimGamma(gammaVal);
      return;
    }

    const tween = gsap.to(smoothStateRef.current, {
      r: distR,
      g: gammaVal,
      duration: 0.36,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => {
        setAnimDistR(smoothStateRef.current.r);
        setAnimGamma(smoothStateRef.current.g);
      },
    });
    return () => {
      tween.kill();
    };
  }, [distR, gammaVal, reducedMotion]);

  /* ========================================================================
     CHAPTER 01 COMPUTATIONS: FRAMELESS INK-ON-PAPER RADIAL TOPOGRAPHY
     ======================================================================== */
  const betaVal = useMemo(
    () => calcAttractiveness(animDistR, 1.0, animGamma),
    [animDistR, animGamma]
  );
  const charScale = useMemo(
    () => 1 / Math.sqrt(Math.max(1e-5, animGamma)),
    [animGamma]
  );

  const peakJ = { x: 432, y: 174 };
  const secPeakK = { x: 118, y: 96 };
  const pxPerUnit = 72;
  const horizonRadiusPx = Math.min(410, charScale * pxPerUnit);
  const fireflyPos = {
    x: peakJ.x - animDistR * pxPerUnit,
    y: peakJ.y + Math.sin(animDistR * 0.58) * 24,
  };

  const stepVec = useMemo(() => {
    const dx = peakJ.x - fireflyPos.x;
    const dy = peakJ.y - fireflyPos.y;
    const travelFrac = Math.min(0.88, 0.1 + betaVal * 0.74);
    return {
      x2: fireflyPos.x + dx * travelFrac,
      y2: fireflyPos.y + dy * travelFrac,
    };
  }, [betaVal, fireflyPos.x, fireflyPos.y, peakJ.x, peakJ.y]);

  const primaryPaperContours = useMemo(
    () =>
      [26, 54, 86, 122, 164, 210, 262].map((r, idx) => ({
        r,
        d: buildTopoContourPath(
          peakJ.x,
          peakJ.y,
          r * 1.06,
          r * 0.84,
          0.06,
          0.035,
          0.45 + idx * 0.22
        ),
      })),
    [peakJ.x, peakJ.y]
  );

  const secondaryPaperContours = useMemo(
    () =>
      [24, 48, 76, 108].map((r, idx) => ({
        r,
        d: buildTopoContourPath(
          secPeakK.x,
          secPeakK.y,
          r * 1.08,
          r * 0.82,
          0.08,
          0.04,
          1.4 + idx * 0.28
        ),
      })),
    [secPeakK.x, secPeakK.y]
  );

  const paperStreamlines = useMemo(() => {
    const angles = [-2.6, -2.18, -1.68, -1.0, -0.3, 0.42, 1.18, 1.98, 2.68];
    return angles.map((ang, i) => {
      const startR = 190 + (i % 3) * 36;
      const sx = peakJ.x + Math.cos(ang) * startR * 1.06;
      const sy = peakJ.y + Math.sin(ang) * startR * 0.82;
      const ctrlAng = ang + (i % 2 === 0 ? 0.22 : -0.2);
      const cx = peakJ.x + Math.cos(ctrlAng) * (startR * 0.48);
      const cy = peakJ.y + Math.sin(ctrlAng) * (startR * 0.42);
      const ex = peakJ.x + Math.cos(ang * 0.92) * 16;
      const ey = peakJ.y + Math.sin(ang * 0.92) * 14;
      const midUnits = (startR * 0.55) / pxPerUnit;
      const strength = Math.exp(-animGamma * midUnits * midUnits);
      return {
        d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`,
        opacity: 0.14 + strength * 0.46,
      };
    });
  }, [animGamma, peakJ.x, peakJ.y]);

  const paperSparkline = useMemo(() => {
    const x0 = 48;
    const xSpan = 504;
    const yBase = 414;
    const yAmp = 48;
    const pts: string[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const r = (i / 60) * 5.0;
      const b = Math.exp(-animGamma * r * r);
      const x = x0 + (r / 5.0) * xSpan;
      const y = yBase - b * yAmp;
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const curX = x0 + (animDistR / 5.0) * xSpan;
    const curY = yBase - betaVal * yAmp;
    const hx = x0 + (Math.min(5, charScale) / 5.0) * xSpan;
    return {
      path: pts.join(' '),
      curX,
      curY,
      hx,
      x0,
      xEnd: x0 + xSpan,
      yBase,
    };
  }, [animDistR, animGamma, betaVal, charScale]);

  /* ========================================================================
     CHAPTER 02 COMPUTATIONS: 2D MOUNTAIN CROSS-SECTION & PARABOLIC HOP ARCS
     ======================================================================== */
  const crossSectionGeo = useMemo(() => {
    const xLeft = 34;
    const xWidth = 532;
    const yBottom = 302;
    const samples = 88;
    const topPts: string[] = [];
    const strata1Pts: string[] = [];
    const strata2Pts: string[] = [];

    for (let i = 0; i <= samples; i += 1) {
      const u = i / samples;
      const x = xLeft + u * xWidth;
      const y = evalCrossSectionScreenY(u);
      topPts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
      strata1Pts.push(
        `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.min(yBottom - 6, y + 18).toFixed(1)}`
      );
      strata2Pts.push(
        `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.min(yBottom - 3, y + 38).toFixed(1)}`
      );
    }

    const fillPath = `${topPts.join(' ')} L${(xLeft + xWidth).toFixed(1)},${yBottom} L${xLeft},${yBottom} Z`;

    return {
      strokePath: topPts.join(' '),
      fillPath,
      strata1Path: strata1Pts.join(' '),
      strata2Path: strata2Pts.join(' '),
      localPt: {
        x: xLeft + 0.22 * xWidth,
        y: evalCrossSectionScreenY(0.22),
      },
      ridgePt: {
        x: xLeft + 0.47 * xWidth,
        y: evalCrossSectionScreenY(0.47),
      },
      globalPt: {
        x: xLeft + 0.78 * xWidth,
        y: evalCrossSectionScreenY(0.78),
      },
    };
  }, []);

  const mountainHopSim = useMemo(() => {
    const xLeft = 34;
    const xWidth = 532;
    let u = 0.14;
    const nodes: Array<{ u: number; x: number; y: number; t: number }> = [
      {
        u,
        x: xLeft + u * xWidth,
        y: evalCrossSectionScreenY(u),
        t: 0,
      },
    ];
    const arcs: Array<{
      d: string;
      p0x: number;
      p0y: number;
      cx: number;
      cy: number;
      p1x: number;
      p1y: number;
      opacity: number;
      crossedRidge: boolean;
    }> = [];

    for (let k = 0; k < HOP_NOISE_SEQ.length; k += 1) {
      const tGen = Math.round(((k + 1) / HOP_NOISE_SEQ.length) * 200);
      const alpha = Math.pow(thetaVal, tGen);
      const xi = HOP_NOISE_SEQ[k];

      const prevU = u;
      let nextU: number;
      if (prevU < 0.47) {
        if (alpha > 0.11 && xi > 0.85) {
          nextU = 0.59 + Math.min(0.14, (alpha - 0.11) * 0.18);
        } else {
          nextU = prevU + (0.22 - prevU) * 0.42 + xi * 0.13 * alpha;
        }
      } else {
        const pullGain = 0.42 * (1 - alpha * 0.62);
        nextU = prevU + (0.78 - prevU) * pullGain + xi * 0.24 * alpha;
      }

      nextU = Math.max(0.06, Math.min(0.95, nextU));
      u = nextU;

      const p0 = nodes[nodes.length - 1];
      const p1 = {
        u: nextU,
        x: xLeft + nextU * xWidth,
        y: evalCrossSectionScreenY(nextU),
        t: tGen,
      };
      nodes.push(p1);

      const crossed = prevU < 0.47 && nextU >= 0.47;
      const midX = crossed ? crossSectionGeo.ridgePt.x : (p0.x + p1.x) * 0.5;
      const spanPx = Math.abs(p1.x - p0.x);
      const ridgeCrestY = crossSectionGeo.ridgePt.y;
      const desiredPeakY = crossed
        ? ridgeCrestY - 22
        : Math.max(24, Math.min(p0.y, p1.y) - (10 + spanPx * 0.22 + alpha * 14));
      const apexY = 2 * desiredPeakY - 0.5 * (p0.y + p1.y);

      arcs.push({
        d: `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} Q${midX.toFixed(1)},${apexY.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`,
        p0x: p0.x,
        p0y: p0.y,
        cx: midX,
        cy: apexY,
        p1x: p1.x,
        p1y: p1.y,
        opacity: crossed ? 0.96 : 0.28 + 0.58 * (1 - k / HOP_NOISE_SEQ.length),
        crossedRidge: crossed,
      });
    }

    const endNode = nodes[nodes.length - 1];
    const escaped = endNode.u >= 0.47;
    return {
      nodes,
      arcs,
      startNode: nodes[0],
      endNode,
      escaped,
    };
  }, [crossSectionGeo.ridgePt.x, crossSectionGeo.ridgePt.y, thetaVal]);

  const exploreStatusNode =
    thetaVal < 0.935 ? (
      <>
        <MathFormula tex="\theta" ariaLabel="theta" /> quá nhỏ · kẹt ở hố phụ
      </>
    ) : thetaVal <= 0.988 ? (
      <>
        <MathFormula tex="\theta = 0.97" ariaLabel="theta = 0.97" /> · hội tụ đáy{' '}
        <MathFormula tex="f^*" ariaLabel="f*" />
      </>
    ) : (
      <>
        <MathFormula tex="\theta = 1.00" ariaLabel="theta = 1.00" /> · dao động
        quanh đích
      </>
    );

  const epochs = useMemo(
    () => [
      {
        t: 0,
        title: 'Đầu quá trình · Tìm kiếm rộng',
        note: (
          <>
            Bước nhảy còn lớn nên dễ vượt qua sườn ngăn cách giữa các hố.
          </>
        ),
        ratio: 1.0,
      },
      {
        t: 50,
        title: 'Giữa quá trình · Thu hẹp phạm vi',
        note: (
          <>
            Giảm dần nhiễu sau khi đàn đã tìm đúng vùng thung lũng tốt.
          </>
        ),
        ratio: Math.pow(thetaVal, 50),
      },
      {
        t: 200,
        title: 'Cuối quá trình · Hội tụ quanh đích',
        note: (
          <>
            Bước nhảy tiến sát 0 để đom đóm dừng ổn định ngay tại đáy{' '}
            <MathFormula tex="f^*" ariaLabel="f*" />.
          </>
        ),
        ratio: Math.pow(thetaVal, 200),
      },
    ],
    [thetaVal]
  );

  /* ========================================================================
     GSAP + SCROLLTRIGGER + LENIS SCRUB CHOREOGRAPHY
     ======================================================================== */
  useGSAP(
    () => {
      const root = continuumRef.current;
      if (!root || reducedMotion) return;

      // 1. Scrubbed Lenis counter-parallax on oversized 01 & 02 chapter numerals
      const numerals = root.querySelectorAll<HTMLElement>(
        '.dynamics-chapter-marker__num'
      );
      numerals.forEach((numEl) => {
        const chapter = numEl.closest('.dynamics-chapter') ?? root;
        gsap.fromTo(
          numEl,
          { yPercent: -24 },
          {
            yPercent: 20,
            ease: 'none',
            scrollTrigger: {
              trigger: chapter,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.65,
            },
          }
        );
      });

      // 2. Chapter 01 Paper Cartography: counter-parallax + radial contour ripple + sparkline ink draw
      const mapEl = paperMapRef.current;
      if (mapEl && exploitSecRef.current) {
        gsap.fromTo(
          mapEl,
          { y: 28 },
          {
            y: -22,
            ease: 'none',
            scrollTrigger: {
              trigger: exploitSecRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.85,
            },
          }
        );

        const contourRings = mapEl.querySelectorAll<SVGPathElement>(
          '.js-paper-contour'
        );
        if (contourRings.length > 0) {
          gsap.fromTo(
            contourRings,
            {
              opacity: 0,
              scale: 0.9,
              svgOrigin: '432 174',
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.85,
              stagger: 0.055,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: mapEl,
                start: 'top 82%',
                once: true,
              },
            }
          );
        }

        const spark = sparkStrokeRef.current;
        if (spark) {
          const sLen = spark.getTotalLength();
          gsap.fromTo(
            spark,
            { strokeDasharray: sLen, strokeDashoffset: sLen },
            {
              strokeDashoffset: 0,
              duration: 1.05,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: mapEl,
                start: 'top 76%',
                once: true,
              },
            }
          );
        }
      }

      // 3. Seamless Continuity Spine (01 -> 02): Lenis scroll-scrubbed plumb-line draw
      const spine = spineRef.current;
      if (spine) {
        const lines = spine.querySelectorAll<HTMLElement>(
          '.dynamics-seamless-spine__line'
        );
        const cap = spine.querySelector<HTMLElement>(
          '.dynamics-seamless-spine__caption'
        );
        const tlSpine = gsap.timeline({
          scrollTrigger: {
            trigger: spine,
            start: 'top 92%',
            end: 'bottom 64%',
            scrub: 0.45,
          },
        });
        if (lines[0]) {
          tlSpine.fromTo(
            lines[0],
            { scaleY: 0, transformOrigin: 'top center' },
            { scaleY: 1, duration: 0.35, ease: 'none' }
          );
        }
        if (cap) {
          tlSpine.fromTo(
            cap,
            { opacity: 0.45, y: 6 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'none' },
            '-=0.12'
          );
        }
        if (lines[1]) {
          tlSpine.fromTo(
            lines[1],
            { scaleY: 0, transformOrigin: 'top center' },
            { scaleY: 1, duration: 0.35, ease: 'none' },
            '-=0.05'
          );
        }
      }

      // 4. Chapter 02 Mountain Cutaway Stage: subtle parallax + ridge draw + 3-Epoch Timeline cascade
      const stageEl = cutawayStageRef.current;
      if (stageEl && exploreSecRef.current) {
        gsap.fromTo(
          stageEl,
          { y: 10 },
          {
            y: -10,
            ease: 'none',
            scrollTrigger: {
              trigger: exploreSecRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.85,
            },
          }
        );

        const ridge = ridgeStrokeRef.current;
        if (ridge) {
          const rLen = ridge.getTotalLength();
          gsap.fromTo(
            ridge,
            { strokeDasharray: rLen, strokeDashoffset: rLen },
            {
              strokeDashoffset: 0,
              duration: 1.1,
              ease: 'power3.inOut',
              scrollTrigger: {
                trigger: stageEl,
                start: 'top 80%',
                once: true,
                onEnter: () => setExploreEntered(true),
              },
            }
          );
        }

        const epochItems = exploreSecRef.current.querySelectorAll<HTMLElement>(
          '.explore-epoch-item'
        );
        const epochBars = exploreSecRef.current.querySelectorAll<HTMLElement>(
          '.explore-epoch-item__bar-fill'
        );
        if (epochItems.length > 0) {
          gsap.fromTo(
            epochItems,
            { opacity: 0, x: 20 },
            {
              opacity: 1,
              x: 0,
              duration: 0.72,
              stagger: 0.12,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: exploreSecRef.current,
                start: 'top 76%',
                once: true,
              },
            }
          );
        }
        if (epochBars.length > 0) {
          gsap.fromTo(
            epochBars,
            { scaleX: 0, transformOrigin: 'left center' },
            {
              scaleX: 1,
              duration: 0.85,
              stagger: 0.14,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: exploreSecRef.current,
                start: 'top 76%',
                once: true,
              },
            }
          );
        }
      }
    },
    { scope: continuumRef, dependencies: [reducedMotion] }
  );

  // 5. Live Animated Firefly Beacon Hopping Across the Parabolic Mountain Arcs on Entry & Theta Change!
  useGSAP(
    () => {
      const stageEl = cutawayStageRef.current;
      const orbG = hopOrbGroupRef.current;
      if (!stageEl || !orbG) return;

      const arcPaths = stageEl.querySelectorAll<SVGPathElement>('.js-hop-arc');
      const arcs = mountainHopSim.arcs;
      if (arcs.length === 0) return;

      if (reducedMotion || !exploreEntered) {
        const end = mountainHopSim.endNode;
        orbG.setAttribute('transform', `translate(${end.x.toFixed(1)}, ${end.y.toFixed(1)})`);
        return;
      }

      gsap.fromTo(
        arcPaths,
        { opacity: 0 },
        {
          opacity: (i) => arcs[i]?.opacity ?? 0.5,
          duration: 0.28,
          stagger: 0.032,
          ease: 'power2.out',
          overwrite: true,
        }
      );

      const playhead = { progress: 0 };
      const totalSegs = arcs.length;
      const tween = gsap.to(playhead, {
        progress: totalSegs,
        duration: 1.25,
        ease: 'power2.out',
        onUpdate: () => {
          const clamped = Math.min(totalSegs - 1e-4, Math.max(0, playhead.progress));
          const idx = Math.floor(clamped);
          const u = clamped - idx;
          const seg = arcs[idx];
          if (!seg) return;
          const oneMinus = 1 - u;
          const bx =
            oneMinus * oneMinus * seg.p0x +
            2 * oneMinus * u * seg.cx +
            u * u * seg.p1x;
          const by =
            oneMinus * oneMinus * seg.p0y +
            2 * oneMinus * u * seg.cy +
            u * u * seg.p1y;
          orbG.setAttribute('transform', `translate(${bx.toFixed(1)}, ${by.toFixed(1)})`);
        },
      });

      return () => {
        tween.kill();
      };
    },
    { scope: cutawayStageRef, dependencies: [exploreEntered, mountainHopSim, reducedMotion] }
  );

  return (
    <div ref={continuumRef} className="dynamics-continuum surface-light">
      <ContourBackdrop variant="light" />

      {/* ====================================================================
          CHAPTER 01: ASYMMETRIC MONOGRAPH (LEFT THESIS | RIGHT OPEN PAPER MAP)
          ==================================================================== */}
      <section
        id="luc-hut-kham-pha"
        ref={exploitSecRef}
        className="dynamics-chapter dynamics-chapter--exploit"
        data-surface="light"
        aria-labelledby={`${idPrefix}-exploit-heading`}
      >
        <div className="section-container">
          <div className="exploit-layout">
            {/* LEFT 5-COL: MONUMENTAL HEADING + INLINE EQUATION + SLIDERS */}
            <div className="exploit-layout__editorial">
              <div className="dynamics-chapter-marker">
                <span className="dynamics-chapter-marker__num" aria-hidden="true">
                  01
                </span>
              </div>

              <h2
                id={`${idPrefix}-exploit-heading`}
                className="dynamics-monograph-title"
              >
                <BlockReveal color="dark" delay={0} reducedMotion={reducedMotion}>
                  <span className="dynamics-monograph-title__serif">
                    Đom đóm mờ hơn
                  </span>
                </BlockReveal>
                <BlockReveal color="dark" delay={0.18} reducedMotion={reducedMotion}>
                  <span className="dynamics-monograph-title__sans">
                    bay về phía con sáng hơn
                  </span>
                </BlockReveal>
              </h2>

              <p className="dynamics-lead reveal-fade">
                Nếu nằm trong tầm nhìn{' '}
                <MathFormula tex="L = 1/\sqrt{\gamma}" ariaLabel="L = 1 / sqrt(gamma)" />
                , con mờ sẽ bị hút về phía con sáng hơn. Khi ở quá xa (
                <MathFormula tex="r > L" ariaLabel="r > L" />
                ), ánh sáng bị môi trường cản bớt nên hai con hầu như không ảnh
                hưởng nhau.
              </p>

              <div className="exploit-equation-strip exploit-equation-strip--pair reveal-fade">
                <MathFormula
                  tex="\beta(r) = \beta_0 e^{-\gamma r^2}"
                  ariaLabel="beta(r) = beta_0 exp(-gamma r^2)"
                />
                <MathFormula
                  tex="L = \frac{1}{\sqrt{\gamma}}"
                  ariaLabel="L = 1 / sqrt(gamma)"
                />
              </div>

              {/* 2-UP ARCHITECTURAL READOUT + TACTILE SLIDERS */}
              <div className="exploit-metrics-pair reveal-fade">
                <div className="exploit-metric-cell">
                  <span className="exploit-metric-cell__label">
                    Độ hấp dẫn{' '}
                    <MathFormula tex="\beta(r)" ariaLabel="beta(r)" />
                  </span>
                  <strong className="exploit-metric-cell__val">
                    {betaVal.toFixed(3)}
                  </strong>
                  <span className="exploit-metric-cell__sub">
                    khi cách nhau{' '}
                    <MathFormula
                      tex={`r = ${distR.toFixed(2)}`}
                      ariaLabel={`r = ${distR.toFixed(2)}`}
                    />
                  </span>
                </div>
                <div className="exploit-metric-cell">
                  <span className="exploit-metric-cell__label">
                    Tầm nhìn{' '}
                    <MathFormula
                      tex="L = 1/\sqrt{\gamma}"
                      ariaLabel="L = 1 / sqrt(gamma)"
                    />
                  </span>
                  <strong className="exploit-metric-cell__val">
                    {charScale.toFixed(2)}
                  </strong>
                  <span className="exploit-metric-cell__sub">
                    {animDistR <= charScale ? (
                      <>
                        <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> nhìn thấy{' '}
                        <MathFormula tex="\mathbf{x}_j" ariaLabel="x_j" /> (bị hút)
                      </>
                    ) : (
                      <>
                        <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> ngoài tầm nhìn
                        (tách nhóm)
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div
                className="dynamics-controls-block reveal-fade"
                aria-label="Tham số khảo sát lực hút theo khoảng cách"
              >
                <div className="dynamics-slider-field">
                  <div className="dynamics-slider-field__header">
                    <label htmlFor={`${idPrefix}-r-slider`}>
                      Khoảng cách <MathFormula tex="r" ariaLabel="r" /> giữa hai
                      đom đóm
                    </label>
                    <span className="dynamics-slider-field__readout">
                      <strong>{distR.toFixed(2)}</strong> đơn vị
                    </span>
                  </div>
                  <input
                    id={`${idPrefix}-r-slider`}
                    className="architectural-range"
                    type="range"
                    min={0.15}
                    max={5}
                    step={0.05}
                    value={distR}
                    style={sliderCustomProps(distR, 0.15, 5)}
                    aria-valuetext={`r bằng ${distR.toFixed(2)}, độ hấp dẫn beta bằng ${betaVal.toFixed(3)}`}
                    onChange={(e) => setDistR(Number(e.target.value))}
                  />
                </div>

                <div className="dynamics-slider-field">
                  <div className="dynamics-slider-field__header">
                    <label htmlFor={`${idPrefix}-gamma-slider`}>
                      Hệ số cản sáng của môi trường{' '}
                      <MathFormula tex="\gamma" ariaLabel="gamma" />
                    </label>
                    <span className="dynamics-slider-field__readout">
                      <MathFormula tex="\gamma =" ariaLabel="gamma =" />{' '}
                      <strong>{gammaVal.toFixed(2)}</strong>
                    </span>
                  </div>
                  <input
                    id={`${idPrefix}-gamma-slider`}
                    className="architectural-range"
                    type="range"
                    min={0.05}
                    max={2.5}
                    step={0.05}
                    value={gammaVal}
                    style={sliderCustomProps(gammaVal, 0.05, 2.5)}
                    aria-valuetext={`gamma bằng ${gammaVal.toFixed(2)}, tầm nhìn L bằng ${charScale.toFixed(2)}`}
                    onChange={(e) => setGammaVal(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT 7-COL: FRAMELESS INK-ON-PAPER CARTOGRAPHIC FIELD */}
            <figure
              ref={paperMapRef}
              className="exploit-paper-map"
              aria-label={`Mặt bằng đường đồng mức với r = ${distR.toFixed(2)} và tầm nhìn L = ${charScale.toFixed(2)}`}
            >
              <div className="exploit-paper-map__caption-top">
                <span>
                  Mặt bằng đường đồng mức{' '}
                  <MathFormula tex="(x_1, x_2)" ariaLabel="(x_1, x_2)" />
                </span>
                <span>
                  {animGamma < 0.12 ? (
                    <>
                      <MathFormula tex="\gamma \to 0" ariaLabel="gamma -> 0" /> ·
                      cả đàn chụm lại
                    </>
                  ) : animDistR <= charScale ? (
                    <>
                      <MathFormula tex="r \le L" ariaLabel="r <= L" /> · trong vùng
                      hút
                    </>
                  ) : (
                    <>
                      <MathFormula tex="r > L" ariaLabel="r > L" /> · ngoài tầm nhìn
                    </>
                  )}
                </span>
              </div>

              <svg
                viewBox="0 0 600 436"
                className="exploit-paper-map__svg"
                aria-hidden="true"
              >
                <defs>
                  <filter id={`${idPrefix}-paper-halo`} x="-12%" y="-25%" width="124%" height="150%">
                    <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="dilated" />
                    <feFlood floodColor="#F3F2EC" result="haloColor" />
                    <feComposite in="haloColor" in2="dilated" operator="in" result="halo" />
                    <feMerge>
                      <feMergeNode in="halo" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {[94, 174, 254].map((gy) => (
                  <line
                    key={`pgy-${gy}`}
                    x1="24"
                    y1={gy}
                    x2="576"
                    y2={gy}
                    stroke="rgba(20, 21, 19, 0.065)"
                    strokeWidth="1"
                  />
                ))}
                {[118, 222, 327, 432, 536].map((gx) => (
                  <line
                    key={`pgx-${gx}`}
                    x1={gx}
                    y1="20"
                    x2={gx}
                    y2="334"
                    stroke="rgba(20, 21, 19, 0.065)"
                    strokeWidth="1"
                  />
                ))}

                {secondaryPaperContours.map((c, idx) => (
                  <path
                    key={`psec-${c.r}`}
                    d={c.d}
                    fill={idx === 0 ? 'rgba(36, 40, 30, 0.045)' : 'none'}
                    stroke="rgba(20, 21, 19, 0.2)"
                    strokeWidth={idx === 0 ? '1.15' : '0.85'}
                  />
                ))}
                <circle cx={secPeakK.x} cy={secPeakK.y} r="3.5" fill="#5F6358" />

                <circle
                  cx={peakJ.x}
                  cy={peakJ.y}
                  r={horizonRadiusPx}
                  fill="rgba(36, 40, 30, 0.055)"
                  stroke="#24281E"
                  strokeWidth="1.3"
                  strokeDasharray="6 4"
                />

                {primaryPaperContours.map((c, idx) => (
                  <path
                    key={`ppri-${c.r}`}
                    className="js-paper-contour"
                    d={c.d}
                    fill={idx === 0 ? 'rgba(36, 40, 30, 0.08)' : 'none'}
                    stroke={
                      idx < 2
                        ? 'rgba(36, 40, 30, 0.62)'
                        : idx < 4
                          ? 'rgba(36, 40, 30, 0.34)'
                          : 'rgba(20, 21, 19, 0.16)'
                    }
                    strokeWidth={idx === 0 ? '1.35' : '0.95'}
                  />
                ))}

                {paperStreamlines.map((st, idx) => (
                  <path
                    key={`pst-${idx}`}
                    d={st.d}
                    fill="none"
                    stroke="#24281E"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity={st.opacity}
                  />
                ))}

                <line
                  x1={fireflyPos.x}
                  y1={fireflyPos.y}
                  x2={peakJ.x}
                  y2={peakJ.y}
                  stroke="rgba(20, 21, 19, 0.32)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />

                <line
                  x1={fireflyPos.x}
                  y1={fireflyPos.y}
                  x2={stepVec.x2}
                  y2={stepVec.y2}
                  stroke="#141513"
                  strokeWidth={1.8 + betaVal * 2.4}
                />
                <circle
                  cx={stepVec.x2}
                  cy={stepVec.y2}
                  r={3.2 + betaVal * 1.8}
                  fill="#24281E"
                />

                <circle
                  cx={peakJ.x}
                  cy={peakJ.y}
                  r="14"
                  fill="rgba(36, 40, 30, 0.14)"
                />
                <circle cx={peakJ.x} cy={peakJ.y} r="6" fill="#141513" />
                <circle cx={peakJ.x} cy={peakJ.y} r="2.3" fill="#F3F2EC" />

                <circle
                  cx={fireflyPos.x}
                  cy={fireflyPos.y}
                  r="6"
                  fill="#F3F2EC"
                  stroke="#141513"
                  strokeWidth="2"
                />

                {/* Top-layer cartographic labels with unified SVG alpha-dilation halo (zero glyph self-overlap!) */}
                <g filter={`url(#${idPrefix}-paper-halo)`}>
                  <text
                    x={secPeakK.x}
                    y={secPeakK.y - 12}
                    textAnchor="middle"
                    className="paper-svg-note"
                  >
                    Đỉnh phụ <tspan fontStyle="italic">x</tspan>
                    <tspan dy="2.5" fontSize="8">
                      k
                    </tspan>
                  </text>

                  {horizonRadiusPx < 350 && (
                    <text
                      x={Math.max(48, peakJ.x - horizonRadiusPx + 12)}
                      y={peakJ.y - 14}
                      className="paper-svg-tag"
                    >
                      Tầm nhìn <tspan fontStyle="italic">L</tspan> ={' '}
                      {charScale.toFixed(2)}
                    </text>
                  )}

                  <text
                    x={peakJ.x + 15}
                    y={peakJ.y + 4}
                    className="paper-svg-tag"
                  >
                    <tspan fontStyle="italic">x</tspan>
                    <tspan dy="2.8" fontSize="8.5">
                      j
                    </tspan>
                    <tspan dy="-2.8"> (</tspan>
                    <tspan fontStyle="italic">I</tspan>
                    <tspan dy="2.8" fontSize="8.5">
                      j
                    </tspan>
                    <tspan dy="-2.8"> &gt; </tspan>
                    <tspan fontStyle="italic">I</tspan>
                    <tspan dy="2.8" fontSize="8.5">
                      i
                    </tspan>
                    <tspan dy="-2.8">)</tspan>
                  </text>

                  <text
                    x={Math.max(52, Math.min(520, fireflyPos.x))}
                    y={fireflyPos.y + 22}
                    textAnchor="middle"
                    className="paper-svg-tag"
                  >
                    <tspan fontStyle="italic">x</tspan>
                    <tspan dy="2.8" fontSize="8.5">
                      i
                    </tspan>
                    <tspan dy="-2.8"> (</tspan>
                    <tspan fontStyle="italic">r</tspan> = {distR.toFixed(2)})
                  </text>
                </g>

                <line
                  x1="24"
                  y1="344"
                  x2="576"
                  y2="344"
                  stroke="rgba(20, 21, 19, 0.16)"
                  strokeWidth="1"
                />
                <text x="48" y="360" className="paper-svg-note">
                  Hàm hấp dẫn β(r) = exp(−γr
                  <tspan dy="-3" fontSize="7.5">
                    2
                  </tspan>
                  <tspan dy="3">)</tspan>
                </text>
                <text
                  x="552"
                  y="360"
                  textAnchor="end"
                  className="paper-svg-note"
                >
                  β({distR.toFixed(2)}) = {betaVal.toFixed(3)}
                </text>

                <line
                  x1={paperSparkline.x0}
                  y1={paperSparkline.yBase}
                  x2={paperSparkline.xEnd}
                  y2={paperSparkline.yBase}
                  stroke="rgba(20, 21, 19, 0.24)"
                  strokeWidth="1"
                />
                {charScale <= 5 && (
                  <line
                    x1={paperSparkline.hx}
                    y1="364"
                    x2={paperSparkline.hx}
                    y2={paperSparkline.yBase}
                    stroke="rgba(36, 40, 30, 0.45)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}
                <path
                  ref={sparkStrokeRef}
                  d={paperSparkline.path}
                  fill="none"
                  stroke="#24281E"
                  strokeWidth="2"
                />
                <line
                  x1={paperSparkline.curX}
                  y1={paperSparkline.curY}
                  x2={paperSparkline.curX}
                  y2={paperSparkline.yBase}
                  stroke="#141513"
                  strokeWidth="1.2"
                />
                <circle
                  cx={paperSparkline.curX}
                  cy={paperSparkline.curY}
                  r="4.5"
                  fill="#141513"
                />
                {[0, 1, 2, 3, 4, 5].map((tk) => (
                  <text
                    key={`ptk-${tk}`}
                    x={paperSparkline.x0 + (tk / 5) * 504}
                    y="430"
                    textAnchor="middle"
                    className="paper-svg-note"
                  >
                    r={tk}
                  </text>
                ))}
              </svg>
            </figure>
          </div>

          {/* ================================================================
              SEAMLESS CONTINUITY SPINE CONNECTING CHAPTER 01 -> CHAPTER 02
              ================================================================ */}
          <div
            ref={spineRef}
            className="dynamics-seamless-spine"
            aria-hidden="true"
          >
            <span className="dynamics-seamless-spine__line" />
            <span className="dynamics-seamless-spine__caption">
              Nếu chỉ bay về phía con sáng hơn, cả nhóm vẫn dễ kẹt ở hố gần đó →
              cần thêm bước nhảy ngẫu nhiên để thoát ra
            </span>
            <LandoSignatureFlourish
              variant="editorial-signoff"
              reducedMotion={reducedMotion}
            />
            <span className="dynamics-seamless-spine__line" />
          </div>
        </div>
      </section>

      {/* ====================================================================
          CHAPTER 02: REVERSED COUNTER-LAYOUT
          (LEFT CHAMFERED MOUNTAIN CROSS-SECTION CONSOLE | RIGHT THESIS + TIMELINE)
          ==================================================================== */}
      <section
        id="buoc-nhay-lam-nguoi"
        ref={exploreSecRef}
        className="dynamics-chapter dynamics-chapter--explore"
        data-surface="light"
        aria-labelledby={`${idPrefix}-explore-heading`}
      >
        <div className="section-container">
          <div className="explore-counter-layout">
            {/* EDITORIAL + 3-EPOCH TIMELINE */}
            <div className="explore-counter-layout__editorial">
              <div className="dynamics-chapter-marker">
                <span className="dynamics-chapter-marker__num" aria-hidden="true">
                  02
                </span>
              </div>

              <h2
                id={`${idPrefix}-explore-heading`}
                className="dynamics-monograph-title"
              >
                <BlockReveal color="dark" delay={0} reducedMotion={reducedMotion}>
                  <span className="dynamics-monograph-title__serif">
                    Nhảy rộng lúc đầu,
                  </span>
                </BlockReveal>
                <BlockReveal color="dark" delay={0.18} reducedMotion={reducedMotion}>
                  <span className="dynamics-monograph-title__sans">
                    thu hẹp dần về cuối
                  </span>
                </BlockReveal>
              </h2>

              <p className="dynamics-lead reveal-fade">
                Ở những vòng đầu, bước nhảy ngẫu nhiên lớn giúp đom đóm thoát
                khỏi hố cục bộ. Sau mỗi vòng, biên độ giảm dần theo{' '}
                <MathFormula
                  tex="\alpha_t = \alpha_0 \theta^t"
                  ariaLabel="alpha_t = alpha_0 theta^t"
                />{' '}
                để dừng chính xác tại đáy tốt nhất.
              </p>

              <div className="exploit-equation-strip exploit-equation-strip--single reveal-fade">
                <MathFormula
                  tex="\mathbf{x}_i^{t+1} = \mathbf{x}_i^t + \beta_0 e^{-\gamma r_{ij}^2}(\mathbf{x}_j^t - \mathbf{x}_i^t) + \alpha_0 \theta^t \boldsymbol{\epsilon}_i^t"
                  ariaLabel="x_i^{t+1} = x_i^t + beta_0 exp(-gamma r_ij^2)(x_j^t - x_i^t) + alpha_0 theta^t epsilon_i^t"
                />
              </div>

              <ol
                className="explore-epoch-timeline"
                aria-label="Ba giai đoạn suy giảm biên độ bước nhảy theo thế hệ"
              >
                {epochs.map((ep) => {
                  const barPct = Math.max(2, Math.min(100, ep.ratio * 100));
                  return (
                    <li key={ep.t} className="explore-epoch-item">
                      <div className="explore-epoch-item__head">
                        <span className="explore-epoch-item__gen">
                          <MathFormula
                            tex={`t = ${ep.t}`}
                            ariaLabel={`t = ${ep.t}`}
                          />
                        </span>
                        <span className="explore-epoch-item__title">
                          {ep.title}
                        </span>
                        <span className="explore-epoch-item__val">
                          <MathFormula
                            tex="\alpha_t / \alpha_0 ="
                            ariaLabel="alpha_t / alpha_0 ="
                          />{' '}
                          <SciNumber value={ep.ratio} sigDigits={2} />
                        </span>
                      </div>
                      <div
                        className="explore-epoch-item__bar-track"
                        aria-hidden="true"
                      >
                        <span
                          className="explore-epoch-item__bar-fill"
                          style={{ inlineSize: `${barPct.toFixed(2)}%` }}
                        />
                      </div>
                      <p className="explore-epoch-item__note">{ep.note}</p>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* LEFT ON DESKTOP (7.4-COL): SCULPTED CHAMFERED MOUNTAIN CUTAWAY & HOP CONSOLE */}
            <div className="explore-counter-layout__stage">
              <figure
                ref={cutawayStageRef}
                className="explore-cutaway-stage"
                aria-label={`Mặt cắt địa hình sườn đèo và cung nhảy làm nguội với theta = ${thetaVal.toFixed(3)}`}
              >
                <div className="explore-cutaway-stage__topbar">
                  <span className="explore-cutaway-stage__eyebrow">
                    Mặt cắt hàm mục tiêu{' '}
                    <MathFormula tex="f(x)" ariaLabel="f(x)" /> qua 200 vòng lặp
                  </span>
                  <span className="explore-cutaway-stage__status">
                    {exploreStatusNode}
                  </span>
                </div>

                <svg
                  viewBox="0 0 600 318"
                  className="explore-cutaway-stage__svg"
                  aria-hidden="true"
                >
                  <defs>
                    <filter id={`${idPrefix}-obsidian-halo`} x="-12%" y="-25%" width="124%" height="150%">
                      <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dilated" />
                      <feFlood floodColor="#101110" result="haloColor" />
                      <feComposite in="haloColor" in2="dilated" operator="in" result="halo" />
                      <feMerge>
                        <feMergeNode in="halo" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {[72, 148, 224].map((ey) => (
                    <line
                      key={`elev-${ey}`}
                      x1="24"
                      y1={ey}
                      x2="576"
                      y2={ey}
                      stroke="rgba(239, 239, 232, 0.06)"
                      strokeWidth="1"
                    />
                  ))}

                  <line
                    x1={crossSectionGeo.ridgePt.x}
                    y1="26"
                    x2={crossSectionGeo.ridgePt.x}
                    y2="302"
                    stroke="rgba(239, 239, 232, 0.18)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={crossSectionGeo.ridgePt.x}
                    y="20"
                    textAnchor="middle"
                    className="dynamics-svg-caption"
                  >
                    ĐỈNH NGĂN CÁCH
                  </text>

                  <path
                    d={crossSectionGeo.fillPath}
                    fill="rgba(36, 40, 30, 0.88)"
                  />
                  <path
                    d={crossSectionGeo.strata1Path}
                    fill="none"
                    stroke="rgba(239, 239, 232, 0.08)"
                    strokeWidth="1"
                  />
                  <path
                    d={crossSectionGeo.strata2Path}
                    fill="none"
                    stroke="rgba(239, 239, 232, 0.05)"
                    strokeWidth="1"
                  />
                  <path
                    ref={ridgeStrokeRef}
                    d={crossSectionGeo.strokePath}
                    fill="none"
                    stroke="#B6C96E"
                    strokeWidth="2"
                  />

                  {mountainHopSim.arcs.map((arc, idx) => (
                    <path
                      key={`hop-${idx}`}
                      className="js-hop-arc"
                      d={arc.d}
                      fill="none"
                      stroke={arc.crossedRidge ? '#C5E84D' : '#8D7AE6'}
                      strokeWidth={arc.crossedRidge ? '2.15' : '1.45'}
                      strokeDasharray={arc.crossedRidge ? undefined : '4 2'}
                      opacity={arc.opacity}
                    />
                  ))}

                  <circle
                    cx={crossSectionGeo.localPt.x}
                    cy={crossSectionGeo.localPt.y}
                    r="4"
                    fill="#D98C4A"
                  />
                  <text
                    x={crossSectionGeo.localPt.x}
                    y={crossSectionGeo.localPt.y + 24}
                    textAnchor="middle"
                    className="dynamics-svg-caption"
                  >
                    HỐ CỰC TIỂU CỤC BỘ
                  </text>

                  <circle
                    cx={crossSectionGeo.globalPt.x}
                    cy={crossSectionGeo.globalPt.y}
                    r="13"
                    fill="rgba(197, 232, 77, 0.16)"
                  />
                  <circle
                    cx={crossSectionGeo.globalPt.x}
                    cy={crossSectionGeo.globalPt.y}
                    r="5"
                    fill="#C5E84D"
                  />
                  <text
                    x={crossSectionGeo.globalPt.x}
                    y={crossSectionGeo.globalPt.y + 26}
                    textAnchor="middle"
                    filter={`url(#${idPrefix}-obsidian-halo)`}
                    className="dynamics-svg-tag dynamics-svg-tag--sage"
                  >
                    Đáy toàn cục <tspan fontStyle="italic">f</tspan>*
                  </text>

                  <circle
                    cx={mountainHopSim.startNode.x}
                    cy={mountainHopSim.startNode.y}
                    r="5"
                    fill="#EFEFE8"
                    stroke="#101110"
                    strokeWidth="1.5"
                  />
                  <text
                    x={mountainHopSim.startNode.x - 10}
                    y={mountainHopSim.startNode.y - 17}
                    textAnchor="middle"
                    filter={`url(#${idPrefix}-obsidian-halo)`}
                    className="dynamics-svg-tag dynamics-svg-tag--ivory"
                  >
                    <tspan fontStyle="italic">x</tspan>
                    <tspan dy="-3.5" fontSize="7.5">
                      0
                    </tspan>
                    <tspan dy="3.5"> (t = 0)</tspan>
                  </text>

                  {/* Live GSAP-Animated Firefly Beacon Traveling Over the Mountain Arcs */}
                  <g
                    ref={hopOrbGroupRef}
                    transform={`translate(${mountainHopSim.endNode.x.toFixed(1)}, ${mountainHopSim.endNode.y.toFixed(1)})`}
                  >
                    <circle
                      r="11"
                      fill={
                        !mountainHopSim.escaped
                          ? 'rgba(217, 140, 74, 0.22)'
                          : 'rgba(197, 232, 77, 0.24)'
                      }
                    />
                    <circle
                      r="5.8"
                      fill={
                        !mountainHopSim.escaped
                          ? '#D98C4A'
                          : thetaVal > 0.988
                            ? '#8D7AE6'
                            : '#C5E84D'
                      }
                      stroke="#EFEFE8"
                      strokeWidth="1.4"
                    />
                  </g>
                  <text
                    x={mountainHopSim.endNode.x}
                    y={mountainHopSim.endNode.y - 19}
                    textAnchor="middle"
                    className="dynamics-svg-tag dynamics-svg-tag--ivory"
                  >
                    t=200
                  </text>
                </svg>

                {/* INTEGRATED CONSOLE DOCK INSIDE THE LEFT CUTAWAY STAGE */}
                <div className="explore-cutaway-stage__dock">
                  <div className="explore-dock-slider">
                    <div className="explore-dock-slider__head">
                      <label htmlFor={`${idPrefix}-theta-slider`}>
                        Hệ số giảm bước nhảy{' '}
                        <MathFormula tex="\theta" ariaLabel="theta" />
                      </label>
                      <span>
                        <MathFormula tex="\theta =" ariaLabel="theta =" />{' '}
                        <strong>{thetaVal.toFixed(3)}</strong>
                      </span>
                    </div>
                    <input
                      id={`${idPrefix}-theta-slider`}
                      className="architectural-range architectural-range--on-dark"
                      type="range"
                      min={0.88}
                      max={1.0}
                      step={0.005}
                      value={thetaVal}
                      style={sliderCustomProps(thetaVal, 0.88, 1.0)}
                      aria-valuetext={`theta bằng ${thetaVal.toFixed(3)}`}
                      onChange={(e) => setThetaVal(Number(e.target.value))}
                    />
                  </div>

                  <div
                    className="explore-dock-presets"
                    role="group"
                    aria-label="Chọn nhanh ba chế độ làm nguội điển hình"
                  >
                    {[
                      { th: 0.9, note: 'Kẹt hố' },
                      { th: 0.97, note: 'Tối ưu' },
                      { th: 1.0, note: 'Dao động' },
                    ].map((item) => {
                      const isActive = Math.abs(thetaVal - item.th) < 0.0025;
                      return (
                        <button
                          key={item.th}
                          type="button"
                          aria-pressed={isActive}
                          className={`explore-dock-btn ${
                            isActive ? 'explore-dock-btn--active' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExploreEntered(true);
                            setThetaVal(item.th);
                          }}
                        >
                          <MathFormula
                            tex={`\\theta = ${item.th.toFixed(2)}`}
                            ariaLabel={`theta = ${item.th.toFixed(2)}`}
                          />{' '}
                          · {item.note}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { memo, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ExplorationSplitSection } from '../components/sections/ExplorationSplitSection';
import { FooterSection } from '../components/sections/FooterSection';
import { HeroSection } from '../components/sections/HeroSection';
import { ManifestoSection } from '../components/sections/ManifestoSection';
import { BlockReveal } from '../components/shared/BlockReveal';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { LandoSectionBlend } from '../components/shared/LandoSectionBlend';
import { LandoSignatureFlourish } from '../components/shared/LandoSignatureFlourish';
import { MathFormula } from '../components/shared/MathFormula';
import { useRouteCurtain } from '../components/shared/RouteCurtain';
import { OrchestratedFireflyHeroCanvas } from '../components/webgl/OrchestratedFireflyHeroCanvas';
import type { AppRoutePath } from '../lib/navigation';
import { useDataset } from '../lib/dataStore';
import { SciNumber } from '../lib/formatters';

gsap.registerPlugin(ScrollTrigger);

export interface HomePageProps {
  isActive?: boolean;
  reducedMotion: boolean;
  onScrollToSection: (id: string) => void;
}

function ChamferTopRightBorder() {
  return (
    <svg
      className="route-showcase-card__border"
      viewBox="0 0 400 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        points="0.75,0.75 370,0.75 399.25,30 399.25,319.25 0.75,319.25"
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export const HomePage = memo(function HomePage({
  isActive = true,
  reducedMotion,
  onScrollToSection,
}: HomePageProps) {
  const heroStageRef = useRef<HTMLElement>(null);
  const heroHudRef = useRef<HTMLDivElement>(null);
  const heroHudFrameRef = useRef<HTMLDivElement>(null);
  const heroCrtOverlayRef = useRef<HTMLDivElement>(null);
  const heroCenterpieceRef = useRef<HTMLDivElement>(null);
  const heroEyebrowRef = useRef<HTMLDivElement>(null);
  const heroMarqueeRef = useRef<HTMLDivElement>(null);
  const heroScrollProgressRef = useRef<number>(0);
  const heroStageGateRef = useRef<((inRange: boolean) => void) | null>(null);

  const showcaseRef = useRef<HTMLElement>(null);
  const { navigateWithCurtain } = useRouteCurtain();

  const convState = useDataset('convergence_iterations', true);

  const convLast =
    convState.data?.by_iterations[convState.data.by_iterations.length - 1] ??
    null;

  // Zero-layout-thrash Lando Sticky-Track Hero -> Manifesto scroll driver + imperative RAF gate (ZERO mid-scroll React re-render!)
  useEffect(() => {
    if (!isActive) {
      heroStageGateRef.current?.(false);
      heroMarqueeRef.current?.classList.add('lando-bridge-marquee--paused');
      return;
    }

    const stageEl = heroStageRef.current;
    if (!stageEl) return;

    let vh = Math.max(1, window.innerHeight);
    let lastActive: boolean | null = null;
    let lastMarqueePaused: boolean | null = null;

    const applyHeroScroll = () => {
      const sy = window.scrollY;
      const heroRunway = vh * 1.02;
      const p = Math.max(0, Math.min(1, sy / heroRunway));
      heroScrollProgressRef.current = p;

      const shouldBeActive = sy < vh * 2.25;
      if (shouldBeActive !== lastActive) {
        lastActive = shouldBeActive;
        heroStageGateRef.current?.(shouldBeActive);
      }

      // Pause marquee CSS animation when Hero canvas is 100% full-bleed (p < 0.015) or offscreen
      const shouldPauseMarquee = !shouldBeActive || p < 0.015;
      if (shouldPauseMarquee !== lastMarqueePaused) {
        lastMarqueePaused = shouldPauseMarquee;
        heroMarqueeRef.current?.classList.toggle(
          'lando-bridge-marquee--paused',
          shouldPauseMarquee
        );
      }
    };

    const onResize = () => {
      vh = Math.max(1, window.innerHeight);
      applyHeroScroll();
    };

    // Pause heavy WebGL hero simulation when off-screen
    let io: IntersectionObserver | null = null;
    const heroSecEl = document.getElementById('hero') ?? stageEl;
    const onHeroContentVisibility = (ev: Event) => {
      const skipped = Boolean((ev as Event & { skipped?: boolean }).skipped);
      if (skipped) {
        lastActive = false;
        heroStageGateRef.current?.(false);
      } else {
        applyHeroScroll();
      }
    };
    heroSecEl.addEventListener('contentvisibilityautostatechange', onHeroContentVisibility);

    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (!entry.isIntersecting) {
          lastActive = false;
          heroStageGateRef.current?.(false);
        } else {
          applyHeroScroll();
        }
      },
      { rootMargin: '120px', threshold: 0 }
    );
    io.observe(heroSecEl);

    // Pause below-the-fold showcase animations via contentvisibilityautostatechange + IO fallback
    const showcaseEl = showcaseRef.current;
    let showcaseIo: IntersectionObserver | null = null;
    const setShowcasePaused = (paused: boolean) => {
      showcaseEl
        ?.getAnimations({ subtree: true })
        .forEach((anim) => (paused ? anim.pause() : anim.play()));
    };
    const onShowcaseVisibility = (ev: Event) => {
      const skipped = Boolean((ev as Event & { skipped?: boolean }).skipped);
      setShowcasePaused(skipped);
    };
    showcaseEl?.addEventListener(
      'contentvisibilityautostatechange',
      onShowcaseVisibility
    );
    if (showcaseEl && !('contentVisibility' in document.documentElement.style)) {
      showcaseIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            setShowcasePaused(!entry.isIntersecting);
          });
        },
        { rootMargin: '200px' }
      );
      showcaseIo.observe(showcaseEl);
    }

    applyHeroScroll();
    const wakeRaf = window.requestAnimationFrame(applyHeroScroll);
    window.addEventListener('scroll', applyHeroScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(wakeRaf);
      io?.disconnect();
      showcaseIo?.disconnect();
      heroSecEl.removeEventListener('contentvisibilityautostatechange', onHeroContentVisibility);
      showcaseEl?.removeEventListener(
        'contentvisibilityautostatechange',
        onShowcaseVisibility
      );
      window.removeEventListener('scroll', applyHeroScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [isActive, reducedMotion]);

  useGSAP(
    () => {
      const sec = showcaseRef.current;
      if (!sec || reducedMotion) return;

      const diagrams = sec.querySelectorAll<HTMLElement>(
        '.route-showcase-card__diagram-inner'
      );
      diagrams.forEach((el, idx) => {
        gsap.fromTo(
          el,
          { y: 10 + idx * 3 },
          {
            y: -10 - idx * 3,
            ease: 'none',
            scrollTrigger: {
              trigger: sec,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      });
    },
    { scope: showcaseRef, dependencies: [reducedMotion] }
  );

  const cards: ReadonlyArray<{
    to: AppRoutePath;
    num: string;
    titleSans: string;
    titleSerif: string;
    desc: ReactNode;
    ctaText: string;
  }> = [
    {
      to: '/thuat-toan',
      num: '02',
      titleSans: 'Nguyên lý',
      titleSerif: 'hoạt động',
      desc: 'Công thức cập nhật vị trí, sơ đồ 5 bước lặp và ví dụ tính từng bước trong không gian 3 chiều.',
      ctaText: 'Xem nguyên lý',
    },
    {
      to: '/thuc-nghiem',
      num: '03',
      titleSans: 'Kết quả',
      titleSerif: 'thực nghiệm',
      desc: (
        <>
          Kiểm tra tốc độ hội tụ 10 chiều, thời gian chạy{' '}
          <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> và khả năng
          tìm đủ 4 đỉnh hàm Himmelblau.
        </>
      ),
      ctaText: 'Xem thực nghiệm',
    },
    {
      to: '/demo',
      num: '04',
      titleSans: 'Mô phỏng &',
      titleSerif: 'nén ảnh',
      desc: (
        <>
          Tự chỉnh tham số{' '}
          <MathFormula tex="n, \gamma, \theta" ariaLabel="n, gamma, theta" />{' '}
          trên 7 hàm chuẩn và thử ứng dụng gom cụm bảng màu cho ảnh 24-bit.
        </>
      ),
      ctaText: 'Mở chạy thử',
    },
  ];

  const marqueeRow1Text =
    'TỐI ƯU BẦY ĐÀN · THUẬT TOÁN ĐOM ĐÓM · XIN-SHE YANG 2008 ·';
  const marqueeRow2Text =
    'TỰ CHIA NHÓM ĐA CỰC TRỊ · KHÔNG CẦN ĐẠO HÀM · HỘI TỤ TOÀN CỤC ·';

  return (
    <>
      {/* 1. Lando Norris 2.08svh Sticky Hero -> Center Window + Fixed-In-Stage 2-Row Marquee + Neon-Lime Signature */}
      <section
        id="hero"
        ref={heroStageRef}
        className="lando-hero-sticky-track section-hero surface-dark"
        data-surface="dark"
        aria-labelledby="hero-heading"
      >
        <div className="lando-hero-sticky-item">
          <ContourBackdrop variant="olive" />

          {/* Top-center Lando Emblem + Eyebrow unveiled above the shrunk 472x306 center window */}
          <div
            ref={heroEyebrowRef}
            className="lando-bridge-top-eyebrow"
            aria-hidden="true"
          >
            <svg
              className="lando-bridge-top-eyebrow__mark"
              viewBox="0 0 56 32"
              fill="none"
            >
              <path
                d="M6 27 L11.5 5 H28 L26.7 10.2 H15.6 L14.1 16.2 H23.8 L22.5 21.2 H12.8 L11.4 27 H6 Z"
                fill="currentColor"
              />
              <path
                d="M27.2 27 L38.4 5 H44.8 L49.6 27 H44.1 L43.2 22.2 H34.8 L32.5 27 H27.2 Z M37.1 17.4 H42.3 L40.9 10.5 L37.1 17.4 Z"
                fill="currentColor"
              />
            </svg>
            <span className="lando-bridge-top-eyebrow__label">
              THUẬT TOÁN ĐOM ĐÓM · XIN-SHE YANG
            </span>
          </div>

          {/* 2-Row Full-Bleed Horizontal Band: Row 1 glides Left->Right, Row 2 glides Right->Left; scrolls UP together on scroll! */}
          <div
            ref={heroMarqueeRef}
            className="lando-bridge-marquee lando-bridge-marquee--paused"
            aria-hidden="true"
          >
            <div className="lando-bridge-marquee__row">
              <div className="lando-bridge-marquee__track lando-bridge-marquee__track--serif">
                <span className="lando-bridge-marquee__chunk">
                  {marqueeRow1Text}
                </span>
                <span className="lando-bridge-marquee__chunk">
                  {marqueeRow1Text}
                </span>
              </div>
            </div>

            <div className="lando-bridge-marquee__row">
              <div className="lando-bridge-marquee__track lando-bridge-marquee__track--sans">
                <span className="lando-bridge-marquee__chunk">
                  {marqueeRow2Text}
                </span>
                <span className="lando-bridge-marquee__chunk">
                  {marqueeRow2Text}
                </span>
              </div>
            </div>
          </div>

          {/* 3D Firefly Sanctuary WebGL Canvas: shrinks from 4 edges + scales into 472x306 center window */}
          <OrchestratedFireflyHeroCanvas
            reducedMotion={reducedMotion}
            scrollProgressRef={heroScrollProgressRef}
            hudContentRef={heroHudRef}
            hudFrameRef={heroHudFrameRef}
            crtOverlayRef={heroCrtOverlayRef}
            centerpieceRef={heroCenterpieceRef}
            eyebrowRef={heroEyebrowRef}
            stageActive={isActive}
            stageGateRef={heroStageGateRef}
            onActivatePortal={() => navigateWithCurtain('/demo')}
          />

          {/* Hero Centerpiece HUD + CRT screen overlay */}
          <HeroSection
            hudRef={heroHudRef}
            hudFrameRef={heroHudFrameRef}
            crtOverlayRef={heroCrtOverlayRef}
            centerpieceRef={heroCenterpieceRef}
            onScrollToManifesto={() => onScrollToSection('boi-canh')}
          />

          {/* Bold #D2FF00 Neon-Lime Calligraphic Signature slashing across the centered 472x306 Hero window */}
          <div className="lando-bridge-signature-stage" aria-hidden="true">
            <LandoSignatureFlourish
              variant="hero-bridge"
              triggerRef={heroStageRef}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </section>

      {/* 2. Matte-Olive Editorial Manifesto (`#24281E`) rising cleanly right underneath the sticky stage */}
      <ManifestoSection reducedMotion={reducedMotion} />

      <LandoSectionBlend
        from="olive"
        to="alabaster"
        reducedMotion={reducedMotion}
      />

      {/* 3. Lando Navier-Stokes Hard-Cutout Fluid-Ribbon Split Duality (#F3F2EC) */}
      <ExplorationSplitSection reducedMotion={reducedMotion} />

      <LandoSectionBlend
        from="alabaster"
        to="obsidian"
        reducedMotion={reducedMotion}
      />

      {/* 4. Refined Gallery Slate Chamfered Route Showcase (#101110 -> #161815 cards) */}
      <section
        id="lo-trinh-chuyen-sau"
        ref={showcaseRef}
        className="section-route-showcase"
        data-surface="dark"
        aria-labelledby="route-showcase-heading"
      >
        <ContourBackdrop variant="dark" />

        <div className="section-container">
          <div className="route-showcase-head">
            <div className="route-showcase-head__copy">
              <h2 id="route-showcase-heading" className="route-showcase-title">
                <span className="route-showcase-title__lines">
                  <BlockReveal
                    color="olive-lime"
                    delay={0}
                    reducedMotion={reducedMotion}
                  >
                    Công thức, kết quả thực nghiệm
                  </BlockReveal>
                  <BlockReveal
                    color="olive-lime"
                    delay={0.18}
                    reducedMotion={reducedMotion}
                  >
                    và{' '}
                    <span className="editorial-serif editorial-serif--sage-gold">
                      chạy thử trực tiếp
                    </span>
                  </BlockReveal>
                </span>
              </h2>
              <LandoSignatureFlourish
                variant="showcase-underline"
                reducedMotion={reducedMotion}
              />
            </div>

            <div className="route-showcase-kpi">
              <span>Sai số sau 500 vòng (3D)</span>
              <strong>
                {convLast ? (
                  <SciNumber value={convLast.fbest} sigDigits={2} />
                ) : (
                  <SciNumber value={1.01e-14} sigDigits={2} />
                )}
              </strong>
            </div>
          </div>

          <div className="route-showcase-grid">
            {cards.map((card, idx) => (
              <Link
                key={card.to}
                to={card.to}
                className={`route-showcase-card ${
                  idx === 1 ? 'route-showcase-card--stagger' : ''
                }`}
                onClick={(e) => navigateWithCurtain(card.to, e)}
              >
                <ChamferTopRightBorder />
                <span className="route-showcase-card__sweep" aria-hidden="true" />

                <div className="route-showcase-card__meta">
                  <span>{card.num}</span>
                </div>

                <div className="route-showcase-card__diagram" aria-hidden="true">
                  <div className="route-showcase-card__diagram-inner">
                    {idx === 0 ? (
                      <svg viewBox="0 0 320 116" fill="none">
                        <ellipse cx="216" cy="58" rx="74" ry="38" stroke="rgba(239,239,232,0.12)" strokeWidth="1" />
                        <ellipse cx="216" cy="58" rx="44" ry="23" stroke="rgba(182,201,110,0.28)" strokeWidth="1" />
                        <ellipse cx="216" cy="58" rx="18" ry="9.5" stroke="rgba(197,232,77,0.48)" strokeWidth="1" />
                        <path d="M42 88 Q124 46 206 58" stroke="#B6C96E" strokeWidth="1.35" />
                        <path d="M66 28 Q138 38 206 55" stroke="rgba(239,239,232,0.42)" strokeWidth="1.05" strokeDasharray="3 3" />
                        <circle cx="216" cy="58" r="4.2" fill="#C5E84D" />
                        <circle cx="42" cy="88" r="3" fill="#EFEFE8" />
                        <circle cx="66" cy="28" r="2.8" fill="#EFEFE8" opacity="0.75" />
                      </svg>
                    ) : idx === 1 ? (
                      <svg viewBox="0 0 320 116" fill="none">
                        <line x1="26" y1="96" x2="294" y2="96" stroke="rgba(239,239,232,0.14)" strokeWidth="1" />
                        <line x1="26" y1="60" x2="294" y2="60" stroke="rgba(239,239,232,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                        <path
                          d="M28 24 L86 46 L146 68 L216 85 L290 92"
                          stroke="#B6C96E"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M28 34 L98 40 L186 44 L290 46"
                          stroke="#8D7AE6"
                          strokeWidth="1.2"
                          strokeDasharray="4 3"
                        />
                        <circle cx="290" cy="92" r="4" fill="#C5E84D" />
                        <circle cx="146" cy="68" r="2.8" fill="#EFEFE8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 320 116" fill="none">
                        <rect x="28" y="20" width="118" height="76" rx="4" stroke="rgba(239,239,232,0.16)" strokeWidth="1" />
                        <circle cx="87" cy="58" r="22" stroke="rgba(182,201,110,0.34)" strokeWidth="1" strokeDasharray="3 2" />
                        <circle cx="87" cy="58" r="3.6" fill="#C5E84D" />
                        <line x1="164" y1="20" x2="164" y2="96" stroke="rgba(239,239,232,0.1)" strokeWidth="1" />
                        <polygon points="232,24 274,42 274,80 232,96 190,80 190,42" stroke="rgba(239,239,232,0.24)" strokeWidth="1" />
                        <path d="M190,42 L232,58 L274,42 M232,58 L232,96" stroke="rgba(141,122,230,0.48)" strokeWidth="1" />
                        <circle cx="232" cy="58" r="3.2" fill="#8D7AE6" />
                        <circle cx="250" cy="48" r="2.5" fill="#EFEFE8" />
                        <circle cx="216" cy="70" r="2.5" fill="#B6C96E" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="route-showcase-card__body">
                  <h3 className="route-showcase-card__heading">
                    {card.titleSans}{' '}
                    <span className="editorial-serif editorial-serif--sage-gold">
                      {card.titleSerif}
                    </span>
                  </h3>
                  <p className="route-showcase-card__desc">{card.desc}</p>
                </div>

                <div className="route-showcase-card__foot">
                  <span>{card.ctaText}</span>
                  <span className="route-showcase-card__arrow" aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
});

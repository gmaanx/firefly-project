import { useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export type LandoSignatureVariant =
  | 'hero-bridge'
  | 'editorial-signoff'
  | 'showcase-underline';

export interface LandoSignatureFlourishProps {
  variant: LandoSignatureVariant;
  reducedMotion: boolean;
  triggerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Calligraphic vector flourishes modeled on `landonorris.com`:
 * - `hero-bridge`: Bold `#D2FF00` neon-lime marker signature slashing diagonally & looping
 *   across the centered `472x306` Hero frame before scrolling up together with the sticky stage.
 * - `editorial-signoff`: Delicate olive-ink pen signoff along the Dynamics `01 -> 02` spine.
 * - `showcase-underline`: Restrained sage-gold calligraphic stroke beneath the Route Showcase title.
 */
export function LandoSignatureFlourish({
  variant,
  reducedMotion,
  triggerRef,
  className = '',
}: LandoSignatureFlourishProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const svg = svgRef.current;
      if (!svg) return;

      const paths = Array.from(
        svg.querySelectorAll<SVGPathElement>('.js-lando-sig-path')
      );
      if (paths.length === 0) return;

      if (reducedMotion) {
        svg.style.opacity = variant === 'hero-bridge' ? '0.96' : '1';
        paths.forEach((p) => {
          p.style.strokeDasharray = 'none';
          p.style.strokeDashoffset = '0';
          p.style.opacity = '1';
        });
        return;
      }

      paths.forEach((p) => {
        const len = Math.ceil(p.getTotalLength() + 4);
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.style.opacity = '0';
      });

      if (variant === 'hero-bridge') {
        const triggerEl = triggerRef?.current ?? svg;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerEl,
            start: () => `top+=${Math.round(window.innerHeight * 0.36)} top`,
            end: () => `top+=${Math.round(window.innerHeight * 0.88)} top`,
            scrub: 0.28,
            invalidateOnRefresh: true,
          },
        });

        // 1. Tall diagonal spine slash (top-right overhang -> bottom-center overhang)
        if (paths[0]) {
          tl.set(paths[0], { opacity: 1 }, 0.0);
          tl.to(
            paths[0],
            { strokeDashoffset: 0, ease: 'power1.inOut', duration: 0.28 },
            0.0
          );
        }
        // 2. Grand sweeping calligraphic loop + rapid mid-center cursive peaks
        if (paths[1]) {
          tl.set(paths[1], { opacity: 1 }, 0.22);
          tl.to(
            paths[1],
            { strokeDashoffset: 0, ease: 'none', duration: 0.5 },
            0.22
          );
        }
        // 3. Long razor horizontal-diagonal whip stroke across left & right borders
        if (paths[2]) {
          tl.set(paths[2], { opacity: 1 }, 0.68);
          tl.to(
            paths[2],
            { strokeDashoffset: 0, ease: 'power1.out', duration: 0.32 },
            0.68
          );
        }
      } else {
        gsap.to(paths, {
          opacity: 1,
          strokeDashoffset: 0,
          duration: 0.95,
          stagger: 0.16,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: svg,
            start: 'top 86%',
            once: true,
          },
        });
      }
    },
    { scope: svgRef, dependencies: [reducedMotion, variant, triggerRef] }
  );

  if (variant === 'hero-bridge') {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 800 570"
        fill="none"
        aria-hidden="true"
        className={`lando-sig lando-sig--hero-bridge ${className}`.trim()}
      >
        {/* Stroke 1: Commanding diagonal ascender-to-descender slash breaking top & bottom box edges */}
        <path
          className="js-lando-sig-path"
          d="M 508 62 C 446 168, 372 326, 294 508"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Stroke 2: Wide sweeping Lando marker loop + energetic italic center peaks */}
        <path
          className="js-lando-sig-path"
          d="M 122 396 C 244 266, 456 132, 588 124 C 634 121, 626 168, 566 228 C 484 312, 368 426, 336 468 C 366 404, 412 318, 438 282 C 420 336, 396 392, 386 424 C 418 372, 454 318, 478 294 C 464 336, 450 368, 444 388 C 470 354, 496 324, 518 308"
          stroke="currentColor"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Stroke 3: Razor-sharp long cross-whip extending outside both left & right box edges */}
        <path
          className="js-lando-sig-path"
          d="M 118 398 C 282 362, 496 312, 688 272"
          stroke="currentColor"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === 'editorial-signoff') {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 186 46"
        fill="none"
        aria-hidden="true"
        className={`lando-sig lando-sig--editorial-signoff ${className}`.trim()}
      >
        <path
          className="js-lando-sig-path"
          d="M 10 32 C 42 12, 68 8, 76 16 C 83 23, 52 36, 44 31 C 37 27, 86 14, 134 18 C 154 20, 166 22, 176 17"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="js-lando-sig-path"
          d="M 96 10 L 82 38"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 260 34"
      fill="none"
      aria-hidden="true"
      className={`lando-sig lando-sig--showcase-underline ${className}`.trim()}
    >
      <path
        className="js-lando-sig-path"
        d="M 6 22 C 68 9, 148 8, 238 14 C 204 18, 152 24, 118 27 C 158 26, 212 22, 252 19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

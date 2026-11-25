import { useRef } from 'react';
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
  className?: string;
}

/**
 * Restrained calligraphic vector flourishes inspired by `landonorris.com`:
 * - `hero-bridge`: Expressive diagonal multi-loop marker stroke scrubbed across the Hero -> Manifesto transition.
 * - `editorial-signoff`: Delicate single-pen olive ink signoff tucked cleanly along the Dynamics continuum spine.
 * - `showcase-underline`: Subtle sage-gold calligraphic loop drawn once beneath the Route Showcase title.
 */
export function LandoSignatureFlourish({
  variant,
  reducedMotion,
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
        paths.forEach((p) => {
          p.style.strokeDasharray = 'none';
          p.style.strokeDashoffset = '0';
        });
        return;
      }

      paths.forEach((p) => {
        const len = Math.ceil(p.getTotalLength() + 2);
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });

      if (variant === 'hero-bridge') {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: svg,
            start: 'top 92%',
            end: 'bottom 36%',
            scrub: 0.45,
          },
        });
        paths.forEach((p, idx) => {
          tl.to(
            p,
            {
              strokeDashoffset: 0,
              ease: 'none',
              duration: idx === 0 ? 0.68 : 0.42,
            },
            idx === 0 ? 0 : 0.46
          );
        });
      } else {
        gsap.to(paths, {
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
    { scope: svgRef, dependencies: [reducedMotion, variant] }
  );

  if (variant === 'hero-bridge') {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 680 230"
        fill="none"
        aria-hidden="true"
        className={`lando-sig lando-sig--hero-bridge ${className}`.trim()}
      >
        {/* Sweeping calligraphic Lando marker loop + crisp cross-slash */}
        <path
          className="js-lando-sig-path"
          d="M 52 168 C 164 118, 336 48, 434 24 C 462 17, 456 42, 412 72 C 324 132, 168 182, 146 174 C 128 168, 224 114, 396 62 C 492 33, 578 18, 636 14"
          stroke="currentColor"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="js-lando-sig-path"
          d="M 358 18 C 332 76, 294 148, 266 208 M 404 34 C 384 82, 358 138, 340 182"
          stroke="currentColor"
          strokeWidth="5.5"
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

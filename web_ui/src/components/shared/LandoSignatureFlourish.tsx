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

        // 1. Bold UP Treble-Clef (`𝄞`) spiral + slanted spine + full-width cross-window whip
        if (paths[0]) {
          tl.set(paths[0], { opacity: 1 }, 0.0);
          tl.to(
            paths[0],
            { strokeDashoffset: 0, ease: 'power1.inOut', duration: 0.62 },
            0.0
          );
        }
        // 2. Stylized crisp UP `"Mẫn"` signature monogram slashing above the whip
        if (paths[1]) {
          tl.set(paths[1], { opacity: 1 }, 0.56);
          tl.to(
            paths[1],
            { strokeDashoffset: 0, ease: 'none', duration: 0.44 },
            0.56
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
        {/* Stroke 1: Authentic UP Secret-Letter Treble-Clef (`𝄞`) + taut slanted spine + full-width whip */}
        <path
          className="js-lando-sig-path"
          d="M 204.3 253.1 C 203.6 244.7, 194.3 209.1, 199.7 200.0 C 205.1 191.0, 232.4 188.8, 238.4 196.1 C 244.4 203.5, 243.0 231.6, 237.7 246.6 C 232.4 261.5, 217.6 281.0, 205.2 290.7 C 192.8 300.3, 172.7 307.8, 159.5 307.4 C 146.2 307.1, 128.0 299.1, 121.6 288.5 C 115.3 277.9, 113.4 253.9, 119.4 240.5 C 125.3 227.0, 145.9 214.1, 159.1 203.6 C 172.4 193.2, 189.2 183.6, 203.1 174.4 C 217.1 165.2, 234.9 157.1, 247.3 145.6 C 259.7 134.2, 273.7 117.5, 281.7 102.1 C 289.7 86.8, 299.0 57.8, 297.9 48.6 C 296.8 39.4, 282.2 36.6, 274.9 44.2 C 267.6 51.7, 258.1 79.7, 251.7 96.4 C 245.3 113.0, 239.0 132.6, 234.3 149.5 C 229.6 166.4, 225.6 186.2, 221.8 203.2 C 218.0 220.2, 213.1 239.9, 210.0 257.0 C 207.0 274.1, 204.9 293.9, 202.4 310.9 C 199.9 328.0, 197.8 347.6, 194.2 364.6 C 190.7 381.6, 185.6 401.3, 180.1 418.1 C 174.6 434.9, 167.6 455.1, 159.5 470.9 C 151.4 486.6, 141.0 506.7, 128.9 517.6 C 116.9 528.5, 94.6 540.8, 83.4 539.6 C 72.3 538.4, 59.3 522.8, 58.4 509.8 C 57.6 496.8, 69.0 472.2, 78.1 457.6 C 87.3 443.1, 103.5 429.0, 116.5 417.8 C 129.4 406.6, 145.9 396.0, 159.7 386.8 C 173.6 377.6, 175.2 374.1, 204.1 359.8 C 233.0 345.5, 298.3 312.6, 342.3 296.4 C 386.3 280.3, 437.6 268.1, 481.9 257.8 C 526.1 247.4, 579.9 236.6, 622.0 231.1 C 664.2 225.6, 728.1 224.2, 748.0 223.0"
          stroke="currentColor"
          strokeWidth="10.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Stroke 2: Authentic UP Secret-Letter `"Mẫn"` fast calligraphic monogram hardened to Lando marker weight */}
        <path
          className="js-lando-sig-path"
          d="M 284.3 284.7 C 293.2 275.7, 332.4 241.5, 349.3 218.5 C 366.2 195.5, 400.5 118.4, 408.0 116.1 C 415.5 113.8, 401.3 194.6, 404.1 201.8 C 406.8 209.0, 421.9 180.4, 428.1 168.7 C 434.3 156.9, 447.1 114.7, 449.7 115.8 C 452.3 117.0, 446.8 163.2, 447.1 177.3 C 447.4 191.4, 447.4 216.3, 452.1 219.2 C 456.8 222.1, 473.8 205.1, 481.4 198.5 C 489.0 191.8, 507.1 168.9, 507.9 170.6 C 508.7 172.4, 486.9 206.5, 487.2 211.3 C 487.6 216.0, 505.0 210.0, 510.6 205.1 C 516.1 200.3, 523.3 175.6, 527.8 175.7 C 532.3 175.7, 537.9 204.4, 543.5 205.3 C 549.1 206.1, 563.9 182.4, 568.9 181.9 C 573.9 181.4, 571.7 200.4, 580.2 201.5 C 588.7 202.5, 615.6 192.0, 631.4 189.8 C 647.1 187.7, 686.7 186.5, 695.5 185.9"
          stroke="currentColor"
          strokeWidth="9.4"
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

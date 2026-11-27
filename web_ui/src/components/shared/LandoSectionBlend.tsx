import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export type LandoSurfaceTone = 'olive' | 'olive-dark' | 'alabaster' | 'obsidian';

export interface LandoSectionBlendProps {
  from: LandoSurfaceTone;
  to: LandoSurfaceTone;
  reducedMotion?: boolean;
}

/**
 * Authentic Lando Norris `.exe-top-visor` sculpted elliptical section transition.
 * Driven via pure GPU compositor `transform: scaleY(...)` on an SVG elliptical visor arch
 * (0.00ms paint cost — zero CPU `clip-path: ellipse(...)` re-rasterization during scroll!).
 */
export function LandoSectionBlend({
  from,
  to,
  reducedMotion = false,
}: LandoSectionBlendProps) {
  const bridgeRef = useRef<HTMLDivElement>(null);
  const archSvgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const bridge = bridgeRef.current;
      const archSvg = archSvgRef.current;
      if (!bridge || !archSvg) return;

      if (reducedMotion) {
        archSvg.style.transform = 'scaleY(0.68)';
        return;
      }

      gsap.fromTo(
        archSvg,
        { scaleY: 0.18 },
        {
          scaleY: 0.96,
          ease: 'none',
          scrollTrigger: {
            trigger: bridge,
            start: 'top 98%',
            end: 'bottom 8%',
            scrub: true,
          },
        }
      );
    },
    { scope: bridgeRef, dependencies: [reducedMotion] }
  );

  return (
    <div
      ref={bridgeRef}
      className={`lando-visor-bridge lando-visor-bridge--to-${to}`}
      aria-hidden="true"
    >
      <svg
        ref={archSvgRef}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className={`lando-visor-bridge__svg lando-visor-bridge__svg--from-${from}`}
      >
        <path
          d="M0,-4 H1440 V28 C1120,100 320,100 0,28 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

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
 * Uses an adjacent decorative container (zero text clipping, zero blurry linear-gradient fade)
 * whose curved visor arch scrubs smoothly with scroll via GPU `clip-path: ellipse(...)`.
 */
export function LandoSectionBlend({
  from,
  to,
  reducedMotion = false,
}: LandoSectionBlendProps) {
  const bridgeRef = useRef<HTMLDivElement>(null);
  const archRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const bridge = bridgeRef.current;
      const arch = archRef.current;
      if (!bridge || !arch) return;

      if (reducedMotion) {
        arch.style.clipPath = 'ellipse(72% 68% at 50% 0%)';
        return;
      }

      gsap.fromTo(
        arch,
        { clipPath: 'ellipse(74% 16% at 50% 0%)' },
        {
          clipPath: 'ellipse(70% 96% at 50% 0%)',
          ease: 'none',
          scrollTrigger: {
            trigger: bridge,
            start: 'top 96%',
            end: 'bottom 10%',
            scrub: 0.35,
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
      <div
        ref={archRef}
        className={`lando-visor-bridge__arch lando-visor-bridge__arch--from-${from}`}
      />
    </div>
  );
}

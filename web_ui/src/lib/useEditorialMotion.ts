import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Masked editorial headline & supporting element reveal using GSAP ScrollTrigger.
 * Automatically reverts and snaps to rest state under reducedMotion.
 */
export function useSectionReveal(
  scopeRef: RefObject<HTMLElement | null>,
  reducedMotion: boolean
): void {
  useGSAP(
    () => {
      const el = scopeRef.current;
      if (!el || reducedMotion) return;

      const lines = el.querySelectorAll<HTMLElement>('.reveal-line');
      if (lines.length > 0) {
        gsap.fromTo(
          lines,
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 0.75,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
          }
        );
      }

      const fades = el.querySelectorAll<HTMLElement>('.reveal-fade');
      if (fades.length > 0) {
        gsap.fromTo(
          fades,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.06,
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          }
        );
      }
    },
    { scope: scopeRef, dependencies: [reducedMotion] }
  );
}

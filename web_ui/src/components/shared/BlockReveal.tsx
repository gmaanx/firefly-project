import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export type BlockRevealColor = 'lime' | 'olive-lime' | 'violet' | 'dark';

export interface BlockRevealProps {
  children: ReactNode;
  color?: BlockRevealColor;
  delay?: number;
  immediate?: boolean;
  reducedMotion?: boolean;
  as?: 'span' | 'div';
  className?: string;
}

/**
 * Signature landonorris.com `data-anim-high="right, lime | violet"` left-to-right
 * rectangle block-wipe reveal. Guarantees underlying text becomes 100% visible
 * and the wipe bar hides cleanly at completion (zero stuck overlays).
 */
export function BlockReveal({
  children,
  color = 'lime',
  delay = 0,
  immediate = false,
  reducedMotion = false,
  as = 'span',
  className = '',
}: BlockRevealProps) {
  const wrapRef = useRef<HTMLSpanElement & HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const content = contentRef.current;
      const bar = barRef.current;
      if (!wrap || !content || !bar) return;

      const sysReduced =
        reducedMotion ||
        document.documentElement.dataset.reducedMotion === 'true' ||
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

      if (sysReduced) {
        gsap.set(content, { opacity: 1 });
        gsap.set(bar, { scaleX: 0, visibility: 'hidden' });
        return;
      }

      gsap.set(content, { opacity: 0 });
      gsap.set(bar, {
        visibility: 'visible',
        scaleX: 0,
        transformOrigin: 'left center',
      });

      const triggerEl = wrap.closest('h1, h2, h3') ?? wrap;

      const tl = gsap.timeline({
        delay,
        scrollTrigger: immediate
          ? undefined
          : {
              trigger: triggerEl,
              start: 'top 91%',
              once: true,
            },
      });

      tl.to(bar, {
        scaleX: 1,
        duration: 0.38,
        ease: 'expo.inOut',
      })
        .set(content, { opacity: 1 })
        .set(bar, { transformOrigin: 'right center' })
        .to(bar, {
          scaleX: 0,
          duration: 0.38,
          ease: 'expo.inOut',
        })
        .set(bar, { visibility: 'hidden' });

      return () => {
        tl.kill();
        gsap.set(content, { opacity: 1 });
        gsap.set(bar, { scaleX: 0, visibility: 'hidden' });
      };
    },
    { scope: wrapRef, dependencies: [color, delay, immediate, reducedMotion] }
  );

  const Tag = as;
  return (
    <Tag
      ref={wrapRef}
      className={`block-reveal ${className}`}
      data-anim-high={`right, ${color}`}
    >
      <span ref={contentRef} className="block-reveal__content">
        {children}
      </span>
      <span
        ref={barRef}
        className={`block-reveal__bar block-reveal__bar--${color}`}
        aria-hidden="true"
      />
    </Tag>
  );
}

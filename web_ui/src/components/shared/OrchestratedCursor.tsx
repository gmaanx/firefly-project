import { useEffect, useRef } from 'react';
import type { AppRoutePath } from '../../lib/navigation';

export interface OrchestratedCursorProps {
  activeRoute: AppRoutePath;
  menuOpen: boolean;
  qaOpen: boolean;
  reducedMotion: boolean;
}

const INTERACTIVE_SELECTOR =
  'a[href], button:not(:disabled), [role="button"], [role="slider"], [role="tab"], [data-cursor-ring], [data-hover-panel], label, summary, input, select, textarea';

const DARK_ISLAND_SELECTOR =
  '.explore-cutaway-stage, .exp-notch-card, .phase-card--active, .flowchart-formula-spotlight, .flowchart-loop-pill, .top-nav--on-dark, .top-nav--menu-open, .split-menu-dialog, dialog';

function computeHeroCenterAngleDeg(x: number, y: number): number {
  return (
    Math.atan2(window.innerHeight * 0.5 - y, window.innerWidth * 0.5 - x) *
    (180 / Math.PI)
  );
}

/**
 * Ultra-lightweight GPU-composited custom cursor:
 * - Zero `document.elementFromPoint` scroll layout thrashing.
 * - Zero `backdrop-close` (`×`) blob overlapping the menu button or dialogs.
 * - Sleeps (`rafId = 0`) automatically as soon as the pointer comes to rest!
 */
export function OrchestratedCursor({
  activeRoute,
  menuOpen,
  qaOpen,
  reducedMotion,
}: OrchestratedCursorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const arrowWrapRef = useRef<HTMLDivElement>(null);

  const routeRef = useRef<AppRoutePath>(activeRoute);
  const overlayRef = useRef<boolean>(menuOpen || qaOpen);
  routeRef.current = activeRoute;
  overlayRef.current = menuOpen || qaOpen;

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const rootEl = rootRef.current;
    const dotEl = dotRef.current;
    const arrowEl = arrowWrapRef.current;
    if (!rootEl || !dotEl || !arrowEl) return;

    let pointerSeen = document.documentElement.hasAttribute('data-pointer-seen');
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.5;
    let curX = targetX;
    let curY = targetY;
    let arrX = targetX - 31;
    let arrY = targetY - 31;
    let rafId = 0;

    let isRing = false;
    let isLight = false;
    let showArrow = false;

    const syncStyles = (
      nextRing: boolean,
      nextLight: boolean,
      nextArrow: boolean
    ) => {
      if (nextRing !== isRing || nextLight !== isLight) {
        isRing = nextRing;
        isLight = nextLight;
        if (nextRing) {
          dotEl.style.backgroundColor = 'rgba(255, 255, 255, 0)';
          dotEl.style.borderColor = nextLight
            ? 'rgba(20, 21, 19, 0.88)'
            : 'rgba(255, 255, 255, 0.9)';
        } else {
          dotEl.style.backgroundColor = nextLight
            ? 'rgba(20, 21, 19, 0.94)'
            : 'rgba(255, 255, 255, 1)';
          dotEl.style.borderColor = 'rgba(255, 255, 255, 0)';
        }
      }

      if (nextArrow !== showArrow) {
        showArrow = nextArrow;
        arrowEl.style.opacity = nextArrow ? '1' : '0';
        arrowEl.style.visibility = nextArrow ? 'visible' : 'hidden';
      }
    };

    const tick = () => {
      const dx = targetX - curX;
      const dy = targetY - curY;
      curX += dx * 0.28;
      curY += dy * 0.28;

      const scale = isRing ? 1 : 0.5;
      dotEl.style.transform = `translate3d(${(curX - 14).toFixed(1)}px, ${(curY - 14).toFixed(1)}px, 0) scale(${scale})`;

      if (showArrow) {
        arrX += (targetX - 31 - arrX) * 0.45;
        arrY += (targetY - 31 - arrY) * 0.45;
        const deg = computeHeroCenterAngleDeg(targetX, targetY);
        arrowEl.style.transform = `translate3d(${arrX.toFixed(1)}px, ${arrY.toFixed(1)}px, 0) rotate(${deg.toFixed(1)}deg)`;
      }

      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        curX = targetX;
        curY = targetY;
        dotEl.style.transform = `translate3d(${(curX - 14).toFixed(1)}px, ${(curY - 14).toFixed(1)}px, 0) scale(${scale})`;
        rafId = 0;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;

      targetX = e.clientX;
      targetY = e.clientY;

      if (!pointerSeen) {
        pointerSeen = true;
        curX = targetX;
        curY = targetY;
        arrX = targetX - 31;
        arrY = targetY - 31;
        document.documentElement.setAttribute('data-pointer-seen', '');
      }

      const target = e.target instanceof Element ? e.target : null;
      const isInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      const inLightSection =
        !overlayRef.current &&
        Boolean(target?.closest('[data-surface="light"]')) &&
        !target?.closest(DARK_ISLAND_SELECTOR);
      const inHeroZone =
        routeRef.current === '/' &&
        !overlayRef.current &&
        !isInteractive &&
        window.scrollY < window.innerHeight * 0.52 &&
        targetY > 68;

      syncStyles(isInteractive, inLightSection, inHeroZone);

      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      rootEl.style.opacity = '0';
    };
    const onEnter = () => {
      rootEl.style.opacity = '1';
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if ((menuOpen || qaOpen) && arrowWrapRef.current) {
      arrowWrapRef.current.style.opacity = '0';
      arrowWrapRef.current.style.visibility = 'hidden';
    }
  }, [activeRoute, menuOpen, qaOpen]);

  if (reducedMotion) {
    return null;
  }

  return (
    <div ref={rootRef} className="orch-custom-cursor" aria-hidden="true">
      <div className="orch-cursor-dot-wrap">
        <div ref={dotRef} className="orch-cursor-dot" />
      </div>

      <div ref={arrowWrapRef} className="orch-cursor-arrow" style={{ opacity: 0, visibility: 'hidden' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 18 18"
          fill="none"
          className="orch-cursor-arrow__svg"
        >
          <path
            d="M15.5 7.268C16.833 8.038 16.833 9.962 15.5 10.732L5.75 16.361C4.417 17.131 2.75 16.169 2.75 14.629V3.371C2.75 1.831 4.417 0.869 5.75 1.639L15.5 7.268Z"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

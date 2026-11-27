import { useEffect, useRef } from 'react';
import gsap from 'gsap';
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
  '.explore-cutaway-stage, .exp-notch-card, .phase-card--active, .flowchart-formula-spotlight, .flowchart-loop-pill, .top-nav, .split-menu, dialog';

const MODAL_CONTENT_SELECTOR = '.exp-modal__inner, .qa-drawer__inner';

type CursorVisualMode = 'dot' | 'ring' | 'backdrop-close';

function computeHeroCenterAngleDeg(x: number, y: number): number {
  return (
    Math.atan2(window.innerHeight * 0.5 - y, window.innerWidth * 0.5 - x) *
    (180 / Math.PI)
  );
}

/**
 * 1:1 Custom Cursor ported directly from Orchestrated (`orchestrated.nl`):
 * - `CursorDot`: `14px` solid circle trailing pointer via GSAP `quickTo` (`0.45s`, `power3.out`),
 *   morphing smoothly (`0.3s`, `expo.out`) into a `28px` `2px` hollow ring over interactive controls,
 *   or an `80px` frosted-glass close badge (`×`) over open `<dialog>` backdrops.
 * - `CursorArrow`: `62px` orbit container with `18px` rounded hollow play-triangle (`0.1s` `quickTo`)
 *   pointing continuously toward the Hero sanctuary center while at the top of `/`.
 * - Automatically adapts ink contrast (`#ffffff` on dark/olive vs `#141513` on light `#F3F2EC` paper)
 *   and disables cleanly on touch devices or `reducedMotion`.
 */
export function OrchestratedCursor({
  activeRoute,
  menuOpen,
  qaOpen,
  reducedMotion,
}: OrchestratedCursorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const crossWrapRef = useRef<HTMLDivElement>(null);
  const arrowWrapRef = useRef<HTMLDivElement>(null);

  const routeRef = useRef<AppRoutePath>(activeRoute);
  const menuOpenRef = useRef<boolean>(menuOpen);
  const overlayRef = useRef<boolean>(menuOpen || qaOpen);
  routeRef.current = activeRoute;
  menuOpenRef.current = menuOpen;
  overlayRef.current = menuOpen || qaOpen;

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dotEl = dotRef.current;
    const crossEl = crossWrapRef.current;
    const arrowEl = arrowWrapRef.current;
    if (!dotEl || !crossEl || !arrowEl) return;

    gsap.set(dotEl, { xPercent: -50, yPercent: -50, scale: 0.5 });
    gsap.set(crossEl, { xPercent: -50, yPercent: -50 });
    gsap.set(arrowEl, { autoAlpha: 0, scale: 0.9 });

    const dotX = gsap.quickTo(dotEl, 'x', { duration: 0.45, ease: 'power3.out' });
    const dotY = gsap.quickTo(dotEl, 'y', { duration: 0.45, ease: 'power3.out' });
    const crossX = gsap.quickTo(crossEl, 'x', { duration: 0.3, ease: 'power3.out' });
    const crossY = gsap.quickTo(crossEl, 'y', { duration: 0.3, ease: 'power3.out' });
    const arrowX = gsap.quickTo(arrowEl, 'x', { duration: 0.1, ease: 'expo.out' });
    const arrowY = gsap.quickTo(arrowEl, 'y', { duration: 0.1, ease: 'expo.out' });

    let pointerSeen = document.documentElement.hasAttribute('data-pointer-seen');
    let lastX = window.innerWidth * 0.5;
    let lastY = window.innerHeight * 0.5;
    let currentMode: CursorVisualMode = 'dot';
    let currentLightSurface = false;
    let arrowVisible = false;

    const applyVisualState = (
      nextMode: CursorVisualMode,
      onLightSurface: boolean,
      shouldShowArrow: boolean
    ) => {
      if (nextMode !== currentMode || onLightSurface !== currentLightSurface) {
        currentMode = nextMode;
        currentLightSurface = onLightSurface;

        gsap.killTweensOf(dotEl, 'scale,backgroundColor,borderColor');

        if (nextMode === 'backdrop-close') {
          gsap.to(dotEl, {
            scale: 2.85,
            backgroundColor: 'rgba(24, 26, 23, 0.86)',
            borderColor: 'rgba(255, 255, 255, 0.16)',
            duration: 0.34,
            ease: 'expo.out',
          });
          gsap.to(crossEl, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.28,
            ease: 'expo.out',
            overwrite: 'auto',
          });
        } else if (nextMode === 'ring') {
          gsap.to(dotEl, {
            scale: 1,
            backgroundColor: 'rgba(255, 255, 255, 0)',
            borderColor: onLightSurface
              ? 'rgba(20, 21, 19, 0.88)'
              : 'rgba(255, 255, 255, 0.9)',
            duration: 0.3,
            ease: 'expo.out',
          });
          gsap.to(crossEl, {
            autoAlpha: 0,
            scale: 0.5,
            duration: 0.2,
            ease: 'expo.out',
            overwrite: 'auto',
          });
        } else {
          gsap.to(dotEl, {
            scale: 0.5,
            backgroundColor: onLightSurface
              ? 'rgba(20, 21, 19, 0.94)'
              : 'rgba(255, 255, 255, 1)',
            borderColor: 'rgba(255, 255, 255, 0)',
            duration: 0.3,
            ease: 'expo.out',
          });
          gsap.to(crossEl, {
            autoAlpha: 0,
            scale: 0.5,
            duration: 0.2,
            ease: 'expo.out',
            overwrite: 'auto',
          });
        }
      }

      if (shouldShowArrow !== arrowVisible) {
        arrowVisible = shouldShowArrow;
        gsap.to(arrowEl, {
          autoAlpha: shouldShowArrow ? 1 : 0,
          scale: shouldShowArrow ? 1 : 0.86,
          duration: shouldShowArrow ? 0.28 : 0.18,
          ease: 'expo.out',
          overwrite: 'auto',
        });
      }
    };

    const liveDialogs = document.getElementsByTagName('dialog');
    const hasOpenDialog = (): boolean => {
      for (let i = 0; i < liveDialogs.length; i += 1) {
        if (liveDialogs[i].open) return true;
      }
      return false;
    };

    const evaluateTarget = (target: Element | null, x: number, y: number) => {
      if (hasOpenDialog()) {
        const insideModal = Boolean(target?.closest(MODAL_CONTENT_SELECTOR));
        if (!insideModal) {
          applyVisualState('backdrop-close', false, false);
          return;
        }
        const isInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
        applyVisualState(isInteractive ? 'ring' : 'dot', false, false);
        return;
      }

      if (menuOpenRef.current && target?.classList.contains('menu-backdrop')) {
        applyVisualState('backdrop-close', false, false);
        return;
      }

      const inLightSection =
        !overlayRef.current &&
        Boolean(target?.closest('[data-surface="light"]')) &&
        !target?.closest(DARK_ISLAND_SELECTOR);

      const isInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      const inHeroZone =
        routeRef.current === '/' &&
        !overlayRef.current &&
        !isInteractive &&
        window.scrollY < window.innerHeight * 0.52 &&
        y > 68;

      applyVisualState(
        isInteractive ? 'ring' : 'dot',
        inLightSection,
        inHeroZone
      );

      if (inHeroZone) {
        gsap.set(arrowEl, { rotation: computeHeroCenterAngleDeg(x, y) });
      }
    };

    let pendingTarget: Element | null = null;
    let moveRafId = 0;

    const flushPointerMove = () => {
      moveRafId = 0;
      if (!pointerSeen) {
        pointerSeen = true;
        document.documentElement.setAttribute('data-pointer-seen', '');
        gsap.set([dotEl, crossEl], { x: lastX, y: lastY });
        gsap.set(arrowEl, {
          x: lastX - 31,
          y: lastY - 31,
          rotation: computeHeroCenterAngleDeg(lastX, lastY),
        });
      } else {
        dotX(lastX);
        dotY(lastY);
        crossX(lastX);
        crossY(lastY);
        arrowX(lastX - 31);
        arrowY(lastY - 31);
      }

      evaluateTarget(pendingTarget, lastX, lastY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;

      lastX = e.clientX;
      lastY = e.clientY;
      pendingTarget = e.target instanceof Element ? e.target : null;

      if (!moveRafId) {
        moveRafId = window.requestAnimationFrame(flushPointerMove);
      }
    };

    let lastScrollHitTs = 0;
    let scrollSettleTimer = 0;

    const runScrollHitTest = () => {
      lastScrollHitTs = performance.now();
      const hovered = document.elementFromPoint(lastX, lastY);
      evaluateTarget(hovered, lastX, lastY);
    };

    const onScroll = () => {
      if (!pointerSeen) return;
      const now = performance.now();
      if (now - lastScrollHitTs >= 96) {
        runScrollHitTest();
      }
      window.clearTimeout(scrollSettleTimer);
      scrollSettleTimer = window.setTimeout(runScrollHitTest, 120);
    };

    const onPointerLeaveWindow = () => {
      if (!rootRef.current) return;
      gsap.to(rootRef.current, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
    };

    const onPointerEnterWindow = () => {
      if (!rootRef.current) return;
      gsap.to(rootRef.current, { autoAlpha: 1, duration: 0.2, overwrite: 'auto' });
    };

    window.addEventListener('pointermove', onPointerMove, {
      passive: true,
      capture: true,
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.documentElement.addEventListener('mouseleave', onPointerLeaveWindow);
    document.documentElement.addEventListener('mouseenter', onPointerEnterWindow);

    return () => {
      if (moveRafId) window.cancelAnimationFrame(moveRafId);
      window.clearTimeout(scrollSettleTimer);
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener(
        'mouseleave',
        onPointerLeaveWindow
      );
      document.documentElement.removeEventListener(
        'mouseenter',
        onPointerEnterWindow
      );
      gsap.killTweensOf([dotEl, crossEl, arrowEl]);
    };
  }, [reducedMotion]);

  // Re-evaluate cursor state immediately when route or menu/drawer state changes
  useEffect(() => {
    if (reducedMotion || typeof document === 'undefined') return;
    if (!document.documentElement.hasAttribute('data-pointer-seen')) return;
    if (menuOpen || qaOpen || activeRoute !== '/') {
      const arrowEl = arrowWrapRef.current;
      if (arrowEl) {
        gsap.to(arrowEl, { autoAlpha: 0, scale: 0.86, duration: 0.16 });
      }
    }
  }, [activeRoute, menuOpen, qaOpen, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div ref={rootRef} className="orch-custom-cursor" aria-hidden="true">
      <div className="orch-cursor-dot-wrap">
        <div ref={dotRef} className="orch-cursor-dot" />
        <div ref={crossWrapRef} className="orch-cursor-cross-wrap">
          {/* Exact rounded-outline close cross SVG from Orchestrated (`_app.js` module `er`) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 21.17 20.97"
            className="orch-cursor-cross"
          >
            <path
              fill="currentColor"
              d="m11.55 11.45-.35-.35zm3.38.45-.35.35zM12 6.34l-.35-.35zM6.94 9.77l-.35.35zm2.78.35.25-.25-.71-.71-.25.25zM.73 4.27l5.86 5.86.71-.71-5.86-5.86zm8.8 1.72L4.27.73l-.71.71L8.82 6.7zm2.82.71 5.26-5.26-.71-.71-5.26 5.26zm7.38-3.14-5.16 5.16.71.71 5.16-5.16zm-5.15 8.69 5.16 5.16.71-.71-5.16-5.16zm3.03 7.28-5.91-5.91-.71.71 5.91 5.91zM11.7 12l.2-.2-.71-.71-.2.2zm-6.44.18L.73 16.7l.71.71 4.52-4.52-.71-.71Zm-.99 8.06 4.52-4.52-.71-.71-4.52 4.52zm3.81-7.35c.59.59.59 1.54 0 2.12l.71.71c.98-.98.98-2.56 0-3.54zm-2.12 0a1.49 1.49 0 0 1 2.12 0l.71-.71c-.98-.98-2.56-.98-3.54 0zM.73 20.24c.98.98 2.56.98 3.54 0l-.71-.71c-.59.59-1.54.59-2.12 0zm.71-.71a1.49 1.49 0 0 1 0-2.12l-.71-.71c-.98.98-.98 2.56 0 3.54zM11.9 11.8c.73-.73.73-1.91 0-2.64l-.71.71c.34.34.34.88 0 1.22zm-.2 1.82a1.14 1.14 0 0 1 0-1.62l-.71-.71c-.84.84-.84 2.2 0 3.04zm8.03 5.91c-.59.59-1.54.59-2.12 0l-.71.71c.98.98 2.56.98 3.54 0zm0-2.12c.59.59.59 1.54 0 2.12l.71.71c.98-.98.98-2.56 0-3.54zm-5.15-8.69c-.98.98-.98 2.56 0 3.54l.71-.71a1.49 1.49 0 0 1 0-2.12zm5.15-7.28c.59.59.59 1.54 0 2.12l.71.71c.98-.98.98-2.56 0-3.54zm-2.12 0a1.49 1.49 0 0 1 2.12 0l.71-.71c-.98-.98-2.56-.98-3.54 0zM8.82 6.7c.98.98 2.56.98 3.54 0l-.71-.71c-.59.59-1.54.59-2.12 0zM1.44 1.44a1.49 1.49 0 0 1 2.12 0l.71-.71C3.29-.24 1.71-.24.73.73zm0 2.12a1.49 1.49 0 0 1 0-2.12L.73.73c-.97.98-.97 2.56 0 3.54zm8.53 6.31c.34-.34.88-.34 1.22 0l.71-.71c-.73-.73-1.91-.73-2.64 0zm-.95-.45c-.48.48-1.25.48-1.72 0l-.71.71c.87.87 2.27.87 3.14 0z"
            />
          </svg>
        </div>
      </div>

      {/* Exact Hero compass rounded-triangle arrow from Orchestrated (`_app.js` module `W` + `Q`) */}
      <div ref={arrowWrapRef} className="orch-cursor-arrow">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 18.4 19.6"
          className="orch-cursor-arrow__svg"
        >
          <path
            fill="#ffffff"
            d="M15 5.8 7.9 1.7c-3-1.7-6.7.5-6.7 3.9v8.2c0 3.5 3.7 5.6 6.7 3.9l7.1-4.1c3-1.7 3-6.1 0-7.8m-.5 7-7.1 4.1c-2.3 1.3-5.2-.3-5.2-3V5.6c0-2.7 2.9-4.4 5.2-3l7.1 4.1c2.3 1.3 2.3 4.7 0 6.1"
          />
        </svg>
      </div>
    </div>
  );
}

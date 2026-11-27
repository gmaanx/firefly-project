import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { normalizeRoutePath, type AppRoutePath } from '../../lib/navigation';

gsap.registerPlugin(ScrollTrigger);

export interface NavigateCurtainOptions {
  fromOpenMenu?: boolean;
  onBeforeSwap?: () => void;
}

export interface DarkZoomNavigateOptions {
  returnPath?: string;
  onBeforeSwap?: () => void;
}

interface SavedReturnSnapshot {
  path: string;
  scrollY: number;
  rect: { top: number; left: number; width: number; height: number } | null;
}

export interface RouteTransitionContextValue {
  isTransitioning: boolean;
  navigateWithCurtain: (
    to: AppRoutePath,
    e?: MouseEvent<HTMLElement>,
    hash?: string,
    options?: NavigateCurtainOptions
  ) => void;
  navigateWithDarkZoom: (
    toPath: string,
    origin?: HTMLElement | MouseEvent<HTMLElement> | null,
    options?: DarkZoomNavigateOptions
  ) => void;
  returnFromSubpage: (fallbackPath?: string) => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  isTransitioning: false,
  navigateWithCurtain: () => {},
  navigateWithDarkZoom: () => {},
  returnFromSubpage: () => {},
});

export function useRouteCurtain(): RouteTransitionContextValue {
  return useContext(RouteTransitionContext);
}

export interface RouteTransitionProviderProps {
  reducedMotion: boolean;
  onResetScroll: (hash?: string) => void;
  onPauseLenis?: (paused: boolean) => void;
  onPreloadRoute?: (to: AppRoutePath) => Promise<unknown> | void;
  children: ReactNode;
}

const ROUTE_CURTAIN_TITLES: Record<AppRoutePath, string> = {
  '/': 'TRANG CHỦ',
  '/thuat-toan': 'THUẬT TOÁN',
  '/thuc-nghiem': 'THỰC NGHIỆM',
  '/demo': 'MÔ PHỎNG',
};

const LANDO_CURVE = 'cubic-bezier(0.65, 0.05, 0, 1)';
const LANDO_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LANDO_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';

function focusRevealedHeading() {
  const heading =
    document.querySelector<HTMLElement>(
      'main [data-route-active="true"] h1[tabindex="-1"], main [data-route-active="true"] h1, main [data-route-active="true"] h2[tabindex="-1"]'
    ) ??
    document.querySelector<HTMLElement>(
      'main h1[tabindex="-1"], main h1, main h2[tabindex="-1"]'
    ) ??
    document.querySelector<HTMLElement>('main');
  heading?.focus({ preventScroll: true });
}

function suspendOrKillRouteScrollTriggers() {
  const keepAliveRoot = document.querySelector('[data-keepalive-root="home"]');
  // Snapshot array before mutating so GSAP's internal trigger list never shifts mid-iteration
  const allTriggers = [...ScrollTrigger.getAll()];
  allTriggers.forEach((st) => {
    const trig = st.trigger ?? (st.vars.trigger as Element | null | undefined);
    if (keepAliveRoot && trig instanceof Node && keepAliveRoot.contains(trig)) {
      if (st.vars.once && st.progress >= 1) {
        st.kill(false);
      } else {
        st.disable(false);
      }
      return;
    }
    st.kill();
  });
}

function waitOrTimeout(p: Promise<unknown>, ms: number) {
  return Promise.race([p, new Promise((resolve) => window.setTimeout(resolve, ms))]);
}

function nextDoubleFrame(): Promise<void> {
  return waitOrTimeout(
    new Promise<void>((r) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => r()))
    ),
    60
  ).then(() => {});
}

/**
 * Hardware-Accelerated Lando Norris Multi-Layer Curved-Arch SPA Page Curtain:
 * Driven via native Web Animations API (`Element.animate()`) on GPU compositor `transform` & `opacity`
 * so page wipes never stall on main-thread chunk evaluation or `gsap.ticker.lagSmoothing`.
 */
export function RouteTransitionProvider({
  reducedMotion,
  onResetScroll,
  onPauseLenis,
  onPreloadRoute,
  children,
}: RouteTransitionProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const stageRef = useRef<HTMLDivElement>(null);
  const limeWaveRef = useRef<HTMLDivElement>(null);
  const oliveSheetRef = useRef<HTMLDivElement>(null);
  const centerLockupRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const notchPathRef = useRef<SVGPathElement>(null);
  const zoomPortalRef = useRef<HTMLDivElement>(null);
  const zoomScrimRef = useRef<HTMLDivElement>(null);
  const zoomBoxRef = useRef<HTMLDivElement>(null);
  const returnStackRef = useRef<SavedReturnSnapshot | null>(null);
  const busyRef = useRef<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const navigateWithCurtain = useCallback(
    (
      to: AppRoutePath,
      e?: MouseEvent<HTMLElement>,
      hash?: string,
      options?: NavigateCurtainOptions
    ) => {
      if (e) {
        e.preventDefault();
      }

      const exactPath = location.pathname;
      if (exactPath === to && !hash) {
        options?.onBeforeSwap?.();
        onResetScroll();
        return;
      }

      if (exactPath === to && hash) {
        options?.onBeforeSwap?.();
        onResetScroll(hash);
        return;
      }

      if (
        reducedMotion ||
        !stageRef.current ||
        !oliveSheetRef.current ||
        !limeWaveRef.current
      ) {
        void onPreloadRoute?.(to);
        options?.onBeforeSwap?.();
        suspendOrKillRouteScrollTriggers();
        startTransition(() => {
          navigate(hash ? `${to}#${hash}` : to);
        });
        window.requestAnimationFrame(() => {
          onResetScroll(hash);
          window.requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            focusRevealedHeading();
          });
        });
        return;
      }

      if (busyRef.current) return;
      busyRef.current = true;
      setIsTransitioning(true);

      // Kick off lazy route chunk fetch immediately while GPU curtain begins sweeping up!
      const preloadTask = Promise.resolve(onPreloadRoute?.(to)).catch(() => {});

      const stage = stageRef.current;
      const limeWave = limeWaveRef.current;
      const oliveSheet = oliveSheetRef.current;
      const centerLockup = centerLockupRef.current;
      const label = labelRef.current;
      const notchPath = notchPathRef.current;

      if (label) {
        label.textContent = ROUTE_CURTAIN_TITLES[to];
      }

      onPauseLenis?.(true);
      stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());

      const runSwapAndUncover = async () => {
        await waitOrTimeout(preloadTask, 650);
        options?.onBeforeSwap?.();
        suspendOrKillRouteScrollTriggers();
        // Reset scroll to 0 BEFORE mounting incoming route so once:true ScrollTriggers never self-kill mid-refresh
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        startTransition(() => {
          navigate(hash ? `${to}#${hash}` : to);
        });

        await nextDoubleFrame();
        onResetScroll(hash);

        centerLockup?.animate(
          [
            { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
            { opacity: 0, transform: 'translate3d(0, -14px, 0)' },
          ],
          { duration: 190, easing: LANDO_IN, fill: 'forwards' }
        );

        const oliveOut = oliveSheet.animate(
          [
            { transform: 'translate3d(0, 0%, 0)' },
            { transform: 'translate3d(0, -118%, 0)' },
          ],
          { duration: 540, delay: 30, easing: LANDO_CURVE, fill: 'forwards' }
        );

        const limeOut = limeWave.animate(
          [
            { transform: 'translate3d(0, 0%, 0)' },
            { transform: 'translate3d(0, -118%, 0)' },
          ],
          { duration: 560, delay: 72, easing: LANDO_CURVE, fill: 'forwards' }
        );

        await waitOrTimeout(
          Promise.allSettled([oliveOut.finished, limeOut.finished]),
          900
        );

        stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        stage.style.visibility = 'hidden';
        stage.style.pointerEvents = 'none';
        stage.style.opacity = '1';
        limeWave.style.transform = 'translate3d(0, 118%, 0)';
        oliveSheet.style.transform = 'translate3d(0, 118%, 0)';

        onPauseLenis?.(false);
        busyRef.current = false;
        setIsTransitioning(false);
        window.requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          focusRevealedHeading();
        });
      };

      void (async () => {
        if (options?.fromOpenMenu) {
          stage.style.visibility = 'visible';
          stage.style.pointerEvents = 'auto';
          limeWave.style.transform = 'translate3d(0, 0%, 0)';
          oliveSheet.style.transform = 'translate3d(0, 0%, 0)';

          const fadeIn = stage.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 170,
            easing: 'ease-out',
            fill: 'forwards',
          });

          centerLockup?.animate(
            [
              { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
              { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
            ],
            { duration: 220, delay: 30, easing: LANDO_OUT, fill: 'forwards' }
          );

          if (notchPath) {
            notchPath.style.strokeDasharray = '220';
            notchPath.animate(
              [{ strokeDashoffset: '220' }, { strokeDashoffset: '0' }],
              { duration: 250, delay: 60, easing: LANDO_OUT, fill: 'forwards' }
            );
          }

          await waitOrTimeout(fadeIn.finished, 320);
          await runSwapAndUncover();
          return;
        }

        stage.style.visibility = 'visible';
        stage.style.pointerEvents = 'auto';
        stage.style.opacity = '1';

        const limeIn = limeWave.animate(
          [
            { transform: 'translate3d(0, 118%, 0)' },
            { transform: 'translate3d(0, 0%, 0)' },
          ],
          { duration: 480, easing: LANDO_CURVE, fill: 'forwards' }
        );

        const oliveIn = oliveSheet.animate(
          [
            { transform: 'translate3d(0, 118%, 0)' },
            { transform: 'translate3d(0, 0%, 0)' },
          ],
          { duration: 500, delay: 40, easing: LANDO_CURVE, fill: 'forwards' }
        );

        centerLockup?.animate(
          [
            { opacity: 0, transform: 'translate3d(0, 16px, 0)' },
            { opacity: 1, transform: 'translate3d(0, 0px, 0)' },
          ],
          { duration: 250, delay: 200, easing: LANDO_OUT, fill: 'both' }
        );

        if (notchPath) {
          notchPath.style.strokeDasharray = '220';
          notchPath.animate(
            [{ strokeDashoffset: '220' }, { strokeDashoffset: '0' }],
            { duration: 280, delay: 230, easing: LANDO_OUT, fill: 'both' }
          );
        }

        await waitOrTimeout(
          Promise.allSettled([limeIn.finished, oliveIn.finished]),
          850
        );
        await runSwapAndUncover();
      })();
    },
    [location.pathname, navigate, onPauseLenis, onPreloadRoute, onResetScroll, reducedMotion]
  );

  const navigateWithDarkZoom = useCallback(
    (
      toPath: string,
      origin?: HTMLElement | MouseEvent<HTMLElement> | null,
      options?: DarkZoomNavigateOptions
    ) => {
      let originEl: HTMLElement | null = null;
      if (origin && 'currentTarget' in origin) {
        if (origin.metaKey || origin.ctrlKey || origin.shiftKey || origin.button !== 0) {
          return;
        }
        origin.preventDefault();
        originEl = origin.currentTarget as HTMLElement;
      } else if (origin instanceof HTMLElement) {
        originEl = origin;
      }

      if (location.pathname === toPath) return;

      const returnPath = options?.returnPath ?? location.pathname;
      const anchorEl =
        originEl?.closest<HTMLElement>(
          '.exp-notch-card, .exp-summary-table__row, .lando-assign-table__row, button, a'
        ) ?? originEl;
      const r = anchorEl?.getBoundingClientRect() ?? null;

      returnStackRef.current = {
        path: returnPath,
        scrollY: window.scrollY,
        rect: r
          ? { top: r.top, left: r.left, width: r.width, height: r.height }
          : null,
      };

      const targetBaseRoute = normalizeRoutePath(toPath);
      const preloadTask = Promise.resolve(onPreloadRoute?.(targetBaseRoute)).catch(
        () => {}
      );

      const portal = zoomPortalRef.current;
      const scrim = zoomScrimRef.current;
      const box = zoomBoxRef.current;

      if (reducedMotion || !portal || !scrim || !box) {
        void preloadTask;
        options?.onBeforeSwap?.();
        suspendOrKillRouteScrollTriggers();
        startTransition(() => {
          navigate(toPath, { state: { from: returnPath } });
        });
        window.requestAnimationFrame(() => {
          onResetScroll();
          window.requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            const backBtn = document.querySelector<HTMLElement>('.top-nav__back-btn');
            if (backBtn) {
              backBtn.focus({ preventScroll: true });
            } else {
              focusRevealedHeading();
            }
          });
        });
        return;
      }

      if (busyRef.current) return;
      busyRef.current = true;
      setIsTransitioning(true);
      onPauseLenis?.(true);

      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);

      const seedW = Math.min(vw * 0.72, 460);
      const seedH = Math.min(vh * 0.56, 280);
      const startTop = r ? Math.max(0, Math.min(vh - 48, r.top)) : (vh - seedH) * 0.5;
      const startLeft = r ? Math.max(0, Math.min(vw - 48, r.left)) : (vw - seedW) * 0.5;
      const startRight = r
        ? Math.max(0, Math.min(vw - 48, vw - (r.left + r.width)))
        : (vw - seedW) * 0.5;
      const startBottom = r
        ? Math.max(0, Math.min(vh - 48, vh - (r.top + r.height)))
        : (vh - seedH) * 0.5;

      const clipStart = `inset(${Math.round(startTop)}px ${Math.round(startRight)}px ${Math.round(startBottom)}px ${Math.round(startLeft)}px round 14px)`;
      const clipFull = 'inset(0px 0px 0px 0px round 0px)';

      portal.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      portal.style.visibility = 'visible';
      portal.style.pointerEvents = 'auto';
      portal.style.opacity = '1';

      void (async () => {
        scrim.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 240,
          easing: 'ease-out',
          fill: 'forwards',
        });

        const expandAnim = box.animate(
          [
            { clipPath: clipStart, opacity: 0.92 },
            { clipPath: clipFull, opacity: 1 },
          ],
          {
            duration: 430,
            easing: LANDO_OUT,
            fill: 'forwards',
          }
        );

        await waitOrTimeout(Promise.allSettled([expandAnim.finished, preloadTask]), 620);

        options?.onBeforeSwap?.();
        suspendOrKillRouteScrollTriggers();
        startTransition(() => {
          navigate(toPath, { state: { from: returnPath } });
        });
        onResetScroll();

        await nextDoubleFrame();

        const fadeOut = portal.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 210,
          easing: 'ease-out',
          fill: 'forwards',
        });

        await waitOrTimeout(fadeOut.finished, 320);

        portal.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        portal.style.visibility = 'hidden';
        portal.style.pointerEvents = 'none';
        portal.style.opacity = '1';

        onPauseLenis?.(false);
        busyRef.current = false;
        setIsTransitioning(false);

        window.requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          const backBtn = document.querySelector<HTMLElement>('.top-nav__back-btn');
          if (backBtn) {
            backBtn.focus({ preventScroll: true });
          } else {
            focusRevealedHeading();
          }
        });
      })();
    },
    [location.pathname, navigate, onPauseLenis, onPreloadRoute, onResetScroll, reducedMotion]
  );

  const returnFromSubpage = useCallback(
    (fallbackPath: string = '/thuc-nghiem') => {
      const stateFrom = (location.state as { from?: string } | null)?.from;
      const saved = returnStackRef.current;
      const destPath = saved?.path ?? stateFrom ?? fallbackPath;
      const restoreY = saved?.scrollY ?? 0;
      const savedRect = saved?.rect ?? null;

      const destBaseRoute = normalizeRoutePath(destPath);
      const preloadTask = Promise.resolve(onPreloadRoute?.(destBaseRoute)).catch(
        () => {}
      );

      const portal = zoomPortalRef.current;
      const scrim = zoomScrimRef.current;
      const box = zoomBoxRef.current;

      const applyRestoredScroll = () => {
        window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
        window.dispatchEvent(
          new CustomEvent('app:lenis-scroll', {
            detail: { top: restoreY, immediate: true },
          })
        );
      };

      if (reducedMotion || !portal || !scrim || !box) {
        void preloadTask;
        suspendOrKillRouteScrollTriggers();
        startTransition(() => {
          navigate(destPath);
        });
        window.requestAnimationFrame(() => {
          applyRestoredScroll();
          window.requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            focusRevealedHeading();
          });
        });
        return;
      }

      if (busyRef.current) return;
      busyRef.current = true;
      setIsTransitioning(true);
      onPauseLenis?.(true);

      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const clipFull = 'inset(0px 0px 0px 0px round 0px)';
      const endTop = savedRect
        ? Math.max(0, Math.min(vh - 48, savedRect.top))
        : Math.round(vh * 0.22);
      const endLeft = savedRect
        ? Math.max(0, Math.min(vw - 48, savedRect.left))
        : Math.round(vw * 0.24);
      const endRight = savedRect
        ? Math.max(0, Math.min(vw - 48, vw - (savedRect.left + savedRect.width)))
        : Math.round(vw * 0.24);
      const endBottom = savedRect
        ? Math.max(0, Math.min(vh - 48, vh - (savedRect.top + savedRect.height)))
        : Math.round(vh * 0.22);
      const clipEnd = `inset(${Math.round(endTop)}px ${Math.round(endRight)}px ${Math.round(endBottom)}px ${Math.round(endLeft)}px round 14px)`;

      portal.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      portal.style.visibility = 'visible';
      portal.style.pointerEvents = 'auto';
      portal.style.opacity = '1';
      box.style.clipPath = clipFull;
      scrim.style.opacity = '1';

      void (async () => {
        const coverIn = portal.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 130,
          easing: 'ease-out',
          fill: 'forwards',
        });
        await waitOrTimeout(Promise.allSettled([coverIn.finished, preloadTask]), 260);

        suspendOrKillRouteScrollTriggers();
        startTransition(() => {
          navigate(destPath);
        });

        await nextDoubleFrame();
        applyRestoredScroll();

        scrim.animate([{ opacity: 0.72 }, { opacity: 0 }], {
          duration: 300,
          easing: 'ease-out',
          fill: 'forwards',
        });

        const shrinkAnim = box.animate(
          [
            { clipPath: clipFull, opacity: 1 },
            { clipPath: clipEnd, opacity: 0 },
          ],
          {
            duration: 340,
            easing: LANDO_OUT,
            fill: 'forwards',
          }
        );

        await waitOrTimeout(shrinkAnim.finished, 450);

        portal.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        portal.style.visibility = 'hidden';
        portal.style.pointerEvents = 'none';
        portal.style.opacity = '1';
        box.style.clipPath = clipFull;

        onPauseLenis?.(false);
        applyRestoredScroll();
        busyRef.current = false;
        setIsTransitioning(false);

        window.requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          focusRevealedHeading();
        });
      })();
    },
    [location.state, navigate, onPauseLenis, onPreloadRoute, reducedMotion]
  );

  return (
    <RouteTransitionContext.Provider
      value={{
        isTransitioning,
        navigateWithCurtain,
        navigateWithDarkZoom,
        returnFromSubpage,
      }}
    >
      {children}
      <div
        ref={zoomPortalRef}
        className="subpage-zoom-portal"
        aria-hidden="true"
      >
        <div ref={zoomScrimRef} className="subpage-zoom-portal__scrim" />
        <div ref={zoomBoxRef} className="subpage-zoom-portal__box" />
      </div>
      <div ref={stageRef} className="route-curtain-stage" aria-hidden="true">
        <div
          ref={limeWaveRef}
          className="route-curtain-sheet route-curtain-sheet--lime"
        >
          <svg
            className="route-curtain-arch route-curtain-arch--top"
            viewBox="0 0 1440 88"
            preserveAspectRatio="none"
          >
            <path d="M0 88 Q720 0 1440 88 Z" fill="currentColor" />
          </svg>
          <svg
            className="route-curtain-arch route-curtain-arch--bottom"
            viewBox="0 0 1440 88"
            preserveAspectRatio="none"
          >
            <path d="M0 0 Q720 88 1440 0 Z" fill="currentColor" />
          </svg>
        </div>

        <div
          ref={oliveSheetRef}
          className="route-curtain-sheet route-curtain-sheet--olive"
        >
          <svg
            className="route-curtain-arch route-curtain-arch--top"
            viewBox="0 0 1440 88"
            preserveAspectRatio="none"
          >
            <path d="M0 88 Q720 0 1440 88 Z" fill="currentColor" />
          </svg>

          <div ref={centerLockupRef} className="route-curtain__lockup">
            <svg
              viewBox="0 0 348 170"
              width="48"
              height="24"
              className="route-curtain__monogram"
              fill="none"
            >
              <path
                d="M36 12 H96 V126 C96 146, 105 151.5, 121 151.5 V158 H36 V151.5 C53 151.5, 64 146, 64 126 V44 C64 24, 53 18.5, 36 18.5 Z"
                fill="currentColor"
              />
              <path
                d="M108 12 H173 L175 50 H168.5 C166 29, 156 19, 134 19 H108 Z"
                fill="currentColor"
              />
              <path
                d="M108 79 H129 C141 79, 147 73.5, 148 63 H154.5 V103 H148 C147 92.5, 141 87, 129 87 H108 Z"
                fill="currentColor"
              />
              <path
                d="M160 158 V151.5 C176 151, 184 136, 188 88 H195 C197.5 136, 204 151, 217 151.5 V158 Z"
                fill="currentColor"
              />
              <path
                d="M200 12 H238 L290 134 C296.5 148.5, 302.5 151.5, 312 151.5 V158 H245 V151.5 C256 151.5, 260 146, 255 134 L213 33 C209 23.5, 205.5 18.5, 200 18.5 Z"
                fill="currentColor"
              />
              <path
                d="M198 102 H238 L240.5 109.5 H198 Z"
                fill="currentColor"
              />
            </svg>
            <span ref={labelRef} className="route-curtain__label">
              TRANG CHỦ
            </span>
            <svg
              viewBox="0 0 180 14"
              className="route-curtain__notch"
              fill="none"
            >
              <path
                ref={notchPathRef}
                d="M2 3 H44 C50 3 54 5 58 9 C62 12 67 12 73 12 H107 C113 12 118 12 122 9 C126 5 130 3 136 3 H178"
                stroke="#d2ff00"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <svg
            className="route-curtain-arch route-curtain-arch--bottom"
            viewBox="0 0 1440 88"
            preserveAspectRatio="none"
          >
            <path d="M0 0 Q720 88 1440 0 Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </RouteTransitionContext.Provider>
  );
}

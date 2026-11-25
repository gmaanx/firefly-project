import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { NavbarAndMenu } from './components/sections/NavbarAndMenu';
import { OrchestratedCursor } from './components/shared/OrchestratedCursor';
import type { QaTabId } from './components/shared/QaDrawer';
import {
  RouteTransitionProvider,
  useRouteCurtain,
} from './components/shared/RouteCurtain';
import {
  TailordCrtFilterDefs,
  TailordPreloader,
} from './components/shared/TailordPreloader';
import {
  APP_ROUTES,
  ROUTE_KEY_MAP,
  isInteractiveElement,
  normalizeRoutePath,
  type AppRoutePath,
  type SurfaceTheme,
} from './lib/navigation';
import { HomePage } from './pages/HomePage';

gsap.registerPlugin(ScrollTrigger);

// Memoized lazy chunk loaders so preloading on hover / idle / curtain cover shares the exact Promise
let algoChunkPromise: Promise<{ default: typeof import('./pages/AlgorithmPage')['AlgorithmPage'] }> | null = null;
let expChunkPromise: Promise<{ default: typeof import('./pages/ExperimentsPage')['ExperimentsPage'] }> | null = null;
let demoChunkPromise: Promise<{ default: typeof import('./pages/DemoPage')['DemoPage'] }> | null = null;

function loadAlgorithmPageChunk() {
  if (!algoChunkPromise) {
    algoChunkPromise = import('./pages/AlgorithmPage').then((m) => ({
      default: m.AlgorithmPage,
    }));
  }
  return algoChunkPromise;
}

function loadExperimentsPageChunk() {
  if (!expChunkPromise) {
    expChunkPromise = import('./pages/ExperimentsPage').then((m) => ({
      default: m.ExperimentsPage,
    }));
  }
  return expChunkPromise;
}

function loadDemoPageChunk() {
  if (!demoChunkPromise) {
    demoChunkPromise = import('./pages/DemoPage').then((m) => ({
      default: m.DemoPage,
    }));
  }
  return demoChunkPromise;
}

export function preloadRouteChunk(to: AppRoutePath): Promise<unknown> {
  if (to === '/thuat-toan') return loadAlgorithmPageChunk();
  if (to === '/thuc-nghiem') return loadExperimentsPageChunk();
  if (to === '/demo') return loadDemoPageChunk();
  return Promise.resolve();
}

const AlgorithmPage = lazy(loadAlgorithmPageChunk);
const ExperimentsPage = lazy(loadExperimentsPageChunk);
const DemoPage = lazy(loadDemoPageChunk);
const QaDrawer = lazy(() =>
  import('./components/shared/QaDrawer').then((m) => ({ default: m.QaDrawer }))
);

function getSectionScrollOffset(_id: string): number {
  return -68;
}

interface AppInnerProps {
  activeRoute: AppRoutePath;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onScrollToSection: (id: string) => void;
}

function AppInner({
  activeRoute,
  reducedMotion,
  onToggleReducedMotion,
  onScrollToSection,
}: AppInnerProps) {
  const { navigateWithCurtain } = useRouteCurtain();
  const routeMeta =
    APP_ROUTES.find((r) => r.path === activeRoute) ?? APP_ROUTES[0];

  const isHomeActive = activeRoute === '/';
  const [hasVisitedHome, setHasVisitedHome] = useState<boolean>(isHomeActive);
  const homeKeepAliveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHomeActive && !hasVisitedHome) {
      setHasVisitedHome(true);
    }
  }, [isHomeActive, hasVisitedHome]);

  // Toggle Keep-Alive HomePage ScrollTriggers cleanly across route switches without touching HomePage.tsx
  useEffect(() => {
    const keepRoot = homeKeepAliveRef.current;
    if (!keepRoot) return;

    if (!isHomeActive) {
      ScrollTrigger.getAll().forEach((st) => {
        const trig = st.trigger ?? (st.vars.trigger as Element | null | undefined);
        if (trig instanceof Node && keepRoot.contains(trig)) {
          st.disable(false);
        }
      });
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('scroll'));
      ScrollTrigger.getAll().forEach((st) => {
        const trig = st.trigger ?? (st.vars.trigger as Element | null | undefined);
        if (trig instanceof Node && keepRoot.contains(trig)) {
          st.enable(false, false);
        }
      });
      ScrollTrigger.refresh();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isHomeActive]);

  // Warm up sub-route JS chunks quietly during browser idle time after initial boot
  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId = 0;
    const timerId = window.setTimeout(() => {
      const warm = () => {
        void loadAlgorithmPageChunk();
        void loadExperimentsPageChunk();
        void loadDemoPageChunk();
      };
      if (typeof win.requestIdleCallback === 'function') {
        idleId = win.requestIdleCallback(warm, { timeout: 2500 });
      } else {
        warm();
      }
    }, 1800);

    return () => {
      window.clearTimeout(timerId);
      if (idleId && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleId);
      }
    };
  }, []);

  const [activeSurface, setActiveSurface] = useState<SurfaceTheme>(
    routeMeta.defaultSurface
  );
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [qaOpen, setQaOpen] = useState<boolean>(false);
  const [qaTab, setQaTab] = useState<QaTabId>('guardrails');
  const mainRef = useRef<HTMLElement>(null);
  const spaceToggleRef = useRef<(() => void) | null>(null);

  const handleOpenQa = useCallback((tab: QaTabId = 'guardrails') => {
    setQaTab(tab);
    setQaOpen(true);
  }, []);

  const handleRegisterSpaceToggle = useCallback((fn: (() => void) | null) => {
    spaceToggleRef.current = fn;
  }, []);

  useEffect(() => {
    document.title = routeMeta.docTitle;
  }, [routeMeta.docTitle]);

  // Accurate navbar surface detection right at the FA logo center (`y ≈ 26px`)
  useEffect(() => {
    setActiveSurface(routeMeta.defaultSurface);
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const intersecting = new Set<HTMLElement>();
    let observedNodes: HTMLElement[] = [];

    const syncActiveSurface = () => {
      let matched: SurfaceTheme | null = null;

      // Primary check: exact section covering the FA navbar logo (`y = 26..28px`)
      for (const sec of observedNodes) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 28 && rect.bottom > 28) {
          const val = sec.dataset.surface as SurfaceTheme | undefined;
          if (val) matched = val;
        }
      }

      // Fallback to IO set if at extreme bounce boundary
      if (!matched) {
        for (const sec of observedNodes) {
          if (intersecting.has(sec)) {
            const val = sec.dataset.surface as SurfaceTheme | undefined;
            if (val) matched = val;
          }
        }
      }

      if (matched) {
        setActiveSurface((prev) => (prev === matched ? prev : matched));
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            intersecting.add(el);
          } else {
            intersecting.delete(el);
          }
        }
        syncActiveSurface();
      },
      {
        rootMargin: '-22px 0px -96% 0px',
        threshold: 0,
      }
    );

    const bindSections = () => {
      io.disconnect();
      intersecting.clear();
      observedNodes = Array.from(
        mainEl.querySelectorAll<HTMLElement>(
          '[data-route-active="true"] [data-surface]'
        )
      );
      for (const sec of observedNodes) {
        io.observe(sec);
      }
      syncActiveSurface();
    };

    bindSections();

    const mo = new MutationObserver(() => {
      bindSections();
    });
    mo.observe(mainEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-route-active'],
    });

    return () => {
      mo.disconnect();
      io.disconnect();
      intersecting.clear();
    };
  }, [activeRoute, routeMeta.defaultSurface]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInteractiveElement(e.target)) return;

      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) {
        if ((e.key === 'm' || e.key === 'M') && menuOpen) {
          e.preventDefault();
          setMenuOpen(false);
        } else if ((e.key === 'q' || e.key === 'Q') && qaOpen) {
          e.preventDefault();
          setQaOpen(false);
        }
        return;
      }

      if (e.key in ROUTE_KEY_MAP) {
        e.preventDefault();
        navigateWithCurtain(ROUTE_KEY_MAP[e.key]);
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
        return;
      }

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQaOpen((prev) => !prev);
        return;
      }

      if (e.key === ' ' && activeRoute === '/demo') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'BUTTON' && tag !== 'A' && spaceToggleRef.current) {
          e.preventDefault();
          spaceToggleRef.current();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRoute, menuOpen, navigateWithCurtain, qaOpen]);

  return (
    <>
      <a href="#main-presentation" className="skip-link">
        Bỏ qua điều hướng tới nội dung chính
      </a>

      <NavbarAndMenu
        activeRoute={activeRoute}
        activeSurface={activeSurface}
        menuOpen={menuOpen}
        onMenuToggle={setMenuOpen}
        onOpenQa={handleOpenQa}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={onToggleReducedMotion}
        onPreloadRoute={preloadRouteChunk}
      />

      <main id="main-presentation" ref={mainRef}>
        {hasVisitedHome ? (
          <div
            ref={homeKeepAliveRef}
            data-keepalive-root="home"
            data-route-active={isHomeActive ? 'true' : 'false'}
            hidden={!isHomeActive}
            aria-hidden={!isHomeActive}
            {...(!isHomeActive ? ({ inert: '' } as Record<string, string>) : {})}
            style={{ display: isHomeActive ? 'block' : 'none' }}
          >
            <HomePage
              reducedMotion={reducedMotion}
              onScrollToSection={onScrollToSection}
            />
          </div>
        ) : null}

        <div
          className="route-subpage-outlet"
          data-route-active={!isHomeActive ? 'true' : 'false'}
          hidden={isHomeActive}
          style={{ display: isHomeActive ? 'none' : 'block' }}
        >
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={null} />
              <Route
                path="/thuat-toan"
                element={
                  <AlgorithmPage
                    reducedMotion={reducedMotion}
                    onOpenQa={handleOpenQa}
                  />
                }
              />
              <Route
                path="/thuc-nghiem"
                element={<ExperimentsPage reducedMotion={reducedMotion} />}
              />
              <Route
                path="/demo"
                element={
                  <DemoPage
                    reducedMotion={reducedMotion}
                    onRegisterSpaceToggle={handleRegisterSpaceToggle}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <Suspense fallback={null}>
        <QaDrawer
          open={qaOpen}
          activeTab={qaTab}
          onTabChange={setQaTab}
          onClose={() => setQaOpen(false)}
        />
      </Suspense>

      <OrchestratedCursor
        activeRoute={activeRoute}
        menuOpen={menuOpen}
        qaOpen={qaOpen}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export function App() {
  const location = useLocation();
  const activeRoute = normalizeRoutePath(location.pathname);

  const [sysReduced, setSysReduced] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
      : false
  );
  const [manualReduced, setManualReduced] = useState<boolean | null>(null);
  const reducedMotion = manualReduced ?? sysReduced;

  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = (ev: MediaQueryListEvent) => setSysReduced(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion
      ? 'true'
      : 'false';
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      lerp: 0.088,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);
    gsap.ticker.lagSmoothing(500, 33);

    const onCustomLenisScroll = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{ top: number; immediate?: boolean; duration?: number }>
      ).detail;
      if (!detail || typeof detail.top !== 'number') return;
      if (detail.immediate) {
        lenis.scrollTo(detail.top, { immediate: true, force: true });
      } else {
        lenis.scrollTo(detail.top, {
          duration: detail.duration ?? 0.55,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    };
    window.addEventListener('app:lenis-scroll', onCustomLenisScroll);

    return () => {
      window.removeEventListener('app:lenis-scroll', onCustomLenisScroll);
      gsap.ticker.remove(tickerUpdate);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  const handlePauseLenis = useCallback((paused: boolean) => {
    if (paused) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
      window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }
  }, []);

  const handleResetScroll = useCallback((hash?: string) => {
    if (hash) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          if (lenisRef.current) {
            const targetTop = Math.max(
              0,
              window.scrollY +
                el.getBoundingClientRect().top +
                getSectionScrollOffset(hash)
            );
            lenisRef.current.scrollTo(targetTop, {
              immediate: true,
              force: true,
            });
          } else {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    }
  }, []);

  const handleScrollToSection = useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      if (lenisRef.current && !reducedMotion) {
        const targetTop = Math.max(
          0,
          window.scrollY +
            target.getBoundingClientRect().top +
            getSectionScrollOffset(id)
        );
        lenisRef.current.scrollTo(targetTop, {
          duration: 1.05,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        target.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    },
    [reducedMotion]
  );

  return (
    <>
      <TailordCrtFilterDefs />
      <TailordPreloader
        reducedMotion={reducedMotion}
        isHomeRoute={activeRoute === '/'}
        onPauseScroll={handlePauseLenis}
      />
      <RouteTransitionProvider
        reducedMotion={reducedMotion}
        onResetScroll={handleResetScroll}
        onPauseLenis={handlePauseLenis}
        onPreloadRoute={preloadRouteChunk}
      >
        <AppInner
          activeRoute={activeRoute}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() =>
            setManualReduced((prev) => !(prev ?? sysReduced))
          }
          onScrollToSection={handleScrollToSection}
        />
      </RouteTransitionProvider>
    </>
  );
}

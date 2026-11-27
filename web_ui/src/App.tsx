import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { NavbarAndMenu } from './components/sections/NavbarAndMenu';
import { OrchestratedCursor } from './components/shared/OrchestratedCursor';
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
let expDetailChunkPromise: Promise<{ default: typeof import('./pages/ExperimentDetailPage')['ExperimentDetailPage'] }> | null = null;
let assignDetailChunkPromise: Promise<{ default: typeof import('./pages/AssignmentDetailPage')['AssignmentDetailPage'] }> | null = null;
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

function loadExperimentDetailChunk() {
  if (!expDetailChunkPromise) {
    expDetailChunkPromise = import('./pages/ExperimentDetailPage').then((m) => ({
      default: m.ExperimentDetailPage,
    }));
  }
  return expDetailChunkPromise;
}

function loadAssignmentDetailChunk() {
  if (!assignDetailChunkPromise) {
    assignDetailChunkPromise = import('./pages/AssignmentDetailPage').then((m) => ({
      default: m.AssignmentDetailPage,
    }));
  }
  return assignDetailChunkPromise;
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
  if (to === '/thuat-toan') {
    return loadAlgorithmPageChunk();
  }
  if (to === '/thuc-nghiem') {
    return Promise.all([loadExperimentsPageChunk(), loadExperimentDetailChunk()]);
  }
  if (to === '/demo') return loadDemoPageChunk();
  return Promise.resolve();
}

const AlgorithmPage = lazy(loadAlgorithmPageChunk);
const ExperimentsPage = lazy(loadExperimentsPageChunk);
const ExperimentDetailPage = lazy(loadExperimentDetailChunk);
const AssignmentDetailPage = lazy(loadAssignmentDetailChunk);
const DemoPage = lazy(loadDemoPageChunk);

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
  const location = useLocation();
  const { navigateWithCurtain } = useRouteCurtain();
  const routeMeta =
    APP_ROUTES.find((r) => r.path === activeRoute) ?? APP_ROUTES[0];

  const isHomeActive = location.pathname === '/';
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
      [...ScrollTrigger.getAll()].forEach((st) => {
        const trig = st.trigger ?? (st.vars.trigger as Element | null | undefined);
        if (trig instanceof Node && keepRoot.contains(trig)) {
          if (st.vars.once && st.progress >= 1) {
            st.kill(false);
          } else {
            st.disable(false);
          }
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
        void loadExperimentDetailChunk();
        void loadAssignmentDetailChunk();
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
  const mainRef = useRef<HTMLElement>(null);
  const spaceToggleRef = useRef<(() => void) | null>(null);

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

    let rebindRaf = 0;
    const scheduleBindSections = () => {
      if (rebindRaf) return;
      rebindRaf = window.requestAnimationFrame(() => {
        rebindRaf = 0;
        bindSections();
      });
    };

    bindSections();

    const subpageOutlet = mainEl.querySelector('.route-subpage-outlet');
    const mo = new MutationObserver(scheduleBindSections);
    if (subpageOutlet) {
      mo.observe(subpageOutlet, { childList: true, subtree: false });
    }
    mo.observe(mainEl, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ['data-route-active'],
    });

    return () => {
      if (rebindRaf) window.cancelAnimationFrame(rebindRaf);
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
  }, [activeRoute, menuOpen, navigateWithCurtain]);

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
            inert={!isHomeActive}
            style={{ display: isHomeActive ? 'block' : 'none' }}
          >
            <HomePage
              isActive={isHomeActive}
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
                element={<AlgorithmPage reducedMotion={reducedMotion} />}
              />
              <Route
                path="/thuc-nghiem"
                element={<ExperimentsPage reducedMotion={reducedMotion} />}
              />
              <Route
                path="/thuc-nghiem/:experimentId"
                element={<ExperimentDetailPage reducedMotion={reducedMotion} />}
              />
              <Route
                path="/phan-cong/:memberId?"
                element={<AssignmentDetailPage reducedMotion={reducedMotion} />}
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

      <OrchestratedCursor
        activeRoute={activeRoute}
        menuOpen={menuOpen}
        qaOpen={false}
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
      lerp: 0.135,
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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    }

    if (!hash) return;

    let attempts = 0;
    const seekHashTarget = () => {
      const el = document.getElementById(hash);
      if (el && el.getBoundingClientRect().height > 0) {
        const targetTop = Math.max(
          0,
          window.scrollY + el.getBoundingClientRect().top + getSectionScrollOffset(hash)
        );
        window.scrollTo({ top: targetTop, left: 0, behavior: 'auto' });
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetTop, {
            immediate: true,
            force: true,
          });
        }
        return;
      }
      if (attempts < 24) {
        attempts += 1;
        window.requestAnimationFrame(seekHashTarget);
      }
    };
    window.requestAnimationFrame(seekHashTarget);
  }, []);

  // Support direct initial page loads with a URL hash (e.g. `/demo#nen-anh-fa`)
  useEffect(() => {
    const rawHash = location.hash.replace(/^#/, '');
    if (!rawHash) return;
    const timer = window.setTimeout(() => {
      handleResetScroll(rawHash);
    }, 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        isHomeRoute={location.pathname === '/'}
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

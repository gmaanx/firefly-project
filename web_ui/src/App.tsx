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

// Lazy-loaded sub-page chunks so initial `/` load only downloads & parses the Home Hero chunk
const AlgorithmPage = lazy(() =>
  import('./pages/AlgorithmPage').then((m) => ({ default: m.AlgorithmPage }))
);
const ExperimentsPage = lazy(() =>
  import('./pages/ExperimentsPage').then((m) => ({ default: m.ExperimentsPage }))
);
const DemoPage = lazy(() =>
  import('./pages/DemoPage').then((m) => ({ default: m.DemoPage }))
);
const QaDrawer = lazy(() =>
  import('./components/shared/QaDrawer').then((m) => ({ default: m.QaDrawer }))
);

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

  // Zero-scroll-listener surface detection via IntersectionObserver (`rootMargin: '-44px 0px -90% 0px'`)
  useEffect(() => {
    setActiveSurface(routeMeta.defaultSurface);
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const intersecting = new Set<HTMLElement>();
    let observedNodes: HTMLElement[] = [];

    const syncActiveSurface = () => {
      let matched: SurfaceTheme | null = null;
      for (const sec of observedNodes) {
        if (intersecting.has(sec)) {
          const val = sec.dataset.surface as SurfaceTheme | undefined;
          if (val) matched = val;
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
        rootMargin: '-44px 0px -90% 0px',
        threshold: 0,
      }
    );

    const bindSections = () => {
      io.disconnect();
      intersecting.clear();
      observedNodes = Array.from(
        mainEl.querySelectorAll<HTMLElement>('[data-surface]')
      );
      for (const sec of observedNodes) {
        io.observe(sec);
      }
    };

    bindSections();

    // Re-bind automatically if a React.lazy() route finishes mounting inside <main>
    const mo = new MutationObserver(() => {
      bindSections();
    });
    mo.observe(mainEl, { childList: true });

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
      />

      <main id="main-presentation" ref={mainRef}>
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  reducedMotion={reducedMotion}
                  onScrollToSection={onScrollToSection}
                />
              }
            />
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
                  onScrollToSection={onScrollToSection}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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

    return () => {
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
            lenisRef.current.scrollTo(el, { offset: -72, immediate: true });
          } else {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, []);

  const handleScrollToSection = useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      if (lenisRef.current && !reducedMotion) {
        lenisRef.current.scrollTo(target, {
          offset: -56,
          duration: 1.22,
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

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
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { normalizeRoutePath, type AppRoutePath } from '../../lib/navigation';

gsap.registerPlugin(ScrollTrigger);

export interface RouteTransitionContextValue {
  isTransitioning: boolean;
  navigateWithCurtain: (
    to: AppRoutePath,
    e?: MouseEvent<HTMLElement>,
    hash?: string
  ) => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  isTransitioning: false,
  navigateWithCurtain: () => {},
});

export function useRouteCurtain(): RouteTransitionContextValue {
  return useContext(RouteTransitionContext);
}

export interface RouteTransitionProviderProps {
  reducedMotion: boolean;
  onResetScroll: (hash?: string) => void;
  onPauseLenis?: (paused: boolean) => void;
  children: ReactNode;
}

const ROUTE_CURTAIN_TITLES: Record<AppRoutePath, string> = {
  '/': '01 · TRANG CHỦ',
  '/thuat-toan': '02 · THUẬT TOÁN',
  '/thuc-nghiem': '03 · KẾT QUẢ THỰC NGHIỆM',
  '/demo': '04 · DEMO & NÉN ẢNH',
};

/**
 * Silky 60fps Three-Phase Async Page Curtain (#282C20 with #D2FF00 hairline edge):
 * Exposes `isTransitioning` so heavy WebGL canvases defer shader compilation until
 * the curtain uncover animation completes (zero main-thread shader stall mid-sweep!).
 */
export function RouteTransitionProvider({
  reducedMotion,
  onResetScroll,
  onPauseLenis,
  children,
}: RouteTransitionProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const curtainRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const navigateWithCurtain = useCallback(
    (to: AppRoutePath, e?: MouseEvent<HTMLElement>, hash?: string) => {
      if (e) {
        e.preventDefault();
      }

      const currentPath = normalizeRoutePath(location.pathname);
      if (currentPath === to && !hash) {
        onResetScroll();
        return;
      }

      if (currentPath === to && hash) {
        onResetScroll(hash);
        return;
      }

      if (reducedMotion || !curtainRef.current) {
        ScrollTrigger.getAll().forEach((st) => st.kill());
        startTransition(() => {
          navigate(hash ? `${to}#${hash}` : to);
        });
        window.requestAnimationFrame(() => {
          onResetScroll(hash);
          window.requestAnimationFrame(() => {
            ScrollTrigger.refresh();
          });
        });
        return;
      }

      if (busyRef.current) return;
      busyRef.current = true;
      setIsTransitioning(true);

      const curtain = curtainRef.current;
      const label = labelRef.current;
      if (label) {
        label.textContent = ROUTE_CURTAIN_TITLES[to];
      }

      onPauseLenis?.(true);
      gsap.killTweensOf(curtain);
      if (label) gsap.killTweensOf(label);

      gsap.set(curtain, {
        visibility: 'visible',
        pointerEvents: 'auto',
        yPercent: 101,
      });
      if (label) {
        gsap.set(label, { autoAlpha: 0, y: 12 });
      }

      const coverTl = gsap.timeline({
        onComplete: () => {
          ScrollTrigger.getAll().forEach((st) => st.kill());
          startTransition(() => {
            navigate(hash ? `${to}#${hash}` : to);
          });
          onResetScroll(hash);

          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              const uncoverTl = gsap.timeline({
                onComplete: () => {
                  gsap.set(curtain, {
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    yPercent: 101,
                  });
                  onPauseLenis?.(false);
                  busyRef.current = false;
                  setIsTransitioning(false);
                  window.requestAnimationFrame(() => {
                    ScrollTrigger.refresh();
                  });
                },
              });

              if (label) {
                uncoverTl.to(
                  label,
                  {
                    autoAlpha: 0,
                    y: -10,
                    duration: 0.18,
                    ease: 'power2.in',
                  },
                  0
                );
              }

              uncoverTl.to(
                curtain,
                {
                  yPercent: -101,
                  duration: 0.46,
                  ease: 'expo.inOut',
                },
                0.03
              );
            });
          });
        },
      });

      coverTl.to(curtain, {
        yPercent: 0,
        duration: 0.38,
        ease: 'expo.inOut',
      });

      if (label) {
        coverTl.to(
          label,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.22,
            ease: 'power3.out',
          },
          0.14
        );
      }
    },
    [location.pathname, navigate, onPauseLenis, onResetScroll, reducedMotion]
  );

  return (
    <RouteTransitionContext.Provider value={{ isTransitioning, navigateWithCurtain }}>
      {children}
      <div ref={curtainRef} className="route-curtain" aria-hidden="true">
        <div className="route-curtain__edge-top" />
        <span ref={labelRef} className="route-curtain__label">
          THUẬT TOÁN ĐOM ĐÓM
        </span>
        <div className="route-curtain__edge-bottom" />
      </div>
    </RouteTransitionContext.Provider>
  );
}

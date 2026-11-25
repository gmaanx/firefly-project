import { useEffect, useState, type RefObject } from 'react';
import { useRouteCurtain } from '../components/shared/RouteCurtain';

/**
 * Prevents synchronous WebGL context creation & GLSL shader compilation stalls
 * while `RouteCurtain` is animating, AND lazily defers below-the-fold WebGL stages
 * until the user scrolls within `rootMargin` of `containerRef`.
 */
export function useDeferredWebGLMount(
  containerRef?: RefObject<HTMLElement | null>,
  rootMargin = '520px'
): {
  shouldMount: boolean;
  isReady: boolean;
} {
  const { isTransitioning } = useRouteCurtain();
  const [nearViewport, setNearViewport] = useState<boolean>(() => !containerRef);
  const [shouldMount, setShouldMount] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef || nearViewport) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [containerRef, nearViewport, rootMargin]);

  useEffect(() => {
    if (isTransitioning || !nearViewport) return;
    if (shouldMount && isReady) return;

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      setShouldMount(true);
      raf2 = window.requestAnimationFrame(() => {
        setIsReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [isReady, isTransitioning, nearViewport, shouldMount]);

  return { shouldMount, isReady };
}

import { useEffect, useState } from 'react';
import { useRouteCurtain } from '../components/shared/RouteCurtain';

/**
 * Prevents synchronous WebGL context creation & GLSL shader compilation stalls
 * while `RouteCurtain` is animating (`expo.inOut`).
 *
 * - On initial page load (`isTransitioning === false`), mounts after 1 animation frame.
 * - On SPA route navigation, waits until `isTransitioning` turns `false` + 1 frame,
 *   then triggers `ready` so the canvas fades in smoothly (`opacity: 0 -> 1`, `0.35s`).
 */
export function useDeferredWebGLMount(): {
  shouldMount: boolean;
  isReady: boolean;
} {
  const { isTransitioning } = useRouteCurtain();
  const [shouldMount, setShouldMount] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    if (isTransitioning) return;

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
  }, [isTransitioning]);

  return { shouldMount, isReady };
}

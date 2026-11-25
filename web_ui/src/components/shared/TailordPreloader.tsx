import { useEffect, useId, useRef, useState } from 'react';

interface BootTelemetryState {
  sceneMounted: boolean;
  loaded: number;
  total: number;
  label: string;
  ready: boolean;
}

type BootListener = (state: BootTelemetryState) => void;

const bootState: BootTelemetryState = {
  sceneMounted: false,
  loaded: 0,
  total: 11,
  label: 'INITIALIZING WEBGL2 & GPGPU SWARM...',
  ready: false,
};

const bootListeners = new Set<BootListener>();

function emitBootState() {
  for (const listener of bootListeners) {
    listener({ ...bootState });
  }
}

export function markSanctuaryBootMounted(): void {
  bootState.sceneMounted = true;
  if (!bootState.ready && bootState.loaded === 0) {
    bootState.label = 'INITIALIZING WEBGL2 & GPGPU SWARM...';
  }
  emitBootState();
}

export function reportSanctuaryBootProgress(
  loaded: number,
  total: number,
  label: string
): void {
  bootState.sceneMounted = true;
  bootState.loaded = Math.max(bootState.loaded, loaded);
  bootState.total = Math.max(1, total);
  bootState.label = label;
  if (loaded >= total) {
    bootState.ready = true;
  }
  emitBootState();
}

export function markSanctuaryBootReady(): void {
  bootState.ready = true;
  bootState.loaded = bootState.total;
  bootState.label = 'SYSTEM READY';
  emitBootState();
}

function subscribeSanctuaryBoot(listener: BootListener): () => void {
  bootListeners.add(listener);
  listener({ ...bootState });
  return () => {
    bootListeners.delete(listener);
  };
}

/**
 * Hidden global SVG filter definitions modeled 1:1 after `https://www.tailord.design/` (`#crt-ink`):
 * Creates organic analog phosphor micro-grain + soft halation bloom on display typography.
 */
export function TailordCrtFilterDefs() {
  return (
    <svg
      className="tailord-crt-svg-defs"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="crt-ink"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            result="grain"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="grain"
            result="monoGrain"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 1 1 0 0"
            in="monoGrain"
            result="grainAlpha"
          />
          <feComposite
            in="SourceGraphic"
            in2="grainAlpha"
            operator="in"
            result="brokenInk"
          />
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="0.6"
            result="softInk"
          />
          <feMerge>
            <feMergeNode in="brokenInk" />
            <feMergeNode in="softInk" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export interface TailordPreloaderProps {
  reducedMotion: boolean;
  isHomeRoute: boolean;
  onPauseScroll?: (paused: boolean) => void;
}

const PACED_BOOT_STAGES: ReadonlyArray<[number, string]> = [
  [0, 'INITIALIZING WEBGL2 & GPGPU SWARM...'],
  [18, 'GENERATING PMREM ENVIRONMENT & PBR MAPS...'],
  [38, 'LOADING LADA_WRECKS.GLB & PROPS...'],
  [62, 'LOADING BOTANICAL FLORA & ROSES...'],
  [82, 'COMPILING CRT PHOSPHOR & PATINA...'],
  [98, 'SYSTEM READY'],
];

/**
 * Full-screen CRT Phosphor Preloader modeled 1:1 after `https://www.tailord.design/`:
 * - `#181717` dark CRT backdrop with `1px / 3px` `rgba(3, 3, 12, 0.27)` scanlines & `110x110` fractalNoise screen grain
 * - Centered editorial serif `FIREFLY ALGORITHM` (`#fffddb` + `#crt-ink`), `52`/`23`-char `█`/`░` block bar (`#7eac81`),
 *   semantic `<progress max={100} value={...}>` + polite `role="status"` completion announcer, and live `.glb`/`.hdr` telemetry
 * - Signature `tailord.design` exit: `opacity: 1 -> 0`, `scale(1 -> 1.04)`, `blur(0px -> 8px)` over `0.75s cubic-bezier(0.16, 1, 0.3, 1)`
 */
export function TailordPreloader({
  reducedMotion,
  isHomeRoute,
  onPauseScroll,
}: TailordPreloaderProps) {
  const progressId = useId();
  const [mounted, setMounted] = useState<boolean>(true);
  const [exiting, setExiting] = useState<boolean>(false);
  const [announcedDone, setAnnouncedDone] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'INITIALIZING WEBGL2 & GPGPU SWARM...'
  );
  const [isCompactBar, setIsCompactBar] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  const onPauseScrollRef = useRef(onPauseScroll);
  onPauseScrollRef.current = onPauseScroll;

  const isHomeRouteRef = useRef(isHomeRoute);
  isHomeRouteRef.current = isHomeRoute;

  useEffect(() => {
    const onResize = () => {
      setIsCompactBar(window.innerWidth < 640);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    onPauseScrollRef.current?.(true);

    let telemetry: BootTelemetryState = { ...bootState };
    const unsub = subscribeSanctuaryBoot((next) => {
      telemetry = next;
    });

    const minDurationMs = reducedMotion ? 280 : 560;
    const holdReadyMs = reducedMotion ? 40 : 80;
    const exitDurationMs = reducedMotion ? 200 : 380;
    const maxSafetyWaitMs = 3200;

    const startPerf = performance.now();
    let prevNow = startPerf;
    let displayPct = 0;
    let readyReachedAt: number | null = null;
    let exitStarted = false;
    let rafId = 0;
    let unmountTimer = 0;

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startPerf);
      const dtSec = Math.min(0.25, Math.max(0.004, (now - prevNow) / 1000));
      prevNow = now;

      const timePacePct = Math.min(100, (elapsed / minDurationMs) * 100);

      let assetTargetPct = 100;
      let activeLabel = telemetry.label;

      if (isHomeRouteRef.current || telemetry.sceneMounted) {
        if (telemetry.ready || elapsed > maxSafetyWaitMs) {
          assetTargetPct = 100;
        } else if (telemetry.loaded > 0) {
          assetTargetPct = Math.min(
            96,
            12 + (telemetry.loaded / Math.max(1, telemetry.total)) * 84
          );
        } else {
          // While initial fetch requests are in flight, advance smoothly up to 34%
          assetTargetPct = Math.min(34, elapsed * 0.055);
        }
      }

      const gatedTarget = Math.min(assetTargetPct, timePacePct);
      if (displayPct < gatedTarget) {
        // Delta-time driven catch-up: never stalls behind synchronous WebGL shader compile frames!
        const allReady = assetTargetPct >= 100 && timePacePct >= 100;
        const minRatePerSec = allReady ? 420 : 120;
        const expBlend = 1 - Math.exp(-(allReady ? 18 : 10) * dtSec);
        const step = Math.max(
          minRatePerSec * dtSec,
          (gatedTarget - displayPct) * expBlend
        );
        displayPct = Math.min(gatedTarget, displayPct + step);
      }

      // If assets finished faster than minDuration (or on non-WebGL routes), pace status labels smoothly with displayPct
      if (
        telemetry.ready ||
        (!isHomeRouteRef.current && !telemetry.sceneMounted)
      ) {
        for (const [threshold, msg] of PACED_BOOT_STAGES) {
          if (displayPct >= threshold) activeLabel = msg;
        }
      }

      if (displayPct >= 99.6 && assetTargetPct >= 100 && timePacePct >= 100) {
        displayPct = 100;
        activeLabel = 'SYSTEM READY';
        if (readyReachedAt === null) {
          readyReachedAt = now;
          setAnnouncedDone(true);
        }
      }

      setProgress(displayPct);
      setStatusMessage(activeLabel);

      if (readyReachedAt !== null && now - readyReachedAt >= holdReadyMs) {
        if (!exitStarted) {
          exitStarted = true;
          setExiting(true);
          document.body.style.overflow = prevOverflow;
          onPauseScrollRef.current?.(false);
          unmountTimer = window.setTimeout(() => {
            setMounted(false);
          }, exitDurationMs + 40);
        }
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      unsub();
      window.cancelAnimationFrame(rafId);
      if (unmountTimer) window.clearTimeout(unmountTimer);
      document.body.style.overflow = prevOverflow;
      onPauseScrollRef.current?.(false);
    };
  }, [mounted, reducedMotion]);

  const roundedPct = Math.max(0, Math.min(100, Math.round(progress)));
  const blockSlots = isCompactBar ? 23 : 52;
  const filledBlocks = Math.round((roundedPct / 100) * blockSlots);
  const blockBar =
    '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, blockSlots - filledBlocks));
  const pctFormatted = `${String(roundedPct).padStart(2, '0')}%`;

  return (
    <>
      {mounted && (
        <div
          className={`tailord-preloader ${
            exiting ? 'tailord-preloader--exiting' : ''
          }`}
          data-preloader-state={exiting ? 'exiting' : 'loading'}
        >
          {/* Top spacer balances bottom telemetry footer so center stack sits optically centered */}
          <div className="tailord-preloader__top-spacer" aria-hidden="true" />

          <div className="tailord-preloader__center">
            <p className="tailord-preloader__title" aria-hidden="true">
              FIREFLY ALGORITHM
            </p>

            <div className="tailord-preloader__bar-wrap">
              <progress
                id={progressId}
                className="tailord-preloader__native-progress sr-only"
                max={100}
                value={roundedPct}
                aria-label="Tiến trình khởi tạo khung cảnh 3D Firefly Algorithm"
              />
              <div className="tailord-preloader__ascii-bar" aria-hidden="true">
                {blockBar}
              </div>
            </div>

            <div className="tailord-preloader__telemetry-row" aria-hidden="true">
              <span className="tailord-preloader__status">{statusMessage}</span>
              <span className="tailord-preloader__percent">{pctFormatted}</span>
            </div>
          </div>

          <div className="tailord-preloader__footer" aria-hidden="true">
            <span>
              PROC: THREE_GLTF // GPGPU_SWARM&nbsp;&nbsp;•&nbsp;&nbsp;CRT_PHOSPHOR:
              ACTIVE&nbsp;&nbsp;•&nbsp;&nbsp;FA // SYS_INIT
            </span>
            <span>
              {roundedPct >= 100
                ? 'SANCTUARY ONLINE'
                : 'LOADING ENVIRONMENT & ASSETS...'}
            </span>
          </div>
        </div>
      )}

      {/* Polite screen-reader completion announcement (never steals focus) */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcedDone
          ? 'Khung cảnh 3D Firefly Algorithm đã sẵn sàng.'
          : ''}
      </span>
    </>
  );
}

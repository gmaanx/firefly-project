import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  markSanctuaryBootMounted,
  markSanctuaryBootReady,
  reportSanctuaryBootProgress,
} from '../shared/TailordPreloader';
import { buildNocturnalWreckScene } from './buildNocturnalWreckScene';
import { createOrchestratedTerrainAndParticles } from './orchestratedTerrainAndParticles';

export interface OrchestratedFireflyHeroCanvasProps {
  reducedMotion: boolean;
  /** Scroll progress `p in [0, 1]` across Hero -> Manifesto transition */
  scrollProgressRef: MutableRefObject<number>;
  /** Optional ref to Hero HUD content for 60fps frame-locked damped exit */
  hudContentRef?: RefObject<HTMLDivElement | null>;
  /** Optional ref to outer sticky Hero HUD frame for synchronized Lando window clip */
  hudFrameRef?: RefObject<HTMLDivElement | null>;
  /** Optional ref to Hero CRT screen overlay for frame-locked scroll fade */
  crtOverlayRef?: RefObject<HTMLDivElement | null>;
  /** Optional ref to Hero centerpiece lockup for compositor-only parallax */
  centerpieceRef?: RefObject<HTMLDivElement | null>;
  /** Optional ref to Lando top-center bridge eyebrow for synchronized reveal */
  eyebrowRef?: RefObject<HTMLDivElement | null>;
  /** True while the Hero + Manifesto top stage is active */
  stageActive: boolean;
  /** Imperative scroll-gate handle so crossing 2.25vh never triggers a full HomePage React re-render */
  stageGateRef?: MutableRefObject<((inRange: boolean) => void) | null>;
  /** Optional handler (kept for prop compatibility) */
  onActivatePortal?: () => void;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Final Display-Space Cinema & Retro CRT Finishing Pass (runs after `OutputPass`):
 * - Authentic Retro Vintage Old-TV Scanlines (`sọc ngang retro vintage`), subtle RGB phosphor
 *   edge convergence fringe, warm analog tape toe, and gentle rolling refresh hum bar on Hero
 * - Complete 100% Matte-Olive (`#24281E`) full-frame dissolve on scroll (`mix`, not just `max`)
 *   so ZERO hero cars/pipes bleed behind `ManifestoSection`
 * - Sub-LSB triangle-noise dithering
 */
const NocturnalFinishingShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uFloorColor: { value: new THREE.Vector3(36 / 255, 40 / 255, 30 / 255) },
    uFloor: { value: 0.0 },
    uNoiseAmount: { value: 1.8 / 255.0 },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(1440, 900) },
    uCrtStrength: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform vec3 uFloorColor;
    uniform float uFloor;
    uniform float uNoiseAmount;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uCrtStrength;

    varying vec2 vUv;

    float triangleNoise(vec2 p) {
      vec2 p1 = fract(p * vec2(5.3983, 5.4427));
      p1 += dot(p1.yx, p1.xy + vec2(21.5351, 14.3137));
      vec2 h = fract(vec2(p1.x * p1.y * 95.4337, p1.x * p1.y * 97.597));
      return h.x + h.y - 1.0;
    }

    vec3 acesToneMap(vec3 x) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      float crtAmt = uCrtStrength * (1.0 - smoothstep(0.32, 0.86, uFloor));
      vec2 q = vUv - 0.5;
      float edgeDist = dot(q, q);

      // Single-tap HDR fetch + inline ACES Filmic (1.06 exposure) + fast sRGB -> eliminates OutputPass & 2 extra texture fetches!
      vec3 hdr = max(texture2D(tDiffuse, vUv).rgb, vec3(0.0)) * 1.06;
      vec3 col = pow(acesToneMap(hdr), vec3(1.0 / 2.2));

      // Phase-locked 3.0px CSS-pixel phosphor aperture (2*pi/3 = 2.0943951) matching .tailord-crt-overlay 1px/3px pitch
      float cssY = vUv.y * uResolution.y;
      float phosphorAperture = 0.5 + 0.5 * cos(cssY * 2.0943951);
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      float apertureDepth = mix(0.085, 0.035, smoothstep(0.18, 0.85, luma)) * crtAmt;
      col *= 1.0 - apertureDepth * (1.0 - phosphorAperture);

      // Subtle #181717 CRT charcoal-phosphor glass black-level sheen + cream-sage warmth
      col = mix(
        col,
        col * vec3(1.015, 1.008, 0.965) + vec3(0.010, 0.010, 0.011),
        0.52 * crtAmt
      );

      float vignette = clamp(1.0 - pow(edgeDist, 1.72) * 2.45 * (1.0 - uFloor * 0.72), 0.0, 1.0);
      col *= vignette;

      // Lando center-window atmospheric olive-duotone plate grade:
      // Keeps the 3D Firefly Sanctuary clearly visible inside the shrunk 472x306 center frame
      // while lifting deep blacks to #3C4233 matte olive-grey so the #D2FF00 signature pops cleanly.
      float sceneLuma = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
      float liftedLuma = pow(sceneLuma, 0.72);
      vec3 oliveDuotone = mix(
        vec3(0.235, 0.258, 0.200),
        vec3(0.575, 0.604, 0.502),
        liftedLuma
      );
      vec3 gradedPlate = mix(col * 0.58 + vec3(0.135, 0.150, 0.115), oliveDuotone, 0.74);
      col = mix(col, gradedPlate, clamp(uFloor, 0.0, 1.0));

      // Sub-LSB triangle dithering + subtle CRT phosphor micro-grain
      col += triangleNoise(gl_FragCoord.xy + fract(uTime * 11.3) * 89.0) * (uNoiseAmount + 0.0038 * crtAmt);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export function OrchestratedFireflyHeroCanvas({
  reducedMotion,
  scrollProgressRef,
  hudContentRef,
  hudFrameRef,
  crtOverlayRef,
  centerpieceRef,
  eyebrowRef,
  stageActive,
  stageGateRef,
}: OrchestratedFireflyHeroCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routeActiveRef = useRef<boolean>(stageActive);
  routeActiveRef.current = stageActive;
  const inScrollRangeRef = useRef<boolean>(true);

  const reducedMotionRef = useRef<boolean>(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const hudRefLatest = useRef(hudContentRef);
  hudRefLatest.current = hudContentRef;

  const hudFrameRefLatest = useRef(hudFrameRef);
  hudFrameRefLatest.current = hudFrameRef;

  const crtRefLatest = useRef(crtOverlayRef);
  crtRefLatest.current = crtOverlayRef;

  const centerpieceRefLatest = useRef(centerpieceRef);
  centerpieceRefLatest.current = centerpieceRef;

  const eyebrowRefLatest = useRef(eyebrowRef);
  eyebrowRefLatest.current = eyebrowRef;

  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const wakeStageRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    markSanctuaryBootMounted();
    const canvas = canvasRef.current;
    if (!canvas) {
      markSanctuaryBootReady();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      });
    } catch {
      setWebglFailed(true);
      markSanctuaryBootReady();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // All shadow-casting lights & props are static: bake shadow map on demand instead of 60x/sec!
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.localClippingEnabled = true;
    renderer.setClearColor(0x010204, 1);

    const isMobile = window.innerWidth < 768;
    let vw = Math.max(2, window.innerWidth);
    let vh = Math.max(2, window.innerHeight);
    let dpr = clamp(Math.min(0.86, 1280 / Math.max(vw, 1)), 0.72, 0.86);
    let pixelH = Math.max(2, Math.floor(vh * dpr));

    /* ----------------------------------------------------------------------
       1. Photoscanned PBR Ground + 340 Non-Clumping Single-Orb Fireflies
       ---------------------------------------------------------------------- */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010204);
    scene.fog = new THREE.FogExp2(0x010204, 0.042);

    const terrainAndParticles = createOrchestratedTerrainAndParticles(
      renderer,
      isMobile,
      pixelH
    );
    scene.add(terrainAndParticles.terrainMesh);
    scene.add(terrainAndParticles.grassCarpetMesh);
    scene.add(terrainAndParticles.fireflyPoints);
    terrainAndParticles.terrainMesh.updateMatrixWorld(true);
    terrainAndParticles.grassCarpetMesh.updateMatrixWorld(true);
    terrainAndParticles.fireflyPoints.updateMatrixWorld(true);
    terrainAndParticles.terrainMesh.matrixAutoUpdate = false;
    terrainAndParticles.grassCarpetMesh.matrixAutoUpdate = false;
    terrainAndParticles.fireflyPoints.matrixAutoUpdate = false;

    const camera = new THREE.PerspectiveCamera(47, vw / vh, 0.15, 65.0);

    /* ----------------------------------------------------------------------
       2. Real `.glb` Wrecked White Sedans, Verdigris Pipe, Shrubs & 3D Roses
       ---------------------------------------------------------------------- */
    const wreckSanctuary = buildNocturnalWreckScene({
      renderer,
      scene,
      camera,
      isMobile,
      sampleHeight: terrainAndParticles.sampleHeight,
      particleLightTex: terrainAndParticles.particleLightRT.texture,
      onLoadProgress: reportSanctuaryBootProgress,
      onReady: markSanctuaryBootReady,
    });
    terrainAndParticles.grassMeadow.bindSpotLight(wreckSanctuary.clearingSpot);
    scene.add(wreckSanctuary.group);

    const computeCameraBase = (aspect: number): { fov: number; baseZ: number } => {
      if (aspect >= 1.4) {
        return { fov: 47, baseZ: 8.75 };
      }
      const fov = clamp(47 * Math.pow(1.4 / Math.max(aspect, 0.52), 0.34), 47, 63);
      const baseZ = clamp(8.75 + (1.4 - aspect) * 2.15, 8.75, 10.8);
      return { fov, baseZ };
    };

    /* ----------------------------------------------------------------------
       3. `EffectComposer` (HalfFloat HDR -> Half-Res Bloom -> ACES -> CRT Finish)
       ---------------------------------------------------------------------- */
    const msaaTarget = new THREE.WebGLRenderTarget(
      Math.max(2, Math.floor(vw * dpr)),
      Math.max(2, Math.floor(vh * dpr)),
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        samples: 0,
      }
    );

    const composer = new EffectComposer(renderer, msaaTarget);
    composer.setPixelRatio(1);
    composer.setSize(Math.max(2, Math.floor(vw * dpr)), Math.max(2, Math.floor(vh * dpr)));

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Quarter-res HDR bloom + inline ACES inside finishPass (eliminates OutputPass completely!)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(2, Math.floor(vw * 0.25)), Math.max(2, Math.floor(vh * 0.25))),
      0.28,
      0.44,
      0.78
    );
    composer.addPass(bloomPass);

    const finishPass = new ShaderPass(NocturnalFinishingShader);
    composer.addPass(finishPass);

    /* ----------------------------------------------------------------------
       4. Pointer Tracking & Resize
       ---------------------------------------------------------------------- */
    let pointerNdcX = 0;
    let pointerNdcY = 0;
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let pointerActive = 0;
    let smoothPointerActive = 0;

    const onPointerMove = (ev: PointerEvent) => {
      if (!routeActiveRef.current || !inScrollRangeRef.current) return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      pointerNdcX = clamp((ev.clientX / w) * 2.0 - 1.0, -1.0, 1.0);
      pointerNdcY = clamp(-((ev.clientY / h) * 2.0 - 1.0), -1.0, 1.0);
      pointerActive = 1.0;
    };

    const onPointerLeave = () => {
      pointerActive = 0.0;
    };

    const handleResize = () => {
      vw = Math.max(2, window.innerWidth);
      vh = Math.max(2, window.innerHeight);
      dpr = clamp(Math.min(0.86, 1280 / Math.max(vw, 1)), 0.72, 0.86);
      const aspect = vw / vh;
      const { fov } = computeCameraBase(aspect);

      camera.aspect = aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(dpr);
      renderer.setSize(vw, vh, false);

      const rtW = Math.max(2, Math.floor(vw * dpr));
      const rtH = Math.max(2, Math.floor(vh * dpr));
      pixelH = rtH;
      composer.setPixelRatio(1);
      composer.setSize(rtW, rtH);
      bloomPass.resolution.set(Math.max(2, Math.floor(vw * 0.25)), Math.max(2, Math.floor(vh * 0.25)));
      finishPass.uniforms.uResolution.value.set(vw, vh);
      terrainAndParticles.resize(pixelH);
    };

    handleResize();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    /* ----------------------------------------------------------------------
       5. `THREE.Timer` Render Loop (3D Parallax + Raycast + GPGPU Fireflies)
       ---------------------------------------------------------------------- */
    const raycaster = new THREE.Raycaster();
    const ptrVec2 = new THREE.Vector2();
    const cursorWorld = new THREE.Vector3(0, -0.75, 1.8);
    const targetCursorWorld = new THREE.Vector3(0, -0.75, 1.8);
    const camLookTarget = new THREE.Vector3();

    const timer = new THREE.Timer();
    timer.connect(document);

    let rafId = 0;
    let running = false;
    let elapsed = 0;
    let introProgress = 0;
    let lastWrapTf = '';
    let lastCanvasTf = '';
    let lastHudOp = '';
    let lastEbOp = '';
    let lastCrtOp = '';
    let lastCenterpieceTf = '';
    let lastRayPtrX = 999;
    let lastRayPtrY = 999;

    const renderSingleStep = (timestamp: number) => {
      // Uncapped native 120Hz/144Hz/240Hz VSync render loop: DOM + WebGL stay locked together!
      const scrollP = clamp(scrollProgressRef.current, 0.0, 1.0);

      const hudEl = hudRefLatest.current?.current;
      if (hudEl) {
        const hudFade = smoothstep(0.0, 0.34, scrollP);
        const hudOpacity = 1.0 - hudFade;
        const opStr = hudOpacity.toFixed(3);
        if (opStr !== lastHudOp) {
          lastHudOp = opStr;
          const hudTy = reducedMotionRef.current ? 0.0 : -24.0 * hudFade;
          const hudScale = reducedMotionRef.current ? 1.0 : 1.0 - 0.08 * hudFade;
          hudEl.style.opacity = opStr;
          hudEl.style.transform = `translate3d(0, ${hudTy.toFixed(2)}px, 0) scale(${hudScale.toFixed(4)})`;
          hudEl.style.pointerEvents = hudOpacity < 0.05 ? 'none' : '';
        }
      }

      const wrapEl = wrapRef.current;
      const eyebrowEl = eyebrowRefLatest.current?.current;
      const framePhase = smoothstep(0.005, 0.78, scrollP);

      // Pure GPU-compositor `scale3d` 4-sided window shrink (replaces non-composited `clip-path: inset(...)` repaints!)
      let nextWrapTf = 'none';
      let nextCanvasTf = 'none';
      if (!reducedMotionRef.current) {
        if (framePhase > 0.001) {
          const isWide = camera.aspect >= 1.05;
          const insetX = (isWide ? 33.6 : 9.5) * framePhase;
          const insetY = (isWide ? 33.0 : 34.0) * framePhase;
          const sx = Math.max(0.1, 1.0 - (2.0 * insetX) / 100.0);
          const sy = Math.max(0.1, 1.0 - (2.0 * insetY) / 100.0);
          const canvasScale = 1.0 - (isWide ? 0.56 : 0.36) * framePhase;
          const tyPct = ((1.0 - canvasScale) * 2.0) / sy;
          nextWrapTf = `scale3d(${sx.toFixed(4)}, ${sy.toFixed(4)}, 1)`;
          nextCanvasTf = `translate3d(0, ${tyPct.toFixed(3)}%, 0) scale3d(${(canvasScale / sx).toFixed(4)}, ${(canvasScale / sy).toFixed(4)}, 1)`;
        }
      } else if (scrollP > 0.25) {
        const isWide = camera.aspect >= 1.05;
        const sx = isWide ? 0.328 : 0.81;
        const sy = isWide ? 0.34 : 0.32;
        nextWrapTf = `scale3d(${sx}, ${sy}, 1)`;
        nextCanvasTf = `scale3d(${(1.0 / sx).toFixed(4)}, ${(1.0 / sy).toFixed(4)}, 1)`;
      }

      if (nextWrapTf !== lastWrapTf) {
        lastWrapTf = nextWrapTf;
        if (wrapEl) wrapEl.style.transform = nextWrapTf;
      }
      if (nextCanvasTf !== lastCanvasTf) {
        lastCanvasTf = nextCanvasTf;
        canvas.style.transform = nextCanvasTf;
      }

      if (eyebrowEl) {
        const ebReveal = smoothstep(0.46, 0.82, framePhase);
        const ebOpStr = ebReveal.toFixed(3);
        if (ebOpStr !== lastEbOp) {
          lastEbOp = ebOpStr;
          eyebrowEl.style.opacity = ebOpStr;
          eyebrowEl.style.transform = reducedMotionRef.current
            ? 'translate3d(-50%, 0, 0)'
            : `translate3d(-50%, ${((1.0 - ebReveal) * 14.0).toFixed(2)}px, 0)`;
        }
      }

      const crtEl = crtRefLatest.current?.current;
      if (crtEl) {
        const crtOpStr = (1.0 - smoothstep(0.18, 0.66, scrollP)).toFixed(3);
        if (crtOpStr !== lastCrtOp) {
          lastCrtOp = crtOpStr;
          crtEl.style.opacity = crtOpStr;
        }
      }

      timer.update(timestamp);
      const dt = clamp(timer.getDelta(), 0.001, 0.033);
      const motionScale = reducedMotionRef.current ? 0.22 : 1.0;
      elapsed += dt * motionScale;

      introProgress = Math.min(1.0, introProgress + dt / 1.05);
      const introEased = smoothstep(0.0, 1.0, introProgress);

      const rush = 0.0;

      const ptrFollow = 1.0 - Math.exp(-dt * 5.8);
      smoothPtrX += (pointerNdcX - smoothPtrX) * ptrFollow;
      smoothPtrY += (pointerNdcY - smoothPtrY) * ptrFollow;
      smoothPointerActive +=
        (pointerActive * (1.0 - framePhase * 0.85) - smoothPointerActive) *
        (1.0 - Math.exp(-dt * 4.5));

      const centerpieceEl = centerpieceRefLatest.current?.current;
      if (centerpieceEl) {
        const nextCpTf = `translate3d(calc(-50% + ${(smoothPtrX * -16).toFixed(2)}px), calc(-50% + ${(smoothPtrY * 10).toFixed(2)}px), 0)`;
        if (nextCpTf !== lastCenterpieceTf) {
          lastCenterpieceTf = nextCpTf;
          centerpieceEl.style.transform = nextCpTf;
        }
      }

      // Keep both cars, glowing verdigris pipe & roses squarely centered inside the shrinking frame
      const { baseZ } = computeCameraBase(camera.aspect);
      const idleSwayX = Math.sin(elapsed * 0.30) * 0.11 * motionScale;
      const idleSwayY = Math.cos(elapsed * 0.24) * 0.04 * motionScale;

      const camX = (smoothPtrX * 0.88 + idleSwayX) * (1.0 - framePhase * 0.72);
      const camZ = baseZ + framePhase * 0.45;
      const groundUnderCam = terrainAndParticles.sampleHeight(camX, camZ);
      const camY = Math.max(
        groundUnderCam + 0.85,
        0.48 + (-smoothPtrY * 0.30 + idleSwayY) * (1.0 - framePhase * 0.72) + framePhase * 0.06
      );

      camera.position.set(camX, camY, camZ);
      camLookTarget.set(
        smoothPtrX * 0.16 * (1.0 - framePhase * 0.7),
        -0.30 - framePhase * 0.06,
        0.35
      );
      camera.lookAt(camLookTarget);
      camera.updateMatrixWorld();

      // Run heightfield raymarch ONLY when pointer actually moved
      if (
        Math.abs(smoothPtrX - lastRayPtrX) > 0.002 ||
        Math.abs(smoothPtrY - lastRayPtrY) > 0.002
      ) {
        lastRayPtrX = smoothPtrX;
        lastRayPtrY = smoothPtrY;
        ptrVec2.set(smoothPtrX, smoothPtrY);
        raycaster.setFromCamera(ptrVec2, camera);
        const ro = raycaster.ray.origin;
        const rd = raycaster.ray.direction;
        let hitFound = false;
        let tPrev = 1.8;
        for (let step = 1; step <= 16; step += 1) {
          const t = 1.8 + step * 0.9;
          const wx = ro.x + rd.x * t;
          const wy = ro.y + rd.y * t;
          const wz = ro.z + rd.z * t;
          const surfH = terrainAndParticles.sampleHeight(wx, wz) + 0.52;
          if (wy <= surfH) {
            let lo = tPrev;
            let hi = t;
            for (let b = 0; b < 3; b += 1) {
              const mid = (lo + hi) * 0.5;
              const my = ro.y + rd.y * mid;
              const mh =
                terrainAndParticles.sampleHeight(ro.x + rd.x * mid, ro.z + rd.z * mid) +
                0.52;
              if (my <= mh) hi = mid;
              else lo = mid;
            }
            const tHit = (lo + hi) * 0.5;
            targetCursorWorld.set(
              clamp(ro.x + rd.x * tHit, -5.8, 5.8),
              clamp(ro.y + rd.y * tHit, -1.35, 1.45),
              clamp(ro.z + rd.z * tHit, -1.8, 5.2)
            );
            hitFound = true;
            break;
          }
          tPrev = t;
        }
        if (!hitFound) {
          const tSky = clamp((1.2 - ro.z) / (Math.abs(rd.z) > 1e-3 ? rd.z : -1.0), 3.5, 11.5);
          targetCursorWorld.set(
            clamp(ro.x + rd.x * tSky, -5.5, 5.5),
            clamp(ro.y + rd.y * tSky, -1.15, 1.35),
            clamp(ro.z + rd.z * tSky, -1.5, 4.8)
          );
        }
      }
      cursorWorld.lerp(targetCursorWorld, 1.0 - Math.exp(-dt * 8.5));
      terrainAndParticles.grassMeadow.injectPointerGust(
        targetCursorWorld.x,
        targetCursorWorld.z,
        pointerActive > 0.5 && scrollP < 0.35
      );

      const gentleSceneScroll = framePhase * 0.24;

      // Step GPGPU Firefly Simulation + Splat 256x256 Ground LightMap
      terrainAndParticles.stepAndSplat(
        renderer,
        camera,
        dt,
        elapsed,
        motionScale,
        introEased,
        gentleSceneScroll,
        rush,
        cursorWorld,
        smoothPointerActive,
        pixelH
      );

      wreckSanctuary.updateUniforms(
        elapsed,
        gentleSceneScroll,
        camera.position,
        cursorWorld,
        smoothPointerActive * introEased
      );
      terrainAndParticles.grassMeadow.update(
        elapsed,
        dt * (0.28 + 0.72 * motionScale),
        gentleSceneScroll,
        wreckSanctuary.practicalPositions
      );

      finishPass.uniforms.uTime.value = elapsed * motionScale;
      finishPass.uniforms.uCrtStrength.value = reducedMotionRef.current ? 0.65 : 1.0;
      finishPass.uniforms.uFloor.value = smoothstep(0.18, 0.78, scrollP);

      // Render 3D PBR Scene + Shadows + Selective HDR Bloom + ACES Output + Cinema Finish
      composer.render(dt);
    };

    const stepFrame = (timestamp: number) => {
      if (!running) return;
      rafId = window.requestAnimationFrame(stepFrame);
      renderSingleStep(timestamp);
    };

    const syncRunState = () => {
      const activeNow = routeActiveRef.current && inScrollRangeRef.current;
      wrapRef.current?.classList.toggle('orchestrated-hero-canvas-wrap--inactive', !activeNow);
      const shouldRun = activeNow && !document.hidden;
      if (shouldRun && !running) {
        handleResize();
        lastWrapTf = '';
        lastCanvasTf = '';
        lastHudOp = '';
        lastCenterpieceTf = '';
        running = true;
        timer.reset();
        renderSingleStep(performance.now());
        rafId = window.requestAnimationFrame(stepFrame);
      } else if (!shouldRun && running) {
        running = false;
        window.cancelAnimationFrame(rafId);
      }
    };

    wakeStageRef.current = syncRunState;
    if (stageGateRef) {
      stageGateRef.current = (inRange: boolean) => {
        if (inScrollRangeRef.current !== inRange) {
          inScrollRangeRef.current = inRange;
          syncRunState();
        }
      };
    }

    document.addEventListener('visibilitychange', syncRunState);
    syncRunState();

    return () => {
      wakeStageRef.current = null;
      if (stageGateRef) stageGateRef.current = null;
      running = false;
      window.cancelAnimationFrame(rafId);
      timer.dispose();
      document.removeEventListener('visibilitychange', syncRunState);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('resize', handleResize);

      terrainAndParticles.dispose();
      wreckSanctuary.dispose();
      bloomPass.dispose();
      finishPass.dispose();
      composer.dispose();
      msaaTarget.dispose();
      renderer.dispose();
    };
  }, [scrollProgressRef]);

  useEffect(() => {
    wakeStageRef.current?.();
  }, [stageActive]);

  if (webglFailed) {
    return <div className="orchestrated-hero-fallback" aria-hidden="true" />;
  }

  return (
    <div
      ref={wrapRef}
      className={`orchestrated-hero-canvas-wrap ${
        stageActive ? '' : 'orchestrated-hero-canvas-wrap--inactive'
      }`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="orchestrated-hero-canvas" />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDeferredWebGLMount } from '../lib/useDeferredWebGLMount';
import type { CompressionTelemetry } from './types';

export interface RgbCubeVisualizerProps {
  pointCloudPositions: Float32Array;
  pointCloudColors: Float32Array;
  telemetry: CompressionTelemetry | null;
  reducedMotion?: boolean;
}

export function RgbCubeVisualizer({
  pointCloudPositions,
  pointCloudColors,
  telemetry,
  reducedMotion = false,
}: RgbCubeVisualizerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [showCloud, setShowCloud] = useState<boolean>(true);
  const [autoSpin, setAutoSpin] = useState<boolean>(true);
  const { shouldMount, isReady } = useDeferredWebGLMount(stageRef, '560px');

  const cloudRef = useRef<THREE.Points | null>(null);
  const centroidsGroupRef = useRef<THREE.Group | null>(null);
  const swarmPointsRef = useRef<THREE.Points | null>(null);
  const orbitStateRef = useRef({
    yaw: 0.62,
    pitch: 0.42,
    distance: 3.45,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const flagsRef = useRef({ showCloud: true, autoSpin: true, reducedMotion: false });

  useEffect(() => {
    flagsRef.current.showCloud = showCloud;
    flagsRef.current.autoSpin = autoSpin;
    flagsRef.current.reducedMotion = reducedMotion;
    if (cloudRef.current) {
      cloudRef.current.visible = showCloud;
    }
  }, [showCloud, autoSpin, reducedMotion]);

  useEffect(() => {
    if (!shouldMount) return;
    const container = stageRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x101110, 1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0xefefe8,
      transparent: true,
      opacity: 0.2,
    });
    const wireBox = new THREE.LineSegments(edgesGeo, edgesMat);
    rootGroup.add(wireBox);

    const makeAxis = (to: [number, number, number], hex: number) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(to[0], to[1], to[2]),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.8 });
      return new THREE.Line(geo, mat);
    };
    const rAxis = makeAxis([1.08, -1, -1], 0xd96b6b);
    const gAxis = makeAxis([-1, 1.08, -1], 0xc5e84d);
    const bAxis = makeAxis([-1, -1, 1.08], 0x8d7ae6);
    rootGroup.add(rAxis, gAxis, bAxis);

    const cloudGeo = new THREE.BufferGeometry();
    const cloudMat = new THREE.PointsMaterial({
      size: 0.042,
      vertexColors: true,
      transparent: true,
      opacity: 0.56,
    });
    const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
    cloudPoints.visible = flagsRef.current.showCloud;
    cloudRef.current = cloudPoints;
    rootGroup.add(cloudPoints);

    const swarmGeo = new THREE.BufferGeometry();
    const swarmMat = new THREE.PointsMaterial({
      size: 0.062,
      color: 0x8d7ae6,
      transparent: true,
      opacity: 0.58,
    });
    const swarmPts = new THREE.Points(swarmGeo, swarmMat);
    swarmPointsRef.current = swarmPts;
    rootGroup.add(swarmPts);

    const centroidsGroup = new THREE.Group();
    centroidsGroupRef.current = centroidsGroup;
    rootGroup.add(centroidsGroup);

    const applySize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    applySize();

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(applySize);
    });
    ro.observe(container);

    let inView = false;
    let rafId = 0;

    const timer = new THREE.Timer();
    timer.connect(document);

    const renderFrame = () => {
      timer.update();
      const dt = Math.min(0.05, timer.getDelta());

      if (
        flagsRef.current.autoSpin &&
        !flagsRef.current.reducedMotion &&
        !orbitStateRef.current.dragging
      ) {
        orbitStateRef.current.yaw += dt * 0.34;
      }

      const { yaw, pitch, distance } = orbitStateRef.current;
      camera.position.x = distance * Math.cos(pitch) * Math.sin(yaw);
      camera.position.y = distance * Math.sin(pitch);
      camera.position.z = distance * Math.cos(pitch) * Math.cos(yaw);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    const renderLoop = () => {
      if (!inView || document.hidden) {
        rafId = 0;
        return;
      }
      renderFrame();
      rafId = window.requestAnimationFrame(renderLoop);
    };

    const stopLoop = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const startLoop = () => {
      if (!inView || document.hidden) return;
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(renderLoop);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        if (inView && !document.hidden) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (inView) {
        startLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onPointerDown = (ev: PointerEvent) => {
      orbitStateRef.current.dragging = true;
      orbitStateRef.current.lastX = ev.clientX;
      orbitStateRef.current.lastY = ev.clientY;
      container.setPointerCapture(ev.pointerId);
      startLoop();
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!orbitStateRef.current.dragging) return;
      const dx = ev.clientX - orbitStateRef.current.lastX;
      const dy = ev.clientY - orbitStateRef.current.lastY;
      orbitStateRef.current.lastX = ev.clientX;
      orbitStateRef.current.lastY = ev.clientY;
      orbitStateRef.current.yaw += dx * 0.01;
      orbitStateRef.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, orbitStateRef.current.pitch + dy * 0.01)
      );
      if (rafId === 0) renderFrame();
    };
    const onPointerUp = (ev: PointerEvent) => {
      orbitStateRef.current.dragging = false;
      if (container.hasPointerCapture(ev.pointerId)) {
        container.releasePointerCapture(ev.pointerId);
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    renderFrame();

    return () => {
      stopLoop();
      window.cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      timer.dispose();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);

      boxGeo.dispose();
      edgesGeo.dispose();
      edgesMat.dispose();
      rAxis.geometry.dispose();
      (rAxis.material as THREE.Material).dispose();
      gAxis.geometry.dispose();
      (gAxis.material as THREE.Material).dispose();
      bAxis.geometry.dispose();
      (bAxis.material as THREE.Material).dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      swarmGeo.dispose();
      swarmMat.dispose();

      centroidsGroup.children.forEach((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      cloudRef.current = null;
      centroidsGroupRef.current = null;
      swarmPointsRef.current = null;
    };
  }, [shouldMount]);

  useEffect(() => {
    const cloud = cloudRef.current;
    if (!cloud) return;
    cloud.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(pointCloudPositions, 3)
    );
    cloud.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(pointCloudColors, 3)
    );
    cloud.geometry.computeBoundingSphere();
  }, [pointCloudPositions, pointCloudColors, shouldMount]);

  useEffect(() => {
    const group = centroidsGroupRef.current;
    const swarmPts = swarmPointsRef.current;
    if (!group || !swarmPts) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    if (!telemetry) return;

    const best =
      telemetry.fireflyCentroids.find((f) => f.isBest) ??
      telemetry.fireflyCentroids[0];

    if (best) {
      const sphereGeo = new THREE.SphereGeometry(0.082, 14, 14);
      const ringGeo = new THREE.RingGeometry(0.105, 0.132, 20);

      for (const [r, g, b] of best.colors) {
        const nx = (r / 255) * 2 - 1;
        const ny = (g / 255) * 2 - 1;
        const nz = (b / 255) * 2 - 1;

        const coreMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(r / 255, g / 255, b / 255),
        });
        const core = new THREE.Mesh(sphereGeo.clone(), coreMat);
        core.position.set(nx, ny, nz);
        group.add(core);

        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xc5e84d,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
        });
        const halo = new THREE.Mesh(ringGeo.clone(), haloMat);
        halo.position.set(nx, ny, nz);
        group.add(halo);
      }

      sphereGeo.dispose();
      ringGeo.dispose();
    }

    const others = telemetry.fireflyCentroids.filter((f) => !f.isBest);
    const totalPts = others.reduce((acc, f) => acc + f.colors.length, 0);
    const posArr = new Float32Array(totalPts * 3);
    let ptr = 0;
    for (const f of others) {
      for (const [r, g, b] of f.colors) {
        posArr[ptr++] = (r / 255) * 2 - 1;
        posArr[ptr++] = (g / 255) * 2 - 1;
        posArr[ptr++] = (b / 255) * 2 - 1;
      }
    }
    swarmPts.geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  }, [telemetry, shouldMount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
      <div className="ba-toolbar">
        <span className="ba-toolbar__title">Không gian RGB 3D</span>
        <div className="chip-group">
          <button
            type="button"
            aria-pressed={showCloud}
            className={`chip-btn ${showCloud ? 'chip-btn--active' : ''}`}
            onClick={() => setShowCloud((v) => !v)}
          >
            Điểm ảnh
          </button>
          <button
            type="button"
            aria-pressed={autoSpin}
            className={`chip-btn ${autoSpin ? 'chip-btn--active' : ''}`}
            onClick={() => setAutoSpin((v) => !v)}
          >
            360°
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-label="Phóng to khối RGB"
            onClick={() => {
              orbitStateRef.current.distance = Math.max(
                2.1,
                orbitStateRef.current.distance - 0.35
              );
            }}
          >
            +
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-label="Thu nhỏ khối RGB"
            onClick={() => {
              orbitStateRef.current.distance = Math.min(
                5.0,
                orbitStateRef.current.distance + 0.35
              );
            }}
          >
            −
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="rgb-cube-stage"
        style={{
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        aria-label="Mô hình không gian màu 3D RGB hiển thị đám mây điểm ảnh và K tâm cụm đom đóm"
      />
    </div>
  );
}

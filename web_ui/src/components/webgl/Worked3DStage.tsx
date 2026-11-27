import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useDeferredWebGLMount } from '../../lib/useDeferredWebGLMount';
import type { ConstrainedDemoData, WorkedExample135Data } from '../../types/dataContracts';

export interface Worked3DStageProps {
  mode: 'unconstrained' | 'constrained';
  activeStep: number;
  workedData: WorkedExample135Data | null;
  constrainedData: ConstrainedDemoData | null;
  reducedMotion: boolean;
}

interface LabelMeta {
  id: string;
  text: string;
  tone: 'best' | 'normal' | 'reject';
}

interface ProjectedLabel extends LabelMeta {
  x: number;
  y: number;
}

function createGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(197, 232, 77, 0.92)');
    grad.addColorStop(0.38, 'rgba(182, 201, 110, 0.34)');
    grad.addColorStop(1, 'rgba(182, 201, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildClippedFeasiblePlaneGeometry(): {
  meshGeo: THREE.BufferGeometry;
  borderGeo: THREE.BufferGeometry;
  activeEdgeGeo: THREE.BufferGeometry;
} {
  type Pt2 = [number, number];
  let poly: Pt2[] = [
    [-5, -5],
    [0.4, -5],
    [0.4, 5],
    [-5, 5],
  ];

  const clipHalfPlane = (pts: Pt2[], evalFn: (p: Pt2) => number): Pt2[] => {
    const out: Pt2[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      const fCur = evalFn(cur);
      const fPrev = evalFn(prev);
      if (fCur >= -1e-9) {
        if (fPrev < -1e-9) {
          const t = fPrev / (fPrev - fCur);
          out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
        }
        out.push(cur);
      } else if (fPrev >= -1e-9) {
        const t = fPrev / (fPrev - fCur);
        out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
      }
    }
    return out;
  };

  poly = clipHalfPlane(poly, ([x1, x2]) => x1 + x2 + 3.5);
  poly = clipHalfPlane(poly, ([x1, x2]) => 6.5 - (x1 + x2));

  const verts3D = poly.map(([x1, x2]) => new THREE.Vector3(x1, 1.5 - x1 - x2, x2));

  const positions: number[] = [];
  for (let i = 1; i < verts3D.length - 1; i += 1) {
    positions.push(
      verts3D[0].x,
      verts3D[0].y,
      verts3D[0].z,
      verts3D[i].x,
      verts3D[i].y,
      verts3D[i].z,
      verts3D[i + 1].x,
      verts3D[i + 1].y,
      verts3D[i + 1].z
    );
  }
  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  meshGeo.computeVertexNormals();

  const loopPts = [...verts3D, verts3D[0]];
  const borderGeo = new THREE.BufferGeometry().setFromPoints(loopPts);

  const activeEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.4, 5.0, -3.9),
    new THREE.Vector3(0.4, -3.9, 5.0),
  ]);

  return { meshGeo, borderGeo, activeEdgeGeo };
}

function toVec3(pos: readonly [number, number, number] | readonly number[]): THREE.Vector3 {
  return new THREE.Vector3(pos[0], pos[2], pos[1]);
}

export function Worked3DStage({
  mode,
  activeStep,
  workedData,
  constrainedData,
  reducedMotion,
}: Worked3DStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelElsRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [labelMetas, setLabelMetas] = useState<LabelMeta[]>([]);
  const { shouldMount, isReady } = useDeferredWebGLMount(wrapRef, '560px');

  const stateRef = useRef({ mode, activeStep, workedData, constrainedData, reducedMotion });
  stateRef.current = { mode, activeStep, workedData, constrainedData, reducedMotion };

  const rebuildSceneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!shouldMount) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x131512, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1.25, 0.1, 100);
    camera.position.set(11.8, 8.6, 12.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 8.5;
    controls.maxDistance = 24;
    controls.autoRotate = !stateRef.current.reducedMotion;
    controls.autoRotateSpeed = 0.52;
    controls.target.set(0.4, 0.6, 0.4);

    const onControlStart = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener('start', onControlStart);

    const hemi = new THREE.HemisphereLight(0xefefe8, 0x24281e, 1.35);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(8, 14, 10);
    scene.add(hemi, keyLight);

    const staticGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(10, 10, 10);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLine = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x3a3e35, transparent: true, opacity: 0.72 })
    );
    staticGroup.add(boxLine);

    const floorGrid = new THREE.GridHelper(10, 10, 0x31352c, 0x21241e);
    floorGrid.position.y = -5;
    staticGroup.add(floorGrid);

    const axesPts = [
      new THREE.Vector3(-5, 0, 0),
      new THREE.Vector3(5, 0, 0),
      new THREE.Vector3(0, -5, 0),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(0, 0, 5),
    ];
    const axesGeo = new THREE.BufferGeometry().setFromPoints(axesPts);
    const axesLines = new THREE.LineSegments(
      axesGeo,
      new THREE.LineBasicMaterial({ color: 0xefefe8, transparent: true, opacity: 0.13 })
    );
    staticGroup.add(axesLines);
    scene.add(staticGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const glowTex = createGlowTexture();
    let pulseTraveler: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3 } | null = null;
    let labelAnchors: { id: string; text: string; world: THREE.Vector3; tone: ProjectedLabel['tone'] }[] = [];

    const disposeDynamicGroup = () => {
      dynamicGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      dynamicGroup.clear();
      pulseTraveler = null;
      labelAnchors = [];
    };

    const buildDynamicScene = () => {
      disposeDynamicGroup();
      const { mode: curMode, activeStep: step, workedData: wData, constrainedData: cData } = stateRef.current;

      if (curMode === 'unconstrained') {
        const optPos = toVec3([1, 1, 1]);
        const optGeo = new THREE.OctahedronGeometry(0.24, 0);
        const optMat = new THREE.MeshBasicMaterial({ color: 0xc5e84d, wireframe: true });
        const optMesh = new THREE.Mesh(optGeo, optMat);
        optMesh.position.copy(optPos);
        dynamicGroup.add(optMesh);
        labelAnchors.push({ id: 'opt', text: 'x* (1,1,1)', world: optPos, tone: 'best' });

        if (wData) {
          wData.initial_population.forEach((ff) => {
            const p3 = toVec3(ff.pos);
            const isBrightest = ff.id === 1;
            const isActiveMover = (step === 1 && ff.id === 2) || (step === 2 && ff.id === 3);
            const radius = isBrightest ? 0.34 : isActiveMover ? 0.3 : 0.23;

            const sphereGeo = new THREE.SphereGeometry(radius, 24, 18);
            const sphereMat = new THREE.MeshStandardMaterial({
              color: isBrightest ? 0xc5e84d : isActiveMover ? 0xefefe8 : 0x939889,
              emissive: isBrightest ? 0xc5e84d : step === 2 && ff.id === 3 ? 0xd98c4a : 0x4b5320,
              emissiveIntensity: isBrightest ? 0.8 : isActiveMover ? 0.5 : 0.2,
              roughness: 0.25,
              metalness: 0.1,
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.copy(p3);
            dynamicGroup.add(sphere);

            if (isBrightest || isActiveMover) {
              const spriteMat = new THREE.SpriteMaterial({
                map: glowTex,
                color: step === 2 && ff.id === 3 ? 0xd98c4a : 0xc5e84d,
                transparent: true,
                opacity: isBrightest ? 0.82 : 0.52,
                depthWrite: false,
              });
              const halo = new THREE.Sprite(spriteMat);
              halo.position.copy(p3);
              halo.scale.setScalar(isBrightest ? 1.8 : 1.3);
              dynamicGroup.add(halo);
            }

            labelAnchors.push({
              id: `x${ff.id}`,
              text: `x${ff.id} (f=${ff.f})`,
              world: p3,
              tone: isBrightest ? 'best' : step === 2 && ff.id === 3 ? 'reject' : 'normal',
            });
          });

          const x1Pos = toVec3(wData.initial_population[0].pos);

          if (step === 1 && wData.pair_logs[0]) {
            const log21 = wData.pair_logs[0];
            const start = toVec3(wData.initial_population[1].pos);
            const landed = toVec3(log21.new_pos);
            const ctrl = start.clone().lerp(landed, 0.5).add(new THREE.Vector3(0, 0.85, 0));
            const curve = new THREE.QuadraticBezierCurve3(start, ctrl, landed);

            const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.05, 8, false);
            const tubeMat = new THREE.MeshBasicMaterial({ color: 0xc5e84d });
            dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

            const guideGeo = new THREE.BufferGeometry().setFromPoints([landed, x1Pos]);
            const guideLine = new THREE.Line(
              guideGeo,
              new THREE.LineDashedMaterial({ color: 0xb6c96e, dashSize: 0.25, gapSize: 0.2, transparent: true, opacity: 0.45 })
            );
            guideLine.computeLineDistances();
            dynamicGroup.add(guideLine);

            const landMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 20, 16),
              new THREE.MeshBasicMaterial({ color: 0xc5e84d })
            );
            landMesh.position.copy(landed);
            dynamicGroup.add(landMesh);

            const travMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.15, 14, 12),
              new THREE.MeshBasicMaterial({ color: 0xefefe8 })
            );
            dynamicGroup.add(travMesh);
            pulseTraveler = { mesh: travMesh, curve };

            labelAnchors.push({
              id: 'x2-new',
              text: `x2' (f=${log21.f_new.toFixed(2)})`,
              world: landed,
              tone: 'best',
            });
          }

          if (step === 2 && wData.pair_logs[1]) {
            const log31 = wData.pair_logs[1];
            const start = toVec3(wData.initial_population[2].pos);
            const trial = toVec3(log31.new_pos);

            const attrGeo = new THREE.BufferGeometry().setFromPoints([start, x1Pos]);
            const attrLine = new THREE.Line(
              attrGeo,
              new THREE.LineDashedMaterial({ color: 0xd98c4a, dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.45 })
            );
            attrLine.computeLineDistances();
            dynamicGroup.add(attrLine);

            const jumpCurve = new THREE.QuadraticBezierCurve3(
              start,
              start.clone().lerp(trial, 0.5).add(new THREE.Vector3(0, 0.55, 0)),
              trial
            );
            const jumpPts = jumpCurve.getPoints(24);
            const jumpGeo = new THREE.BufferGeometry().setFromPoints(jumpPts);
            const jumpLine = new THREE.Line(
              jumpGeo,
              new THREE.LineDashedMaterial({ color: 0xd98c4a, dashSize: 0.2, gapSize: 0.14 })
            );
            jumpLine.computeLineDistances();
            dynamicGroup.add(jumpLine);

            const trialMesh = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.24, 0),
              new THREE.MeshBasicMaterial({ color: 0xd98c4a, wireframe: true })
            );
            trialMesh.position.copy(trial);
            dynamicGroup.add(trialMesh);

            labelAnchors.push({
              id: 'x3-trial',
              text: `Thử (f=${log31.f_new.toFixed(2)} > 26)`,
              world: trial,
              tone: 'reject',
            });
          }
        }
      } else {
        const { meshGeo, borderGeo, activeEdgeGeo } = buildClippedFeasiblePlaneGeometry();
        const planeMesh = new THREE.Mesh(
          meshGeo,
          new THREE.MeshBasicMaterial({
            color: 0xb6c96e,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        dynamicGroup.add(planeMesh);

        const borderLine = new THREE.Line(
          borderGeo,
          new THREE.LineBasicMaterial({ color: 0xb6c96e, transparent: true, opacity: 0.65 })
        );
        dynamicGroup.add(borderLine);

        const activeEdge = new THREE.Line(
          activeEdgeGeo,
          new THREE.LineBasicMaterial({ color: 0xc5e84d })
        );
        dynamicGroup.add(activeEdge);

        const uncPos = toVec3([1, 1, 1]);
        const uncMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 18, 14),
          new THREE.MeshBasicMaterial({ color: 0xd98c4a, transparent: true, opacity: 0.48, wireframe: true })
        );
        uncMesh.position.copy(uncPos);
        dynamicGroup.add(uncMesh);
        labelAnchors.push({ id: 'unc', text: '(1,1,1) bị phạt', world: uncPos, tone: 'reject' });

        if (cData) {
          const nbestPos = toVec3(cData.nbest);
          const nbestMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.31, 24, 18),
            new THREE.MeshStandardMaterial({
              color: 0xc5e84d,
              emissive: 0xc5e84d,
              emissiveIntensity: 0.85,
              roughness: 0.2,
            })
          );
          nbestMesh.position.copy(nbestPos);
          dynamicGroup.add(nbestMesh);

          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowTex, color: 0xc5e84d, transparent: true, opacity: 0.82, depthWrite: false })
          );
          halo.position.copy(nbestPos);
          halo.scale.setScalar(1.85);
          dynamicGroup.add(halo);

          const dropGeo = new THREE.BufferGeometry().setFromPoints([uncPos, nbestPos]);
          const dropLine = new THREE.Line(
            dropGeo,
            new THREE.LineDashedMaterial({ color: 0xd98c4a, dashSize: 0.24, gapSize: 0.18 })
          );
          dropLine.computeLineDistances();
          dynamicGroup.add(dropLine);

          if (cData.history.length > 1) {
            const trajPts = cData.history
              .filter((_, i) => i % 4 === 0 || i === cData.history.length - 1)
              .map((h) => toVec3(h.nbest));
            const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPts);
            dynamicGroup.add(
              new THREE.Line(trajGeo, new THREE.LineBasicMaterial({ color: 0xc5e84d, transparent: true, opacity: 0.82 }))
            );
          }

          labelAnchors.push({
            id: 'nbest-136',
            text: `nbest [${cData.nbest.map((v) => v.toFixed(2)).join(', ')}]`,
            world: nbestPos,
            tone: 'best',
          });
        }
      }

      setLabelMetas(
        labelAnchors.map((a) => ({ id: a.id, text: a.text, tone: a.tone }))
      );
    };

    let width = 480;
    let height = 400;
    const syncSize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    syncSize();
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(syncSize);
    });
    ro.observe(wrap);

    let isVisible = false;
    let loopRunning = false;

    const timer = new THREE.Timer();
    timer.connect(document);
    const projVec = new THREE.Vector3();
    let labelTick = 0;

    const projectNonOverlappingLabels = () => {
      const raw: ProjectedLabel[] = [];
      for (const a of labelAnchors) {
        projVec.copy(a.world).project(camera);
        if (projVec.z > 1) continue;
        const px = (projVec.x * 0.5 + 0.5) * width;
        const py = (-projVec.y * 0.5 + 0.5) * height;
        if (px < 28 || px > width - 28 || py < 28 || py > height - 16) continue;
        raw.push({ id: a.id, text: a.text, x: px, y: py, tone: a.tone });
      }
      // 4-pass bidirectional 2D collision relaxation so x1, x3, x*, x2, x2' never overlap
      for (let pass = 0; pass < 4; pass += 1) {
        raw.sort((p, q) => p.y - q.y);
        for (let i = 0; i < raw.length; i += 1) {
          for (let j = i + 1; j < raw.length; j += 1) {
            const dx = Math.abs(raw[j].x - raw[i].x);
            const dy = raw[j].y - raw[i].y;
            if (dx < 84 && dy < 25) {
              const push = (25 - dy) * 0.5 + 0.5;
              raw[i].y = Math.max(26, raw[i].y - push);
              raw[j].y = Math.min(height - 16, raw[j].y + push);
            }
          }
        }
      }

      const placedMap = new Map<string, ProjectedLabel>();
      for (const item of raw) {
        placedMap.set(item.id, item);
      }
      for (const a of labelAnchors) {
        const el = labelElsRef.current.get(a.id);
        if (!el) continue;
        const hit = placedMap.get(a.id);
        if (hit) {
          el.style.transform = `translate3d(${hit.x.toFixed(1)}px, ${hit.y.toFixed(1)}px, 0) translate(-50%, -130%)`;
          el.style.opacity = '1';
        } else {
          el.style.opacity = '0';
        }
      }
    };

    const rebuildAndProject = () => {
      buildDynamicScene();
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
        projectNonOverlappingLabels();
      });
    };

    rebuildSceneRef.current = rebuildAndProject;
    rebuildAndProject();

    const animate = () => {
      if (!isVisible || document.hidden) return;
      timer.update();
      const dt = Math.min(0.05, Math.max(0.001, timer.getDelta()));
      const elapsed = timer.getElapsed();

      if (stateRef.current.reducedMotion) {
        controls.autoRotate = false;
      }

      if (pulseTraveler && !stateRef.current.reducedMotion) {
        const u = (elapsed * 0.55) % 1;
        pulseTraveler.curve.getPoint(u, pulseTraveler.mesh.position);
      }

      controls.update(dt);
      renderer.render(scene, camera);

      labelTick += 1;
      if (labelTick % 4 === 0) {
        projectNonOverlappingLabels();
      }
    };

    const syncLoopState = () => {
      const shouldRun = isVisible && !document.hidden;
      if (shouldRun && !loopRunning) {
        loopRunning = true;
        renderer.setAnimationLoop(animate);
      } else if (!shouldRun && loopRunning) {
        loopRunning = false;
        renderer.setAnimationLoop(null);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? false;
        syncLoopState();
      },
      { threshold: 0.01 }
    );
    io.observe(wrap);

    const onVisibilityChange = () => {
      syncLoopState();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    controls.update(0.016);
    renderer.render(scene, camera);
    projectNonOverlappingLabels();

    return () => {
      rebuildSceneRef.current = null;
      loopRunning = false;
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      cancelAnimationFrame(resizeRaf);
      io.disconnect();
      ro.disconnect();
      timer.dispose();
      disposeDynamicGroup();
      glowTex.dispose();
      boxGeo.dispose();
      boxEdges.dispose();
      axesGeo.dispose();
      renderer.dispose();
    };
  }, [shouldMount]);

  useEffect(() => {
    rebuildSceneRef.current?.();
  }, [mode, activeStep, workedData, constrainedData]);

  return (
    <div className="worked-3d-card">
      <div
        ref={wrapRef}
        className="worked-3d-canvas-wrap"
        style={{
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        role="img"
        aria-label={
          mode === 'unconstrained'
            ? 'Không gian 3D tương tác với 5 đom đóm trên miền [-5, 5]^3'
            : 'Không gian 3D tương tác bài toán tối ưu có ràng buộc với mặt phẳng khả thi x1 + x2 + x3 = 1.5, x1 <= 0.4'
        }
      >
        <canvas ref={canvasRef} className="worked-3d-canvas" />
        <div className="worked-3d-overlay-badges" aria-hidden="true">
          {labelMetas.map((lbl) => (
            <span
              key={lbl.id}
              ref={(el) => {
                if (el) {
                  labelElsRef.current.set(lbl.id, el);
                } else {
                  labelElsRef.current.delete(lbl.id);
                }
              }}
              className={`firefly-3d-label ${
                lbl.tone === 'best'
                  ? 'firefly-3d-label--best'
                  : lbl.tone === 'reject'
                    ? 'hairline-bento__val--amber'
                    : ''
              }`}
            >
              {lbl.text}
            </span>
          ))}
        </div>
      </div>

      <div className="worked-3d-caption">
        <span>
          [-5, 5]<sup>3</sup>
        </span>
        <span>
          {mode === 'unconstrained' ? 'x* = (1, 1, 1)' : 'x1 + x2 + x3 = 1.5, x1 ≤ 0.4'}
        </span>
      </div>
    </div>
  );
}

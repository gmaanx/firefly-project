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
  sub?: string;
  tone: 'best' | 'normal' | 'reject' | 'muted';
}

interface Anchor3D extends LabelMeta {
  world: THREE.Vector3;
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

function addElevationStem(
  parent: THREE.Group,
  worldPos: THREE.Vector3,
  colorHex: number,
  opacity: number
) {
  const floorY = -5;
  if (worldPos.y <= floorY + 0.08) return;
  const stemGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
    new THREE.Vector3(worldPos.x, floorY, worldPos.z),
  ]);
  const stemMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
  });
  parent.add(new THREE.Line(stemGeo, stemMat));

  const ringGeo = new THREE.RingGeometry(0.11, 0.19, 20);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: Math.min(0.6, opacity * 1.45),
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(worldPos.x, floorY + 0.015, worldPos.z);
  parent.add(ring);
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
  const labelElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const leaderElsRef = useRef<Map<string, SVGPolylineElement>>(new Map());
  const dotElsRef = useRef<Map<string, SVGCircleElement>>(new Map());
  const resetCamRef = useRef<(() => void) | null>(null);

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
    const camera = new THREE.PerspectiveCamera(37, 1.35, 0.1, 100);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 9.5;
    controls.maxDistance = 25;
    controls.autoRotate = !stateRef.current.reducedMotion;
    controls.autoRotateSpeed = 0.44;

    const applyDefaultCamera = () => {
      if (stateRef.current.mode === 'unconstrained') {
        camera.position.set(12.2, 6.9, 13.4);
        controls.target.set(0.35, 1.15, 0.35);
      } else {
        camera.position.set(12.4, 7.6, 12.8);
        controls.target.set(-0.2, 0.3, 0.2);
      }
      controls.update();
    };
    applyDefaultCamera();

    resetCamRef.current = () => {
      applyDefaultCamera();
      controls.autoRotate = !stateRef.current.reducedMotion;
    };

    const onControlStart = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener('start', onControlStart);

    const hemi = new THREE.HemisphereLight(0xefefe8, 0x24281e, 1.4);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
    keyLight.position.set(8, 14, 10);
    scene.add(hemi, keyLight);

    const staticGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(10, 10, 10);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLine = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x3a3e35, transparent: true, opacity: 0.56 })
    );
    staticGroup.add(boxLine);

    const floorGrid = new THREE.GridHelper(10, 10, 0x33382e, 0x21251e);
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
      new THREE.LineBasicMaterial({ color: 0xefefe8, transparent: true, opacity: 0.11 })
    );
    staticGroup.add(axesLines);
    scene.add(staticGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const glowTex = createGlowTexture();
    let pulseTraveler: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3 } | null = null;
    let labelAnchors: Anchor3D[] = [];

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
      const { mode: curMode, activeStep: step, workedData: wData, constrainedData: cData } =
        stateRef.current;

      if (curMode === 'unconstrained') {
        const optPos = toVec3([1, 1, 1]);
        const optGeo = new THREE.OctahedronGeometry(0.27, 0);
        const optMat = new THREE.MeshBasicMaterial({ color: 0xc5e84d, wireframe: true });
        const optMesh = new THREE.Mesh(optGeo, optMat);
        optMesh.position.copy(optPos);
        dynamicGroup.add(optMesh);
        addElevationStem(dynamicGroup, optPos, 0xc5e84d, 0.24);
        labelAnchors.push({
          id: 'opt',
          text: 'x* (1,1,1)',
          sub: 'f* = 0',
          world: optPos,
          tone: 'best',
        });

        if (wData) {
          wData.initial_population.forEach((ff) => {
            const p3 = toVec3(ff.pos);
            const isBrightest = ff.id === 1;
            const isActiveMover = (step === 1 && ff.id === 2) || (step === 2 && ff.id === 3);
            const isBystander = step !== 0 && !isBrightest && !isActiveMover;
            const radius = isBrightest ? 0.36 : isActiveMover ? 0.32 : isBystander ? 0.19 : 0.26;

            const sphereGeo = new THREE.SphereGeometry(radius, 24, 18);
            const sphereMat = new THREE.MeshStandardMaterial({
              color: isBrightest
                ? 0xc5e84d
                : isActiveMover
                  ? step === 2
                    ? 0xf0b27a
                    : 0xefefe8
                  : isBystander
                    ? 0x6f7468
                    : 0xbec3b5,
              emissive: isBrightest
                ? 0xc5e84d
                : step === 2 && ff.id === 3
                  ? 0xd98c4a
                  : isActiveMover
                    ? 0x8ea63b
                    : 0x2d321c,
              emissiveIntensity: isBrightest ? 0.85 : isActiveMover ? 0.55 : isBystander ? 0.12 : 0.28,
              roughness: 0.25,
              metalness: 0.1,
              transparent: isBystander,
              opacity: isBystander ? 0.58 : 1,
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.copy(p3);
            dynamicGroup.add(sphere);

            addElevationStem(
              dynamicGroup,
              p3,
              isBrightest ? 0xc5e84d : isActiveMover ? 0xefefe8 : 0x7c8274,
              isBrightest || isActiveMover ? 0.28 : isBystander ? 0.1 : 0.18
            );

            if (isBrightest || isActiveMover) {
              const spriteMat = new THREE.SpriteMaterial({
                map: glowTex,
                color: step === 2 && ff.id === 3 ? 0xd98c4a : 0xc5e84d,
                transparent: true,
                opacity: isBrightest ? 0.85 : 0.55,
                depthWrite: false,
              });
              const halo = new THREE.Sprite(spriteMat);
              halo.position.copy(p3);
              halo.scale.setScalar(isBrightest ? 1.9 : 1.38);
              dynamicGroup.add(halo);
            }

            labelAnchors.push({
              id: `x${ff.id}`,
              text: isBystander ? `x${ff.id}` : `x${ff.id} (${ff.pos.join(',')})`,
              sub: isBystander ? `f=${ff.f}` : `f = ${ff.f}`,
              world: p3,
              tone: isBrightest
                ? 'best'
                : step === 2 && ff.id === 3
                  ? 'reject'
                  : isBystander
                    ? 'muted'
                    : 'normal',
            });
          });

          const x1Pos = toVec3(wData.initial_population[0].pos);

          if (step === 1 && wData.pair_logs[0]) {
            const log21 = wData.pair_logs[0];
            const start = toVec3(wData.initial_population[1].pos);
            const landed = toVec3(log21.new_pos);
            const ctrl = start.clone().lerp(landed, 0.5).add(new THREE.Vector3(0, 0.85, 0));
            const curve = new THREE.QuadraticBezierCurve3(start, ctrl, landed);

            const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.055, 8, false);
            const tubeMat = new THREE.MeshBasicMaterial({ color: 0xc5e84d });
            dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

            const guideGeo = new THREE.BufferGeometry().setFromPoints([landed, x1Pos]);
            const guideLine = new THREE.Line(
              guideGeo,
              new THREE.LineDashedMaterial({
                color: 0xb6c96e,
                dashSize: 0.25,
                gapSize: 0.2,
                transparent: true,
                opacity: 0.5,
              })
            );
            guideLine.computeLineDistances();
            dynamicGroup.add(guideLine);

            const landMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.27, 20, 16),
              new THREE.MeshBasicMaterial({ color: 0xc5e84d })
            );
            landMesh.position.copy(landed);
            dynamicGroup.add(landMesh);
            addElevationStem(dynamicGroup, landed, 0xc5e84d, 0.28);

            const travMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.16, 14, 12),
              new THREE.MeshBasicMaterial({ color: 0xefefe8 })
            );
            dynamicGroup.add(travMesh);
            pulseTraveler = { mesh: travMesh, curve };

            labelAnchors.push({
              id: 'x2-new',
              text: `x2' mới`,
              sub: `f = ${log21.f_new.toFixed(2)}`,
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
              new THREE.LineDashedMaterial({
                color: 0xd98c4a,
                dashSize: 0.3,
                gapSize: 0.25,
                transparent: true,
                opacity: 0.48,
              })
            );
            attrLine.computeLineDistances();
            dynamicGroup.add(attrLine);

            const jumpCurve = new THREE.QuadraticBezierCurve3(
              start,
              start.clone().lerp(trial, 0.5).add(new THREE.Vector3(0, 0.6, 0)),
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
              new THREE.OctahedronGeometry(0.25, 0),
              new THREE.MeshBasicMaterial({ color: 0xd98c4a, wireframe: true })
            );
            trialMesh.position.copy(trial);
            dynamicGroup.add(trialMesh);

            labelAnchors.push({
              id: 'x3-trial',
              text: 'Điểm thử',
              sub: `f = ${log31.f_new.toFixed(2)} > 26`,
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
          new THREE.MeshBasicMaterial({
            color: 0xd98c4a,
            transparent: true,
            opacity: 0.48,
            wireframe: true,
          })
        );
        uncMesh.position.copy(uncPos);
        dynamicGroup.add(uncMesh);
        addElevationStem(dynamicGroup, uncPos, 0xd98c4a, 0.22);
        labelAnchors.push({
          id: 'unc',
          text: '(1, 1, 1)',
          sub: 'vi phạm x1 ≤ 0.4',
          world: uncPos,
          tone: 'reject',
        });

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
          addElevationStem(dynamicGroup, nbestPos, 0xc5e84d, 0.3);

          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowTex,
              color: 0xc5e84d,
              transparent: true,
              opacity: 0.82,
              depthWrite: false,
            })
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
              new THREE.Line(
                trajGeo,
                new THREE.LineBasicMaterial({ color: 0xc5e84d, transparent: true, opacity: 0.82 })
              )
            );
          }

          labelAnchors.push({
            id: 'nbest-136',
            text: `x* [${cData.nbest.map((v) => v.toFixed(2)).join(', ')}]`,
            sub: 'hợp lệ tối ưu',
            world: nbestPos,
            tone: 'best',
          });
        }
      }

      setLabelMetas(
        labelAnchors.map((a) => ({
          id: a.id,
          text: a.text,
          sub: a.sub,
          tone: a.tone,
        }))
      );
    };

    let width = 520;
    let height = 380;
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

    // CAD Side-Rail Callout Solver: pushes all labels cleanly into the left & right side margins
    // connected by crisp 1px elbow leader lines -> 0% sphere occlusion at any rotation angle!
    const projectCalloutRails = () => {
      interface ScreenNode {
        id: string;
        sx: number;
        sy: number;
        tone: LabelMeta['tone'];
        side: 'left' | 'right';
        ly: number;
        anchorX: number;
      }

      const nodes: ScreenNode[] = [];
      let sumX = 0;
      for (const a of labelAnchors) {
        projVec.copy(a.world).project(camera);
        if (projVec.z > 1) continue;
        const sx = (projVec.x * 0.5 + 0.5) * width;
        const sy = (-projVec.y * 0.5 + 0.5) * height;
        if (sx < 8 || sx > width - 8 || sy < 8 || sy > height - 8) continue;
        sumX += sx;
        nodes.push({
          id: a.id,
          sx,
          sy,
          tone: a.tone,
          side: 'left',
          ly: sy,
          anchorX: sx,
        });
      }

      const splitX = nodes.length > 0 ? sumX / nodes.length : width * 0.5;
      const leftRailMax = Math.max(108, Math.min(width * 0.27, 146));
      const rightRailMin = Math.min(width - 108, Math.max(width * 0.73, width - 146));

      const leftGroup: ScreenNode[] = [];
      const rightGroup: ScreenNode[] = [];

      for (const n of nodes) {
        if (n.sx < splitX) {
          n.side = 'left';
          n.anchorX = Math.min(leftRailMax, Math.max(92, n.sx - 34));
          leftGroup.push(n);
        } else {
          n.side = 'right';
          n.anchorX = Math.max(rightRailMin, Math.min(width - 92, n.sx + 34));
          rightGroup.push(n);
        }
      }

      const relaxVerticalRail = (group: ScreenNode[]) => {
        group.sort((a, b) => a.sy - b.sy);
        const minGap = 36;
        const topPad = 24;
        const botPad = height - 24;

        for (let pass = 0; pass < 6; pass += 1) {
          for (let i = 0; i < group.length; i += 1) {
            group[i].ly = Math.max(topPad, Math.min(botPad, group[i].ly));
          }
          for (let i = 1; i < group.length; i += 1) {
            const diff = group[i].ly - group[i - 1].ly;
            if (diff < minGap) {
              const push = (minGap - diff) * 0.5;
              group[i - 1].ly -= push;
              group[i].ly += push;
            }
          }
        }
        // Final boundary clamp pass top->bottom then bottom->top
        if (group.length > 0) {
          group[0].ly = Math.max(topPad, group[0].ly);
          for (let i = 1; i < group.length; i += 1) {
            if (group[i].ly - group[i - 1].ly < minGap) {
              group[i].ly = group[i - 1].ly + minGap;
            }
          }
          const last = group.length - 1;
          group[last].ly = Math.min(botPad, group[last].ly);
          for (let i = last - 1; i >= 0; i -= 1) {
            if (group[i + 1].ly - group[i].ly < minGap) {
              group[i].ly = Math.max(topPad, group[i + 1].ly - minGap);
            }
          }
        }
      };

      relaxVerticalRail(leftGroup);
      relaxVerticalRail(rightGroup);

      const placed = new Map<string, ScreenNode>();
      for (const n of nodes) placed.set(n.id, n);

      for (const a of labelAnchors) {
        const el = labelElsRef.current.get(a.id);
        const lineEl = leaderElsRef.current.get(a.id);
        const dotEl = dotElsRef.current.get(a.id);
        const hit = placed.get(a.id);

        if (!hit) {
          if (el) el.style.opacity = '0';
          if (lineEl) lineEl.style.opacity = '0';
          if (dotEl) dotEl.style.opacity = '0';
          continue;
        }

        const isMuted = hit.tone === 'muted';
        if (el) {
          const xAlign = hit.side === 'left' ? '-100%' : '0%';
          el.style.transform = `translate3d(${hit.anchorX.toFixed(1)}px, ${hit.ly.toFixed(1)}px, 0) translate(${xAlign}, -50%)`;
          el.style.opacity = isMuted ? '0.56' : '1';
          el.dataset.side = hit.side;
        }

        if (lineEl && dotEl) {
          const dir = hit.side === 'left' ? -1 : 1;
          const dx = hit.anchorX - hit.sx;
          const dy = hit.ly - hit.sy;
          const dist = Math.hypot(dx, dy) || 1;
          const startOff = Math.min(9, dist * 0.28);
          const sxEdge = hit.sx + (dx / dist) * startOff;
          const syEdge = hit.sy + (dy / dist) * startOff;
          const elbowX = hit.anchorX - dir * 10;
          const endX = hit.anchorX - dir * 3;

          lineEl.setAttribute(
            'points',
            `${sxEdge.toFixed(1)},${syEdge.toFixed(1)} ${elbowX.toFixed(1)},${hit.ly.toFixed(1)} ${endX.toFixed(1)},${hit.ly.toFixed(1)}`
          );
          lineEl.style.opacity = isMuted ? '0.22' : '0.68';

          dotEl.setAttribute('cx', sxEdge.toFixed(1));
          dotEl.setAttribute('cy', syEdge.toFixed(1));
          dotEl.style.opacity = isMuted ? '0.32' : '0.88';
        }
      }
    };

    buildDynamicScene();

    rebuildSceneRef.current = () => {
      buildDynamicScene();
      applyDefaultCamera();
      requestAnimationFrame(projectCalloutRails);
    };

    let pulseT = 0;

    const animate = (timestamp?: number) => {
      if (!loopRunning) return;
      timer.update(timestamp);
      const dt = Math.min(0.05, timer.getDelta());

      if (pulseTraveler && !stateRef.current.reducedMotion) {
        pulseT = (pulseT + dt * 0.62) % 1;
        pulseTraveler.curve.getPoint(pulseT, pulseTraveler.mesh.position);
      }

      controls.update(dt);
      renderer.render(scene, camera);

      labelTick += 1;
      if (labelTick % 2 === 0) {
        projectCalloutRails();
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
    requestAnimationFrame(projectCalloutRails);

    return () => {
      rebuildSceneRef.current = null;
      resetCamRef.current = null;
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

        {/* Crisp 1px CAD Leader Polylines Connecting Spheres to Side Callout Rails */}
        <svg className="worked-3d-leaders" aria-hidden="true">
          {labelMetas.map((lbl) => {
            const stroke =
              lbl.tone === 'best'
                ? '#C5E84D'
                : lbl.tone === 'reject'
                  ? '#D98C4A'
                  : 'rgba(239, 239, 232, 0.48)';
            return (
              <g key={`ldr-${lbl.id}`}>
                <polyline
                  ref={(el) => {
                    if (el) leaderElsRef.current.set(lbl.id, el);
                    else leaderElsRef.current.delete(lbl.id);
                  }}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1"
                  style={{ opacity: 0 }}
                />
                <circle
                  ref={(el) => {
                    if (el) dotElsRef.current.set(lbl.id, el);
                    else dotElsRef.current.delete(lbl.id);
                  }}
                  r="1.8"
                  fill={stroke}
                  style={{ opacity: 0 }}
                />
              </g>
            );
          })}
        </svg>

        <div className="worked-3d-overlay-badges" aria-hidden="true">
          {labelMetas.map((lbl) => (
            <div
              key={lbl.id}
              ref={(el) => {
                if (el) {
                  labelElsRef.current.set(lbl.id, el);
                } else {
                  labelElsRef.current.delete(lbl.id);
                }
              }}
              className={`firefly-3d-callout ${
                lbl.tone === 'best'
                  ? 'firefly-3d-callout--best'
                  : lbl.tone === 'reject'
                    ? 'firefly-3d-callout--reject'
                    : lbl.tone === 'muted'
                      ? 'firefly-3d-callout--muted'
                      : ''
              }`}
            >
              <span className="firefly-3d-callout__main">{lbl.text}</span>
              {lbl.sub ? <span className="firefly-3d-callout__sub">{lbl.sub}</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="worked-3d-caption">
        <span>
          [-5, 5]<sup>3</sup> ·{' '}
          {mode === 'unconstrained' ? 'x* = (1, 1, 1)' : 'x1 + x2 + x3 = 1.5, x1 ≤ 0.4'}
        </span>
        <button
          type="button"
          className="worked-3d-reset-btn"
          onClick={() => resetCamRef.current?.()}
        >
          Góc chuẩn ↺
        </button>
      </div>
    </div>
  );
}

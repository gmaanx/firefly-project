import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createTaskBudget, yieldToMain } from '../../lib/yieldToMain';
import { TERRAIN_SPAN } from './orchestratedTerrainAndParticles';
import {
  applyNocturnalPatina,
  buildCurtainCreeperVines,
  buildDreamyGroundMist,
  buildFinnedAutomotiveEcu,
  buildForensicGroundDebrisProps,
  buildFrontWheelArchInternals,
  buildJunkyardCoolantAndScrapProps,
  buildOpenEngineBayMechanicals,
  buildOrganicRoofSodAndWeeds,
  buildVaz2105FrontNoseAssembly,
  buildVaz2105RearClusterAndSeatExtras,
  buildVaz2105SideMirror,
  buildVolumetricCabinSmoke,
  createDirtyWindshieldTexture,
  createPatinaBumpTexture,
  createWeatheredCarPanelTextures,
  mergeStaticBufferGeometries,
  type WeatheredCarTextureSet,
} from './sancturnalPatinaAndTextures';

export interface NocturnalWreckSceneOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera?: THREE.Camera;
  isMobile: boolean;
  sampleHeight: (wx: number, wz: number) => number;
  particleLightTex: THREE.Texture;
  onLoadProgress?: (loaded: number, total: number, label: string) => void;
  onReady?: () => void;
}

const sharedGltfLoader = new GLTFLoader();
const cachedGltfPromises = new Map<string, Promise<GLTF>>();

function loadCachedGltf(url: string): Promise<GLTF> {
  const existing = cachedGltfPromises.get(url);
  if (existing) return existing;
  const req = sharedGltfLoader.loadAsync(url).catch((err) => {
    cachedGltfPromises.delete(url);
    throw err;
  });
  cachedGltfPromises.set(url, req);
  return req;
}

let cachedPatinaBumpTex: THREE.Texture | null = null;
let cachedDirtyWindshieldTex: THREE.Texture | null = null;
const cachedWeatheredPanelSets = new Map<string, WeatheredCarTextureSet>();

function getSharedPatinaBumpTexture(): THREE.Texture {
  if (!cachedPatinaBumpTex) {
    cachedPatinaBumpTex = createPatinaBumpTexture();
  }
  return cachedPatinaBumpTex;
}

function getSharedDirtyWindshieldTexture(): THREE.Texture {
  if (!cachedDirtyWindshieldTex) {
    cachedDirtyWindshieldTex = createDirtyWindshieldTexture();
  }
  return cachedDirtyWindshieldTex;
}

function getSharedWeatheredPanelTextures(
  variant: Parameters<typeof createWeatheredCarPanelTextures>[0],
  seed: number
): WeatheredCarTextureSet {
  const key = `${variant}:${seed}`;
  const hit = cachedWeatheredPanelSets.get(key);
  if (hit) return hit;
  const built = createWeatheredCarPanelTextures(variant, seed);
  cachedWeatheredPanelSets.set(key, built);
  return built;
}

export interface NocturnalWreckSceneHandle {
  group: THREE.Group;
  clearingSpot: THREE.SpotLight;
  practicalPositions: {
    leftRed: THREE.Vector3;
    rightGreen: THREE.Vector3;
    rightBlue: THREE.Vector3;
    pipeCyan: THREE.Vector3;
  };
  ready: Promise<void>;
  updateUniforms: (
    elapsed: number,
    scrollP: number,
    cameraPos: THREE.Vector3,
    cursorWorld: THREE.Vector3,
    cursorGlow: number
  ) => void;
  dispose: () => void;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };
}

function bakeMeshMetricGeometry(
  mesh: THREE.Mesh,
  opts: {
    centerXZ?: boolean;
    zeroBottomY?: boolean;
    extraRotateX?: number;
    upwardNormalBlend?: number;
  } = {}
): THREE.BufferGeometry {
  const src = mesh.geometry;
  const dst = new THREE.BufferGeometry();

  const posAttr = src.getAttribute('position');
  const normAttr = src.getAttribute('normal');
  const count = posAttr.count;

  const worldMat = mesh.matrixWorld.clone();
  if (opts.extraRotateX) {
    const rotX = new THREE.Matrix4().makeRotationX(opts.extraRotateX);
    worldMat.premultiply(rotX);
  }
  const normalMat = new THREE.Matrix3().getNormalMatrix(worldMat);

  const posOut = new Float32Array(count * 3);
  const normOut = new Float32Array(count * 3);
  const tmpV = new THREE.Vector3();
  const tmpN = new THREE.Vector3();

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i += 1) {
    tmpV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(worldMat);
    posOut[i * 3] = tmpV.x;
    posOut[i * 3 + 1] = tmpV.y;
    posOut[i * 3 + 2] = tmpV.z;

    if (tmpV.x < minX) minX = tmpV.x;
    if (tmpV.x > maxX) maxX = tmpV.x;
    if (tmpV.y < minY) minY = tmpV.y;
    if (tmpV.z < minZ) minZ = tmpV.z;
    if (tmpV.z > maxZ) maxZ = tmpV.z;

    if (normAttr) {
      tmpN
        .set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
        .applyMatrix3(normalMat)
        .normalize();
    } else {
      tmpN.set(0, 1, 0);
    }
    normOut[i * 3] = tmpN.x;
    normOut[i * 3 + 1] = tmpN.y;
    normOut[i * 3 + 2] = tmpN.z;
  }

  const offX = opts.centerXZ ? -0.5 * (minX + maxX) : 0;
  const offY = opts.zeroBottomY ? -minY : 0;
  const offZ = opts.centerXZ ? -0.5 * (minZ + maxZ) : 0;
  const upBlend = opts.upwardNormalBlend ?? 0;

  for (let i = 0; i < count; i += 1) {
    const px = posOut[i * 3] + offX;
    const py = posOut[i * 3 + 1] + offY;
    const pz = posOut[i * 3 + 2] + offZ;
    posOut[i * 3] = px;
    posOut[i * 3 + 1] = py;
    posOut[i * 3 + 2] = pz;

    if (upBlend > 0) {
      const rLen = Math.hypot(px, pz) + 1e-4;
      tmpN
        .set(
          normOut[i * 3] * (1 - upBlend) + (px / rLen) * 0.22 * upBlend,
          normOut[i * 3 + 1] * (1 - upBlend) + 0.97 * upBlend,
          normOut[i * 3 + 2] * (1 - upBlend) + (pz / rLen) * 0.22 * upBlend
        )
        .normalize();
      normOut[i * 3] = tmpN.x;
      normOut[i * 3 + 1] = tmpN.y;
      normOut[i * 3 + 2] = tmpN.z;
    }
  }

  dst.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
  dst.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));

  const uvAttr = src.getAttribute('uv');
  if (uvAttr) {
    const uvOut = new Float32Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      uvOut[i * 2] = uvAttr.getX(i);
      uvOut[i * 2 + 1] = uvAttr.getY(i);
    }
    dst.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
  }

  if (src.index) {
    dst.setIndex(src.index.clone());
  }

  dst.computeBoundingBox();
  dst.computeBoundingSphere();
  return dst;
}

function mergeMetricGeometries(
  geos: THREE.BufferGeometry[],
  centerXZ = true,
  zeroBottomY = true
): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const g of geos) {
    const p = g.getAttribute('position');
    totalVerts += p.count;
    totalIndices += g.index ? g.index.count : p.count;
  }

  const posOut = new Float32Array(totalVerts * 3);
  const normOut = new Float32Array(totalVerts * 3);
  const uvOut = new Float32Array(totalVerts * 2);
  const idxOut = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vCursor = 0;
  let iCursor = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const cnt = p.count;

    for (let i = 0; i < cnt; i += 1) {
      const vi = vCursor + i;
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      posOut[vi * 3] = x;
      posOut[vi * 3 + 1] = y;
      posOut[vi * 3 + 2] = z;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;

      normOut[vi * 3] = n ? n.getX(i) : 0;
      normOut[vi * 3 + 1] = n ? n.getY(i) : 1;
      normOut[vi * 3 + 2] = n ? n.getZ(i) : 0;

      uvOut[vi * 2] = uv ? uv.getX(i) : 0;
      uvOut[vi * 2 + 1] = uv ? uv.getY(i) : 0;
    }

    if (g.index) {
      const idx = g.index;
      for (let k = 0; k < idx.count; k += 1) {
        idxOut[iCursor + k] = idx.getX(k) + vCursor;
      }
      iCursor += idx.count;
    } else {
      for (let k = 0; k < cnt; k += 1) {
        idxOut[iCursor + k] = vCursor + k;
      }
      iCursor += cnt;
    }
    vCursor += cnt;
  }

  const offX = centerXZ ? -0.5 * (minX + maxX) : 0;
  const offY = zeroBottomY ? -minY : 0;
  const offZ = centerXZ ? -0.5 * (minZ + maxZ) : 0;

  if (offX !== 0 || offY !== 0 || offZ !== 0) {
    for (let i = 0; i < totalVerts; i += 1) {
      posOut[i * 3] += offX;
      posOut[i * 3 + 1] += offY;
      posOut[i * 3 + 2] += offZ;
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
  merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function buildNocturnalWreckScene(
  opts: NocturnalWreckSceneOptions
): NocturnalWreckSceneHandle {
  const { renderer, scene, camera, isMobile, sampleHeight, particleLightTex, onLoadProgress, onReady } = opts;
  const group = new THREE.Group();
  let disposed = false;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const sharedUniforms = {
    uTime: { value: 0.0 },
    uScrollDim: { value: 0.0 },
    uParticleLightMap: { value: particleLightTex },
    uTerrainSpan: { value: TERRAIN_SPAN },
  };

  /* ------------------------------------------------------------------------
     1. Nocturnal Chiaroscuro Practical Lighting (`PCFShadowMap`)
        Calibrated 1:1 to zoomed crops `ref_left_car_hood.png`, `ref_center_pipe_roses.png`,
        `ref_right_car.png`, `ref_foreground_grass_tires.png`!
     ------------------------------------------------------------------------ */
  const hemiFill = new THREE.HemisphereLight(0x161f2e, 0x18130a, 0.22);
  group.add(hemiFill);

  const clearingSpot = new THREE.SpotLight(
    0xffdd9e,
    52.0,
    24.0,
    Math.PI * 0.35,
    0.78,
    1.55
  );
  clearingSpot.position.set(0.1, 8.6, 3.85);
  clearingSpot.target.position.set(0.0, -1.35, 1.45);
  clearingSpot.castShadow = true;
  clearingSpot.shadow.mapSize.set(1024, 1024);
  clearingSpot.shadow.camera.near = 2.5;
  clearingSpot.shadow.camera.far = 18.0;
  clearingSpot.shadow.bias = -0.00045;
  clearingSpot.shadow.normalBias = 0.025;
  group.add(clearingSpot);
  group.add(clearingSpot.target);

  const frontMeadowSpot = new THREE.SpotLight(
    0xffd088,
    18.5,
    16.0,
    Math.PI * 0.38,
    0.88,
    1.6
  );
  frontMeadowSpot.position.set(-0.3, 5.2, 6.6);
  frontMeadowSpot.target.position.set(-0.15, -1.5, 2.8);

  // Left Boxy Lada Practicals: Contained Electric Sapphire Engine + Contained Ember-Red Arch & Cabin
  const engineBlueLight = new THREE.PointLight(0x0c68ff, 9.5, 0.92, 2.2);
  const wheelRedLight = new THREE.PointLight(0xff1406, 5.8, 0.96, 2.2);
  const cabinRedLight = new THREE.PointLight(0xff1c12, 8.4, 2.05, 1.85);

  // Right Boxy Lada Practicals: Moody Emerald-Green Rear Cabin + Vivid Sapphire Rear Underglow
  const rightCabinGreenLight = new THREE.PointLight(0x10cf48, 0.62, 1.45, 2.0);
  const rightUnderglowBlueLight = new THREE.PointLight(0x126aff, 16.5, 2.35, 1.85);

  // Center Tilted Pipe Cyan-Verdigris Glow + Interactive Cursor Lamp (analytic spill only -> saves 5 PBR lights/pixel!)
  const pipeCyanLight = new THREE.PointLight(0x1ceaa0, 3.0, 3.0, 1.8);
  const cursorLight = new THREE.PointLight(0xffb464, 0.0, 4.8, 1.7);

  group.add(
    engineBlueLight,
    cabinRedLight,
    rightUnderglowBlueLight
  );

  const baseLightIntensities = {
    hemi: 0.24,
    clearing: 54.0,
    frontMeadow: 22.5,
    engineBlue: 9.5,
    wheelRed: 5.8,
    cabinRed: 6.8,
    rightGreen: 0.62,
    rightBlue: 16.5,
    pipeCyan: 3.0,
  };

  /* ------------------------------------------------------------------------
     2. Upper-Right-Center Distant Horizon City/Star Pinpoints (Matches Photo!)
     ------------------------------------------------------------------------ */
  {
    const rng = createSeededRandom(20261124);
    const starCount = 245;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSize = new Float32Array(starCount);

    for (let i = 0; i < starCount; i += 1) {
      const u = rng();
      const v = rng();
      const sx = 0.05 + Math.pow(u, 0.85) * 6.2 + (rng() - 0.5) * 0.75;
      const sy = -0.32 + v * 2.05 + (rng() - 0.5) * 0.22;
      const sz = -7.8 - rng() * 2.4;

      starPos[i * 3] = sx;
      starPos[i * 3 + 1] = sy;
      starPos[i * 3 + 2] = sz;

      const cPick = rng();
      if (cPick < 0.58) {
        starCol[i * 3] = 0.96;
        starCol[i * 3 + 1] = 0.91;
        starCol[i * 3 + 2] = 0.78;
      } else if (cPick < 0.82) {
        starCol[i * 3] = 0.98;
        starCol[i * 3 + 1] = 0.72;
        starCol[i * 3 + 2] = 0.44;
      } else {
        starCol[i * 3] = 0.68;
        starCol[i * 3 + 1] = 0.80;
        starCol[i * 3 + 2] = 0.98;
      }
      starSize[i] = 0.85 + Math.pow(rng(), 2.2) * 1.85;
    }

    const starGeo = track(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('aStarCol', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('aStarSize', new THREE.BufferAttribute(starSize, 1));

    const starMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uScrollDim: sharedUniforms.uScrollDim,
          uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aStarCol;
          attribute float aStarSize;
          uniform float uDpr;
          varying vec3 vCol;
          void main() {
            vCol = aStarCol;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aStarSize * uDpr;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform float uScrollDim;
          varying vec3 vCol;
          void main() {
            vec2 q = gl_PointCoord * 2.0 - 1.0;
            float r = length(q);
            if (r > 1.0) discard;
            float a = pow(1.0 - r, 2.2) * 0.68 * (1.0 - uScrollDim);
            gl_FragColor = vec4(vCol * a, 1.0);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(new THREE.Points(starGeo, starMat));
  }

  /* ------------------------------------------------------------------------
     3. Foreground Snaking Wire Looms & Center Junkyard Micro-Props
        Matches `ref_center_pipe_roses.png` & `ref_foreground_grass_tires.png`!
     ------------------------------------------------------------------------ */
  {
    const cableMatBlack = track(
      new THREE.MeshStandardMaterial({
        color: 0x131417,
        roughness: 0.65,
        metalness: 0.14,
      })
    );
    const cableMatRed = track(
      new THREE.MeshStandardMaterial({
        color: 0x7c1d16,
        roughness: 0.58,
        metalness: 0.12,
      })
    );
    const cableMatGreen = track(
      new THREE.MeshStandardMaterial({
        color: 0x1d4a26,
        roughness: 0.64,
        metalness: 0.10,
      })
    );

    const blackCableGeos: THREE.BufferGeometry[] = [];

    const makeGroundCableGeo = (
      pts2D: Array<[number, number, number?]>,
      radius: number
    ): THREE.TubeGeometry => {
      const vecs = pts2D.map(([x, z, lift = 0.072]) => {
        return new THREE.Vector3(x, sampleHeight(x, z) + lift, z);
      });
      const curve = new THREE.CatmullRomCurve3(vecs);
      return new THREE.TubeGeometry(curve, 68, radius, 6, false);
    };

    const makeGroundCable = (
      pts2D: Array<[number, number, number?]>,
      radius: number,
      mat: THREE.Material
    ) => {
      const geo = makeGroundCableGeo(pts2D, radius);
      if (mat === cableMatBlack) {
        blackCableGeos.push(geo);
        return;
      }
      const m = new THREE.Mesh(track(geo), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    };

    // Main black & crimson wire bundles looping on top of the matted grass from ECU around front tire (`ref_foreground_grass_tires.png`)!
    makeGroundCable(
      [
        [-2.25, 2.25, 0.085],
        [-1.65, 2.82, 0.074],
        [-1.02, 2.84, 0.072],
        [-0.46, 2.74, 0.082],
        [-0.22, 3.38, 0.072],
        [0.14, 4.18, 0.072],
        [0.06, 4.68, 0.072],
        [-0.36, 4.92, 0.070],
      ],
      0.017,
      cableMatBlack
    );
    makeGroundCable(
      [
        [-0.46, 2.74, 0.078],
        [-1.18, 3.08, 0.072],
        [-1.58, 3.65, 0.072],
        [-1.32, 4.22, 0.072],
        [-0.86, 4.52, 0.074],
      ],
      0.015,
      cableMatBlack
    );
    makeGroundCable(
      [
        [-0.42, 1.85, 0.076],
        [-0.44, 2.74, 0.078],
        [-0.14, 3.46, 0.072],
        [0.20, 4.22, 0.072],
        [0.02, 4.78, 0.070],
        [-0.22, 5.15, 0.068],
      ],
      0.014,
      cableMatRed
    );
    makeGroundCable(
      [
        [-0.78, 1.68, 0.080],
        [-0.35, 2.08, 0.072],
        [0.32, 2.04, 0.070],
        [1.18, 2.06, 0.070],
        [2.05, 1.78, 0.082],
      ],
      0.013,
      cableMatGreen
    );

    // Curved black EPDM rubber radiator hose right beside coolant tank (`ref_center_pipe_roses.png`!)
    makeGroundCable(
      [
        [0.42, 1.52, 0.16],
        [0.50, 1.66, 0.20],
        [0.56, 1.82, 0.08],
      ],
      0.042,
      cableMatBlack
    );

    if (blackCableGeos.length > 0) {
      const mergedBlackCables = track(mergeStaticBufferGeometries(blackCableGeos));
      blackCableGeos.forEach((g) => g.dispose());
      const blackCablesMesh = new THREE.Mesh(mergedBlackCables, cableMatBlack);
      blackCablesMesh.castShadow = true;
      blackCablesMesh.receiveShadow = true;
      group.add(blackCablesMesh);
    }

    // Dark round air-filter housing in center junkyard heap (`ref_center_pipe_roses.png`!)
    const airMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e2224,
        roughness: 0.72,
        metalness: 0.48,
      })
    );
    const airMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 20)),
      airMat
    );
    airMesh.position.set(-0.78, sampleHeight(-0.78, 1.28) + 0.11, 1.28);
    airMesh.rotation.set(0.45, 0.3, 0.35);
    airMesh.castShadow = true;
    group.add(airMesh);
  }

  /* ------------------------------------------------------------------------
     4. Load All Photoscanned & Articulated `.glb` Assets + PBR Rust/Moss + HDRI
     ------------------------------------------------------------------------ */
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const texLoader = new THREE.TextureLoader();

  const loadTex = (url: string, isSRGB: boolean, repeat = 1): THREE.Texture => {
    const t = track(texLoader.load(url));
    if (isSRGB) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = maxAniso;
    return t;
  };

  const rustDiff = loadTex('/textures/sanctuary/rust_diff.jpg', true, 1);
  const rustNor = loadTex('/textures/sanctuary/rust_nor.jpg', false, 1);
  const mossMetalDiff = loadTex('/textures/sanctuary/moss_metal_diff.jpg', true, 1);

  const ready = (async () => {
    const TOTAL_BOOT_STEPS = 11;
    let completedSteps = 0;
    const trackAsset = <T,>(promise: Promise<T>, label: string): Promise<T> =>
      promise.then((res) => {
        completedSteps += 1;
        if (!disposed) {
          onLoadProgress?.(completedSteps, TOTAL_BOOT_STEPS, label);
        }
        return res;
      });

    try {
      const [
        ladaGltf,
        sedanDonorGltf,
        tyreGltf,
        rimGltf,
        powerBoxGltf,
        pipeGltf,
        shrubWildGltf,
        shrubFlowerGltf,
        periwinkleGltf,
        weedGltf,
        roseGltf,
      ] = await Promise.all([
        trackAsset(loadCachedGltf('/models/lada_wrecks.glb'), 'LOADING LADA_WRECKS.GLB...'),
        trackAsset(loadCachedGltf('/models/sedan_opt.glb'), 'LOADING SEDAN_CHASSIS.GLB...'),
        trackAsset(loadCachedGltf('/models/old_tyre.glb'), 'LOADING OLD_TYRE.GLB...'),
        trackAsset(loadCachedGltf('/models/rusted_rim.glb'), 'LOADING RUSTED_RIM.GLB...'),
        trackAsset(loadCachedGltf('/models/power_box.glb'), 'LOADING POWER_BOX.GLB...'),
        trackAsset(loadCachedGltf('/models/pipe_pillar.glb'), 'LOADING PIPE_PILLAR.GLB...'),
        trackAsset(loadCachedGltf('/models/shrub_wild.glb'), 'LOADING SHRUB_WILD.GLB...'),
        trackAsset(loadCachedGltf('/models/shrub_flower.glb'), 'LOADING SHRUB_FLOWER.GLB...'),
        trackAsset(loadCachedGltf('/models/periwinkle.glb'), 'LOADING PERIWINKLE.GLB...'),
        trackAsset(loadCachedGltf('/models/weed_wild.glb'), 'LOADING WEED_WILD.GLB...'),
        trackAsset(loadCachedGltf('/models/rose_blossom.glb'), 'LOADING ROSE_BLOSSOM.GLB...'),
      ]);

      if (disposed) {
        return;
      }

      const maybeYield = createTaskBudget(38);
      await maybeYield();
      if (disposed) return;

      // Instant GPU PMREM environment (eliminates 1.7 MB night_env.hdr download + CPU RGBE decode!)
      const pmremGen = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = track(pmremGen.fromScene(roomEnv, 0.04));
      roomEnv.dispose();
      pmremGen.dispose();
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.16;

      /* ====================================================================
         A. DEEP MICRO-WEATHERED PBR CAR PAINT SHADER ("VẾT HẰN THỜI GIAN")
            Matches `ref_left_car_hood.png` & `ref_right_car.png` 1:1:
            - Deep pitted normal-map relief (`normalScale = 1.55`)
            - Salvaged mossy olive-pistachio front fender (`#7D8A55`) vs chalky
              dirty off-white doors/body (`#CFCAC0`)
            - Razor-sharp jagged burnt-sienna & dark rust streaks dripping from
              window sills, handles, fender creases, and lower rocker seams!
         ==================================================================== */
      const patinaBump = getSharedPatinaBumpTexture();
      await maybeYield();
      if (disposed) return;

      // Hand-painted Canvas PBR Weathering Maps (cached globally + sliced across frames!)
      const texChalkDoor = getSharedWeatheredPanelTextures('chalk_white', 19842105);
      await maybeYield();
      if (disposed) return;
      const texChalkRear = getSharedWeatheredPanelTextures('chalk_rear', 19862107);
      await maybeYield();
      if (disposed) return;
      const texOliveFender = getSharedWeatheredPanelTextures('olive_fender', 19820519);
      await maybeYield();
      if (disposed) return;
      const texDetachedDoor = getSharedWeatheredPanelTextures('detached_door', 19881124);
      await maybeYield();
      if (disposed) return;

      const createHeavyWeatheredLadaMaterial = (optsMat: {
        panelTex: WeatheredCarTextureSet;
        invCarMat: THREE.Matrix4;
        hingeOffset?: THREE.Vector3;
        uvZMin?: number;
        uvZSpan?: number;
        flipU?: boolean;
        normalStrength?: number;
        rimStrength?: number;
      }): THREE.MeshStandardMaterial => {
        const nStr = optsMat.normalStrength ?? 1.55;
        const rimStr = optsMat.rimStrength ?? 0.075;
        const hOff = optsMat.hingeOffset ?? new THREE.Vector3(0, 0, 0);
        const uvZMin = optsMat.uvZMin ?? -0.45;
        const uvZSpan = optsMat.uvZSpan ?? 1.25;
        const flipU = optsMat.flipU ? 1.0 : 0.0;
        const mat = track(
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.86,
            metalness: 0.12,
            side: THREE.DoubleSide,
          })
        );

        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uPanelMap = { value: optsMat.panelTex.map };
          shader.uniforms.uPanelBump = { value: optsMat.panelTex.bumpMap };
          shader.uniforms.uPanelRough = { value: optsMat.panelTex.roughnessMap };
          shader.uniforms.uRustNor = { value: rustNor };
          shader.uniforms.uNormalStr = { value: nStr };
          shader.uniforms.uRimStr = { value: rimStr };
          shader.uniforms.uInvCarMat = { value: optsMat.invCarMat };
          shader.uniforms.uHingeOff = { value: hOff };
          shader.uniforms.uUvDomain = { value: new THREE.Vector3(uvZMin, uvZSpan, flipU) };
          shader.uniforms.uParticleLightMap = sharedUniforms.uParticleLightMap;
          shader.uniforms.uTerrainSpan = sharedUniforms.uTerrainSpan;

          shader.vertexShader =
            'uniform mat4 uInvCarMat;\nuniform vec3 uHingeOff;\nvarying vec3 vWPos;\nvarying vec3 vCarMetric;\nvarying vec3 vWNrm;\n' +
            shader.vertexShader.replace(
              '#include <worldpos_vertex>',
              `#include <worldpos_vertex>
               vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
               vCarMetric = (uInvCarMat * vec4(vWPos, 1.0)).xyz + uHingeOff;
               vWNrm = normalize(mat3(modelMatrix) * objectNormal);`
            );

          shader.fragmentShader =
            `uniform sampler2D uPanelMap;
             uniform sampler2D uPanelBump;
             uniform sampler2D uPanelRough;
             uniform sampler2D uRustNor;
             uniform float uNormalStr;
             uniform float uRimStr;
             uniform vec3 uUvDomain;
             uniform sampler2D uParticleLightMap;
             uniform float uTerrainSpan;
             varying vec3 vWPos;
             varying vec3 vCarMetric;
             varying vec3 vWNrm;
             vec2 evalCarPanelUv(vec3 cm) {
               float uRaw = clamp((cm.z - uUvDomain.x) / max(0.2, uUvDomain.y), 0.015, 0.985);
               float u = uUvDomain.z > 0.5 ? (1.0 - uRaw) : uRaw;
               float v = clamp((cm.y - 0.22) / 0.96, 0.015, 0.985);
               return vec2(u, v);
             }\n` +
            shader.fragmentShader
              .replace(
                '#include <normal_fragment_maps>',
                `#include <normal_fragment_maps>
                 vec2 triUv = vec2(vWPos.x * 1.35 + vWPos.z * 1.15, vWPos.y * 1.35);
                 vec2 pUvN = evalCarPanelUv(vCarMetric);
                 vec3 mapN = texture2D(uRustNor, triUv * 2.3).xyz * 2.0 - 1.0;
                 float bH0 = texture2D(uPanelBump, pUvN).r;
                 float bHx = texture2D(uPanelBump, pUvN + vec2(1.0 / 512.0, 0.0)).r;
                 float bHy = texture2D(uPanelBump, pUvN + vec2(0.0, 1.0 / 512.0)).r;
                 vec2 canvasGrad = vec2(bH0 - bHx, bH0 - bHy) * 6.5;
                 normal = normalize(normal + vec3(mapN.x * uNormalStr * 0.34 + canvasGrad.x, mapN.y * uNormalStr * 0.34 + canvasGrad.y, mapN.x * 0.18));`
              )
              .replace(
                '#include <roughnessmap_fragment>',
                `#include <roughnessmap_fragment>
                 vec2 pUvR = evalCarPanelUv(vCarMetric);
                 float cRough = texture2D(uPanelRough, pUvR).g;
                 roughnessFactor = clamp(0.66 + cRough * 0.30, 0.62, 0.96);`
              )
              .replace(
                '#include <map_fragment>',
                `#include <map_fragment>
                 float carY = vCarMetric.y;
                 vec2 panelUv = evalCarPanelUv(vCarMetric);
                 vec3 texCol = texture2D(uPanelMap, panelUv).rgb;
                 vec3 upperClean = texture2D(uPanelMap, vec2(panelUv.x, 0.92)).rgb;
                 diffuseColor.rgb = mix(texCol, upperClean, smoothstep(0.81, 0.86, carY));`
              )
              .replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                 vec2 plUv = clamp(vWPos.xz / uTerrainSpan + 0.5, 0.002, 0.998);
                 vec3 pLight = texture2D(uParticleLightMap, plUv).rgb;
                 totalEmissiveRadiance += diffuseColor.rgb * pLight * 0.18;`
              )
              .replace(
                '#include <opaque_fragment>',
                `vec3 ladaViewDir = normalize(vViewPosition);
                 float ladaFresnel = pow(1.0 - clamp(abs(dot(normalize(normal), ladaViewDir)), 0.0, 1.0), 3.0);
                 outgoingLight += vec3(1.0, 0.83, 0.60) * (ladaFresnel * uRimStr);
                 #include <opaque_fragment>`
              );
        };
        return mat;
      };

      const leftCarInvMat = new THREE.Matrix4();
      const openDoorInvMat = new THREE.Matrix4();
      const detachedDoorInvMat = new THREE.Matrix4();
      const rightCarInvMat = new THREE.Matrix4();
      const doorHingeVec = new THREE.Vector3(0.755, 0.65, 0.74);

      const ladaFenderOliveMat = createHeavyWeatheredLadaMaterial({
        panelTex: texOliveFender,
        invCarMat: leftCarInvMat,
        uvZMin: 0.72,
        uvZSpan: 1.20,
        flipU: false,
        normalStrength: 1.60,
        rimStrength: 0.065,
      });

      const ladaChalkWhiteMat = createHeavyWeatheredLadaMaterial({
        panelTex: texChalkRear,
        invCarMat: leftCarInvMat,
        uvZMin: -0.52,
        uvZSpan: 1.35,
        flipU: true,
        normalStrength: 1.45,
        rimStrength: 0.075,
      });

      const ladaRightRearWhiteMat = createHeavyWeatheredLadaMaterial({
        panelTex: texChalkRear,
        invCarMat: rightCarInvMat,
        uvZMin: -1.92,
        uvZSpan: 1.56,
        flipU: false,
        normalStrength: 1.50,
        rimStrength: 0.075,
      });

      const ladaOpenDoorWhiteMat = createHeavyWeatheredLadaMaterial({
        panelTex: texChalkDoor,
        invCarMat: openDoorInvMat,
        hingeOffset: doorHingeVec,
        uvZMin: -0.44,
        uvZSpan: 1.19,
        flipU: true,
        normalStrength: 1.55,
        rimStrength: 0.08,
      });

      const ladaDetachedDoorMat = createHeavyWeatheredLadaMaterial({
        panelTex: texDetachedDoor,
        invCarMat: detachedDoorInvMat,
        hingeOffset: doorHingeVec,
        uvZMin: -0.44,
        uvZSpan: 1.19,
        flipU: false,
        normalStrength: 1.45,
        rimStrength: 0.13,
      });

      const darkTrimMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x15171a,
          roughness: 0.72,
          metalness: 0.28,
          side: THREE.DoubleSide,
        })
      );

      const dirtyWsTex = getSharedDirtyWindshieldTexture();
      // Transparent dusty laminated automotive windshield glass (`kính trước xe vẫn còn, trong suốt để thấy ánh sáng khói đỏ & vô lăng bên trong`)!
      const windshieldGlassMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xc8a4a2,
          map: dirtyWsTex,
          emissive: new THREE.Color(0x520b08),
          emissiveIntensity: 0.24,
          roughness: 0.36,
          metalness: 0.04,
          ior: 1.50,
          reflectivity: 0.58,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );

      const rearGlassMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0x24683a,
          emissive: new THREE.Color(0x04260e),
          emissiveIntensity: 0.10,
          roughness: 0.28,
          metalness: 0.06,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );

      const headlightGlassMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x1b2840,
          emissive: new THREE.Color(0x0a3898),
          emissiveIntensity: 0.24,
          roughness: 0.22,
          metalness: 0.72,
          side: THREE.DoubleSide,
        })
      );

      const taillightLensMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x58140e,
          emissive: new THREE.Color(0x3a0804),
          emissiveIntensity: 0.18,
          roughness: 0.36,
          metalness: 0.22,
          side: THREE.DoubleSide,
        })
      );

      const brakeRustedIronMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x2c1812,
          emissive: new THREE.Color(0x680c06),
          emissiveIntensity: 0.24,
          roughness: 0.68,
          metalness: 0.68,
          side: THREE.DoubleSide,
        })
      );

      const engineBlueChromeMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x101c38,
          emissive: new THREE.Color(0x0846e8),
          emissiveIntensity: 0.54,
          roughness: 0.26,
          metalness: 0.88,
          side: THREE.DoubleSide,
        })
      );

      const assignLadaMaterials = (
        root: THREE.Object3D,
        whiteOverride?: THREE.Material
      ) => {
        root.traverse((obj) => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const m = obj as THREE.Mesh;
          // Clone geometry per scene instance so disposing a scene never corrupts cached GLTF prototypes
          m.geometry = track(m.geometry.clone());
          m.castShadow = true;
          m.receiveShadow = true;
          const matName = (m.material as THREE.Material)?.name || '';
          if (matName === 'paint_fender_olive') {
            m.material = ladaFenderOliveMat;
          } else if (matName === 'paint_white') {
            m.material = whiteOverride ?? ladaChalkWhiteMat;
          } else if (matName === 'windshield_glass' || matName === 'windshield_red') {
            m.material = windshieldGlassMat;
            m.castShadow = false;
            m.renderOrder = 6;
          } else if (matName === 'rear_glass') {
            m.material = rearGlassMat;
            m.castShadow = false;
            m.renderOrder = 6;
          } else if (matName === 'headlight_glass') {
            m.material = headlightGlassMat;
          } else if (matName === 'taillight_lens') {
            m.material = taillightLensMat;
          } else if (matName === 'brake_iron') {
            m.material = brakeRustedIronMat;
          } else {
            m.material = darkTrimMat;
          }
        });
      };

      /* ====================================================================
         B. ASSEMBLE LEFT BOXY LADA FRONT WRECK + SWUNG-OPEN DOOR + DETACHED DOOR
            Exact match to `ref_left_car_hood.png`!
         ==================================================================== */
      ladaGltf.scene.position.set(0, 0, 0);
      ladaGltf.scene.rotation.set(0, 0, 0);
      ladaGltf.scene.scale.set(1, 1, 1);
      ladaGltf.scene.updateMatrixWorld(true);

      sedanDonorGltf.scene.position.set(0, 0, 0);
      sedanDonorGltf.scene.rotation.set(0, 0, 0);
      sedanDonorGltf.scene.scale.set(1, 1, 1);
      sedanDonorGltf.scene.updateMatrixWorld(true);

      const leftFrontNode = ladaGltf.scene.getObjectByName('left_front');
      const doorPanelNode = ladaGltf.scene.getObjectByName('door_panel');
      const rightRearNode = ladaGltf.scene.getObjectByName('right_rear');

      const leftCarRoot = new THREE.Group();
      const leftCarScale = 0.96;
      const leftCarX = -2.44;
      const leftCarZ = 0.88;
      const leftCarY = sampleHeight(leftCarX, leftCarZ) - 0.14;
      const leftCarRotY = -0.68;

      if (leftFrontNode) {
        const lfClone = leftFrontNode.clone(true);
        assignLadaMaterials(lfClone);
        leftCarRoot.add(lfClone);
      }

      // Mount sculpted VAZ-2105 9-slat radiator grille, Zhiguli badge, rectangular lamps, wipers & suspension!
      leftCarRoot.add(buildVaz2105FrontNoseAssembly(disposables));
      leftCarRoot.add(buildFrontWheelArchInternals(disposables));

      // Soft Volumetric Crimson-Red Smoke Mist INSIDE the enclosed cabin (behind clear windshield & steering wheel!)
      // Matches `mv_3m28_left_car_door.png`: "ánh sáng xuất phát từ trong xe (chỉ như một lớp khói mờ mờ), kính trước trong suốt"!
      leftCarRoot.add(
        buildVolumetricCabinSmoke(
          0xe0221a,
          [
            { pos: [-0.34, 0.98, 0.28], rot: [-0.52, -0.05, 0.04], scale: [0.96, 0.66], opacity: 0.50 },
            { pos: [0.02, 0.98, 0.26], rot: [-0.48, 0.08, 0.05], scale: [1.18, 0.70], opacity: 0.52 },
            { pos: [0.34, 0.96, 0.24], rot: [-0.45, 0.18, -0.04], scale: [0.94, 0.66], opacity: 0.48 },
            { pos: [-0.18, 0.86, 0.06], rot: [-0.32, -0.22, -0.08], scale: [1.16, 0.74], opacity: 0.46 },
            { pos: [0.24, 0.84, -0.06], rot: [-0.18, 0.42, 0.12], scale: [1.02, 0.68], opacity: 0.42 },
            { pos: [0.02, 0.72, -0.20], rot: [0.08, -0.15, 0.04], scale: [1.26, 0.78], opacity: 0.50 },
          ],
          disposables
        )
      );

      // Small rectangular dark-amber Lada side-repeater indicator on front fender (`ref_left_car_hood.png`!)
      {
        const blinkerGeo = track(new THREE.BoxGeometry(0.026, 0.034, 0.082));
        const blinkerMat = track(
          new THREE.MeshStandardMaterial({
            color: 0x5c2c0a,
            roughness: 0.42,
            metalness: 0.25,
          })
        );
        const blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
        blinker.position.set(0.775, 0.56, 1.52);
        leftCarRoot.add(blinker);
      }

      // Swung-open boxy driver's door with thin white rectangular window frame (`HINGE = 0.755, 0.65, 0.74`)
      const doorPivot = new THREE.Group();
      doorPivot.position.set(0.755, 0.65, 0.74);
      if (doorPanelNode) {
        const dpClone = doorPanelNode.clone(true);
        assignLadaMaterials(dpClone, ladaOpenDoorWhiteMat);
        doorPivot.add(dpClone);

        // Recessed rectangular black Lada 2105 door handle + chrome bezel (`ref_left_car_hood.png`!)
        const bezelMesh = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.032, 0.056, 0.175)),
          track(
            new THREE.MeshStandardMaterial({
              color: 0x9ca2a8,
              roughness: 0.45,
              metalness: 0.78,
            })
          )
        );
        bezelMesh.position.set(0.032, 0.05, -0.98);
        doorPivot.add(bezelMesh);

        const recessMesh = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.038, 0.038, 0.145)),
          darkTrimMat
        );
        recessMesh.position.set(0.034, 0.05, -0.98);
        doorPivot.add(recessMesh);

        // Subtle stamped lower rocker seam groove + sculpted VAZ-2105 side mirror (ONLY on open door!)
        const seamGroove = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.028, 0.010, 1.16)),
          track(
            new THREE.MeshStandardMaterial({
              color: 0x3b1808,
              roughness: 0.92,
            })
          )
        );
        seamGroove.position.set(0.022, -0.26, -0.58);
        doorPivot.add(seamGroove);
        doorPivot.add(buildVaz2105SideMirror(disposables));
      }
      doorPivot.rotation.y = -0.96;
      leftCarRoot.add(doorPivot);
      leftCarRoot.add(buildOpenEngineBayMechanicals(disposables));

      // Transplant detailed 3D engine block, hoses, radiator & front coil spring inside open Lada cavities!
      {
        const engNames = ['engine-parts_28', 'engine-transmission_30', 'radiator_61'];
        const engGeos: THREE.BufferGeometry[] = [];
        for (const en of engNames) {
          const eo = sedanDonorGltf.scene.getObjectByName(en);
          if (eo) {
            eo.traverse((ch) => {
              if ((ch as THREE.Mesh).isMesh) {
                engGeos.push(bakeMeshMetricGeometry(ch as THREE.Mesh));
              }
            });
          }
        }
        if (engGeos.length > 0) {
          const mergedEng = track(mergeMetricGeometries(engGeos, true, true));
          engGeos.forEach((g) => g.dispose());
          // Place salvaged rusty radiator/engine-transmission assembly in the center junkyard pile ONLY
          // (keeping `leftCarRoot`'s open hood bay clear for our sculpted `buildOpenEngineBayMechanicals` + braided hoses!)
          const junkEngMat = track(
            new THREE.MeshStandardMaterial({
              color: 0x624a38,
              normalMap: rustNor,
              roughness: 0.78,
              metalness: 0.52,
            })
          );
          const junkEng = new THREE.Mesh(mergedEng, junkEngMat);
          junkEng.position.set(-0.56, sampleHeight(-0.56, 1.56) + 0.04, 1.56);
          junkEng.rotation.set(0.24, 0.65, -0.28);
          junkEng.scale.setScalar(0.48);
          junkEng.castShadow = true;
          junkEng.receiveShadow = true;
          group.add(junkEng);
        }

        // Tangled engine hoses & spark-plug wires glinting blue inside the sunken hood cavity (batched into 1 draw call!)
        const hoseRng = createSeededRandom(31337);
        const hoseGeos: THREE.BufferGeometry[] = [];
        for (let h = 0; h < 11; h += 1) {
          const p0 = new THREE.Vector3(
            (hoseRng() - 0.5) * 0.88,
            0.54 + hoseRng() * 0.10,
            0.92 + hoseRng() * 0.84
          );
          const p1 = new THREE.Vector3(
            (hoseRng() - 0.5) * 0.78,
            0.64 + hoseRng() * 0.11,
            0.98 + hoseRng() * 0.80
          );
          const p2 = new THREE.Vector3(
            (hoseRng() - 0.5) * 0.88,
            0.52 + hoseRng() * 0.10,
            1.05 + hoseRng() * 0.78
          );
          hoseGeos.push(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3([p0, p1, p2]),
              12,
              0.011 + hoseRng() * 0.011,
              5,
              false
            )
          );
        }
        const mergedHoseGeo = track(mergeStaticBufferGeometries(hoseGeos));
        hoseGeos.forEach((g) => g.dispose());
        leftCarRoot.add(new THREE.Mesh(mergedHoseGeo, engineBlueChromeMat));

        // Rusty coil spring & control arm inside the front-left wheel arch (`ref_left_car_hood.png`)
        const sprObj = sedanDonorGltf.scene.getObjectByName('spring_74');
        if (sprObj) {
          const sGeos: THREE.BufferGeometry[] = [];
          sprObj.traverse((ch) => {
            if ((ch as THREE.Mesh).isMesh) sGeos.push(bakeMeshMetricGeometry(ch as THREE.Mesh));
          });
          if (sGeos.length > 0) {
            const mSpr = track(mergeMetricGeometries(sGeos, true, true));
            sGeos.forEach((g) => g.dispose());
            const sprMesh = new THREE.Mesh(mSpr, brakeRustedIronMat);
            sprMesh.position.set(0.58, 0.34, 1.36);
            sprMesh.scale.setScalar(1.05);
            leftCarRoot.add(sprMesh);
          }
        }
      }

      leftCarRoot.scale.setScalar(leftCarScale);
      leftCarRoot.rotation.set(0.03, leftCarRotY, -0.025);
      leftCarRoot.position.set(leftCarX, leftCarY, leftCarZ);
      leftCarRoot.updateMatrixWorld(true);
      leftCarInvMat.copy(leftCarRoot.matrixWorld).invert();
      openDoorInvMat.copy(doorPivot.matrixWorld).invert();

      engineBlueLight.position
        .set(-0.04, 0.56, 1.35)
        .applyMatrix4(leftCarRoot.matrixWorld);
      wheelRedLight.position
        .set(0.50, 0.36, 1.36)
        .applyMatrix4(leftCarRoot.matrixWorld);
      cabinRedLight.position
        .set(-0.04, 0.94, 0.18)
        .applyMatrix4(leftCarRoot.matrixWorld);

      group.add(leftCarRoot);

      // Detached Boxy White Car Door with Rectangular Window Frame Lying FLUSH in Bottom-Left Grass!
      // Exact terrain-normal + VAZ-2105 tumblehome compensation + vertex-minimum ground contact solver
      // so ZERO parts float in mid-air (`không bị lơ lửng`) and ZERO soil pokes through!
      if (doorPanelNode) {
        const flatDoorWrap = new THREE.Group();
        const fdClone = doorPanelNode.clone(true);
        assignLadaMaterials(fdClone, ladaDetachedDoorMat);
        flatDoorWrap.add(fdClone);

        const fdx = -2.26;
        const fdz = 3.68;
        const dirY = new THREE.Vector2(0.95, -0.31).normalize();
        const negDirZ = new THREE.Vector2(0.31, 0.95).normalize();

        const hSill = sampleHeight(
          fdx - dirY.x * 0.36 + negDirZ.x * 0.56,
          fdz - dirY.y * 0.36 + negDirZ.y * 0.56
        );
        const hHead = sampleHeight(
          fdx + dirY.x * 0.62 + negDirZ.x * 0.32,
          fdz + dirY.y * 0.62 + negDirZ.y * 0.32
        );
        const hHinge = sampleHeight(fdx + dirY.x * 0.05, fdz + dirY.y * 0.05);
        const hLatch = sampleHeight(
          fdx + dirY.x * 0.05 + negDirZ.x * 1.10,
          fdz + dirY.y * 0.05 + negDirZ.y * 1.10
        );

        // Compensate for terrain slope + VAZ-2105 upper window frame 5.8deg inward tumblehome (+0.104)
        // so both the stamped metal door shell AND all 4 bars of the window frame rest flat on the grass!
        const slopeY = (hHead - hSill) / 0.98 + 0.104;
        const slopeNegZ = (hLatch - hHinge) / 1.10;

        const yAxis = new THREE.Vector3(dirY.x, slopeY, dirY.y).normalize();
        const negZVec = new THREE.Vector3(negDirZ.x, slopeNegZ, negDirZ.y).normalize();
        const zAxis = negZVec.clone().negate();
        const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
        zAxis.crossVectors(xAxis, yAxis).normalize();

        const basisMat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        flatDoorWrap.quaternion.setFromRotationMatrix(basisMat);
        flatDoorWrap.scale.setScalar(0.96);
        flatDoorWrap.position.set(fdx, sampleHeight(fdx, fdz), fdz);
        flatDoorWrap.updateMatrixWorld(true);

        // Vertex-accurate ground contact: find minimum bottom clearance across the curved heightfield
        let minClearance = Infinity;
        const vCheck = new THREE.Vector3();
        fdClone.traverse((ch) => {
          if (!(ch as THREE.Mesh).isMesh) return;
          const m = ch as THREE.Mesh;
          // Flush ground sheet: receive shadows cleanly without casting an artificial floating PCF offset shadow
          m.castShadow = false;
          m.receiveShadow = true;
          const posAttr = m.geometry.getAttribute('position');
          for (let i = 0; i < posAttr.count; i += 1) {
            vCheck
              .set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
              .applyMatrix4(m.matrixWorld);
            const clr = vCheck.y - sampleHeight(vCheck.x, vCheck.z);
            if (clr < minClearance) minClearance = clr;
          }
        });

        // Nestle bottom inner steel skin 6mm into the moss/soil bed so top skin (+46mm) & window frame (+26mm) sit 100% grounded!
        if (Number.isFinite(minClearance)) {
          flatDoorWrap.position.y -= minClearance + 0.006;
          flatDoorWrap.updateMatrixWorld(true);
        }

        detachedDoorInvMat.copy(flatDoorWrap.matrixWorld).invert();
        group.add(flatDoorWrap);
      }

      /* ====================================================================
         C. RIGHT BOXY LADA REAR CUTAWAY (`right_rear` — Solid C-Arch + Bench Seat + Blue Underglow)
            Rear (`đít xe`) swung ~32deg forward-left (`rightCarRotY = -1.98`, `-113.4deg`) so from camera `(0, 6.2)`
            the C-arch faces dead-on with the green rear window peeking at the upper-right of the C-pillar!
         ==================================================================== */
      const rightCarRoot = new THREE.Group();
      const rightCarScale = 1.02;
      const rightCarX = 2.16;
      const rightCarZ = 0.64;
      const rightCarY = sampleHeight(rightCarX, rightCarZ) - 0.14;
      const rightCarRotY = -1.98;

      if (rightRearNode) {
        const rrClone = rightRearNode.clone(true);
        assignLadaMaterials(rrClone, ladaRightRearWhiteMat);
        rightCarRoot.add(rrClone);
      }
      rightCarRoot.add(buildVaz2105RearClusterAndSeatExtras(disposables));
      rightCarRoot.add(
        buildVolumetricCabinSmoke(
          0x12c84e,
          [
            { pos: [0.06, 0.76, -0.58], rot: [0.08, 1.25, 0.0], scale: [0.78, 0.48], opacity: 0.12 },
          ],
          disposables
        )
      );

      // Black vinyl rear bench seat inside open C-shaped rear cabin (`ref_right_car.png`!)
      {
        const seatGeos: THREE.BufferGeometry[] = [];
        for (const sn of ['rear-seat_62', 'rear-seat-backseat_63']) {
          const so = sedanDonorGltf.scene.getObjectByName(sn);
          if (so) {
            so.traverse((ch) => {
              if ((ch as THREE.Mesh).isMesh) seatGeos.push(bakeMeshMetricGeometry(ch as THREE.Mesh));
            });
          }
        }
        if (seatGeos.length > 0) {
          const mergedSeat = track(mergeMetricGeometries(seatGeos, true, true));
          seatGeos.forEach((g) => g.dispose());
          const seatMat = track(
            new THREE.MeshStandardMaterial({
              color: 0x0c0e0d,
              emissive: new THREE.Color(0x010903),
              emissiveIntensity: 0.05,
              roughness: 0.56,
              metalness: 0.06,
              side: THREE.DoubleSide,
            })
          );
          const seatMesh = new THREE.Mesh(mergedSeat, seatMat);
          seatMesh.position.set(0.0, 0.27, -0.58);
          seatMesh.scale.set(0.88, 0.80, 0.84);
          seatMesh.castShadow = true;
          seatMesh.receiveShadow = true;
          rightCarRoot.add(seatMesh);
        }

        // Dangling green wire inside the cut rear cabin + small rusty canister at cut sill (`ref_right_car.png`!)
        const greenWireGeo = track(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(0.18, 1.26, -0.58),
              new THREE.Vector3(0.24, 0.96, -0.64),
              new THREE.Vector3(0.19, 0.68, -0.60),
            ]),
            12,
            0.008,
            5,
            false
          )
        );
        rightCarRoot.add(
          new THREE.Mesh(
            greenWireGeo,
            track(
              new THREE.MeshStandardMaterial({
                color: 0x1ee058,
                emissive: new THREE.Color(0x10b842),
                emissiveIntensity: 0.75,
              })
            )
          )
        );

        const sillCan = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 14)),
          track(
            new THREE.MeshStandardMaterial({
              color: 0x7c8288,
              roughness: 0.65,
              metalness: 0.65,
            })
          )
        );
        sillCan.position.set(0.62, 0.20, -0.34);
        sillCan.rotation.z = Math.PI * 0.5;
        rightCarRoot.add(sillCan);
      }

      rightCarRoot.scale.setScalar(rightCarScale);
      rightCarRoot.rotation.set(-0.02, rightCarRotY, 0.03);
      rightCarRoot.position.set(rightCarX, rightCarY, rightCarZ);
      rightCarRoot.updateMatrixWorld(true);
      rightCarInvMat.copy(rightCarRoot.matrixWorld).invert();

      rightCabinGreenLight.position
        .set(0.10, 0.72, -0.52)
        .applyMatrix4(rightCarRoot.matrixWorld);
      rightUnderglowBlueLight.position
        .set(0.42, 0.16, -1.62)
        .applyMatrix4(rightCarRoot.matrixWorld);

      group.add(rightCarRoot);
      await maybeYield();
      if (disposed) return;

      /* ====================================================================
         D. PHOTOSCANNED TIRES (`old_tyre.glb`), RUSTED STEEL RIMS (`rusted_rim.glb`)
            & POWER/ECU BOX (`power_box.glb`) — Matches `ref_foreground_grass_tires.png`!
         ==================================================================== */
      const extractFirstMeshBaked = (
        gScene: THREE.Group,
        bakeOpts: { extraRotateX?: number; centerXZ?: boolean; zeroBottomY?: boolean }
      ): { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial } | null => {
        gScene.position.set(0, 0, 0);
        gScene.rotation.set(0, 0, 0);
        gScene.scale.set(1, 1, 1);
        gScene.updateMatrixWorld(true);
        let found: THREE.Mesh | null = null;
        gScene.traverse((ch) => {
          if ((ch as THREE.Mesh).isMesh && !found) found = ch as THREE.Mesh;
        });
        if (!found) return null;
        const geo = track(bakeMeshMetricGeometry(found, bakeOpts));
        const mat = track(((found as THREE.Mesh).material as THREE.MeshStandardMaterial).clone());
        return { geo, mat };
      };

      const tyreAsset = extractFirstMeshBaked(tyreGltf.scene, {
        extraRotateX: -Math.PI * 0.5,
        centerXZ: true,
        zeroBottomY: true,
      });
      const rimAsset = extractFirstMeshBaked(rimGltf.scene, {
        extraRotateX: -Math.PI * 0.5,
        centerXZ: true,
        zeroBottomY: true,
      });

      if (tyreAsset) {
        tyreAsset.mat.color.setHex(0x585248);
        tyreAsset.mat.roughness = 0.94;

        const tyreSpots = [
          { x: -0.58, z: 4.46, yOff: 0.005, rx: 0.04, ry: 0.7, rz: -0.03, s: 1.16, withRim: true },
          { x: 1.76, z: 4.08, yOff: 0.005, rx: -0.03, ry: 2.1, rz: 0.04, s: 1.10, withRim: true },
          // Background spare tires behind open left door & right side of central bush (`mv_3m28s_1080p.png`!)
          { x: -1.12, z: 0.22, yOff: 0.005, rx: 0.08, ry: 1.2, rz: -0.05, s: 1.05, withRim: false },
          { x: 1.32, z: 0.18, yOff: 0.005, rx: -0.06, ry: 0.4, rz: 0.08, s: 1.02, withRim: false },
        ];
        for (const p of tyreSpots) {
          const tm = new THREE.Mesh(tyreAsset.geo, tyreAsset.mat);
          tm.position.set(p.x, sampleHeight(p.x, p.z) + p.yOff, p.z);
          tm.rotation.set(p.rx, p.ry, p.rz);
          tm.scale.setScalar(p.s);
          tm.castShadow = true;
          tm.receiveShadow = true;
          group.add(tm);

          if (rimAsset && p.withRim) {
            rimAsset.mat.color.setHex(0x6e4a32);
            rimAsset.mat.roughness = 0.88;
            const rm = new THREE.Mesh(rimAsset.geo, rimAsset.mat);
            rm.position.set(p.x, sampleHeight(p.x, p.z) + p.yOff + 0.025, p.z);
            rm.rotation.set(p.rx, p.ry, p.rz);
            rm.scale.setScalar(p.s * 0.96);
            rm.castShadow = true;
            rm.receiveShadow = true;
            group.add(rm);
          }
        }
      }

      // Photoscanned weathered industrial junction box (`power_box.glb`) in center junkyard heap (`mv_3m28_center_debris.png`)!
      const pboxAsset = extractFirstMeshBaked(powerBoxGltf.scene, {
        extraRotateX: -Math.PI * 0.5,
        centerXZ: true,
        zeroBottomY: true,
      });
      if (pboxAsset) {
        pboxAsset.mat.color.setHex(0x666052);
        pboxAsset.mat.roughness = 0.88;
        const pbJunk = new THREE.Mesh(pboxAsset.geo, pboxAsset.mat);
        pbJunk.position.set(-0.98, sampleHeight(-0.98, 1.48) + 0.02, 1.48);
        pbJunk.rotation.set(0.18, 0.55, -0.14);
        pbJunk.scale.setScalar(0.40);
        pbJunk.castShadow = true;
        pbJunk.receiveShadow = true;
        group.add(pbJunk);
      }

      // Complete Forensic Scattered Ground Debris (`mv_3m28_center_debris.png` & `mv_3m28_right_car.png` 1:1):
      // Finned radiator + fan shroud, U-bent intake hose, starter + 5-hole belt pulley, flat vented brake rotor disc,
      // upright white-piped bucket seat inside bush, metal canister under right car cut sill, ECU, & coolant reservoir!
      {
        const debrisGrp = buildForensicGroundDebrisProps(rustNor, sampleHeight, disposables);
        applyNocturnalPatina(debrisGrp, patinaBump, 0.08);
        group.add(debrisGrp);

        const ecuModule = buildFinnedAutomotiveEcu(rustNor, disposables);
        ecuModule.position.set(-0.45, sampleHeight(-0.45, 2.74) + 0.075, 2.74);
        ecuModule.rotation.set(0.08, 0.42, -0.06);
        applyNocturnalPatina(ecuModule, patinaBump, 0.09);
        group.add(ecuModule);

        const { coolantTank } = buildJunkyardCoolantAndScrapProps(rustNor, disposables);
        const tx = 0.24;
        const tz = 1.68;
        coolantTank.position.set(tx, sampleHeight(tx, tz) + 0.078, tz);
        coolantTank.rotation.set(0.14, -0.28, 0.12);
        group.add(coolantTank);
      }

      if (tyreAsset) applyNocturnalPatina(new THREE.Mesh(tyreAsset.geo, tyreAsset.mat), patinaBump, 0.07);
      if (rimAsset) applyNocturnalPatina(new THREE.Mesh(rimAsset.geo, rimAsset.mat), patinaBump, 0.08);
      await maybeYield();
      if (disposed) return;

      /* ====================================================================
         E. CENTER TILTED CYAN-VERDIGRIS FLANGED PIPE + HEAVY RUST COLLARS + ROOTS
            Exact match to `ref_center_pipe_roses.png`!
         ==================================================================== */
      pipeGltf.scene.position.set(0, 0, 0);
      pipeGltf.scene.rotation.set(0, 0, 0);
      pipeGltf.scene.scale.set(1, 1, 1);
      pipeGltf.scene.updateMatrixWorld(true);

      const pipe02Node = pipeGltf.scene.getObjectByName(
        'modular_industrial_pipes_01_pipe02'
      );
      let mainPipeMeshSrc: THREE.Mesh | null = null;
      pipe02Node?.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh && !mainPipeMeshSrc) mainPipeMeshSrc = ch as THREE.Mesh;
      });

      if (mainPipeMeshSrc) {
        const pipeGeo = track(
          bakeMeshMetricGeometry(mainPipeMeshSrc, { centerXZ: true, zeroBottomY: true })
        );
        const origPipeMat = (mainPipeMeshSrc as THREE.Mesh)
          .material as THREE.MeshStandardMaterial;
        const pipeMat = track(origPipeMat.clone());
        pipeMat.color.setHex(0x82a898);
        pipeMat.normalMap = rustNor;
        pipeMat.normalScale.set(1.35, 1.35);
        pipeMat.roughness = 0.78;
        pipeMat.metalness = 0.38;

        pipeMat.onBeforeCompile = (shader) => {
          shader.uniforms.uRustDiff = { value: rustDiff };
          shader.uniforms.uMossDiff = { value: mossMetalDiff };
          shader.vertexShader =
            'varying vec3 vPipeLocal;\n' +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               vPipeLocal = position.xyz;`
            );
          shader.fragmentShader =
            `uniform sampler2D uRustDiff;
             uniform sampler2D uMossDiff;
             varying vec3 vPipeLocal;\n` +
            shader.fragmentShader
              .replace(
                '#include <map_fragment>',
                `#include <map_fragment>
                 vec2 pUv = vec2(atan(vPipeLocal.x, vPipeLocal.z) * 0.65, vPipeLocal.y * 0.95);
                 vec3 rTex = texture2D(uRustDiff, pUv * 1.3).rgb;
                 vec3 mTex = texture2D(uMossDiff, pUv * 1.6).rgb;
                 float cyanPatch = exp(-pow((vPipeLocal.y - 1.18) / 0.44, 2.0)) * smoothstep(0.18, 0.58, mTex.g);
                 // Rusty orange-brown collar rings at y=1.06, 1.54, 1.86
                 float ringMask =
                   exp(-pow((vPipeLocal.y - 1.06) / 0.045, 2.0)) +
                   exp(-pow((vPipeLocal.y - 1.54) / 0.045, 2.0)) +
                   exp(-pow((vPipeLocal.y - 1.86) / 0.045, 2.0));
                 vec3 baseWeathered = mix(vec3(0.46, 0.48, 0.44), rTex * vec3(0.85, 0.58, 0.38), 0.55);
                 vec3 oxidized = mix(baseWeathered, vec3(0.10, 0.88, 0.68), cyanPatch * 0.92);
                 oxidized = mix(oxidized, vec3(0.62, 0.26, 0.08), clamp(ringMask, 0.0, 1.0) * 0.88);
                 diffuseColor.rgb = oxidized;`
              )
              .replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                 vec2 pUv2 = vec2(atan(vPipeLocal.x, vPipeLocal.z) * 0.65, vPipeLocal.y * 0.95);
                 float patchNoise = texture2D(uMossDiff, pUv2 * 1.6).g;
                 float midBand = exp(-pow((vPipeLocal.y - 1.18) / 0.38, 2.0)) * smoothstep(0.22, 0.62, patchNoise);
                 totalEmissiveRadiance += vec3(0.05, 0.72, 0.50) * midBand * 0.82;`
              );
        };

        const pipePivot = new THREE.Group();
        const px = 0.06;
        const pz = -0.80;
        const py = sampleHeight(px, pz) + 0.06;
        pipePivot.position.set(px, py, pz);
        pipePivot.rotation.set(0.08, 0.18, -0.39);
        pipePivot.scale.set(1.42, 1.46, 1.42);

        const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
        pipeMesh.castShadow = true;
        pipeMesh.receiveShadow = true;
        pipePivot.add(pipeMesh);

        const collarMat = track(
          new THREE.MeshStandardMaterial({
            color: 0x6c3416,
            normalMap: rustNor,
            roughness: 0.86,
            metalness: 0.45,
          })
        );
        const collarGeos: THREE.BufferGeometry[] = [];
        for (const cy of [1.06, 1.54, 1.86]) {
          const cg = new THREE.CylinderGeometry(0.124, 0.124, 0.032, 20);
          cg.translate(0, cy, 0);
          collarGeos.push(cg);
        }
        const mergedCollars = track(mergeStaticBufferGeometries(collarGeos));
        collarGeos.forEach((g) => g.dispose());
        pipePivot.add(new THREE.Mesh(mergedCollars, collarMat));

        // Gnarled, kinked dead fibrous roots spilling wildly from pipe top & draping down right side (36 roots batched into 1 draw call!)
        const twigRng = createSeededRandom(7719);
        const twigMat = track(
          new THREE.MeshStandardMaterial({
            color: 0x483520,
            roughness: 0.96,
            metalness: 0.0,
          })
        );
        const twigGeos: THREE.BufferGeometry[] = [];
        for (let t = 0; t < 36; t += 1) {
          const drapeRight = t < 24;
          const ang = drapeRight
            ? -0.65 + twigRng() * 1.45
            : twigRng() * Math.PI * 2;
          const rad = 0.02 + twigRng() * 0.075;
          const reach = 0.06 + twigRng() * 0.28;
          const rise = 0.03 + twigRng() * 0.24;
          const drop = drapeRight ? 0.18 + twigRng() * 0.82 : -0.08 + twigRng() * 0.22;
          const cPts: THREE.Vector3[] = [];
          const nKinks = 6;
          for (let s = 0; s <= nKinks; s += 1) {
            const u = s / nKinks;
            const curAng = ang + (twigRng() - 0.5) * 0.42 * u;
            const curR = rad * 0.5 + reach * Math.pow(u, 0.72) + (twigRng() - 0.5) * 0.045 * u;
            const archY = Math.sin(u * Math.PI) * rise * (drapeRight ? 0.65 : 1.15) - Math.pow(u, 1.45) * drop;
            cPts.push(
              new THREE.Vector3(
                Math.cos(curAng) * curR + (twigRng() - 0.5) * 0.035,
                1.88 + archY + (twigRng() - 0.5) * 0.025,
                Math.sin(curAng) * curR + (twigRng() - 0.5) * 0.035
              )
            );
          }
          twigGeos.push(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(cPts),
              14,
              0.0022 + twigRng() * 0.0032,
              4,
              false
            )
          );
        }
        const mergedTwigs = track(mergeStaticBufferGeometries(twigGeos));
        twigGeos.forEach((g) => g.dispose());
        pipePivot.add(new THREE.Mesh(mergedTwigs, twigMat));

        pipePivot.updateMatrixWorld(true);
        pipeCyanLight.position
          .set(0.12, 1.22, 0.22)
          .applyMatrix4(pipePivot.matrixWorld);
        group.add(pipePivot);
      }

      /* ====================================================================
         F. MULTI-SPECIES PHOTOSCANNED WILD SHRUB, PERIWINKLE & 3D ROSE BUSH
            (`shrub_flower.glb` + `shrub_wild.glb` + `periwinkle.glb` + `rose_blossom.glb`)
         ==================================================================== */
      const collectBakedFoliage = (
        gScene: THREE.Group,
        tintHex: number
      ): Array<{ geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }> => {
        gScene.position.set(0, 0, 0);
        gScene.rotation.set(0, 0, 0);
        gScene.scale.set(1, 1, 1);
        gScene.updateMatrixWorld(true);

        const out: Array<{ geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }> = [];
        let sharedMat: THREE.MeshStandardMaterial | null = null;
        gScene.traverse((ch) => {
          if (!(ch as THREE.Mesh).isMesh) return;
          const m = ch as THREE.Mesh;
          const geo = track(
            bakeMeshMetricGeometry(m, {
              centerXZ: true,
              zeroBottomY: true,
              upwardNormalBlend: 0.72,
            })
          );
          if (!sharedMat) {
            sharedMat = track((m.material as THREE.MeshStandardMaterial).clone());
            sharedMat.alphaTest = 0.0;
            sharedMat.transparent = false;
            sharedMat.depthWrite = true;
            sharedMat.side = THREE.DoubleSide;
            sharedMat.color.setHex(tintHex);
            sharedMat.roughness = 0.86;
            sharedMat.metalness = 0.0;

            sharedMat.onBeforeCompile = (shader) => {
              shader.uniforms.uTime = sharedUniforms.uTime;
              shader.uniforms.uParticleLightMap = sharedUniforms.uParticleLightMap;
              shader.uniforms.uTerrainSpan = sharedUniforms.uTerrainSpan;

              shader.vertexShader =
                'uniform float uTime;\nvarying vec3 vFolWorld;\n' +
                shader.vertexShader
                  .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
                     float hM = clamp(position.y * 0.9, 0.0, 1.0);
                     transformed.x += sin(uTime * 1.15 + position.z * 2.5) * 0.014 * hM;`
                  )
                  .replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                     #ifdef USE_INSTANCING
                       vFolWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                     #else
                       vFolWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
                     #endif`
                  );

              shader.fragmentShader =
                `uniform sampler2D uParticleLightMap;
                 uniform float uTerrainSpan;
                 varying vec3 vFolWorld;\n` +
                shader.fragmentShader.replace(
                  '#include <emissivemap_fragment>',
                  `#include <emissivemap_fragment>
                   vec2 plUv = clamp(vFolWorld.xz / uTerrainSpan + 0.5, 0.002, 0.998);
                   vec3 pLight = texture2D(uParticleLightMap, plUv).rgb;
                   totalEmissiveRadiance += diffuseColor.rgb * (0.025 + pLight * 1.35);`
                );
            };
          }
          out.push({ geo, mat: sharedMat });
        });
        return out;
      };

      const shrubWildSet = collectBakedFoliage(shrubWildGltf.scene, 0xc8de72);
      const shrubFlowerSet = collectBakedFoliage(shrubFlowerGltf.scene, 0xd4e684);
      const periwinkleSet = collectBakedFoliage(periwinkleGltf.scene, 0xdcd6f6);
      const weedSet = collectBakedFoliage(weedGltf.scene, 0xc2b260);
      await maybeYield();
      if (disposed) return;

      // 1. Central Flowering Briar Mound (`shrub_01` + `shrub_02`) + Flanking Car Bushes
      {
        const allShrubs = [...shrubFlowerSet, ...shrubWildSet];
        if (allShrubs.length > 0) {
          const spots = [
            { v: 0, x: 0.24, z: 0.42, yOff: -0.05, ry: 0.4, sx: 0.95, sy: 0.78 },
            { v: 1, x: 0.65, z: 0.56, yOff: -0.05, ry: 1.7, sx: 1.05, sy: 0.82 },
            { v: 2, x: -0.18, z: 0.34, yOff: -0.05, ry: 2.6, sx: 1.02, sy: 0.78 },
            { v: 3, x: 0.32, z: -0.12, yOff: -0.05, ry: -0.8, sx: 1.12, sy: 0.88 },
            { v: 0, x: 0.86, z: 0.32, yOff: -0.06, ry: 1.1, sx: 0.86, sy: 0.68 },
            { v: 4, x: 0.12, z: 0.74, yOff: -0.07, ry: 2.1, sx: 0.95, sy: 0.68 },
            { v: 2, x: -4.12, z: 2.05, yOff: -0.08, ry: 1.1, sx: 1.02, sy: 0.76 },
            { v: 1, x: 1.72, z: 0.38, yOff: -0.08, ry: -1.4, sx: 1.05, sy: 0.78 },
            { v: 3, x: 3.55, z: 0.65, yOff: -0.08, ry: 0.7, sx: 1.05, sy: 0.78 },
          ];
          for (const sp of spots) {
            const sv = allShrubs[sp.v % allShrubs.length];
            const sm = new THREE.Mesh(sv.geo, sv.mat);
            sm.position.set(sp.x, sampleHeight(sp.x, sp.z) + sp.yOff, sp.z);
            sm.rotation.y = sp.ry;
            sm.scale.set(sp.sx, sp.sy, sp.sx);
            sm.castShadow = true;
            sm.receiveShadow = true;
            group.add(sm);
          }
        }
      }

      // 2. Photoscanned Periwinkle Wildflowers & Fine Leaf Mats (`periwinkle.glb`) across the central mound!
      if (periwinkleSet.length > 0) {
        const pwRng = createSeededRandom(44201);
        const dummy = new THREE.Object3D();
        const perVar = isMobile ? 18 : 32;
        for (let b = 0; b < Math.min(3, periwinkleSet.length); b += 1) {
          const pv = periwinkleSet[b];
          const inst = new THREE.InstancedMesh(pv.geo, pv.mat, perVar);
          inst.receiveShadow = true;
          for (let i = 0; i < perVar; i += 1) {
            const a = pwRng() * Math.PI * 2;
            const r = Math.pow(pwRng(), 0.62) * 1.18;
            const bx = 0.34 + Math.cos(a) * r * 1.08;
            const bz = 0.54 + Math.sin(a) * r * 0.78;
            const dome = Math.max(0, 1.0 - (r / 1.22) * (r / 1.22));
            const by = sampleHeight(bx, bz) - 0.02 + dome * 0.24 * pwRng();
            const s = 1.45 + pwRng() * 1.15;
            dummy.position.set(bx, by, bz);
            dummy.rotation.set(
              (pwRng() - 0.5) * 0.25,
              pwRng() * Math.PI * 2,
              (pwRng() - 0.5) * 0.25
            );
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
          group.add(inst);
        }
      }

      // 3. Delicate Botanical 3D Roses (`rose_blossom.glb`) nestled inside the wild bush!
      roseGltf.scene.position.set(0, 0, 0);
      roseGltf.scene.rotation.set(0, 0, 0);
      roseGltf.scene.scale.set(1, 1, 1);
      roseGltf.scene.updateMatrixWorld(true);

      const roseMeshes: THREE.Mesh[] = [];
      roseGltf.scene.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh) roseMeshes.push(ch as THREE.Mesh);
      });

      if (roseMeshes.length >= 2) {
        const bakedParts = roseMeshes.map((rm) => bakeMeshMetricGeometry(rm));
        let headIdx = 0;
        let smallestSpanY = Infinity;
        bakedParts.forEach((bg, idx) => {
          const bb = bg.boundingBox!;
          const spanY = bb.max.y - bb.min.y;
          if (spanY < smallestSpanY) {
            smallestSpanY = spanY;
            headIdx = idx;
          }
        });

        const fullRoseGeo = track(mergeMetricGeometries(bakedParts, true, true));
        bakedParts.forEach((bg) => bg.dispose());
        const blossomOnlyGeo = track(
          bakeMeshMetricGeometry(roseMeshes[headIdx], { centerXZ: true, zeroBottomY: true })
        );

        const origRoseMat = roseMeshes[headIdx].material as THREE.MeshStandardMaterial;
        const makeRoseMaterial = (pureBlossom: boolean) => {
          const rm = track(origRoseMat.clone());
          rm.color.setHex(0xffffff);
          rm.roughness = 0.86;
          rm.metalness = 0.0;
          rm.alphaTest = 0.0;
          rm.transparent = false;
          rm.side = THREE.DoubleSide;

          rm.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = sharedUniforms.uTime;
            shader.uniforms.uParticleLightMap = sharedUniforms.uParticleLightMap;
            shader.uniforms.uTerrainSpan = sharedUniforms.uTerrainSpan;
            shader.uniforms.uPureBlossom = { value: pureBlossom ? 1.0 : 0.0 };

            shader.vertexShader =
              'attribute vec3 aRoseTint;\nuniform float uTime;\nvarying vec3 vRoseTint;\nvarying vec3 vRoseWorld;\n' +
              shader.vertexShader
                .replace(
                  '#include <begin_vertex>',
                  `#include <begin_vertex>
                   vRoseTint = aRoseTint;
                   float swayH = clamp(position.y * 0.65, 0.0, 1.0);
                   transformed.x += sin(uTime * 1.25 + position.z * 3.1) * 0.014 * swayH;`
                )
                .replace(
                  '#include <worldpos_vertex>',
                  `#include <worldpos_vertex>
                   #ifdef USE_INSTANCING
                     vRoseWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                   #else
                     vRoseWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
                   #endif`
                );

            shader.fragmentShader =
              `uniform sampler2D uParticleLightMap;
               uniform float uTerrainSpan;
               uniform float uPureBlossom;
               varying vec3 vRoseTint;
               varying vec3 vRoseWorld;\n` +
              shader.fragmentShader
                .replace(
                  '#include <map_fragment>',
                  `#include <map_fragment>
                   float petalMask = max(uPureBlossom, smoothstep(0.03, 0.16, diffuseColor.r - diffuseColor.g * 1.02));
                   float texShade = clamp(dot(diffuseColor.rgb, vec3(0.56, 0.28, 0.16)) * 1.48, 0.24, 1.12);
                   vec3 leafBotanical = diffuseColor.rgb * vec3(0.62, 0.84, 0.42);
                   vec3 velvetyPetal = vRoseTint * texShade;
                   diffuseColor.rgb = mix(leafBotanical, velvetyPetal, petalMask);
                   diffuseColor.a = 1.0;`
                )
                .replace(
                  '#include <emissivemap_fragment>',
                  `#include <emissivemap_fragment>
                   vec2 plUv = clamp(vRoseWorld.xz / uTerrainSpan + 0.5, 0.002, 0.998);
                   vec3 pLight = texture2D(uParticleLightMap, plUv).rgb;
                   totalEmissiveRadiance += diffuseColor.rgb * (0.03 + pLight * 1.30);`
                );
          };
          return rm;
        };

        const stemmedRoseMat = makeRoseMaterial(false);
        const blossomRoseMat = makeRoseMaterial(true);

        const roseRng = createSeededRandom(55109);
        const dummy = new THREE.Object3D();
        const tintColor = new THREE.Color();
        const rosePalette = [
          0xa87ce4, // wild periwinkle-lilac (`ref_center_pipe_roses.png`!)
          0xbc96ee, // pale lavender blossom
          0xd47496, // wild briar dusty-rose
          0xb43c64, // muted velvety rose
          0x8e62d4, // nocturnal meadow violet
        ];

        const stemmedCount = isMobile ? 34 : 52;
        const stemmedTints = new Float32Array(stemmedCount * 3);
        fullRoseGeo.setAttribute(
          'aRoseTint',
          new THREE.InstancedBufferAttribute(stemmedTints, 3)
        );
        const stemmedInst = new THREE.InstancedMesh(fullRoseGeo, stemmedRoseMat, stemmedCount);
        stemmedInst.receiveShadow = true;

        for (let i = 0; i < stemmedCount; i += 1) {
          let rx = 0;
          let rz = 0;
          const pick = roseRng();
          if (pick < 0.74) {
            const a = roseRng() * Math.PI * 2;
            const r = Math.pow(roseRng(), 0.62) * 1.12;
            rx = 0.34 + Math.cos(a) * r * 1.08;
            rz = 0.48 + Math.sin(a) * r * 0.76;
          } else if (pick < 0.88) {
            rx = -4.10 + (roseRng() - 0.5) * 0.65;
            rz = 2.05 + (roseRng() - 0.5) * 0.65;
          } else {
            rx = 1.72 + (roseRng() - 0.5) * 0.85;
            rz = 0.55 + (roseRng() - 0.5) * 0.75;
          }

          dummy.position.set(rx, sampleHeight(rx, rz) - 0.02, rz);
          dummy.rotation.set(
            (roseRng() - 0.5) * 0.26,
            roseRng() * Math.PI * 2,
            (roseRng() - 0.5) * 0.26
          );
          dummy.scale.setScalar(0.15 + roseRng() * 0.10);
          dummy.updateMatrix();
          stemmedInst.setMatrixAt(i, dummy.matrix);

          tintColor.setHex(rosePalette[Math.floor(roseRng() * rosePalette.length)]);
          stemmedTints[i * 3] = tintColor.r;
          stemmedTints[i * 3 + 1] = tintColor.g;
          stemmedTints[i * 3 + 2] = tintColor.b;
        }
        stemmedInst.instanceMatrix.needsUpdate = true;
        group.add(stemmedInst);

        const headCount = isMobile ? 52 : 86;
        const headTints = new Float32Array(headCount * 3);
        blossomOnlyGeo.setAttribute(
          'aRoseTint',
          new THREE.InstancedBufferAttribute(headTints, 3)
        );
        const headInst = new THREE.InstancedMesh(blossomOnlyGeo, blossomRoseMat, headCount);
        headInst.receiveShadow = true;

        for (let i = 0; i < headCount; i += 1) {
          const a = roseRng() * Math.PI * 2;
          const r = Math.pow(roseRng(), 0.58) * 1.12;
          const bx = 0.36 + Math.cos(a) * r * 1.08;
          const bz = 0.56 + Math.sin(a) * r * 0.78;
          const dome = Math.max(0, 1.0 - (r / 1.18) * (r / 1.18));
          const by = sampleHeight(bx, bz) + 0.09 + dome * 0.38 * (0.35 + 0.65 * roseRng());

          dummy.position.set(bx, by, bz);
          dummy.rotation.set(
            0.35 + (roseRng() - 0.5) * 0.55,
            roseRng() * Math.PI * 2,
            (roseRng() - 0.5) * 0.50
          );
          dummy.scale.setScalar(0.052 + roseRng() * 0.044);
          dummy.updateMatrix();
          headInst.setMatrixAt(i, dummy.matrix);

          tintColor.setHex(rosePalette[Math.floor(roseRng() * rosePalette.length)]);
          headTints[i * 3] = tintColor.r;
          headTints[i * 3 + 1] = tintColor.g;
          headTints[i * 3 + 2] = tintColor.b;
        }
        headInst.instanceMatrix.needsUpdate = true;
        group.add(headInst);
      }

      // Mount a low, dense mossy wildflower/heather mat strictly on the outer-left front fender corner (`mv_3m28_left_car_door.png`!)
      if (shrubFlowerSet.length > 0) {
        const noseBush = new THREE.Mesh(shrubFlowerSet[0].geo, shrubFlowerSet[0].mat);
        noseBush.position.set(-0.62, 0.78, 1.66).applyMatrix4(leftCarRoot.matrixWorld);
        noseBush.scale.set(0.38, 0.16, 0.38);
        noseBush.rotation.y = 0.8;
        group.add(noseBush);
      }

      /* ====================================================================
         G. ORGANIC EARTHEN ROOF SOD CLODS, CURTAIN CREEPER VINES & GROUND MIST
         ==================================================================== */
      await maybeYield();
      if (disposed) return;
      group.add(
        buildOrganicRoofSodAndWeeds({
          leftCarMatrix: leftCarRoot.matrixWorld,
          rightCarMatrix: rightCarRoot.matrixWorld,
          sampleHeight,
          rustNor,
          disposables,
        })
      );

      await maybeYield();
      if (disposed) return;
      // Authentic Hanging Curtain Creeper Vines (`dây cúc tần rủ`) on BOTH car bodies (clean swung-open door)!
      group.add(
        buildCurtainCreeperVines({
          leftCarMatrix: leftCarRoot.matrixWorld,
          rightCarMatrix: rightCarRoot.matrixWorld,
          uTime: sharedUniforms.uTime,
          disposables,
        })
      );

      await maybeYield();
      if (disposed) return;
      // Ethereal Dreamy Low-Lying Ground Mist (`khói sương lờ mờ ở dưới đất — mơ màng, ảo ảo`)!
      group.add(
        buildDreamyGroundMist({
          sampleHeight,
          uTime: sharedUniforms.uTime,
          uScrollDim: sharedUniforms.uScrollDim,
          disposables,
        })
      );

      // Focused wild weeds (`weed_wild.glb`) strictly around central junkyard pile & right rear bumper underglow!
      if (weedSet.length > 0) {
        const wRng = createSeededRandom(88123);
        const dummy = new THREE.Object3D();
        const weedCount = isMobile ? 22 : 36;
        const wInst = new THREE.InstancedMesh(weedSet[0].geo, weedSet[0].mat, weedCount);
        wInst.receiveShadow = true;
        for (let i = 0; i < weedCount; i += 1) {
          let wx: number;
          let wz: number;
          if (i < Math.floor(weedCount * 0.55)) {
            wx = 2.85 + wRng() * 1.10;
            wz = 1.45 + wRng() * 0.85;
          } else {
            wx = -0.65 + wRng() * 1.65;
            wz = 0.85 + wRng() * 0.95;
          }
          dummy.position.set(wx, sampleHeight(wx, wz) - 0.015, wz);
          dummy.rotation.set(0, wRng() * Math.PI * 2, 0);
          dummy.scale.setScalar(1.25 + wRng() * 0.95);
          dummy.updateMatrix();
          wInst.setMatrixAt(i, dummy.matrix);
        }
        wInst.instanceMatrix.needsUpdate = true;
        group.add(wInst);
      }
      if (!disposed && camera && typeof renderer.compileAsync === 'function') {
        await yieldToMain();
        if (!disposed) {
          try {
            await renderer.compileAsync(scene, camera);
          } catch {
            // Non-fatal fallback to standard lazy shader compile
          }
        }
      }

      if (!disposed) {
        // Freeze static world matrices across the entire sanctuary hierarchy -> zero CPU matrix traversal at 120fps!
        group.updateMatrixWorld(true);
        group.traverse((obj) => {
          obj.matrixAutoUpdate = false;
        });
        group.matrixAutoUpdate = false;

        // Bake static spotlight shadow map once all 3D props have mounted (zero per-frame shadow re-renders!)
        renderer.shadowMap.needsUpdate = true;
        onLoadProgress?.(TOTAL_BOOT_STEPS, TOTAL_BOOT_STEPS, 'SYSTEM READY');
        onReady?.();
      }
    } catch (err) {
      console.error('[buildNocturnalWreckScene] Failed loading 3D sanctuary assets:', err);
      if (!disposed && camera && typeof renderer.compileAsync === 'function') {
        await yieldToMain();
        if (!disposed) {
          try {
            await renderer.compileAsync(scene, camera);
          } catch {
            // Non-fatal fallback to standard lazy shader compile
          }
        }
      }

      if (!disposed) {
        group.updateMatrixWorld(true);
        group.traverse((obj) => {
          obj.matrixAutoUpdate = false;
        });
        group.matrixAutoUpdate = false;

        // Bake static spotlight shadow map once all 3D props have mounted (zero per-frame shadow re-renders!)
        renderer.shadowMap.needsUpdate = true;
        onLoadProgress?.(TOTAL_BOOT_STEPS, TOTAL_BOOT_STEPS, 'SYSTEM READY');
        onReady?.();
      }
    }
  })();

  /* ------------------------------------------------------------------------
     5. Per-Frame Uniform & Practical Light Updates
     ------------------------------------------------------------------------ */
  const updateUniforms = (
    elapsed: number,
    scrollP: number,
    _cameraPos: THREE.Vector3,
    cursorWorld: THREE.Vector3,
    cursorGlow: number
  ) => {
    sharedUniforms.uTime.value = elapsed;
    sharedUniforms.uScrollDim.value = scrollP;

    const dim = clamp(1.0 - scrollP * 0.85, 0.08, 1.0);
    const subtlePulse = 0.96 + 0.04 * Math.sin(elapsed * 2.1);

    hemiFill.intensity = baseLightIntensities.hemi * dim;
    clearingSpot.intensity = baseLightIntensities.clearing * dim;
    frontMeadowSpot.intensity = baseLightIntensities.frontMeadow * dim;

    engineBlueLight.intensity = baseLightIntensities.engineBlue * subtlePulse * dim;
    wheelRedLight.intensity = baseLightIntensities.wheelRed * dim;
    cabinRedLight.intensity = baseLightIntensities.cabinRed * dim;
    rightCabinGreenLight.intensity = baseLightIntensities.rightGreen * dim;
    rightUnderglowBlueLight.intensity =
      baseLightIntensities.rightBlue * (0.95 + 0.05 * Math.cos(elapsed * 1.7)) * dim;
    pipeCyanLight.intensity = baseLightIntensities.pipeCyan * dim;

    cursorLight.position.set(cursorWorld.x, cursorWorld.y + 0.35, cursorWorld.z);
    cursorLight.intensity = cursorGlow * 3.8 * dim;
  };

  const dispose = () => {
    disposed = true;
    if (scene.environment) {
      scene.environment = null;
    }
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mt) => mt.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    disposables.forEach((d) => d.dispose());
  };

  return {
    group,
    clearingSpot,
    practicalPositions: {
      leftRed: wheelRedLight.position,
      rightGreen: rightCabinGreenLight.position,
      rightBlue: rightUnderglowBlueLight.position,
      pipeCyan: pipeCyanLight.position,
    },
    ready,
    updateUniforms,
    dispose,
  };
}

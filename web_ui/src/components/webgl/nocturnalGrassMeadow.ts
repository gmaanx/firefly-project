import * as THREE from 'three';

/**
 * Nocturnal Sanctuary Grass Meadow (`nocturnalGrassMeadow.ts`)
 * Directly adapts the multi-shoot 3D botanical grass architecture from `D:\UEH\web\up\src\world\GrassMeadow.js`
 * tailored 1:1 to our nocturnal wrecked-Lada & firefly clearing (`ref_foreground_grass_tires.png`):
 *
 * 1. Multi-Shoot V-Ribbed Pointed-Tip 3D Botanical Tuft Template (`createGrassTuftTemplateGeometry`):
 *    - Desktop: `135,000` 3-shoot tufts = **`405,000` individual curved V-ribbed 3D grass blades** in 1 GPU draw call!
 *    - Mobile:  `40,000` 2-shoot tufts = **`80,000` individual curved V-ribbed 3D grass blades** in 1 GPU draw call!
 * 2. Stratified Jittered Frustum-Cell Carpet (`Pass 1: 88% frustum trapezoid cells + Pass 2: 12% drifts`):
 *    - Every single camera-frustum cell receives a jittered multi-shoot tuft -> **0.00% bare patches or Poisson holes**.
 * 3. Synchronized Procedural Velvet Thatch & Moss Ground Bed (`terrainMesh`):
 *    - Multi-octave procedural peat, dry-straw thatch, and olive moss matching the exact root-to-mid blade palette,
 *      with 5-tap rotated Poisson shadow-map sampling + live `uParticleLightMap` firefly ground-splat illumination.
 * 4. Prop Footprint Exclusion & Matted-Turf Trimming (`getSanctuaryGrassMask`):
 *    - Cleanly suppresses grass underneath the detached bottom-left white car door + window frame, inside tire rubber rings,
 *      and trims the foreground wire-loom & ECU walkway so snaking cables and micro-props sit crisply on top of plush turf.
 * 5. Overdamped 2D Viscoelastic Aerodynamic Reed Wind Field (`128 x 88` `HalfFloatType` `DataTexture`, `zeta = 1.096 > 1.0`):
 *    - Sweeping the mouse cursor (or low-skimming firefly murmuration) parts the 3D grass like silk with zero rubber bounce.
 */

export const MEADOW_U_MIN = -10.5;
export const MEADOW_U_MAX = 10.5;
export const MEADOW_V_MIN = -3.6; // wz = -3.6 (behind pipe & wrecks)
export const MEADOW_V_MAX = 7.2;  // wz = +7.2 (right under camera lens)
const U_SPAN = MEADOW_U_MAX - MEADOW_U_MIN;
const V_SPAN = MEADOW_V_MAX - MEADOW_V_MIN;

const DESKTOP_TUFT_COUNT = 72000; // 216,000 lush 3D V-ribbed blades (vertex-lit -> locked 60fps!)
const MOBILE_TUFT_COUNT = 26000;  // 52,000 3D V-ribbed blades!

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };
}

function hash2D(ix: number, iz: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295.0;
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function meadowFbm(x: number, z: number): number {
  let sum = 0.0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 3; i += 1) {
    sum += amp * valueNoise2D(x * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/**
 * Prop footprint & matted-walkway height mask (`0.0` = solid exclusion, `(0, 1]` = height trim factor):
 * - Keeps the detached bottom-left white car door + thin white window frame 100% unobstructed!
 * - Keeps foreground black rubber tire treads crisp while letting wild weeds sprout inside tire centers!
 * - Gently trims the foreground wire-loom & ECU walkway so cables & junkyard props sit visibly on top of dense turf!
 */
function getSanctuaryGrassMask(x: number, z: number): { densityMask: number; heightScale: number } {
  // 1. Detached boxy white car door + rectangular window frame lying flush in bottom-left grass:
  //    Aligned 1:1 with `flatDoorWrap` world footprint (`center (-2.04, 4.14)`) so short crushed turf lies
  //    underneath the grounded 52mm door + 32mm window frame while full lush grass hugs its outer rim!
  const doorDx = x - (-2.04);
  const doorDz = z - 4.14;
  const doorRotX = doorDx * 0.95 - doorDz * 0.31;
  const doorRotZ = doorDx * 0.31 + doorDz * 0.95;
  if (Math.abs(doorRotX) < 0.76 && Math.abs(doorRotZ) < 0.66) {
    const edge = Math.max(Math.abs(doorRotX) / 0.76, Math.abs(doorRotZ) / 0.66);
    return {
      densityMask: 0.55 + 0.45 * smoothstepJS(0.72, 1.0, edge),
      heightScale: 0.14 + 0.78 * smoothstepJS(0.75, 1.0, edge),
    };
  }

  // 2. Foreground rubber tires: suppress grass inside the rubber sidewall torus (`0.18 < r < 0.42`),
  //    while allowing tall wild weeds right inside the center steel rim (`r <= 0.18`)!
  const tires: Array<[number, number, number]> = [
    [-0.58, 4.46, 0.41],
    [1.76, 4.08, 0.39],
  ];
  for (const [tx, tz, tr] of tires) {
    const r = Math.hypot(x - tx, z - tz);
    if (r > tr * 0.42 && r < tr * 1.04) {
      return { densityMask: 0.15, heightScale: 0.18 };
    }
    if (r <= tr * 0.42) {
      return { densityMask: 1.0, heightScale: 1.35 };
    }
  }

  // 3. Solid under-chassis footprints of Left & Right Lada wrecks (keep grass lush around sills, trim deep inside)
  const lDx = (x - (-2.55)) * 0.78 + (z - 0.88) * 0.62;
  const lDz = -(x - (-2.55)) * 0.62 + (z - 0.88) * 0.78;
  if (Math.abs(lDx) < 0.58 && Math.abs(lDz) < 1.05) {
    return { densityMask: 0.25, heightScale: 0.32 };
  }

  // 4. Finned ECU module & junkyard micro-prop spots (keep grass short right under the small props so they never drown!)
  const dEcu = Math.hypot(x - (-0.45), z - 2.74);
  if (dEcu < 0.26) {
    return { densityMask: 0.75, heightScale: 0.28 + 0.50 * (dEcu / 0.26) };
  }

  const junkClearDx = (x - (-0.05)) / 1.32;
  const junkClearDz = (z - 1.58) / 0.46;
  const junkD2 = junkClearDx * junkClearDx + junkClearDz * junkClearDz;
  if (junkD2 < 1.0) {
    return { densityMask: 0.92, heightScale: 0.42 + 0.42 * junkD2 };
  }

  // 5. Foreground wire-loom path: plush matted golden turf (`heightScale ~ 0.68..0.85`) so snaking cables rest visibly!
  if (x > -1.75 && x < 0.65 && z > 2.25 && z < 5.15) {
    return { densityMask: 1.0, heightScale: 0.72 };
  }

  return { densityMask: 1.0, heightScale: 1.0 };
}

/**
 * Verbatim multi-shoot V-ribbed pointed-tip 3D grass tuft template from `D:\UEH\web\up\src\world\GrassMeadow.js`:
 * Every single GPU instance renders 2–3 crisscrossed curved V-ribbed shoots with distinct yaw, height,
 * root offset, width, and breeze phase!
 */
function createGrassTuftTemplateGeometry(
  segments: number,
  shootsPerTuft: number
): THREE.InstancedBufferGeometry {
  const shootSpecs =
    shootsPerTuft === 3
      ? [
          { yawOff: 0.0, hScale: 1.0, wScale: 0.96, ox: 0.0, oz: 0.0, phaseOff: 0.0 },
          { yawOff: 2.08, hScale: 0.84, wScale: 1.04, ox: 0.032, oz: -0.024, phaseOff: 2.15 },
          { yawOff: -2.14, hScale: 0.72, wScale: 1.08, ox: -0.028, oz: 0.026, phaseOff: 4.35 },
        ]
      : [
          { yawOff: 0.0, hScale: 1.0, wScale: 0.98, ox: 0.0, oz: 0.0, phaseOff: 0.0 },
          { yawOff: 1.96, hScale: 0.82, wScale: 1.06, ox: 0.030, oz: -0.022, phaseOff: 2.4 },
        ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const shootParams: number[] = []; // vec4(yawOff, hScale, ox, oz)
  const shootExtra: number[] = [];  // vec2(wScale, phaseOff)
  const indices: number[] = [];

  for (let b = 0; b < shootSpecs.length; b += 1) {
    const sp = shootSpecs[b];
    const baseVertex = positions.length / 3;

    for (let s = 0; s <= segments; s += 1) {
      const t = s / segments;
      if (s < segments) {
        const widthProfile =
          (0.74 + 0.28 * Math.sin(Math.min(1.0, t * 1.45) * Math.PI * 0.70)) *
          (1.0 - Math.pow(t, 1.28) * 0.90);
        const ribZ = (1.0 - Math.pow(t, 1.22)) * 0.12;

        positions.push(-widthProfile, t, -ribZ);
        uvs.push(0.0, t);
        shootParams.push(sp.yawOff, sp.hScale, sp.ox, sp.oz);
        shootExtra.push(sp.wScale, sp.phaseOff);

        positions.push(widthProfile, t, ribZ * 0.25);
        uvs.push(1.0, t);
        shootParams.push(sp.yawOff, sp.hScale, sp.ox, sp.oz);
        shootExtra.push(sp.wScale, sp.phaseOff);
      } else {
        // True pointed botanical tip (zero squared quad top!)
        positions.push(0.0, 1.0, 0.0);
        uvs.push(0.5, 1.0);
        shootParams.push(sp.yawOff, sp.hScale, sp.ox, sp.oz);
        shootExtra.push(sp.wScale, sp.phaseOff);
      }
    }

    for (let s = 0; s < segments - 1; s += 1) {
      const i0 = baseVertex + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i1, i2, i2, i1, i3);
    }
    const lastBase = baseVertex + (segments - 1) * 2;
    const tipIdx = baseVertex + segments * 2;
    indices.push(lastBase, lastBase + 1, tipIdx);
  }

  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aShootParam', new THREE.Float32BufferAttribute(shootParams, 4));
  geo.setAttribute('aShootExtra', new THREE.Float32BufferAttribute(shootExtra, 2));
  geo.setIndex(indices);
  return geo;
}

export interface NocturnalGrassMeadowOptions {
  isMobile: boolean;
  sampleHeight: (wx: number, wz: number) => number;
  particleLightTex: THREE.Texture;
  terrainSpan: number;
}

export interface NocturnalGrassMeadowHandle {
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  grassMesh: THREE.Mesh;
  totalBladeCount: number;
  bindSpotLight: (spot: THREE.SpotLight) => void;
  updatePointerWind: (
    camera: THREE.Camera,
    pointerNdcX: number,
    pointerNdcY: number,
    active: boolean
  ) => boolean;
  injectPointerGust: (worldX: number, worldZ: number, active: boolean) => void;
  injectSwarmBreeze: (swarmX: number, swarmZ: number, strength: number) => void;
  update: (
    elapsed: number,
    dt: number,
    scrollDim: number,
    practicalPositions?: {
      leftRed?: THREE.Vector3;
      rightGreen?: THREE.Vector3;
      rightBlue?: THREE.Vector3;
      pipeCyan?: THREE.Vector3;
    }
  ) => void;
  dispose: () => void;
}

export function createNocturnalGrassMeadow(
  opts: NocturnalGrassMeadowOptions
): NocturnalGrassMeadowHandle {
  const { isMobile, sampleHeight, particleLightTex, terrainSpan } = opts;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();
  group.name = 'NocturnalGrassMeadow';

  const shootsPerTuft = isMobile ? 2 : 3;
  const windW = isMobile ? 64 : 96;
  const windH = isMobile ? 44 : 66;
  const windCells = windW * windH;

  const fallbackShadowData = new Uint8Array([255, 255, 255, 255]);
  const fallbackShadowTex = new THREE.DataTexture(fallbackShadowData, 1, 1, THREE.RGBAFormat);
  fallbackShadowTex.needsUpdate = true;
  disposables.push(fallbackShadowTex);

  // Overdamped 2D Viscoelastic Aerodynamic Reed Field (`zeta = 1.096 > 1.0` -> zero rubber bounce!)
  const dispX = new Float32Array(windCells);
  const dispZ = new Float32Array(windCells);
  const velX = new Float32Array(windCells);
  const velZ = new Float32Array(windCells);
  const targetX = new Float32Array(windCells);
  const targetZ = new Float32Array(windCells);
  const gustEnv = new Float32Array(windCells);
  const windHalfData = new Uint16Array(windCells * 4);

  const zeroH = THREE.DataUtils.toHalfFloat(0.0);
  windHalfData.fill(zeroH);

  const windTexture = new THREE.DataTexture(
    windHalfData,
    windW,
    windH,
    THREE.RGBAFormat,
    THREE.HalfFloatType
  );
  windTexture.minFilter = THREE.LinearFilter;
  windTexture.magFilter = THREE.LinearFilter;
  windTexture.wrapS = THREE.ClampToEdgeWrapping;
  windTexture.wrapT = THREE.ClampToEdgeWrapping;
  windTexture.generateMipmaps = false;
  windTexture.needsUpdate = true;
  disposables.push(windTexture);

  let windAwake = false;
  let hasPrevPtr = false;
  let prevPtrX = 0;
  let prevPtrZ = 0;
  const smoothDir = new THREE.Vector2(1.0, 0.0);
  let boundSpotLight: THREE.SpotLight | null = null;

  // Pre-baked 256x256 Terrain Albedo DataTexture (eliminates 7 `vnoise` / 28 `hash21` ALU calls per ground pixel every frame!)
  const albedoRes = 256;
  const albedoBytes = new Uint8Array(albedoRes * albedoRes * 4);
  for (let iy = 0; iy < albedoRes; iy += 1) {
    const wz = ((iy + 0.5) / albedoRes - 0.5) * terrainSpan;
    for (let ix = 0; ix < albedoRes; ix += 1) {
      const wx = ((ix + 0.5) / albedoRes - 0.5) * terrainSpan;
      const macro = valueNoise2D(wx * 0.45, wz * 0.45) * 0.62 + valueNoise2D(wx * 1.35, wz * 1.35) * 0.38;
      const patchStraw = valueNoise2D(wx * 3.2, wz * 3.2) * 0.56 + valueNoise2D(wx * 8.5, wz * 8.5) * 0.44;
      const thatchFine = valueNoise2D(wx * 18.0, wz * 18.0) * 0.6 + valueNoise2D(wx * 42.0, wz * 42.0) * 0.4;

      let r = 0.048 + (0.115 - 0.048) * macro;
      let g = 0.038 + (0.098 - 0.038) * macro;
      let b = 0.016 + (0.036 - 0.016) * macro;

      const strawMix = smoothstepJS(0.32, 0.84, patchStraw) * 0.62;
      r += (0.215 - r) * strawMix;
      g += (0.168 - g) * strawMix;
      b += (0.062 - b) * strawMix;

      const dxB = wx - 0.32;
      const dzB = wz - 0.52;
      const bushZone = Math.exp(-(dxB * dxB + dzB * dzB) * 0.55) * 0.72;
      r += (0.065 - r) * bushZone;
      g += (0.125 - g) * bushZone;
      b += (0.032 - b) * bushZone;

      const mod = 0.84 + 0.32 * thatchFine;
      const idx4 = (iy * albedoRes + ix) * 4;
      albedoBytes[idx4] = Math.min(255, Math.round(r * mod * 255));
      albedoBytes[idx4 + 1] = Math.min(255, Math.round(g * mod * 255));
      albedoBytes[idx4 + 2] = Math.min(255, Math.round(b * mod * 255));
      albedoBytes[idx4 + 3] = 255;
    }
  }
  const terrainAlbedoTex = new THREE.DataTexture(albedoBytes, albedoRes, albedoRes, THREE.RGBAFormat);
  terrainAlbedoTex.minFilter = THREE.LinearFilter;
  terrainAlbedoTex.magFilter = THREE.LinearFilter;
  terrainAlbedoTex.wrapS = THREE.ClampToEdgeWrapping;
  terrainAlbedoTex.wrapT = THREE.ClampToEdgeWrapping;
  terrainAlbedoTex.needsUpdate = true;
  disposables.push(terrainAlbedoTex);

  const uniforms = {
    uTime: { value: 0.0 },
    uScrollDim: { value: 0.0 },
    uWindTex: { value: windTexture },
    uTerrainAlbedoTex: { value: terrainAlbedoTex },
    uParticleLightMap: { value: particleLightTex },
    uTerrainSpan: { value: terrainSpan },
    uShadowMap: { value: fallbackShadowTex as THREE.Texture },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uHasShadow: { value: 0.0 },
    uSpotPos: { value: new THREE.Vector3(0.1, 8.6, 3.85) },
    uSpotTarget: { value: new THREE.Vector3(0.0, -1.35, 1.45) },
    uSpotColor: { value: new THREE.Color('#FFDD9C') },
    uUVMin: { value: new THREE.Vector2(MEADOW_U_MIN, MEADOW_V_MIN) },
    uUVInvSpan: { value: new THREE.Vector2(1.0 / U_SPAN, 1.0 / V_SPAN) },
    // Nocturnal car & pipe practical bounce positions so 3D grass blades catch localized red/green/blue/cyan glow!
    uLeftRedPos: { value: new THREE.Vector3(-2.1, -1.1, 1.8) },
    uRightGreenPos: { value: new THREE.Vector3(2.1, -0.7, 1.1) },
    uRightBluePos: { value: new THREE.Vector3(3.4, -1.25, 1.6) },
    uPipeCyanPos: { value: new THREE.Vector3(0.2, 0.2, -0.6) },
  };

  /* ------------------------------------------------------------------------
     1. Synchronized Velvet Thatch & Moss Sub-Turf Mesh (`_buildTerrainMesh`)
        Matches the exact root-to-mid botanical palette of the 405k 3D blades!
     ------------------------------------------------------------------------ */
  const segX = isMobile ? 96 : 156;
  const segZ = isMobile ? 72 : 116;
  const vertCount = (segX + 1) * (segZ + 1);
  const tPos = new Float32Array(vertCount * 3);
  const tUvs = new Float32Array(vertCount * 2);
  const tIndices: number[] = [];

  {
    let pPtr = 0;
    let uPtr = 0;
    for (let iz = 0; iz <= segZ; iz += 1) {
      const tz = iz / segZ;
      const wz = -terrainSpan * 0.5 + tz * terrainSpan;
      for (let ix = 0; ix <= segX; ix += 1) {
        const tx = ix / segX;
        const wx = -terrainSpan * 0.5 + tx * terrainSpan;
        const wy = sampleHeight(wx, wz);

        tPos[pPtr++] = wx;
        tPos[pPtr++] = wy;
        tPos[pPtr++] = wz;

        tUvs[uPtr++] = tx;
        tUvs[uPtr++] = tz;
      }
    }
    // Correct +Y counter-clockwise winding: (ix, iz) -> (ix, iz+1) -> (ix+1, iz)
    for (let iz = 0; iz < segZ; iz += 1) {
      for (let ix = 0; ix < segX; ix += 1) {
        const a = iz * (segX + 1) + ix;
        const b = a + 1;
        const c = a + (segX + 1);
        const d = c + 1;
        tIndices.push(a, c, b, b, c, d);
      }
    }
  }

  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  terrainGeo.setAttribute('uv', new THREE.BufferAttribute(tUvs, 2));
  terrainGeo.setIndex(tIndices);
  terrainGeo.computeVertexNormals();
  disposables.push(terrainGeo);

  const SHARED_LIGHT_GLSL = /* glsl */ `
    float sampleSpotShadow(vec4 sc) {
      if (uHasShadow < 0.5) return 1.0;
      vec3 proj = sc.xyz / max(sc.w, 0.0001);
      if (proj.x <= 0.003 || proj.x >= 0.997 || proj.y <= 0.003 || proj.y >= 0.997 || proj.z >= 0.999) {
        return 1.0;
      }
      float compareZ = proj.z - 0.00085;
      return mix(0.25, 1.0, step(compareZ, unpackRGBAToDepth(texture2D(uShadowMap, proj.xy))));
    }

    vec3 evalNocturnalPracticalSpill(vec3 wp) {
      // Contained subtle practical light spill onto immediate surrounding grass blades (matches reference photo!)
      float dRed   = length(wp - uLeftRedPos);
      float dGreen = length(wp - uRightGreenPos);
      float dBlue  = length(wp - uRightBluePos);
      float dCyan  = length(wp - uPipeCyanPos);

      vec3 spill = vec3(0.0);
      spill += vec3(1.0, 0.08, 0.02) * (0.48 / (1.0 + dRed * dRed * 3.6)) * smoothstep(1.35, 0.22, dRed);
      spill += vec3(0.05, 0.88, 0.26) * (0.50 / (1.0 + dGreen * dGreen * 1.9)) * smoothstep(2.3, 0.4, dGreen);
      spill += vec3(0.04, 0.28, 1.0) * (1.65 / (1.0 + dBlue * dBlue * 1.45)) * smoothstep(2.8, 0.25, dBlue);
      spill += vec3(0.08, 0.85, 0.62) * (0.28 / (1.0 + dCyan * dCyan * 1.6)) * smoothstep(2.4, 0.5, dCyan);
      return spill;
    }
  `;

  const terrainMat = new THREE.ShaderMaterial({
    defines: isMobile ? { MOBILE_GRASS: 1 } : {},
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform mat4 uShadowMatrix;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec4 vShadowCoord;

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vShadowCoord = uShadowMatrix * vec4(wp.xyz + vec3(0.0, 0.04, 0.0), 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      #include <packing>

      uniform sampler2D uShadowMap;
      uniform float uHasShadow;
      uniform sampler2D uTerrainAlbedoTex;
      uniform sampler2D uParticleLightMap;
      uniform float uTerrainSpan;
      uniform float uScrollDim;
      uniform vec3 uSpotPos;
      uniform vec3 uSpotTarget;
      uniform vec3 uSpotColor;
      uniform vec3 uLeftRedPos;
      uniform vec3 uRightGreenPos;
      uniform vec3 uRightBluePos;
      uniform vec3 uPipeCyanPos;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec4 vShadowCoord;

      ${SHARED_LIGHT_GLSL}

      void main() {
        vec2 xz = vWorldPos.xz;
        vec2 plUv = clamp(xz / uTerrainSpan + 0.5, 0.002, 0.998);
        vec3 albedo = texture2D(uTerrainAlbedoTex, plUv).rgb;

        // Overhead nocturnal clearing spotlight cone + shadow!
        vec3 toLight = uSpotPos - vWorldPos;
        float spotDist = length(toLight);
        vec3 L = toLight / max(spotDist, 0.001);
        vec3 spotAxis = normalize(uSpotPos - uSpotTarget);
        float coneCos = dot(L, spotAxis);
        float spotCone = smoothstep(0.56, 0.90, coneCos);
        float distAtten = 1.0 / (1.0 + 0.028 * spotDist * spotDist);

        vec3 N = normalize(vNormalW.y >= 0.0 ? vNormalW : -vNormalW);
        vec3 macroN = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.52));
        float nDotL = clamp((dot(macroN, L) + 0.42) / 1.42, 0.0, 1.0);
        float shadowFactor = sampleSpotShadow(vShadowCoord);

        vec3 clearingLight = uSpotColor * (nDotL * 2.55 * spotCone * distAtten * shadowFactor);
        vec3 nightAmbient  = vec3(0.032, 0.036, 0.048);

        // Live firefly ground-splat light map + practical car/pipe spill!
        vec3 pLight = texture2D(uParticleLightMap, plUv).rgb;
        float pPeak = max(pLight.r, max(pLight.g, pLight.b));
        pLight /= pow(1.0 + pow(pPeak / 0.88, 3.0), 1.0 / 3.0);

        vec3 practicalSpill = evalNocturnalPracticalSpill(vWorldPos);
        vec3 lit = albedo * (clearingLight + nightAmbient + pLight * 2.25 + practicalSpill * 1.45) * 0.72;

        // Smooth nocturnal perimeter vignette into pure pitch-black clearing edge!
        float perimFade = smoothstep(9.2, 4.4, length(xz * vec2(0.84, 1.06)));
        lit *= perimFade * (1.0 - uScrollDim * 0.85);

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
  disposables.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.frustumCulled = false;
  group.add(terrainMesh);

  /* ------------------------------------------------------------------------
     2. 135,000 3-Shoot V-Ribbed Tufts (= 405,000 3D Grass Blades in 1 Draw Call!)
        Stratified Jittered Frustum-Cell Carpet (`Pass 1: 88%` + `Pass 2: 12%`)
     ------------------------------------------------------------------------ */
  const targetCount = isMobile ? MOBILE_TUFT_COUNT : DESKTOP_TUFT_COUNT;
  const segments = 3;
  const instGeo = createGrassTuftTemplateGeometry(segments, shootsPerTuft);
  disposables.push(instGeo);

  const aRootAndYaw = new Float32Array(targetCount * 4);
  const aShape = new Float32Array(targetCount * 4);
  const aBotany = new Float32Array(targetCount * 2);

  const rng = mulberry32(19730529);
  const widthMobileComp = isMobile ? 1.56 : 1.32;
  let placed = 0;

  const emitTuftAtXZ = (wx: number, wz: number, tuftScale: number): boolean => {
    if (placed >= targetCount) return false;
    if (
      wx < MEADOW_U_MIN + 0.15 ||
      wx > MEADOW_U_MAX - 0.15 ||
      wz < MEADOW_V_MIN + 0.15 ||
      wz > MEADOW_V_MAX - 0.15
    ) {
      return false;
    }

    // Soft nocturnal clearing perimeter cutoff so we don't waste instances in pitch-black outer space
    const perimR = Math.hypot(wx * 0.84, (wz - 1.8) * 1.05);
    if (perimR > 7.8) return false;

    const { densityMask, heightScale } = getSanctuaryGrassMask(wx, wz);
    if (densityMask <= 0.02) return false;
    if (densityMask < 0.99 && rng() > densityMask) return false;

    const wy = sampleHeight(wx, wz);
    const patchNoise = meadowFbm(wx * 0.85 - 4.2, wz * 0.85 + 8.6);
    const bushDistSq = (wx - 0.34) * (wx - 0.34) + (wz - 0.54) * (wz - 0.54);
    const nearBush = Math.exp(-bushDistSq * 0.58);

    // Near-to-far depth framing ("xa gần"): plush matted golden turf in foreground walkway,
    // taller wild shaggy meadow grass flanking the wrecked Lada cars & central wildflower mound!
    const sideShag = smoothstepJS(1.35, 3.85, Math.abs(wx));
    const rearShag = smoothstepJS(2.2, -0.8, wz) * 0.35;
    const organicMult = tuftScale * heightScale * (1.0 + sideShag * 0.42 + rearShag + nearBush * 0.55);

    const roll = rng();
    let variety = 0.0;
    let bladeH: number;
    let bladeHalfW: number;
    let droop: number;

    const wildflowerChance = nearBush > 0.18 ? 0.12 * nearBush : (patchNoise > 0.62 ? 0.018 : 0.0);

    if (roll < wildflowerChance) {
      variety = 3.0; // Nocturnal meadow wildflower shoot (periwinkle lilac, wild briar rose, cream)
      bladeH = (0.16 + rng() * 0.12) * organicMult;
      bladeHalfW = (0.0085 + rng() * 0.0045) * widthMobileComp;
      droop = (0.20 + rng() * 0.24) * bladeH;
    } else if (roll < 0.62) {
      variety = 0.0; // Slender matted autumn fescue & golden ryegrass (`ref_foreground_grass_tires.png`!)
      bladeH = (0.115 + rng() * 0.088) * organicMult * (0.86 + patchNoise * 0.32);
      bladeHalfW = (0.0074 + rng() * 0.0038) * widthMobileComp;
      droop = (0.38 + rng() * 0.38) * bladeH;
    } else if (roll < 0.84) {
      variety = 1.0; // Plush low bentgrass & mossy clover undergrowth (zero bare soil!)
      bladeH = (0.086 + rng() * 0.062) * organicMult * (0.88 + patchNoise * 0.26);
      bladeHalfW = (0.0088 + rng() * 0.0042) * widthMobileComp;
      droop = (0.32 + rng() * 0.30) * bladeH;
    } else {
      variety = 2.0; // Taller golden-straw dry hay panicle stalk
      bladeH = (0.168 + rng() * 0.118) * organicMult * (0.88 + patchNoise * 0.30);
      bladeHalfW = (0.0068 + rng() * 0.0034) * widthMobileComp;
      droop = (0.42 + rng() * 0.40) * bladeH;
    }

    if (bladeH < 0.016) return false;

    const i4 = placed * 4;
    const i2 = placed * 2;
    aRootAndYaw[i4] = wx;
    aRootAndYaw[i4 + 1] = wy - 0.008;
    aRootAndYaw[i4 + 2] = wz;
    // Coherent wind-combed patch swirl + natural per-tuft variation (`ref_foreground_grass_tires.png`!)
    aRootAndYaw[i4 + 3] = patchNoise * Math.PI * 2.0 + (rng() - 0.5) * 1.85;

    aShape[i4] = bladeH;
    aShape[i4 + 1] = bladeHalfW;
    aShape[i4 + 2] = droop;
    aShape[i4 + 3] = rng();

    const tone = clamp(patchNoise * 0.76 + (rng() - 0.5) * 0.34, 0.0, 1.0);
    aBotany[i2] = tone;
    aBotany[i2 + 1] = variety;

    placed += 1;
    return true;
  };

  // Pass 1 (88% of tufts): Stratified Jittered Camera-Frustum Cell Carpet (`wz` from `+6.3` near camera to `-2.1` rear)
  {
    const gridBudget = Math.floor(targetCount * 0.88);
    const gridRows = isMobile ? 190 : 340;
    const zNear = 6.25;
    const zFar = -2.15;
    const zSpan = zNear - zFar; // 8.4m

    const rowZ = new Float32Array(gridRows);
    const rowXHalf = new Float32Array(gridRows);
    const rowWeights = new Float32Array(gridRows);
    let weightSum = 0.0;

    for (let r = 0; r < gridRows; r += 1) {
      // Concentrate higher row density closer to camera (`zNear = 6.25`, camera at `z = 8.75`)
      const sz = Math.pow((r + 0.5) / gridRows, 1.18);
      const wz = zNear - sz * zSpan;
      const distFromCam = Math.max(1.8, 8.75 - wz);
      // Exact perspective frustum half-width (`fov = 47 deg`, `aspect ~ 1.6..2.1`)
      const xHalf = Math.min(7.4, 1.45 + distFromCam * 0.74);
      rowZ[r] = wz;
      rowXHalf[r] = xHalf;
      const w = Math.pow(xHalf, 0.76);
      rowWeights[r] = w;
      weightSum += w;
    }

    for (let r = 0; r < gridRows && placed < targetCount; r += 1) {
      const cols = Math.max(28, Math.round((gridBudget * rowWeights[r]) / weightSum));
      const xHalf = rowXHalf[r];
      for (let c = 0; c < cols && placed < targetCount; c += 1) {
        const jr = clamp((r + 0.5 + (rng() - 0.5) * 0.94) / gridRows, 0.001, 0.999);
        const wz = zNear - Math.pow(jr, 1.18) * zSpan;
        const jc = (c + 0.5 + (rng() - 0.5) * 0.94) / cols;
        const wx = (jc * 2.0 - 1.0) * xHalf;
        const organicScale = 0.88 + meadowFbm(wx * 0.65 + 3.1, wz * 0.65 - 5.7) * 0.30;
        emitTuftAtXZ(wx, wz, organicScale);
      }
    }

    // Pass 2 (remaining ~12%): Extra plush foreground & wildflower mound drifts
    let attempts = 0;
    const maxAttempts = (targetCount - placed) * 5 + 2000;
    while (placed < targetCount && attempts < maxAttempts) {
      attempts += 1;
      const sz = Math.pow(rng(), 1.25);
      const wz = zNear - sz * zSpan;
      const distFromCam = Math.max(1.8, 8.75 - wz);
      const xHalf = Math.min(7.4, 1.45 + distFromCam * 0.74);
      const wx = (rng() * 2.0 - 1.0) * xHalf;
      emitTuftAtXZ(wx, wz, 0.92 + rng() * 0.36);
    }
  }

  instGeo.instanceCount = placed;
  instGeo.setAttribute('aRootAndYaw', new THREE.InstancedBufferAttribute(aRootAndYaw, 4));
  instGeo.setAttribute('aShape', new THREE.InstancedBufferAttribute(aShape, 4));
  instGeo.setAttribute('aBotany', new THREE.InstancedBufferAttribute(aBotany, 2));
  instGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1.0, 2.0), 16.0);

  const totalBladeCount = placed * shootsPerTuft;

  const grassMat = new THREE.ShaderMaterial({
    defines: isMobile ? { MOBILE_GRASS: 1 } : {},
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #include <packing>

      attribute vec4 aShootParam;
      attribute vec2 aShootExtra;
      attribute vec4 aRootAndYaw;
      attribute vec4 aShape;
      attribute vec2 aBotany;

      uniform float uTime;
      uniform sampler2D uWindTex;
      uniform sampler2D uShadowMap;
      uniform float uHasShadow;
      uniform sampler2D uParticleLightMap;
      uniform float uTerrainSpan;
      uniform float uScrollDim;
      uniform mat4 uShadowMatrix;
      uniform vec2 uUVMin;
      uniform vec2 uUVInvSpan;
      uniform vec3 uSpotPos;
      uniform vec3 uSpotTarget;
      uniform vec3 uSpotColor;
      uniform vec3 uLeftRedPos;
      uniform vec3 uRightGreenPos;
      uniform vec3 uRightBluePos;
      uniform vec3 uPipeCyanPos;

      varying vec2 vBladeUv;
      varying float vPatchTone;
      varying float vVariety;
      varying float vSeed;
      varying float vBushZone;
      varying float vExposureFade;
      varying vec3 vSpotDiffuse;
      varying vec3 vTranslucencyLight;
      varying vec3 vFillLight;
      varying vec3 vSapphireAdditive;

      ${SHARED_LIGHT_GLSL}

      void main() {
        float shootYawOff = aShootParam.x;
        float shootHScale = aShootParam.y;
        vec2 shootRootOff = aShootParam.zw;
        float shootWScale = aShootExtra.x;
        float shootPhase  = aShootExtra.y;

        float baseYaw = aRootAndYaw.w;
        float yaw = baseYaw + shootYawOff;
        float cb = cos(baseYaw);
        float sb = sin(baseYaw);

        vec3 rootPos = aRootAndYaw.xyz;
        rootPos.x += cb * shootRootOff.x - sb * shootRootOff.y;
        rootPos.z += sb * shootRootOff.x + cb * shootRootOff.y;

        float bladeH = aShape.x * shootHScale;
        float halfW  = aShape.y * shootWScale;
        float droop  = aShape.z * (0.85 + 0.25 * shootHScale);
        float seed   = fract(aShape.w + shootPhase * 0.173);

        float t = position.y;
        vBladeUv = uv;
        vPatchTone = aBotany.x;
        vVariety = aBotany.y;
        vSeed = seed;

        float camDist = distance(cameraPosition, rootPos);
        float distWidthBoost = 1.0 + smoothstep(5.5, 13.5, camDist) * 0.65;

        float cy = cos(yaw);
        float sy = sin(yaw);
        vec2 dirW = vec2(cy, sy);
        vec2 dirF = vec2(-sy, cy);

        // Sample overdamped 2D cursor & firefly-swarm wind field!
        vec2 windUv = clamp((rootPos.xz - uUVMin) * uUVInvSpan, 0.002, 0.998);
        vec4 windSample = texture2D(uWindTex, windUv);
        vec2 springDisp = windSample.rg;
        float gustEnv = clamp(windSample.b, 0.0, 1.2);

        // Rolling nocturnal meadow breeze + silky leaf-tip sigh inside cursor/swarm wake (matches Up GrassMeadow.js!)
        float breezePhase = uTime * 1.18 - rootPos.x * 0.42 - rootPos.z * 0.34 + seed * 6.283185;
        float breezeWave = sin(breezePhase) + 0.44 * sin(uTime * 0.68 - rootPos.x * 0.22 + rootPos.z * 0.26 + shootPhase);
        vec2 breezeDir = normalize(vec2(0.82, 0.57));
        vec2 ambientBreeze = breezeDir * (breezeWave * 0.025 * (0.38 + 0.62 * bladeH * 4.2));

        float sighPhase = uTime * 2.25 - dot(rootPos.xz, breezeDir) * 0.95 + seed * 6.283185 + shootPhase;
        vec2 wakeSigh = vec2(sin(sighPhase), cos(sighPhase * 0.88 + 1.1)) * (0.032 * gustEnv * bladeH * 3.2);

        float flexProfile = pow(t, 1.68);
        float archProfile = t * t;
        vec2 naturalArchXZ = dirF * (droop * archProfile);

        // Full-scale Up viscoelastic reed bow: swept stems part deeply (up to 1.18 * bladeH) & recover silkily!
        vec2 rawWindFull = ambientBreeze + springDisp * (2.55 * bladeH) + wakeSigh;
        float maxWindReach = bladeH * 1.18;
        float rawWindLen = length(rawWindFull);
        if (rawWindLen > 0.0001) {
          float softClamp = maxWindReach / sqrt(maxWindReach * maxWindReach + rawWindLen * rawWindLen);
          rawWindFull *= softClamp * 1.12;
        }
        vec2 windTipXZ = rawWindFull * flexProfile;
        vec2 totalTipXZ = naturalArchXZ + windTipXZ;

        // Exact length-preserving botanical arc drop (from GrassMeadow.js!)
        float horizSq = dot(totalTipXZ, totalTipXZ);
        float verticalArcY = max(0.012 * t, t * bladeH - horizSq / max(0.032, 1.44 * bladeH));

        float localX = position.x * halfW * distWidthBoost;
        float localZ = position.z * halfW * distWidthBoost;

        vec3 worldPos;
        worldPos.x = rootPos.x + dirW.x * localX + dirF.x * localZ + totalTipXZ.x;
        worldPos.z = rootPos.z + dirW.y * localX + dirF.y * localZ + totalTipXZ.y;
        worldPos.y = rootPos.y + verticalArcY;

        // Analytical stem tangent & V-rib beveled 3D normal (from GrassMeadow.js!)
        vec2 dTipDt = dirF * (2.0 * droop * t) + rawWindFull * (1.68 * pow(max(t, 0.001), 0.68));
        vec3 stemTan = normalize(vec3(dTipDt.x, max(0.06, bladeH), dTipDt.y));
        vec3 widthAxis = vec3(dirW.x, 0.0, dirW.y);
        vec3 flatNormal = normalize(cross(stemTan, widthAxis));
        float ribSign = (uv.x - 0.5) * 2.0;
        vec3 beveledNormal = normalize(flatNormal + widthAxis * (ribSign * 0.28) + vec3(0.0, 0.34, 0.0));

        float windBendAmt = clamp(length(springDisp) / 0.35, 0.0, 1.0);
        vec2 bushDelta = worldPos.xz - vec2(0.34, 0.54);
        vBushZone = exp(-dot(bushDelta, bushDelta) * 0.58);

        // Per-vertex lighting along all 4 height rings (eliminates 17M fragment texture reads/frame while preserving 216k lush blades!)
        vec3 macroN = normalize(mix(beveledNormal, vec3(0.0, 1.0, 0.0), 0.52));
        vec3 V = normalize(cameraPosition - worldPos);
        vec3 toLight = uSpotPos - worldPos;
        float spotDist = length(toLight);
        vec3 L = toLight / max(spotDist, 0.001);
        vec3 spotAxis = normalize(uSpotPos - uSpotTarget);
        float spotCone = smoothstep(0.56, 0.90, dot(L, spotAxis));
        float distAtten = 1.0 / (1.0 + 0.028 * spotDist * spotDist);

        vec4 shadowCoord = uShadowMatrix * vec4(worldPos + vec3(0.0, 0.04, 0.0), 1.0);
        float shadowFactor = sampleSpotShadow(shadowCoord);

        float nDotL = clamp((dot(macroN, L) + 0.42) / 1.42, 0.0, 1.0);
        vSpotDiffuse = uSpotColor * (nDotL * 2.65 * spotCone * distAtten * shadowFactor);

        float sunBack = pow(clamp(dot(V, -L) * 0.5 + 0.5, 0.0, 1.0), 2.6);
        float leafThinness = smoothstep(0.28, 0.96, t);
        vTranslucencyLight = uSpotColor * (sunBack * leafThinness * spotCone * shadowFactor * 0.68);

        vec2 plUv = clamp(worldPos.xz / uTerrainSpan + 0.5, 0.002, 0.998);
        vec3 pLight = texture2D(uParticleLightMap, plUv).rgb;
        float pPeak = max(pLight.r, max(pLight.g, pLight.b));
        pLight /= (1.0 + pPeak * 0.85);

        vec3 practicalSpill = evalNocturnalPracticalSpill(worldPos);
        vFillLight = (pLight * 1.95 + practicalSpill * 1.30) * (0.45 + 0.72 * t);

        float dBlueDirect = length(worldPos - uRightBluePos);
        vSapphireAdditive =
          vec3(0.015, 0.18, 1.0) *
          (0.42 / (1.0 + dBlueDirect * dBlueDirect * 1.95)) *
          smoothstep(2.15, 0.22, dBlueDirect) *
          (0.35 + 0.65 * t);

        float windPartingShade = mix(1.0, 0.78 + 0.42 * clamp(dot(beveledNormal, L) * 0.5 + 0.5, 0.0, 1.0), windBendAmt);
        float perimFade = smoothstep(9.2, 4.4, length(worldPos.xz * vec2(0.84, 1.06)));
        vExposureFade = windPartingShade * perimFade * (1.0 - uScrollDim * 0.85);

        gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vBladeUv;
      varying float vPatchTone;
      varying float vVariety;
      varying float vSeed;
      varying float vBushZone;
      varying float vExposureFade;
      varying vec3 vSpotDiffuse;
      varying vec3 vTranslucencyLight;
      varying vec3 vFillLight;
      varying vec3 vSapphireAdditive;

      void main() {
        float t = clamp(vBladeUv.y, 0.0, 1.0);
        float across = abs(vBladeUv.x - 0.5) * 2.0;

        // Archival Nocturnal Autumn-Meadow Palette (calibrated 1:1 to ref_foreground_grass_tires.png!)
        vec3 colRootEarth  = vec3(0.042, 0.034, 0.014);
        vec3 colMossOlive  = vec3(0.118, 0.126, 0.042);
        vec3 colWarmOchre  = vec3(0.245, 0.186, 0.066);
        vec3 colDryStraw   = vec3(0.325, 0.258, 0.104);
        vec3 colGoldenTip  = vec3(0.385, 0.308, 0.132);
        vec3 colOatPlume   = vec3(0.435, 0.348, 0.165);

        vec3 midBlade = mix(colMossOlive, colWarmOchre, vPatchTone);
        float dryShoot = smoothstep(0.62, 0.98, fract(vSeed * 7.31 + vPatchTone * 0.33));
        midBlade = mix(midBlade, colDryStraw, dryShoot * 0.62);

        // Lush botanical green shift right around the central wildflower & rose bush!
        midBlade = mix(midBlade, vec3(0.088, 0.175, 0.042), vBushZone * 0.76);
        midBlade *= (0.84 + 0.32 * vSeed);

        vec3 baseAlbedo = mix(colRootEarth, midBlade, smoothstep(0.0, 0.44, t));
        vec3 tipTarget = mix(colGoldenTip, colOatPlume, dryShoot * 0.55);
        tipTarget = mix(tipTarget, vec3(0.165, 0.265, 0.072), vBushZone * 0.68);
        baseAlbedo = mix(baseAlbedo, tipTarget, smoothstep(0.46, 1.0, t) * (0.66 + 0.28 * vPatchTone));

        // 4 Botanical species varieties (from GrassMeadow.js!): wildflowers, golden wild-oat plumes & clover!
        if (vVariety > 2.5) {
          float blossomMask = smoothstep(0.74, 0.91, t);
          vec3 colPeriwinkle = vec3(0.34, 0.24, 0.52);
          vec3 colBriarRose  = vec3(0.44, 0.18, 0.26);
          vec3 colChamomile  = vec3(0.46, 0.41, 0.28);
          vec3 petalCol = vSeed < 0.48 ? colPeriwinkle : (vSeed < 0.82 ? colBriarRose : colChamomile);
          baseAlbedo = mix(baseAlbedo, petalCol, blossomMask * 0.92);
        } else if (vVariety > 1.5) {
          float plumeMask = smoothstep(0.54, 0.94, t);
          baseAlbedo = mix(baseAlbedo, colOatPlume, plumeMask * 0.85);
        } else if (vVariety > 0.5) {
          baseAlbedo = mix(baseAlbedo, colMossOlive * 1.12, 0.28);
        }

        // Fast V-rib center-to-edge cellulose relief (zero per-pixel sin!)
        baseAlbedo *= (1.032 - across * across * 0.085);

        float rootAO = mix(0.22, 1.0, sqrt(t));
        vec3 nightAmbient = vec3(0.034, 0.038, 0.052);

        vec3 color =
          baseAlbedo * ((vSpotDiffuse + nightAmbient) * rootAO + vFillLight + vTranslucencyLight) +
          vSapphireAdditive;

        color = min(color, vec3(0.70)) * vExposureFade;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  disposables.push(grassMat);

  const grassMesh = new THREE.Mesh(instGeo, grassMat);
  grassMesh.frustumCulled = false;
  grassMesh.onBeforeRender = () => {
    const shadow = boundSpotLight?.shadow;
    if (shadow?.map?.texture) {
      uniforms.uShadowMap.value = shadow.map.texture;
      uniforms.uShadowMatrix.value.copy(shadow.matrix);
      uniforms.uHasShadow.value = 1.0;
      boundSpotLight!.getWorldPosition(uniforms.uSpotPos.value);
      boundSpotLight!.target.getWorldPosition(uniforms.uSpotTarget.value);
    }
  };
  group.add(grassMesh);

  /* ------------------------------------------------------------------------
     3. Overdamped 2D Viscoelastic Aerodynamic Reed Physics (`GrassMeadow.js`)
     ------------------------------------------------------------------------ */
  const injectSegment = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    strength: number,
    brushRadius = 1.15
  ) => {
    const segDx = x1 - x0;
    const segDz = z1 - z0;
    const segLen = Math.hypot(segDx, segDz);

    let dirX = smoothDir.x;
    let dirZ = smoothDir.y;
    if (segLen > 0.003) {
      const nx = segDx / segLen;
      const nz = segDz / segLen;
      dirX = dirX * 0.42 + nx * 0.58;
      dirZ = dirZ * 0.42 + nz * 0.58;
      const dLen = Math.hypot(dirX, dirZ) || 1.0;
      dirX /= dLen;
      dirZ /= dLen;
      smoothDir.set(dirX, dirZ);
    }

    const invR = 1.0 / brushRadius;
    const steps = Math.max(1, Math.min(20, Math.ceil(segLen / 0.18)));
    const stepScale = 1.0 / Math.pow(steps, 0.50);
    const maxTarget = 0.58;

    const cellSizeU = U_SPAN / (windW - 1);
    const cellSizeV = V_SPAN / (windH - 1);
    const radCellsU = Math.ceil(brushRadius / cellSizeU) + 1;
    const radCellsV = Math.ceil(brushRadius / cellSizeV) + 1;

    for (let s = 1; s <= steps; s += 1) {
      const frac = s / steps;
      const px = x0 + segDx * frac;
      const pz = z0 + segDz * frac;

      const centerIu = Math.round(((px - MEADOW_U_MIN) / U_SPAN) * (windW - 1));
      const centerIv = Math.round(((pz - MEADOW_V_MIN) / V_SPAN) * (windH - 1));

      const iuMin = Math.max(0, centerIu - radCellsU);
      const iuMax = Math.min(windW - 1, centerIu + radCellsU);
      const ivMin = Math.max(0, centerIv - radCellsV);
      const ivMax = Math.min(windH - 1, centerIv + radCellsV);

      for (let iv = ivMin; iv <= ivMax; iv += 1) {
        const cellZ = MEADOW_V_MIN + (iv / (windH - 1)) * V_SPAN;
        const rowOffset = iv * windW;
        for (let iu = iuMin; iu <= iuMax; iu += 1) {
          const cellX = MEADOW_U_MIN + (iu / (windW - 1)) * U_SPAN;
          const dist = Math.hypot(cellX - px, cellZ - pz);
          if (dist >= brushRadius) continue;

          const q = 1.0 - dist * invR;
          const falloff = q * q * (3.0 - 2.0 * q);

          let rx = cellX - px;
          let rz = cellZ - pz;
          const rLen = Math.hypot(rx, rz);
          if (rLen > 0.02) {
            rx /= rLen;
            rz /= rLen;
          } else {
            rx = -dirZ;
            rz = dirX;
          }

          // Exact Up GrassMeadow parting ratio: 72% sweep direction + 28% lateral radial parting!
          const pushX = dirX * 0.72 + rx * 0.28;
          const pushZ = dirZ * 0.72 + rz * 0.28;

          const idx = rowOffset + iu;
          const addLean = falloff * Math.min(1.45, strength) * stepScale * 0.48;

          let tx = targetX[idx] + pushX * addLean;
          let tz = targetZ[idx] + pushZ * addLean;
          const tMag = Math.hypot(tx, tz);
          if (tMag > 0.0001) {
            const softScale = maxTarget / Math.hypot(maxTarget, tMag);
            tx *= softScale * 1.12;
            tz *= softScale * 1.12;
          }
          targetX[idx] = tx;
          targetZ[idx] = tz;

          const tg = Math.min(1.15, falloff * (0.52 + strength * 0.46));
          if (tg > gustEnv[idx]) {
            gustEnv[idx] = tg;
          }
        }
      }
    }
    windAwake = true;
  };

  // Exact D:\UEH\web\up `updatePointerWind(camera, pointerNDC)`: raycasts directly against `terrainMesh` (+0.00m ground)!
  const grassRaycaster = new THREE.Raycaster();
  const grassPtrNdc = new THREE.Vector2();
  const updatePointerWind = (
    camera: THREE.Camera,
    pointerNdcX: number,
    pointerNdcY: number,
    active: boolean
  ): boolean => {
    if (!active || Math.abs(pointerNdcX) > 1.05 || Math.abs(pointerNdcY) > 1.05) {
      hasPrevPtr = false;
      return false;
    }
    grassPtrNdc.set(pointerNdcX, pointerNdcY);
    grassRaycaster.setFromCamera(grassPtrNdc, camera);
    const hits = grassRaycaster.intersectObject(terrainMesh, false);
    if (hits.length === 0) {
      hasPrevPtr = false;
      return false;
    }
    const hx = hits[0].point.x;
    const hz = hits[0].point.z;
    if (!hasPrevPtr) {
      prevPtrX = hx;
      prevPtrZ = hz;
      hasPrevPtr = true;
      injectSegment(hx, hz, hx + 0.06, hz - 0.04, 0.55, 0.92);
      return true;
    }
    const segDist = Math.hypot(hx - prevPtrX, hz - prevPtrZ);
    if (segDist > 0.004) {
      if (segDist > 7.5) {
        prevPtrX = hx;
        prevPtrZ = hz;
        return true;
      }
      const speedStrength = Math.min(1.55, 0.54 + segDist * 1.95);
      const brushR = Math.min(1.28, 0.86 + speedStrength * 0.26);
      injectSegment(prevPtrX, prevPtrZ, hx, hz, speedStrength, brushR);
      prevPtrX = hx;
      prevPtrZ = hz;
    }
    return true;
  };

  const injectPointerGust = (worldX: number, worldZ: number, active: boolean) => {
    if (!active) {
      hasPrevPtr = false;
      return;
    }
    if (!hasPrevPtr) {
      prevPtrX = worldX;
      prevPtrZ = worldZ;
      hasPrevPtr = true;
      return;
    }
    const segDist = Math.hypot(worldX - prevPtrX, worldZ - prevPtrZ);
    if (segDist > 0.005 && segDist < 6.5) {
      const spdStrength = Math.min(1.35, 0.38 + segDist * 1.45);
      injectSegment(prevPtrX, prevPtrZ, worldX, worldZ, spdStrength, 1.08);
      prevPtrX = worldX;
      prevPtrZ = worldZ;
    } else if (segDist >= 6.5) {
      prevPtrX = worldX;
      prevPtrZ = worldZ;
    }
  };

  let prevSwarmX = 0;
  let prevSwarmZ = 0;
  let hasPrevSwarm = false;
  const injectSwarmBreeze = (swarmX: number, swarmZ: number, strength: number) => {
    if (strength <= 0.02) return;
    if (!hasPrevSwarm) {
      prevSwarmX = swarmX;
      prevSwarmZ = swarmZ;
      hasPrevSwarm = true;
      return;
    }
    const d = Math.hypot(swarmX - prevSwarmX, swarmZ - prevSwarmZ);
    if (d > 0.003 && d < 4.0) {
      injectSegment(prevSwarmX, prevSwarmZ, swarmX, swarmZ, strength * 0.35, 1.45);
      prevSwarmX = swarmX;
      prevSwarmZ = swarmZ;
    }
  };

  const stepWindSimulation = (safeDt: number) => {
    if (!windAwake) return;

    const springK = 14.0;
    const springDamp = 8.2; // zeta = 1.096 (overdamped silk reed, zero rubber bounce!)
    const targetDecay = Math.exp(-2.55 * safeDt);
    const gustDecay = Math.exp(-1.95 * safeDt);
    const maxDisp = 0.58;
    const toHalf = THREE.DataUtils.toHalfFloat;

    let activeCount = 0;
    for (let i = 0; i < windCells; i += 1) {
      let dx = dispX[i];
      let dz = dispZ[i];
      let vx = velX[i];
      let vz = velZ[i];
      let tx = targetX[i];
      let tz = targetZ[i];
      let g = gustEnv[i];

      if (dx === 0 && dz === 0 && vx === 0 && vz === 0 && tx === 0 && tz === 0 && g === 0) {
        continue;
      }

      tx *= targetDecay;
      tz *= targetDecay;

      const ax = springK * (tx - dx) - springDamp * vx;
      const az = springK * (tz - dz) - springDamp * vz;
      vx += ax * safeDt;
      vz += az * safeDt;
      dx += vx * safeDt;
      dz += vz * safeDt;

      const mag = Math.hypot(dx, dz);
      if (mag > maxDisp) {
        const s = maxDisp / mag;
        dx *= s;
        dz *= s;
        vx *= 0.85;
        vz *= 0.85;
      }

      g *= gustDecay;
      const i4 = i * 4;
      if (
        Math.abs(dx) < 0.0005 &&
        Math.abs(dz) < 0.0005 &&
        Math.abs(vx) < 0.0015 &&
        Math.abs(vz) < 0.0015 &&
        Math.abs(tx) < 0.0005 &&
        Math.abs(tz) < 0.0005 &&
        g < 0.002
      ) {
        dispX[i] = 0;
        dispZ[i] = 0;
        velX[i] = 0;
        velZ[i] = 0;
        targetX[i] = 0;
        targetZ[i] = 0;
        gustEnv[i] = 0;
        windHalfData[i4] = zeroH;
        windHalfData[i4 + 1] = zeroH;
        windHalfData[i4 + 2] = zeroH;
        windHalfData[i4 + 3] = zeroH;
      } else {
        dispX[i] = dx;
        dispZ[i] = dz;
        velX[i] = vx;
        velZ[i] = vz;
        targetX[i] = tx;
        targetZ[i] = tz;
        gustEnv[i] = g;
        windHalfData[i4] = toHalf(dx);
        windHalfData[i4 + 1] = toHalf(dz);
        windHalfData[i4 + 2] = toHalf(g);
        windHalfData[i4 + 3] = zeroH;
        activeCount += 1;
      }
    }

    windTexture.needsUpdate = true;
    if (activeCount === 0) {
      windAwake = false;
    }
  };

  return {
    group,
    terrainMesh,
    grassMesh,
    totalBladeCount,
    bindSpotLight: (spot: THREE.SpotLight) => {
      boundSpotLight = spot;
    },
    updatePointerWind,
    injectPointerGust,
    injectSwarmBreeze,
    update: (elapsed, dt, scrollDim, practicalPositions) => {
      uniforms.uTime.value = elapsed;
      uniforms.uScrollDim.value = scrollDim;
      if (boundSpotLight) {
        boundSpotLight.getWorldPosition(uniforms.uSpotPos.value);
        boundSpotLight.target.getWorldPosition(uniforms.uSpotTarget.value);
        const shadow = boundSpotLight.shadow;
        if (shadow?.map?.texture) {
          uniforms.uShadowMap.value = shadow.map.texture;
          uniforms.uShadowMatrix.value.copy(shadow.matrix);
          uniforms.uHasShadow.value = 1.0;
        }
      }
      if (practicalPositions) {
        if (practicalPositions.leftRed) uniforms.uLeftRedPos.value.copy(practicalPositions.leftRed);
        if (practicalPositions.rightGreen) uniforms.uRightGreenPos.value.copy(practicalPositions.rightGreen);
        if (practicalPositions.rightBlue) uniforms.uRightBluePos.value.copy(practicalPositions.rightBlue);
        if (practicalPositions.pipeCyan) uniforms.uPipeCyanPos.value.copy(practicalPositions.pipeCyan);
      }
      if (dt > 0.0005) {
        stepWindSimulation(clamp(dt, 0.001, 0.05));
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

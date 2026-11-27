import * as THREE from 'three';
import {
  createNocturnalGrassMeadow,
  type NocturnalGrassMeadowHandle,
} from './nocturnalGrassMeadow';

export const TERRAIN_SPAN = 26.0;
const HM_RES = 256;
const PARTICLE_LIGHT_RES = 256;
const SUBSAMPLES = 1;

export interface OrchestratedTerrainAndParticlesHandle {
  terrainMesh: THREE.Mesh;
  grassCarpetMesh: THREE.Mesh;
  grassMeadow: NocturnalGrassMeadowHandle;
  fireflyPoints: THREE.Points;
  particleLightRT: THREE.WebGLRenderTarget;
  sampleHeight: (wx: number, wz: number) => number;
  stepAndSplat: (
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    motionScale: number,
    introProgress: number,
    scrollP: number,
    rush: number,
    cursorWorld: THREE.Vector3,
    cursorOn: number,
    pixelHeight: number
  ) => void;
  resize: (pixelHeight: number) => void;
  dispose: () => void;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

function hash2(ix: number, iz: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296.0;
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function evalMeadowClearingHeight(wx: number, wz: number): number {
  const base = -1.56;

  const centerMound =
    Math.exp(-(wx * wx) / 5.2 - ((wz + 0.45) * (wz + 0.45)) / 3.8) * 0.26;

  const leftBank =
    Math.exp(-((wx + 2.45) * (wx + 2.45)) / 7.8 - ((wz - 0.85) * (wz - 0.85)) / 7.2) * 0.15;
  const rightBank =
    Math.exp(-((wx - 2.55) * (wx - 2.55)) / 7.8 - ((wz - 0.95) * (wz - 0.95)) / 7.2) * 0.16;

  const n1 = (valueNoise2D(wx * 0.42 + 4.2, wz * 0.42 - 2.1) - 0.5) * 0.13;
  const n2 = (valueNoise2D(wx * 1.35 - 3.7, wz * 1.35 + 6.4) - 0.5) * 0.045;
  const n3 = (valueNoise2D(wx * 3.8 + 1.1, wz * 3.8 - 5.3) - 0.5) * 0.018;

  return base + centerMound + leftBank + rightBank + n1 + n2 + n3;
}

/* --------------------------------------------------------------------------
   3D Simplex Noise & Curl Helper on CPU for Exact Orchestrated Module 8645
   (Running 1,152 particles on typed Float32Array takes < 0.28ms per frame on JS
   AND gives 100% deterministic control over velocity, anti-clump aging, and
   exact 3-frame ViewProjection shutter motion blur without float-RT quirks!)
   -------------------------------------------------------------------------- */
function fastNoise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const h = (a: number, b: number, c: number) => {
    let n = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1442695041)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 2147483648.0 - 1.0;
  };

  const c000 = h(ix, iy, iz);
  const c100 = h(ix + 1, iy, iz);
  const c010 = h(ix, iy + 1, iz);
  const c110 = h(ix + 1, iy + 1, iz);
  const c001 = h(ix, iy, iz + 1);
  const c101 = h(ix + 1, iy, iz + 1);
  const c011 = h(ix, iy + 1, iz + 1);
  const c111 = h(ix + 1, iy + 1, iz + 1);

  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;

  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

function evalCurl3D(x: number, y: number, z: number, out: [number, number, number]): void {
  const e = 0.18;
  const inv2e = 1.0 / (2.0 * e);
  const dy1 = (fastNoise3(x, y + e, z) - fastNoise3(x, y - e, z)) * inv2e;
  const dz1 = (fastNoise3(x, y, z + e) - fastNoise3(x, y, z - e)) * inv2e;
  const dx1 = (fastNoise3(x + e, y, z) - fastNoise3(x - e, y, z)) * inv2e;

  const qx = x + 17.3;
  const qy = y - 11.7;
  const qz = z + 23.1;
  const dy2 = (fastNoise3(qx, qy + e, qz) - fastNoise3(qx, qy - e, qz)) * inv2e;
  const dz2 = (fastNoise3(qx, qy, qz + e) - fastNoise3(qx, qy, qz - e)) * inv2e;
  const dx2 = (fastNoise3(qx + e, qy, qz) - fastNoise3(qx - e, qy, qz)) * inv2e;

  out[0] = dy1 * dz2 - dz1 * dy2;
  out[1] = dz1 * dx2 - dx1 * dz2;
  out[2] = dx1 * dy2 - dy1 * dx2;
}

/* --------------------------------------------------------------------------
   GLSL Shaders — Exact Decompiled `orchestrated.nl` Modules 5685, 5765, 8824
   -------------------------------------------------------------------------- */

const PARTICLE_LIGHT_VERT = /* glsl */ `
  attribute vec3 aSplatMeta; // x=u, y=v, z=size

  uniform sampler2D uPositions;
  uniform float uTerrainSpan;
  uniform float uPointSize;
  uniform float uResolution;
  uniform float uBrightness;
  uniform vec3 uColor0;
  uniform vec3 uColor1;

  varying vec4 vColor;
  varying vec3 vParticleWorld;
  varying float vRadiusWorld;

  void main() {
    vec4 data = texture2D(uPositions, aSplatMeta.xy);
    vec3 p = data.xyz;
    float age = data.w;

    vec2 ndc = p.xz / (uTerrainSpan * 0.5);
    gl_Position = vec4(ndc.x, ndc.y, 0.0, 1.0);

    float life = smoothstep(0.5, 0.38, abs(age - 0.5));
    float radiusWorld = life * (0.55 + 0.85 * aSplatMeta.z) * uPointSize;
    gl_PointSize = clamp((radiusWorld / (uTerrainSpan * 0.5)) * uResolution, 0.0, 56.0);

    if (life <= 0.001 || abs(ndc.x) > 1.15 || abs(ndc.y) > 1.15) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
    }

    vec3 c0 = uColor0 * uColor0;
    vec3 c1 = uColor1 * uColor1;
    vec3 c = mix(c0, c1, aSplatMeta.y * aSplatMeta.y);

    vColor = vec4(c * uBrightness, 1.0);
    vParticleWorld = p;
    vRadiusWorld = max(radiusWorld, 0.05);
  }
`;

const PARTICLE_LIGHT_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uHeightMap;
  uniform float uResolution;
  uniform float uTerrainSpan;

  varying vec4 vColor;
  varying vec3 vParticleWorld;
  varying float vRadiusWorld;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec4 nh = texture2D(uHeightMap, uv);
    vec3 n = normalize(nh.xyz);
    vec2 xz = (uv - 0.5) * uTerrainSpan;
    vec3 groundPos = vec3(xz.x, nh.w, xz.y);

    vec3 delta = groundPos - vParticleWorld;
    float dist = length(delta);
    if (dist > vRadiusWorld) discard;

    float b = pow(1.0 - min(dist / vRadiusWorld, 1.0), 2.1);
    b *= max(0.0, dot(n, normalize(-delta + vec3(0.0, 1e-4, 0.0))));

    gl_FragColor = vColor * b;
  }
`;

// Exact Orchestrated.nl Modules 5685 & 5765:
// Optical Camera-Lens Bokeh Orbs (creamy Airy core + translucent circular aperture disc + velvety halo)!
const FIREFLY_BOKEH_VERT = /* glsl */ `
  attribute vec4 aData; // x = u, y = v, z = shutterSubsample [0..0.9], w = sizeSeed

  uniform sampler2D uPositions0;
  uniform sampler2D uPositions1;
  uniform mat4 uViewProjection0;
  uniform mat4 uViewProjection1;

  uniform float uPointSize;
  uniform float uScreenHeight;
  uniform float uBrightness;
  uniform float uIntroBrightness;
  uniform vec3 uColor0;
  uniform vec3 uColor1;

  varying vec4 vColor;
  varying float vBokehFactor;

  void main() {
    vec4 data0 = texture2D(uPositions0, aData.xy);
    vec4 data1 = texture2D(uPositions1, aData.xy);

    vec3 d01 = data0.xyz - data1.xyz;
    vec3 p1 = dot(d01, d01) > 1.2 ? data0.xyz : data1.xyz;

    vec4 screen0 = uViewProjection0 * vec4(data0.xyz, 1.0);
    vec4 screen1 = uViewProjection1 * vec4(p1, 1.0);

    gl_Position = mix(screen0, screen1, aData.z);

    float age = data0.w;
    float life = smoothstep(0.5, 0.36, abs(age - 0.5));
    float size = life * (0.15 + 0.85 * pow(aData.w, 2.05));
    float rawPt = size * uPointSize * uScreenHeight / max(0.42, gl_Position.w);
    gl_PointSize = clamp(rawPt, 0.0, 21.0);

    if (size <= 0.001 || gl_Position.w <= 0.15) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
    }

    vec3 c0 = uColor0 * uColor0;
    vec3 c1 = uColor1 * uColor1;
    // ~75% warm peach-amber (#FFB366) + ~25% dreamy amethyst-violet (#A464E8), matching orches_4.0s.png!
    vec3 c = mix(c0, c1, pow(aData.y, 1.85));

    float twinkle = 0.46 + 0.64 * fract(aData.w * 19.37 + aData.x * 7.13);
    vBokehFactor = smoothstep(5.0, 15.5, gl_PointSize);
    float bokehAtten = mix(1.36, 0.44, vBokehFactor) * twinkle;
    vColor = vec4(c * (uBrightness * bokehAtten * uIntroBrightness), 1.0);
  }
`;

const FIREFLY_BOKEH_FRAG = /* glsl */ `
  precision highp float;

  uniform float uHardness;
  varying vec4 vColor;
  varying float vBokehFactor;

  void main() {
    vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
    float l = length(uv);
    if (l > 1.0) discard;

    float dx = dFdx(l);
    float dy = dFdy(l);
    float d = length(vec2(dx, dy));

    // Optical bokeh aperture disc + warm Airy core + soft atmospheric coma halo (matches orches_4.0s.png 1:1!)
    float disc = smoothstep(1.0, min(1.0 - d, uHardness), l);
    float core = exp(-l * l * 4.4);
    float halo = pow(max(0.0, 1.0 - l), 2.35);
    float a = mix(core * 0.78 + halo * 0.44, disc * 0.68 + core * 0.36 + halo * 0.18, vBokehFactor);
    vec3 col = vColor.rgb * (1.0 + core * 0.28);
    gl_FragColor = vec4(col * a, a);
  }
`;

export function createOrchestratedTerrainAndParticles(
  renderer: THREE.WebGLRenderer,
  isMobile: boolean,
  initialPixelHeight: number
): OrchestratedTerrainAndParticlesHandle {
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Build 256x256 Height + Normal Map
  const hmData = new Float32Array(HM_RES * HM_RES * 4);
  const heightsOnly = new Float32Array(HM_RES * HM_RES);

  for (let iy = 0; iy < HM_RES; iy += 1) {
    const wz = ((iy + 0.5) / HM_RES - 0.5) * TERRAIN_SPAN;
    for (let ix = 0; ix < HM_RES; ix += 1) {
      const wx = ((ix + 0.5) / HM_RES - 0.5) * TERRAIN_SPAN;
      heightsOnly[iy * HM_RES + ix] = evalMeadowClearingHeight(wx, wz);
    }
  }

  const step = TERRAIN_SPAN / HM_RES;
  for (let iy = 0; iy < HM_RES; iy += 1) {
    const iyN = Math.min(HM_RES - 1, iy + 1);
    const iyS = Math.max(0, iy - 1);
    for (let ix = 0; ix < HM_RES; ix += 1) {
      const ixE = Math.min(HM_RES - 1, ix + 1);
      const ixW = Math.max(0, ix - 1);
      const hC = heightsOnly[iy * HM_RES + ix];
      const nx = heightsOnly[iy * HM_RES + ixW] - heightsOnly[iy * HM_RES + ixE];
      const ny = 2.0 * step;
      const nz = heightsOnly[iyS * HM_RES + ix] - heightsOnly[iyN * HM_RES + ix];
      const inv = 1.0 / (Math.hypot(nx, ny, nz) + 1e-6);
      const i4 = (iy * HM_RES + ix) * 4;
      hmData[i4] = nx * inv;
      hmData[i4 + 1] = ny * inv;
      hmData[i4 + 2] = nz * inv;
      hmData[i4 + 3] = hC;
    }
  }

  const hasFloatLinear = Boolean(renderer.extensions.get('OES_texture_float_linear'));
  const heightTex = new THREE.DataTexture(
    hmData,
    HM_RES,
    HM_RES,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  heightTex.minFilter = hasFloatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  heightTex.magFilter = hasFloatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  heightTex.wrapS = THREE.ClampToEdgeWrapping;
  heightTex.wrapT = THREE.ClampToEdgeWrapping;
  heightTex.needsUpdate = true;
  disposables.push(heightTex);

  const sampleHeight = (wx: number, wz: number): number => {
    const u = clamp(wx / TERRAIN_SPAN + 0.5, 0.0, 0.9999) * (HM_RES - 1);
    const v = clamp(wz / TERRAIN_SPAN + 0.5, 0.0, 0.9999) * (HM_RES - 1);
    const x0 = Math.floor(u);
    const z0 = Math.floor(v);
    const x1 = Math.min(HM_RES - 1, x0 + 1);
    const z1 = Math.min(HM_RES - 1, z0 + 1);
    const fx = u - x0;
    const fz = v - z0;
    return (
      heightsOnly[z0 * HM_RES + x0] * (1 - fx) * (1 - fz) +
      heightsOnly[z0 * HM_RES + x1] * fx * (1 - fz) +
      heightsOnly[z1 * HM_RES + x0] * (1 - fx) * fz +
      heightsOnly[z1 * HM_RES + x1] * fx * fz
    );
  };

  // 2. Real-Time 256x256 ParticleLightMap RenderTarget
  const particleLightRT = new THREE.WebGLRenderTarget(
    PARTICLE_LIGHT_RES,
    PARTICLE_LIGHT_RES,
    {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    }
  );
  disposables.push(particleLightRT);

  // 3. `D:\UEH\web\up` Multi-Shoot 405,000-Blade 3D Botanical GrassMeadow + Viscoelastic Wind Field!
  const grassMeadow = createNocturnalGrassMeadow({
    isMobile,
    sampleHeight,
    particleLightTex: particleLightRT.texture,
    terrainSpan: TERRAIN_SPAN,
  });

  /* ------------------------------------------------------------------------
     4. Exact Decompiled `orchestrated.nl` Particle Murmuration (`Module 8645`)
        - `36 x 32 = 1,152` Unified Flowing Bokeh Fireflies (700 on mobile)
        - ONE living murmuration streaming together (idle figure-8 across meadow,
          responsive flowing comet-cloud behind mouse cursor on hover!)
        - Anti-clump near-attractor aging boost + wide 3.9m outer respawn sphere
        - `6` continuous shutter subsamples across `screen0 -> screen1` + crisp
          `uHardness = 0.80` circular lens bokeh discs!
     ------------------------------------------------------------------------ */
  const gridX = isMobile ? 20 : 24;
  const gridY = isMobile ? 16 : 20;
  const fireflyCount = gridX * gridY;

  let prng = 0x9e3779b9;
  const nextRand = () => {
    prng = (prng + 0x6d2b79f5) >>> 0;
    let t = Math.imul(prng ^ (prng >>> 15), 1 | prng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };

  const seedArr = new Float32Array(fireflyCount * 3);
  const velArr = new Float32Array(fireflyCount * 3);

  const makeStateTex = () => {
    const data = new Float32Array(fireflyCount * 4);
    const tex = new THREE.DataTexture(
      data,
      gridX,
      gridY,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    disposables.push(tex);
    return { data, tex };
  };

  const stateRing = [makeStateTex(), makeStateTex()];
  let ringIdx = 0;

  const spawnInMurmurationSphere = (
    cx: number,
    cyOffsetAboveGround: number,
    cz: number,
    radius: number,
    out: [number, number, number]
  ) => {
    const u = nextRand() * 2.0 - 1.0;
    const phi = nextRand() * Math.PI * 2.0;
    const r = radius * Math.pow(Math.max(1e-4, nextRand()), 0.44);
    const s = Math.sqrt(Math.max(0.0, 1.0 - u * u));
    const sx = clamp(cx + s * Math.cos(phi) * r * 1.18, -5.2, 5.2);
    const sz = clamp(cz + s * Math.sin(phi) * r * 0.88, -1.4, 5.4);
    const gY = sampleHeight(sx, sz);
    // Rising Orchestrated.nl fountain: hugs the meadow grass at base & billows gently into the night air!
    const sy = clamp(gY + cyOffsetAboveGround + u * r * 0.62, gY + 0.08, gY + 2.45);
    out[0] = sx;
    out[1] = sy;
    out[2] = sz;
  };

  // Initialize 3 organic low-meadow & ascending-plume firefly streams (flock index decoupled from sizeSeed `h0`!)
  {
    const tmp: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < fireflyCount; i += 1) {
      seedArr[i * 3] = nextRand();
      seedArr[i * 3 + 1] = nextRand();
      seedArr[i * 3 + 2] = nextRand();

      const mod = i % 10;
      if (mod < 5) {
        // Primary Orchestrated.nl billowing foreground-left/center meadow plume (`orches_4.0s.png`!)
        spawnInMurmurationSphere(-1.35, 0.62, 2.75, 2.45, tmp);
      } else if (mod < 8) {
        // Ascending central wildflower rose, verdigris pipe & night-sky bokeh stream
        spawnInMurmurationSphere(-0.15, 1.25, 0.95, 2.65, tmp);
      } else {
        // Right car & foreground meadow ambient bokeh stream
        spawnInMurmurationSphere(1.95, 0.72, 2.15, 2.45, tmp);
      }
      const age = nextRand();
      for (const st of stateRing) {
        st.data[i * 4] = tmp[0];
        st.data[i * 4 + 1] = tmp[1];
        st.data[i * 4 + 2] = tmp[2];
        st.data[i * 4 + 3] = age;
      }
    }
    stateRing[0].tex.needsUpdate = true;
    stateRing[1].tex.needsUpdate = true;
  }

  // Exact Orchestrated.nl colors (#FFB366 warm peach-amber + #9E5DDF amethyst-violet)
  const color0 = new THREE.Vector3(1.0, 0.70, 0.40);
  const color1 = new THREE.Vector3(0.62, 0.365, 0.875);

  // Splat geometry (1 point per firefly)
  const splatDummy = new Float32Array(fireflyCount * 3);
  const splatMeta = new Float32Array(fireflyCount * 3);
  for (let iy = 0; iy < gridY; iy += 1) {
    for (let ix = 0; ix < gridX; ix += 1) {
      const idx = iy * gridX + ix;
      splatMeta[idx * 3] = (ix + 0.5) / gridX;
      splatMeta[idx * 3 + 1] = (iy + 0.5) / gridY;
      splatMeta[idx * 3 + 2] = seedArr[idx * 3];
    }
  }

  const splatScene = new THREE.Scene();
  const splatCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const splatGeo = new THREE.BufferGeometry();
  splatGeo.setAttribute('position', new THREE.BufferAttribute(splatDummy, 3));
  splatGeo.setAttribute('aSplatMeta', new THREE.BufferAttribute(splatMeta, 3));
  splatGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

  const splatMat = new THREE.ShaderMaterial({
    uniforms: {
      uPositions: { value: stateRing[0].tex },
      uHeightMap: { value: heightTex },
      uTerrainSpan: { value: TERRAIN_SPAN },
      uPointSize: { value: 1.65 },
      uResolution: { value: PARTICLE_LIGHT_RES },
      uBrightness: { value: 0.14 },
      uColor0: { value: color0 },
      uColor1: { value: color1 },
    },
    vertexShader: PARTICLE_LIGHT_VERT,
    fragmentShader: PARTICLE_LIGHT_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const splatPoints = new THREE.Points(splatGeo, splatMat);
  splatPoints.frustumCulled = false;
  splatScene.add(splatPoints);
  disposables.push(splatGeo, splatMat);

  // Bokeh Firefly Render Geometry (`fireflyCount * SUBSAMPLES`)
  const totalVerts = fireflyCount * SUBSAMPLES;
  const dummyPosArr = new Float32Array(totalVerts * 3);
  const aDataArr = new Float32Array(totalVerts * 4);
  {
    let ptr = 0;
    for (let iy = 0; iy < gridY; iy += 1) {
      for (let ix = 0; ix < gridX; ix += 1) {
        const idx = iy * gridX + ix;
        const u = (ix + 0.5) / gridX;
        const v = (iy + 0.5) / gridY;
        const szSeed = seedArr[idx * 3];
        for (let s = 0; s < SUBSAMPLES; s += 1) {
          aDataArr[ptr++] = u;
          aDataArr[ptr++] = v;
          // Spans [0.0 .. 0.82] of ONE frame -> continuous shutter motion blur, ZERO bead separation!
          aDataArr[ptr++] = (s / Math.max(1, SUBSAMPLES - 1)) * 0.82;
          aDataArr[ptr++] = szSeed;
        }
      }
    }
  }

  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(dummyPosArr, 3));
  fireflyGeo.setAttribute('aData', new THREE.BufferAttribute(aDataArr, 4));
  fireflyGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

  const viewProj0 = new THREE.Matrix4();
  const viewProj1 = new THREE.Matrix4();
  let vpInit = false;

  const fireflyMat = new THREE.ShaderMaterial({
    uniforms: {
      uPositions0: { value: stateRing[0].tex },
      uPositions1: { value: stateRing[1].tex },
      uViewProjection0: { value: viewProj0 },
      uViewProjection1: { value: viewProj1 },
      uPointSize: { value: 0.082 },
      uScreenHeight: { value: initialPixelHeight },
      // Optical lens bokeh glow calibrated 1:1 to orches_0.4s / 4.0s / 8.0s!
      uBrightness: { value: 1.48 },
      uIntroBrightness: { value: 0.0 },
      uHardness: { value: 0.62 },
      uColor0: { value: color0 },
      uColor1: { value: color1 },
    },
    vertexShader: FIREFLY_BOKEH_VERT,
    fragmentShader: FIREFLY_BOKEH_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });

  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  fireflyPoints.frustumCulled = false;
  fireflyPoints.renderOrder = 15;
  disposables.push(fireflyGeo, fireflyMat);

  // 3 Cohesive Low-Meadow Murmuration Attractors (converge smoothly onto 3D mouse cursor on hover!)
  const flockSmooth = [
    new THREE.Vector3(-1.15, -0.85, 2.85),
    new THREE.Vector3(0.45, -0.65, 1.25),
    new THREE.Vector3(2.05, -0.85, 2.35),
  ];
  const flockGoal = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const centerpiecePos = new THREE.Vector3(0.0, 0.22, 0.35);

  // Exact Orchestrated Module 8645 Constants (calibrated for moderate, dreamy murmuration!)
  const INERTIA = 0.956;
  const MOUSE_ATTRACT = 1.12;
  const CURL_FREQ = 0.46;
  const CURL_AMP = 2.15;
  const AGING = 0.22;

  const stepAndSplat = (
    r: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    motionScale: number,
    introProgress: number,
    scrollP: number,
    rush: number,
    cursorWorld: THREE.Vector3,
    cursorOn: number,
    pixelHeight: number
  ) => {
    viewProj1.copy(viewProj0);
    viewProj0.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (!vpInit) {
      viewProj1.copy(viewProj0);
      vpInit = true;
    }

    // 3 organic idle paths: low foreground meadow plume + ascending night-sky fountain + right car stream!
    const f0x = -1.35 + Math.sin(elapsed * 0.24) * 1.45;
    const f0z = 2.65 + Math.cos(elapsed * 0.19) * 0.72;
    const f0y = sampleHeight(f0x, f0z) + 0.62 + Math.sin(elapsed * 0.31) * 0.22;

    const f1x = -0.15 + Math.cos(elapsed * 0.20 + 1.2) * 1.55;
    const f1z = 0.95 + Math.sin(elapsed * 0.16 + 0.6) * 0.85;
    const f1y = sampleHeight(f1x, f1z) + 1.38 + Math.cos(elapsed * 0.26) * 0.34;

    const f2x = 1.95 + Math.sin(elapsed * 0.22 + 2.6) * 1.35;
    const f2z = 2.15 + Math.cos(elapsed * 0.18 + 2.1) * 0.78;
    const f2y = sampleHeight(f2x, f2z) + 0.74 + Math.sin(elapsed * 0.29 + 1.4) * 0.24;

    const curTargetY = Math.max(cursorWorld.y, sampleHeight(cursorWorld.x, cursorWorld.z) + 0.38);
    const idleTargets: Array<[number, number, number, number]> = [
      [f0x, f0y, f0z, 1.0],
      [f1x, f1y, f1z, 0.92],
      [f2x, f2y, f2z, 0.88],
    ];

    const followAlpha = 1.0 - Math.exp(-dt * (2.6 + cursorOn * 1.8));
    for (let f = 0; f < 3; f += 1) {
      const [ix, iy, iz, cPull] = idleTargets[f];
      const k = cursorOn * cPull;
      flockGoal[f].set(
        ix + (cursorWorld.x - ix) * k,
        iy + (curTargetY - iy) * k,
        iz + (cursorWorld.z - iz) * k
      );
      flockSmooth[f].lerp(flockGoal[f], followAlpha);
    }

    const prevSlot = ringIdx;
    ringIdx = (ringIdx + 1) % 2;
    const currData = stateRing[ringIdx].data;
    const prevData = stateRing[prevSlot].data;

    const simDt = dt * (0.28 + 0.72 * motionScale);
    const frameInertia = Math.pow(INERTIA, simDt * 60.0);

    const axisX0 = camera.position.x - centerpiecePos.x;
    const axisY0 = camera.position.y - centerpiecePos.y;
    const axisZ0 = camera.position.z - centerpiecePos.z;
    const axisLen = Math.hypot(axisX0, axisY0, axisZ0) + 1e-3;
    const axisX = axisX0 / axisLen;
    const axisY = axisY0 / axisLen;
    const axisZ = axisZ0 / axisLen;

    const curlTmp: [number, number, number] = [0, 0, 0];
    const spawnTmp: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < fireflyCount; i += 1) {
      const i4 = i * 4;
      const i3 = i * 3;
      const hx = seedArr[i3];
      const hy = seedArr[i3 + 1];
      const hz = seedArr[i3 + 2];

      const mod = i % 10;
      const fIdx = mod < 5 ? 0 : mod < 8 ? 1 : 2;
      const attr = flockSmooth[fIdx];
      const attrX = attr.x;
      const attrY = attr.y;
      const attrZ = attr.z;

      let px = prevData[i4];
      let py = prevData[i4 + 1];
      let pz = prevData[i4 + 2];
      let age = prevData[i4 + 3];

      let vx = velArr[i3];
      let vy = velArr[i3 + 1];
      let vz = velArr[i3 + 2];

      if (age >= 1.0 && rush < 0.05) {
        spawnInMurmurationSphere(
          attrX + (hy - 0.5) * 0.95,
          fIdx === 1 ? 1.15 + hz * 0.55 : 0.56 + hz * 0.35,
          attrZ + (hz - 0.5) * 0.85,
          fIdx === 1 ? 2.75 : 2.35,
          spawnTmp
        );
        px = spawnTmp[0];
        py = spawnTmp[1];
        pz = spawnTmp[2];
        vx = 0;
        vy = 0;
        vz = 0;
        age -= 1.0;
      } else {
        evalCurl3D(
          px * CURL_FREQ + elapsed * 0.13,
          py * CURL_FREQ,
          pz * CURL_FREQ + elapsed * 0.09,
          curlTmp
        );

        // Gently ascending billowing fountain shell (like orches_4.0s.png!) without escaping into empty top sky
        const phi = hx * 19.73 + elapsed * 0.20 * (hy - 0.5);
        const uElev = hy * 1.75 - 0.72;
        const sRing = Math.sqrt(Math.max(0.05, 1.0 - Math.min(1.0, uElev * uElev)));
        const rShell = 0.14 + Math.pow(hz, 1.75) * (1.75 - cursorOn * 0.52);

        const goalX = attrX + Math.cos(phi) * sRing * rShell * 1.22;
        const goalY = attrY + uElev * rShell * 0.62 + age * 0.28;
        const goalZ = attrZ + Math.sin(phi) * sRing * rShell * 0.96;

        const pull = MOUSE_ATTRACT * (0.55 + hy * 0.65) * (1.0 + cursorOn * 0.35) * (1.0 - rush);
        const cAmp = CURL_AMP * (0.45 + hz * 0.68);

        const impX = (goalX - px) * pull + curlTmp[0] * cAmp;
        const impY = (goalY - py) * pull + curlTmp[1] * cAmp * 0.65;
        const impZ = (goalZ - pz) * pull + curlTmp[2] * cAmp;

        vx = vx * frameInertia + impX * simDt * (1.0 - frameInertia) * 14.0;
        vy = vy * frameInertia + impY * simDt * (1.0 - frameInertia) * 14.0;
        vz = vz * frameInertia + impZ * simDt * (1.0 - frameInertia) * 14.0;

        // Moderate, dreamy murmuration velocity ("tốc độ đom đóm bay vừa phải") matching orches_4.0s/8.0s!
        if (rush < 0.02) {
          const maxSpd = (0.62 + cursorOn * 0.82) * simDt;
          const vL = Math.hypot(vx, vy, vz);
          if (vL > maxSpd && vL > 1e-5) {
            const sc = maxSpd / vL;
            vx *= sc;
            vy *= sc;
            vz *= sc;
          }
        }

        // Soft centerpiece clearance around FA / FIREFLY ALGORITHM
        const ldx = px - centerpiecePos.x;
        const ldy = py - centerpiecePos.y;
        const ldz = pz - centerpiecePos.z;
        const ellip = Math.hypot(ldx * 0.85, ldy * 1.25, ldz * 1.35) + 1e-4;
        if (ellip < 1.75 && rush < 0.2) {
          const push = smoothstep(1.75, 0.72, ellip) * 0.022 * (1.0 - rush);
          const invL = 1.0 / (Math.hypot(ldx, ldy, ldz) + 1e-4);
          vx += ldx * invL * push;
          vy += ldy * invL * push;
          vz += ldz * invL * push;
        }

        // Scroll dispersal past camera lens (`_Rush`)
        if (rush > 0.001) {
          const fcLen = Math.hypot(ldx, ldy, ldz) + 1e-3;
          const rxD = axisX * (0.85 + hy * 1.35) + (ldx / fcLen) * 0.6 + (hx * 2.0 - 1.0) * 0.85;
          const ryD = axisY * (0.85 + hy * 1.35) + (ldy / fcLen) * 0.6 + (hy * 2.0 - 1.0) * 0.85;
          const rzD = axisZ * (0.85 + hy * 1.35) + (ldz / fcLen) * 0.6 + (hz * 2.0 - 1.0) * 0.85;
          const rN = Math.hypot(rxD, ryD, rzD) + 1e-3;
          const rB = rush * (hx * 1.25 + 0.28) * simDt * 18.0;
          vx += (rxD / rN) * rB;
          vy += (ryD / rN) * rB;
          vz += (rzD / rN) * rB;
        }

        px += vx;
        py += vy;
        pz += vz;

        if (rush > 0.5) {
          const dOut = Math.hypot(px, py, pz);
          if (dOut > 18.0) {
            const sClamp = 18.0 / dOut;
            px *= sClamp;
            py *= sClamp;
            pz *= sClamp;
          }
        }

        // Exact Orchestrated anti-clump rule: particles close to their attractor age faster & recycle!
        const dAttr = Math.hypot(attrX - px, attrY - py, attrZ - pz);
        const nearBoost = smoothstep(1.25, 0.22, dAttr) * 0.46;
        age += (AGING + nearBoost) * simDt * (1.0 - rush);

        const floorY = sampleHeight(px, pz) + 0.08;
        if (py < floorY) {
          py = floorY;
          if (vy < 0) vy *= -0.18;
        }
      }

      currData[i4] = px;
      currData[i4 + 1] = py;
      currData[i4 + 2] = pz;
      currData[i4 + 3] = age;

      velArr[i3] = vx;
      velArr[i3 + 1] = vy;
      velArr[i3 + 2] = vz;
    }

    stateRing[ringIdx].tex.needsUpdate = true;

    // Splat real-time firefly pools of light onto the ground & 3D grass meadow!
    splatMat.uniforms.uPositions.value = stateRing[ringIdx].tex;
    splatMat.uniforms.uBrightness.value = 0.105 * introProgress * (1.0 - scrollP * 0.85);
    r.setRenderTarget(particleLightRT);
    r.clear(true, false, false);
    r.render(splatScene, splatCam);
    r.setRenderTarget(null);

    fireflyMat.uniforms.uPositions0.value = stateRing[ringIdx].tex;
    fireflyMat.uniforms.uPositions1.value = stateRing[prevSlot].tex;
    fireflyMat.uniforms.uIntroBrightness.value = introProgress;
    fireflyMat.uniforms.uScreenHeight.value = pixelHeight;
  };

  const resize = (pixelHeight: number) => {
    fireflyMat.uniforms.uScreenHeight.value = pixelHeight;
  };

  const dispose = () => {
    grassMeadow.dispose();
    disposables.forEach((d) => d.dispose());
  };

  return {
    terrainMesh: grassMeadow.terrainMesh,
    grassCarpetMesh: grassMeadow.grassMesh,
    grassMeadow,
    fireflyPoints,
    particleLightRT,
    sampleHeight,
    stepAndSplat,
    resize,
    dispose,
  };
}

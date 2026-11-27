import * as THREE from 'three';

/**
 * Handcrafted Procedural Canvas PBR Maps, Universal Non-Plastic Patina Normalizer,
 * and Multi-Part 3D Sub-Assembly Builders (`sancturnalPatinaAndTextures.ts`).
 *
 * Directly inspired by the 3D modeling & material architecture in `D:\UEH\web\up`:
 * - `src/3d/artifactFactory.js` (`Rule 1: applyVintagePatina`, `getPatinaBumpTexture`, `injectGoldenFresnelRim`)
 * - `src/utils/proceduralTextures.js` (`512x512` multi-layer `CanvasTexture` color + bump + roughness maps)
 * - `src/world/StoryProps.js`, `src/3d/customArtifacts.js`, & `src/world/GrassMeadow.js`
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };
}

function hash2(ix: number, iy: number): number {
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295.0;
}

function vnoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number, octaves = 4): number {
  let sum = 0.0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * vnoise2D(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/**
 * Deterministic static BufferGeometry batcher (preserves exact world positions, normals & UVs
 * while collapsing dozens of identical-material static meshes into a single GPU draw call for 120fps+).
 */
export function mergeStaticBufferGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
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

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const cnt = p.count;

    for (let i = 0; i < cnt; i += 1) {
      const vi = vOffset + i;
      posOut[vi * 3] = p.getX(i);
      posOut[vi * 3 + 1] = p.getY(i);
      posOut[vi * 3 + 2] = p.getZ(i);

      normOut[vi * 3] = n ? n.getX(i) : 0;
      normOut[vi * 3 + 1] = n ? n.getY(i) : 1;
      normOut[vi * 3 + 2] = n ? n.getZ(i) : 0;

      uvOut[vi * 2] = uv ? uv.getX(i) : 0;
      uvOut[vi * 2 + 1] = uv ? uv.getY(i) : 0;
    }

    if (g.index) {
      const idx = g.index;
      for (let k = 0; k < idx.count; k += 1) {
        idxOut[iOffset + k] = idx.getX(k) + vOffset;
      }
      iOffset += idx.count;
    } else {
      for (let k = 0; k < cnt; k += 1) {
        idxOut[iOffset + k] = vOffset + k;
      }
      iOffset += cnt;
    }
    vOffset += cnt;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
  merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
  merged.computeBoundingSphere();
  return merged;
}

/* ==========================================================================
   1. UNIVERSAL NON-PLASTIC PATINA & GRAZING FRESNEL RIM (`artifactFactory.js` Rule 1)
   ========================================================================== */

export function createPatinaBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const rng = mulberry32(19740812);

  for (let y = 0; y < size; y += 1) {
    const ny = (y / size) * Math.PI * 2;
    for (let x = 0; x < size; x += 1) {
      const nx = (x / size) * Math.PI * 2;
      const fineSpeckle = (rng() + rng() - 1.0) * 34.0;
      const toothWeave =
        Math.sin(nx * 14.0 + Math.cos(ny * 9.0) * 1.4) * 11.0 +
        Math.cos(ny * 17.0 - Math.sin(nx * 11.0) * 1.2) * 11.0;
      const brushedGrain = Math.sin(nx * 36.0 + ny * 6.0) * 6.5;
      const val = Math.max(0, Math.min(255, Math.round(128 + fineSpeckle + toothWeave + brushedGrain)));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.strokeStyle = 'rgba(72, 72, 72, 0.24)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 48; i += 1) {
    const sx = rng() * size;
    const sy = rng() * size;
    const ang = rng() * Math.PI * 2;
    const len = 8 + rng() * 28;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const NOCTURNAL_RIM_COLOR = new THREE.Color('#FFD398');

/**
 * Applies `D:\UEH\web\up` Rule 1 (`applyVintagePatina`) adapted for nocturnal chiaroscuro props:
 * - Clamps `roughness` into non-plastic `[0.62, 0.94]` and `metalness` to realistic oxidized bounds
 * - Injects `patinaBump` tactile micro-grain & subtle grazing Fresnel rim (`#FFD398`)
 */
export function applyNocturnalPatina(
  root: THREE.Object3D,
  patinaBump: THREE.Texture,
  rimIntensity = 0.085
): void {
  const seen = new WeakSet<THREE.Material>();

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const m = child as THREE.Mesh;
    m.castShadow = true;
    m.receiveShadow = true;

    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat || seen.has(mat) || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return;
    seen.add(mat);

    mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.78, 0.62, 0.94);
    mat.metalness = THREE.MathUtils.clamp(mat.metalness ?? 0.12, 0.0, 0.55);
    if (!mat.bumpMap && !mat.normalMap) {
      mat.bumpMap = patinaBump;
      mat.bumpScale = 0.016;
    }

    const prevHook = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      if (typeof prevHook === 'function' && prevHook !== THREE.Material.prototype.onBeforeCompile) {
        prevHook.call(mat, shader, renderer);
      }
      shader.uniforms.uNocturnalRimCol = { value: NOCTURNAL_RIM_COLOR };
      shader.uniforms.uNocturnalRimInt = { value: rimIntensity };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uNocturnalRimCol;
           uniform float uNocturnalRimInt;`
        )
        .replace(
          '#include <opaque_fragment>',
          `vec3 patView = normalize(vViewPosition);
           float patFres = pow(1.0 - clamp(abs(dot(normalize(normal), patView)), 0.0, 1.0), 3.0);
           outgoingLight += uNocturnalRimCol * (patFres * uNocturnalRimInt);
           #include <opaque_fragment>`
        );
    };
  });
}

/* ==========================================================================
   2. HIGH-RES `512x512` CANVAS PBR WEATHERED CAR PANEL MAPS (`proceduralTextures.js`)
      Asymmetric photographic rust cascades, oxidized scabs, stamped seams, twig scratches,
      and moss mottling mapped non-repeating (`ClampToEdgeWrapping`) across each car panel!
   ========================================================================== */

export interface WeatheredCarTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createWeatheredCarPanelTextures(
  variant: 'chalk_white' | 'olive_fender' | 'chalk_rear' | 'detached_door',
  seed = 19842105
): WeatheredCarTextureSet {
  const size = 256;
  const sc = size / 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const ctx = cCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;

  const rng = mulberry32(seed);

  // Base Soviet enamel paint color (`y = 0` top of panel / roof, `y = size - 1` bottom rocker sill!)
  const baseRgb =
    variant === 'olive_fender'
      ? [118, 138, 70] // Weathered mossy pistachio-olive (`ref_left_car_hood.png`)
      : variant === 'detached_door'
        ? [122, 126, 114] // Heavily grime-darkened, moss-and-rust-stained detached door (`mv_3m28_left_car_door.png` bottom-left)
        : variant === 'chalk_rear'
          ? [204, 199, 186] // Dirty chalky off-white (`ref_right_car.png`)
          : [212, 207, 194]; // Weathered chalky off-white (`ref_left_car_hood.png`)

  const cImg = ctx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    const vNorm = 1.0 - y / (size - 1); // 1.0 = top, 0.0 = bottom sill
    const fy = y / sc;
    for (let x = 0; x < size; x += 1) {
      const fx = x / sc;
      const mottle = fbm2D(fx * 0.016, fy * 0.016, 3);
      const grimePatch = fbm2D(fx * 0.042 + 5.7, fy * 0.042 - 3.1, 3);
      const algae = fbm2D(fx * 0.035 + 11.4, fy * 0.035 - 7.2, 2);
      const fine = (rng() - 0.5) * 9.0;

      const shade = 0.84 + mottle * 0.24 - Math.max(0, grimePatch - 0.48) * (variant === 'detached_door' ? 0.44 : 0.28);
      let r = baseRgb[0] * shade + fine;
      let g = baseRgb[1] * shade + fine;
      let b = baseRgb[2] * shade + fine;

      if (algae > (variant === 'detached_door' ? 0.44 : 0.54)) {
        const k = Math.min(0.48, (algae - 0.44) * 0.95);
        r = r * (1 - k) + 68 * k;
        g = g * (1 - k) + 86 * k;
        b = b * (1 - k) + 38 * k;
      }

      if (vNorm < 0.16) {
        const mud = (1.0 - vNorm / 0.16) * (0.48 + 0.52 * mottle);
        r = r * (1 - mud * 0.68) + 52 * (mud * 0.68);
        g = g * (1 - mud * 0.68) + 34 * (mud * 0.68);
        b = b * (1 - mud * 0.68) + 18 * (mud * 0.68);
      }

      const idx = (y * size + x) * 4;
      cImg.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      cImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      cImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      cImg.data[idx + 3] = 255;

      const bumpVal = Math.max(0, Math.min(255, Math.round(136 + (mottle - 0.5) * 34 + fine * 1.5)));
      bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      const roughVal = Math.max(168, Math.min(250, Math.round(194 + (1.0 - mottle) * 44)));
      rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // 2. Stamped horizontal lower rocker/trim seam (`y = 0.83 * size`, matching VAZ-2105 door/quarter!)
  const seamY = Math.round(size * 0.83);
  if (variant !== 'detached_door') {
    ctx.strokeStyle = 'rgba(74, 30, 10, 0.76)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, seamY);
    ctx.lineTo(size, seamY);
    ctx.stroke();

    bCtx.strokeStyle = '#2C2C2C';
    bCtx.lineWidth = 3.2;
    bCtx.beginPath();
    bCtx.moveTo(0, seamY);
    ctx.lineTo(size, seamY);
    bCtx.stroke();
  } else {
    // Stamped inner door-card structural recesses on detached foreground door (`ref_left_car_hood.png` bottom-left!)
    ctx.strokeStyle = 'rgba(58, 62, 58, 0.48)';
    ctx.lineWidth = 3.0 * sc;
    ctx.strokeRect(56 * sc, 210 * sc, 175 * sc, 195 * sc);
    ctx.strokeRect(262 * sc, 210 * sc, 185 * sc, 195 * sc);
    bCtx.strokeStyle = '#3A3A3A';
    bCtx.lineWidth = 4.2 * sc;
    bCtx.strokeRect(56 * sc, 210 * sc, 175 * sc, 195 * sc);
    ctx.strokeRect(262 * sc, 210 * sc, 185 * sc, 195 * sc);
  }

  const beltStartY = Math.round(size * 0.34);

  const paintRustRivulet = (
    startX: number,
    startY: number,
    rawLengthPx: number,
    rawWidthPx: number,
    alpha: number,
    rawFanTopPx = 0
  ) => {
    const lengthPx = rawLengthPx * sc;
    const widthPx = rawWidthPx * sc;
    const fanTopPx = rawFanTopPx * sc;
    if (fanTopPx > 1) {
      const fanGrad = ctx.createLinearGradient(startX, startY, startX, startY + lengthPx * 0.48);
      fanGrad.addColorStop(0.0, `rgba(154, 62, 14, ${alpha * 0.74})`);
      fanGrad.addColorStop(0.45, `rgba(176, 78, 18, ${alpha * 0.38})`);
      fanGrad.addColorStop(1.0, 'rgba(176, 78, 18, 0.0)');
      ctx.fillStyle = fanGrad;
      ctx.beginPath();
      ctx.moveTo(startX - fanTopPx, startY);
      ctx.lineTo(startX + fanTopPx, startY);
      ctx.lineTo(startX + widthPx * 1.6, startY + lengthPx * 0.52);
      ctx.lineTo(startX - widthPx * 1.6, startY + lengthPx * 0.52);
      ctx.closePath();
      ctx.fill();
    }

    const haloGrad = ctx.createLinearGradient(startX, startY, startX, startY + lengthPx);
    haloGrad.addColorStop(0.0, `rgba(186, 86, 22, ${alpha * 0.48})`);
    haloGrad.addColorStop(0.55, `rgba(176, 78, 18, ${alpha * 0.28})`);
    haloGrad.addColorStop(1.0, 'rgba(176, 78, 18, 0.0)');
    ctx.strokeStyle = haloGrad;
    ctx.lineWidth = widthPx * 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    let cx = startX;
    ctx.moveTo(cx, startY);
    const steps = 8;
    const pathPts: Array<[number, number]> = [[cx, startY]];
    for (let s = 1; s <= steps; s += 1) {
      const sy = startY + (lengthPx * s) / steps;
      cx += (rng() - 0.5) * 3.0;
      ctx.lineTo(cx, sy);
      pathPts.push([cx, sy]);
    }
    ctx.stroke();

    const coreGrad = ctx.createLinearGradient(startX, startY, startX, startY + lengthPx);
    coreGrad.addColorStop(0.0, `rgba(112, 34, 8, ${alpha})`);
    coreGrad.addColorStop(0.35, `rgba(158, 56, 14, ${alpha * 0.90})`);
    coreGrad.addColorStop(0.82, `rgba(172, 68, 18, ${alpha * 0.50})`);
    coreGrad.addColorStop(1.0, 'rgba(172, 68, 18, 0.0)');
    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = widthPx;
    ctx.beginPath();
    ctx.moveTo(pathPts[0][0], pathPts[0][1]);
    for (let s = 1; s < pathPts.length; s += 1) {
      ctx.lineTo(pathPts[s][0], pathPts[s][1]);
    }
    ctx.stroke();

    bCtx.strokeStyle = '#585858';
    bCtx.lineWidth = widthPx * 1.2;
    bCtx.beginPath();
    bCtx.moveTo(pathPts[0][0], pathPts[0][1]);
    for (let s = 1; s < pathPts.length; s += 1) {
      bCtx.lineTo(pathPts[s][0], pathPts[s][1]);
    }
    bCtx.stroke();

    rCtx.strokeStyle = '#F6F6F6';
    rCtx.lineWidth = widthPx * 2.2;
    rCtx.beginPath();
    rCtx.moveTo(pathPts[0][0], pathPts[0][1]);
    for (let s = 1; s < pathPts.length; s += 1) {
      rCtx.lineTo(pathPts[s][0], pathPts[s][1]);
    }
    rCtx.stroke();
  };

  // 3. Variant-specific asymmetric photographic rust cascades (ZERO uniform barcode stripes!)
  if (variant === 'chalk_white') {
    // Open white front door (`ref_left_car_hood.png`):
    // 1 wide triangular burnt-orange cascade on middle-right + 1 medium left-center drip + 2 delicate hairline drips!
    paintRustRivulet(size * 0.61, beltStartY - 2, 240, 3.8, 0.94, 19);
    paintRustRivulet(size * 0.648, beltStartY + 6, 168, 2.2, 0.80, 9);
    paintRustRivulet(size * 0.36, beltStartY + 2, 152, 2.2, 0.74, 7);
    paintRustRivulet(size * 0.21, beltStartY + 8, 84, 1.5, 0.58, 0);
    paintRustRivulet(size * 0.83, beltStartY + 4, 118, 1.8, 0.66, 5);
    for (const u of [0.16, 0.35, 0.58, 0.63, 0.79, 0.90]) {
      paintRustRivulet(size * u + (rng() - 0.5) * 10, seamY, 26 + rng() * 44, 1.6 + rng() * 1.8, 0.74);
    }
  } else if (variant === 'olive_fender') {
    // Faded pistachio-olive front fender (`ref_left_car_hood.png`): subtle rust water stains along top hood seam!
    for (const [u, len, wid, al] of [
      [0.24, 92, 1.8, 0.62],
      [0.46, 128, 2.4, 0.72],
      [0.68, 76, 1.6, 0.54],
      [0.86, 145, 2.2, 0.68],
    ]) {
      paintRustRivulet(size * u, beltStartY - 8, len, wid, al, 5);
    }
  } else if (variant === 'chalk_rear') {
    // Right rear white quarter (`ref_right_car.png`): dirty aged chalk-white with light rust only at seams & 2 subtle drips!
    paintRustRivulet(size * 0.28, beltStartY + 18, 72, 1.5, 0.48, 0);
    paintRustRivulet(size * 0.74, beltStartY + 12, 95, 1.9, 0.56, 4);
    for (const u of [0.22, 0.48, 0.71, 0.88]) {
      paintRustRivulet(size * u, seamY, 22 + rng() * 36, 1.5 + rng() * 1.4, 0.62);
    }
  } else {
    // Detached foreground white door (`ref_left_car_hood.png` bottom-left): subtle oxidized smudges & grime!
    paintRustRivulet(size * 0.44, size * 0.42, 85, 2.0, 0.42, 6);
    paintRustRivulet(size * 0.72, size * 0.48, 64, 1.6, 0.36, 0);
  }

  // 4. Fine weathered hairline scratches only (ZERO round polka-dot blisters!)
  for (let i = 0; i < 36; i += 1) {
    const sx = rng() * size;
    const sy = beltStartY * 0.8 + rng() * (size * 0.7);
    const ang = (rng() - 0.5) * 1.2 + Math.PI * 0.5;
    const len = 10 + rng() * 38;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(84, 38, 14, 0.48)' : 'rgba(52, 50, 46, 0.34)';
    ctx.lineWidth = 0.9 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();

    bCtx.strokeStyle = '#424242';
    bCtx.lineWidth = 1.4;
    bCtx.beginPath();
    bCtx.moveTo(sx, sy);
    bCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.ClampToEdgeWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  return { map, bumpMap, roughnessMap };
}

/* ==========================================================================
   3. MULTI-PART SCULPTED 3D SUB-ASSEMBLIES (`StoryProps.js` & `customArtifacts.js` Craftsmanship)
   ========================================================================== */

export function buildVaz2105FrontNoseAssembly(
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();
  g.name = 'Vaz2105FrontNose';

  const matteGrilleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x111316,
      roughness: 0.84,
      metalness: 0.18,
    })
  );
  const weatheredChromeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8e969e,
      roughness: 0.42,
      metalness: 0.78,
    })
  );
  const reflectorBlueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x243a68,
      emissive: new THREE.Color(0x0b3a9c),
      emissiveIntensity: 0.34,
      roughness: 0.22,
      metalness: 0.85,
    })
  );
  const amberCornerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8c420c,
      emissive: new THREE.Color(0x3a1402),
      emissiveIntensity: 0.16,
      roughness: 0.46,
      metalness: 0.18,
    })
  );

  const backPlate = new THREE.Mesh(track(new THREE.BoxGeometry(0.76, 0.21, 0.03)), matteGrilleMat);
  backPlate.position.set(0, 0.565, 1.905);
  g.add(backPlate);

  const slatGeo = track(new THREE.BoxGeometry(0.74, 0.008, 0.042));
  for (let i = 0; i < 9; i += 1) {
    const slat = new THREE.Mesh(slatGeo, matteGrilleMat);
    slat.position.set(0, 0.478 + i * 0.0215, 1.918);
    g.add(slat);
  }

  const topTrim = new THREE.Mesh(track(new THREE.BoxGeometry(0.78, 0.014, 0.046)), weatheredChromeMat);
  topTrim.position.set(0, 0.668, 1.920);
  const botTrim = new THREE.Mesh(track(new THREE.BoxGeometry(0.78, 0.014, 0.046)), weatheredChromeMat);
  botTrim.position.set(0, 0.462, 1.920);
  const badge = new THREE.Mesh(track(new THREE.BoxGeometry(0.046, 0.068, 0.052)), weatheredChromeMat);
  badge.position.set(0, 0.568, 1.925);
  const badgeCore = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.032, 0.050, 0.055)),
    track(new THREE.MeshStandardMaterial({ color: 0x5c1412, roughness: 0.55 }))
  );
  badgeCore.position.set(0, 0.568, 1.926);
  g.add(topTrim, botTrim, badge, badgeCore);

  for (const sgn of [-1, 1]) {
    const bezel = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.175, 0.042)), matteGrilleMat);
    bezel.position.set(sgn * 0.515, 0.565, 1.908);
    g.add(bezel);

    const reflector = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.205, 0.145, 0.048)),
      reflectorBlueMat
    );
    reflector.position.set(sgn * 0.505, 0.565, 1.914);
    g.add(reflector);

    const amberTurn = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.068, 0.145, 0.048)),
      amberCornerMat
    );
    amberTurn.position.set(sgn * 0.655, 0.565, 1.906);
    g.add(amberTurn);
  }

  const cowlVent = new THREE.Mesh(track(new THREE.BoxGeometry(1.26, 0.03, 0.14)), matteGrilleMat);
  cowlVent.position.set(0, 0.745, 0.80);
  g.add(cowlVent);

  for (const wx of [-0.34, 0.22]) {
    const wiperArm = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.012, 0.016)), matteGrilleMat);
    wiperArm.position.set(wx + 0.16, 0.785, 0.73);
    wiperArm.rotation.set(-0.55, 0.12, 0.08);
    g.add(wiperArm);
  }

  return g;
}

export function buildFrontWheelArchInternals(
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();
  g.position.set(0.54, 0.36, 1.36);

  const innerWall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.56, 0.42)),
    track(new THREE.MeshBasicMaterial({ color: 0x060304, side: THREE.DoubleSide }))
  );
  innerWall.rotation.y = Math.PI * 0.5;
  innerWall.position.set(-0.18, 0.04, 0);
  g.add(innerWall);

  const rustedSuspMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b1e14,
      emissive: new THREE.Color(0x520a04),
      emissiveIntensity: 0.22,
      roughness: 0.72,
      metalness: 0.62,
    })
  );

  const armGeo = track(new THREE.CylinderGeometry(0.016, 0.018, 0.32, 8));
  for (const [ay, az, rz] of [
    [0.11, 0.09, 1.25],
    [0.11, -0.09, 1.25],
    [-0.09, 0.11, 1.48],
    [-0.09, -0.11, 1.48],
  ]) {
    const arm = new THREE.Mesh(armGeo, rustedSuspMat);
    arm.position.set(-0.06, ay, az);
    arm.rotation.z = rz;
    g.add(arm);
  }

  const knuckle = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.24, 0.08)), rustedSuspMat);
  knuckle.position.set(0.06, 0.01, 0.0);
  const caliper = new THREE.Mesh(track(new THREE.BoxGeometry(0.075, 0.11, 0.095)), rustedSuspMat);
  caliper.position.set(0.09, 0.05, -0.09);
  g.add(knuckle, caliper);

  return g;
}

export function buildVaz2105RearClusterAndSeatExtras(
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();

  const housingMat = track(
    new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.78, metalness: 0.25 })
  );
  const redBrakeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x7a1610,
      emissive: new THREE.Color(0x320604),
      emissiveIntensity: 0.18,
      roughness: 0.42,
    })
  );
  const amberTurnMat = track(
    new THREE.MeshStandardMaterial({ color: 0x8e480e, roughness: 0.45 })
  );
  const reverseWhiteMat = track(
    new THREE.MeshStandardMaterial({ color: 0x9ca09e, roughness: 0.48 })
  );

  const lampCluster = new THREE.Group();
  lampCluster.position.set(0.54, 0.58, -1.875);
  const bezel = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.115, 0.05)), housingMat);
  const brakeSeg = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.092, 0.056)), redBrakeMat);
  brakeSeg.position.x = -0.08;
  const revSeg = new THREE.Mesh(track(new THREE.BoxGeometry(0.065, 0.092, 0.056)), reverseWhiteMat);
  revSeg.position.x = 0.03;
  const turnSeg = new THREE.Mesh(track(new THREE.BoxGeometry(0.095, 0.092, 0.056)), amberTurnMat);
  turnSeg.position.x = 0.115;
  lampCluster.add(bezel, brakeSeg, revSeg, turnSeg);
  g.add(lampCluster);

  // Rectangular red/amber VAZ-2105 rear quarter side-marker reflector (`ref_right_car.png`!)
  const sideMarkerBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.022, 0.042, 0.145)),
    housingMat
  );
  sideMarkerBezel.position.set(0.742, 0.56, -1.66);
  const sideMarkerLens = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.028, 0.030, 0.125)),
    redBrakeMat
  );
  sideMarkerLens.position.set(0.745, 0.56, -1.66);
  g.add(sideMarkerBezel, sideMarkerLens);

  const pleatMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0b0e0c,
      roughness: 0.54,
      metalness: 0.06,
    })
  );
  const pleatGeo = track(new THREE.CapsuleGeometry(0.024, 0.98, 5, 10));
  for (let p = 0; p < 5; p += 1) {
    const pleat = new THREE.Mesh(pleatGeo, pleatMat);
    pleat.rotation.z = Math.PI * 0.5;
    pleat.position.set(0.0, 0.46 + p * 0.085, -0.92 - p * 0.042);
    g.add(pleat);
  }

  return g;
}

export function buildVaz2105SideMirror(
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();
  const mat = track(
    new THREE.MeshStandardMaterial({
      color: 0x101215,
      roughness: 0.76,
      metalness: 0.18,
    })
  );
  const stalk = new THREE.Mesh(track(new THREE.BoxGeometry(0.055, 0.032, 0.045)), mat);
  stalk.position.set(0.032, 0.21, -0.18);
  const housing = new THREE.Mesh(track(new THREE.BoxGeometry(0.115, 0.088, 0.052)), mat);
  housing.position.set(0.078, 0.235, -0.19);
  housing.rotation.y = 0.22;
  g.add(stalk, housing);
  return g;
}

export function buildOpenEngineBayMechanicals(
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();

  const alloyBlueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a4688,
      emissive: new THREE.Color(0x0a38b8),
      emissiveIntensity: 0.42,
      roughness: 0.24,
      metalness: 0.88,
    })
  );
  const brightChromeBlueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x72a8ff,
      emissive: new THREE.Color(0x1e6cff),
      emissiveIntensity: 0.72,
      roughness: 0.16,
      metalness: 0.94,
    })
  );
  const darkBlockMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0a1020,
      roughness: 0.68,
      metalness: 0.55,
    })
  );

  const block = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.22, 0.56)), darkBlockMat);
  block.position.set(0.02, 0.50, 1.34);
  const valveCover = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.085, 0.50)), alloyBlueMat);
  valveCover.position.set(0.02, 0.635, 1.34);
  const oilCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.036, 0.038, 0.028, 14)),
    brightChromeBlueMat
  );
  oilCap.position.set(0.02, 0.688, 1.50);
  g.add(block, valveCover, oilCap);

  const airPan = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.165, 0.175, 0.068, 20)),
    alloyBlueMat
  );
  airPan.position.set(-0.14, 0.648, 1.28);
  g.add(airPan);

  const runnerGeo = track(new THREE.CylinderGeometry(0.020, 0.022, 0.22, 10));
  for (let r = 0; r < 4; r += 1) {
    const runner = new THREE.Mesh(runnerGeo, brightChromeBlueMat);
    runner.rotation.z = 1.15;
    runner.position.set(-0.14, 0.59, 1.14 + r * 0.125);
    g.add(runner);
  }

  const alternator = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.068, 0.068, 0.11, 14)),
    brightChromeBlueMat
  );
  alternator.rotation.x = Math.PI * 0.5;
  alternator.position.set(0.24, 0.57, 1.56);
  const battery = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.16, 0.16)), darkBlockMat);
  battery.position.set(-0.38, 0.56, 1.56);
  const radTopBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.86, 0.055, 0.065)), alloyBlueMat);
  radTopBar.position.set(0.0, 0.63, 1.76);
  g.add(alternator, battery, radTopBar);

  return g;
}

export function buildBotanical3DHayMound(
  tuftSpecs: ReadonlyArray<{
    pos: THREE.Vector3;
    yaw: number;
    tiltX: number;
    tiltZ: number;
    height: number;
    spread: number;
    rgb: [number, number, number];
  }>,
  disposables: Array<{ dispose: () => void }>
): THREE.InstancedMesh {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  // 6-shoot one-way wind-swept curved meadow sedge & dry grass ribbon (`segs = 6`, `y >= 0` everywhere so ZERO spikes poke up like a sea-urchin or down through car ceilings!)
  const segs = 6;
  const shoots = 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const shootAngles = [-0.46, -0.26, -0.08, 0.11, 0.29, 0.48];
  const shootReach = [0.76, 0.94, 1.08, 0.86, 1.02, 0.72];
  const shootCrown = [0.34, 0.42, 0.30, 0.46, 0.36, 0.28];

  let vBase = 0;
  for (let s = 0; s < shoots; s += 1) {
    const ang = shootAngles[s];
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const maxR = shootReach[s];
    const crown = shootCrown[s];
    const waveSide = (s % 2 === 0 ? 1 : -1) * 0.045;

    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      const reach = maxR * Math.pow(t, 1.18);
      // Rises smoothly into a low wind-combed arch and settles gently (`y >= 0.0` across [0..1] -> NEVER pierces roofs!)
      const y = Math.sin(t * Math.PI * 0.78) * crown;
      const w = 0.036 * Math.max(0.0, 1.0 - Math.pow(t, 1.35));
      const swayX = Math.sin(t * Math.PI) * waveSide;

      if (i < segs) {
        const lxL = swayX - w;
        const lzL = reach;
        const lxR = swayX + w;
        const lzR = reach;

        positions.push(
          ca * lxL - sa * lzL, y, sa * lxL + ca * lzL,
          ca * lxR - sa * lzR, y, sa * lxR + ca * lzR
        );
        normals.push(-0.18 * ca, 0.96, -0.18 * sa, 0.18 * ca, 0.96, 0.18 * sa);
        uvs.push(0, t, 1, t);
      } else {
        positions.push(ca * swayX - sa * reach, y * 0.82, sa * swayX + ca * reach);
        normals.push(0, 1, 0);
        uvs.push(0.5, 1.0);
      }
    }

    for (let i = 0; i < segs; i += 1) {
      const r0 = vBase + i * 2;
      const r1 = vBase + (i + 1) * 2;
      if (i < segs - 1) {
        indices.push(r0, r0 + 1, r1, r0 + 1, r1 + 1, r1);
      } else {
        indices.push(r0, r0 + 1, r1);
      }
    }
    vBase += segs * 2 + 1;
  }

  const geo = track(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0x161005),
      emissiveIntensity: 0.35,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );
  // Orient shading normal strictly toward sky (+Y world) so unshadowed cabin PointLights below car roofs never tint roof hay red/green!
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'varying vec3 vSkyUpView;\n' +
      shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
         vSkyUpView = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`
      );
    shader.fragmentShader =
      'varying vec3 vSkyUpView;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         normal = normalize(mix(normal, vSkyUpView, 0.92));
         if (dot(normal, vSkyUpView) < 0.0) normal = vSkyUpView;`
      );
  };

  const inst = new THREE.InstancedMesh(geo, mat, tuftSpecs.length);
  inst.castShadow = true;
  inst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < tuftSpecs.length; i += 1) {
    const sp = tuftSpecs[i];
    dummy.position.copy(sp.pos);
    dummy.rotation.set(sp.tiltX, sp.yaw, sp.tiltZ);
    dummy.scale.set(sp.spread, sp.height, sp.spread);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    col.setRGB(sp.rgb[0], sp.rgb[1], sp.rgb[2]);
    inst.setColorAt(i, col);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  return inst;
}

/**
 * Soft Volumetric Interior Cabin Smoke & Mist Builder (`buildVolumetricCabinSmoke`):
 * Creates layered wispy FBM smoke planes *inside* the enclosed car cabin (behind the clear
 * windshield & seats) so crimson-red / emerald-green light emanates like a dreamy, hazy cloud
 * from inside the car (`chỉ như một lớp khói mờ mờ từ trong xe`) rather than an opaque red glass board!
 */
export function buildVolumetricCabinSmoke(
  tintHex: number,
  puffSpecs: ReadonlyArray<{ pos: [number, number, number]; rot: [number, number, number]; scale: [number, number]; opacity: number }>,
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    const ny = (y / (size - 1)) * 2.0 - 1.0;
    for (let x = 0; x < size; x += 1) {
      const nx = (x / (size - 1)) * 2.0 - 1.0;
      const r2 = nx * nx + ny * ny;
      const radial = Math.max(0.0, 1.0 - r2);
      const wisp =
        fbm2D(x * 0.045 + 3.1, y * 0.045 - 1.7, 4) * 0.68 +
        fbm2D(x * 0.095 - 5.4, y * 0.095 + 4.2, 3) * 0.32;
      const alpha = Math.pow(radial, 1.85) * Math.max(0.0, Math.min(1.0, (wisp - 0.18) * 1.45));
      const idx = (y * size + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
      img.data[idx + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  const smokeTex = track(new THREE.CanvasTexture(canvas));
  const group = new THREE.Group();
  const planeGeo = track(new THREE.PlaneGeometry(1, 1));

  for (const sp of puffSpecs) {
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: tintHex,
        map: smokeTex,
        transparent: true,
        opacity: sp.opacity,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
      })
    );
    const m = new THREE.Mesh(planeGeo, mat);
    m.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
    m.rotation.set(sp.rot[0], sp.rot[1], sp.rot[2]);
    m.scale.set(sp.scale[0], sp.scale[1], 1.0);
    m.renderOrder = 4;
    group.add(m);
  }
  return group;
}

/**
 * Subtle Dusty / Condensed Automotive Windshield Surface Texture (`createDirtyWindshieldAlphaMap`):
 * Clear in the center swept wiper arcs so the steering wheel, dashboard & red cabin smoke are clearly
 * visible through the glass, with subtle dirt/condensation around the perimeter corners (`mv_3m28_left_car_door.png`)!
 */
export function createDirtyWindshieldTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const edgeDist = Math.min(u, 1.0 - u, v, 1.0 - v);
      const cornerDirt = 1.0 - Math.min(1.0, edgeDist / 0.24);
      // Clearer swept wiper arc on the left/center so the round Lada steering wheel & dashboard show clearly through the crimson haze!
      const wiperDist = Math.hypot((u - 0.34) * 1.15, (v - 0.58) * 1.05);
      const wiperClear = wiperDist < 0.34 ? (1.0 - wiperDist / 0.34) * 0.45 : 0.0;
      const n = fbm2D(x * 0.055 + 2.3, y * 0.055 - 4.1, 4);
      const grime = Math.max(0.0, Math.min(1.0, cornerDirt * 0.62 + Math.max(0, n - 0.42) * 0.58 - wiperClear));
      const idx = (y * w + x) * 4;
      img.data[idx] = Math.round(186 + grime * 48);
      img.data[idx + 1] = Math.round(118 + grime * 34);
      img.data[idx + 2] = Math.round(114 + grime * 28);
      img.data[idx + 3] = Math.round((0.20 + grime * 0.38) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Organic Earthen Peat/Moss Sod Clods + Wind-Flattened Gnarled Sedge & Trailing Vines (`buildOrganicRoofSodAndWeeds`):
 * Replaces uniform "crew-cut hairpiece" tufts (`lùm tóc công nghiệp`) with:
 * 1. Irregular sculpted 3D earthen peat & moss sod clods hugging asymmetric patches of the roof,
 * 2. Gnarled, kinked dead roots & long bent dry stalks trailing asymmetrically over the doorway & windshield,
 * 3. Uneven wind-flattened clusters of long & short dry sedge leaning at natural `65deg-85deg` angles!
 */
export function buildOrganicRoofSodAndWeeds(
  opts: {
    leftCarMatrix: THREE.Matrix4;
    rightCarMatrix: THREE.Matrix4;
    sampleHeight: (x: number, z: number) => number;
    rustNor: THREE.Texture;
    disposables: Array<{ dispose: () => void }>;
  }
): THREE.Group {
  const { leftCarMatrix, rightCarMatrix, sampleHeight, rustNor, disposables } = opts;
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const rng = mulberry32(77319);
  const outGroup = new THREE.Group();

  // 1. Sculpted 3D Earthen Peat & Moss Sod Clod Material
  const sodMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3a2e18,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughness: 0.96,
      metalness: 0.0,
    })
  );

  // Left & Right Car Roof Earthen Sod Beds (batched into 1 single GPU draw call!)
  const sodClodGeos: THREE.BufferGeometry[] = [];
  const sodMatrix = new THREE.Matrix4();
  const sodQuat = new THREE.Quaternion();
  const sodPos = new THREE.Vector3();
  const sodScale = new THREE.Vector3(1, 1, 1);
  const sodUpY = new THREE.Vector3(0, 1, 0);

  const pushSodClod = (
    carMatrix: THREE.Matrix4,
    lx: number,
    ly: number,
    lz: number,
    rx: number,
    ry: number,
    rz: number,
    sd: number
  ) => {
    const g = new THREE.SphereGeometry(1.0, 16, 10);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (y < 0) y *= 0.22;
      const n = fbm2D(x * 2.4 + sd, z * 2.4 - sd, 3);
      const bump = 0.68 + n * 0.62;
      pos.setXYZ(i, x * rx * bump, y * ry * (0.75 + n * 0.5), z * rz * bump);
    }
    g.computeVertexNormals();
    sodPos.set(lx, ly, lz).applyMatrix4(carMatrix);
    sodQuat.setFromAxisAngle(sodUpY, sd);
    sodMatrix.compose(sodPos, sodQuat, sodScale);
    g.applyMatrix4(sodMatrix);
    sodClodGeos.push(g);
  };

  for (const [lx, ly, lz, rx, ry, rz, sd] of [
    [0.24, 1.325, -0.14, 0.36, 0.065, 0.28, 1.7],
    [0.44, 1.312, -0.06, 0.26, 0.055, 0.24, 4.3],
    [-0.02, 1.328, -0.24, 0.28, 0.050, 0.22, 8.1],
    [-0.64, 0.805, 1.72, 0.14, 0.042, 0.15, 12.5],
  ]) {
    pushSodClod(leftCarMatrix, lx, ly, lz, rx, ry, rz, sd);
  }

  for (const [lx, ly, lz, rx, ry, rz, sd] of [
    [0.12, 1.322, -0.16, 0.42, 0.038, 0.34, 3.2],
    [-0.18, 1.322, -0.32, 0.32, 0.032, 0.26, 6.8],
    [0.0, 0.44, -1.54, 0.46, 0.08, 0.26, 9.4],
  ]) {
    pushSodClod(rightCarMatrix, lx, ly, lz, rx, ry, rz, sd);
  }

  const mergedSodGeo = track(mergeStaticBufferGeometries(sodClodGeos));
  sodClodGeos.forEach((g) => g.dispose());
  const sodMesh = new THREE.Mesh(mergedSodGeo, sodMat);
  sodMesh.castShadow = true;
  sodMesh.receiveShadow = true;
  outGroup.add(sodMesh);

  // 2. Gnarled Trailing Vines, Bent Dead Stalks & Knotted Rope/Roots (`TubeGeometry` curves batched into 1 draw call!)
  const stalkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x866c32,
      emissive: new THREE.Color(0x181206),
      emissiveIntensity: 0.30,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  stalkMat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'varying vec3 vStalkSkyUp;\n' +
      shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
         vStalkSkyUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`
      );
    shader.fragmentShader =
      'varying vec3 vStalkSkyUp;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         normal = normalize(mix(normal, vStalkSkyUp, 0.88));
         if (dot(normal, vStalkSkyUp) < 0.0) normal = vStalkSkyUp;`
      );
  };

  const stalkGeos: THREE.BufferGeometry[] = [];
  for (let s = 0; s < 34; s += 1) {
    const p0 = new THREE.Vector3(
      0.26 + rng() * 0.34,
      1.32 + rng() * 0.03,
      -0.34 + rng() * 0.48
    );
    const p1 = p0.clone().add(
      new THREE.Vector3(
        0.10 + rng() * 0.16,
        -0.05 - rng() * 0.12,
        (rng() - 0.5) * 0.18
      )
    );
    const p2 = p1.clone().add(
      new THREE.Vector3(
        0.04 + rng() * 0.10,
        -(0.16 + rng() * 0.24),
        (rng() - 0.5) * 0.18
      )
    );
    for (const pt of [p0, p1, p2]) pt.applyMatrix4(leftCarMatrix);
    stalkGeos.push(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 8, 0.0032 + rng() * 0.0028, 4, false)
    );
  }

  // Right car front-left roof knotted golden-tan rope loop sticking out + cabin vines!
  {
    const ropeMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x9c7832,
        emissive: new THREE.Color(0x1e1405),
        emissiveIntensity: 0.28,
        roughness: 0.92,
        metalness: 0.0,
      })
    );
    const ropePts = [
      new THREE.Vector3(0.56, 1.29, 0.14),
      new THREE.Vector3(0.61, 1.265, 0.30),
      new THREE.Vector3(0.54, 1.245, 0.27),
      new THREE.Vector3(0.57, 1.275, 0.15),
    ].map((p) => p.applyMatrix4(rightCarMatrix));
    outGroup.add(
      new THREE.Mesh(
        track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts), 14, 0.012, 6, false)),
        ropeMat
      )
    );
    for (let v = 0; v < 18; v += 1) {
      const vp0 = new THREE.Vector3(0.46 + rng() * 0.28, 0.28 + rng() * 0.18, -0.58 + rng() * 0.68).applyMatrix4(rightCarMatrix);
      const vp1 = vp0.clone().add(new THREE.Vector3((rng() - 0.5) * 0.24, 0.04 + rng() * 0.10, (rng() - 0.5) * 0.24));
      const vp2 = vp1.clone().add(new THREE.Vector3((rng() - 0.5) * 0.24, -0.08 - rng() * 0.10, (rng() - 0.5) * 0.24));
      stalkGeos.push(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([vp0, vp1, vp2]), 7, 0.0028 + rng() * 0.0020, 4, false)
      );
    }
  }

  const mergedStalksGeo = track(mergeStaticBufferGeometries(stalkGeos));
  stalkGeos.forEach((g) => g.dispose());
  outGroup.add(new THREE.Mesh(mergedStalksGeo, stalkMat));

  // 3. Asymmetric Wind-Swept Dry Meadow Grass & Cascading Doorway Straw (`mv_3m28_left_car_door.png` & `mv_3m28_right_car.png`!)
  // Because each tuft now sweeps cleanly in ONE direction (+Z local) with `y >= 0`, `tiltX ~ 0` keeps 100% of blades hugging
  // the top of the sod bed like wind-matted couch-grass (`không bao giờ xòe gai nhím hay đâm xuyên trần xe`)!
  const sedgeSpecs: Array<{
    pos: THREE.Vector3;
    yaw: number;
    tiltX: number;
    tiltZ: number;
    height: number;
    spread: number;
    rgb: [number, number, number];
  }> = [];

  // Left Car Roof: Asymmetric matted golden-olive sod clumps on right/rear half of roof (`mv_3m28_left_car_door.png`!)
  const leftCenters: Array<[number, number, number, number, number]> = [
    [0.32, -0.12, 0.34, 165, 1.35],
    [0.08, -0.24, 0.28, 110, 1.65],
    [0.48, 0.02, 0.24, 120, 1.15],
  ];
  for (const [cx, cz, radMax, count, flowYaw] of leftCenters) {
    for (let i = 0; i < count; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.68) * radMax;
      const lx = Math.max(-0.22, Math.min(0.60, cx + Math.cos(a) * r));
      const lz = Math.max(-0.46, Math.min(0.18, cz + Math.sin(a) * r * 0.85));
      const nearRightRim = lx > 0.46;
      const wp = new THREE.Vector3(lx, 1.332 + (1.0 - r / radMax) * 0.032, lz).applyMatrix4(leftCarMatrix);
      const shade = 0.34 + rng() * 0.34;
      const greenTouch = rng() > 0.68 ? 0.08 : 0.0;
      sedgeSpecs.push({
        pos: wp,
        yaw: (nearRightRim ? 1.48 : flowYaw) + (rng() - 0.5) * 1.05,
        tiltX: nearRightRim ? 0.42 + rng() * 0.32 : (rng() - 0.5) * 0.22,
        tiltZ: (rng() - 0.5) * 0.20,
        height: 0.14 + Math.pow(rng(), 1.4) * 0.22,
        spread: 0.18 + rng() * 0.14,
        rgb: [0.52 * shade, (0.42 + greenTouch) * shade, 0.15 * shade],
      });
    }
  }
  // Cascading dry golden grass & vines draping DOWN from outer roof gutter (+X = 0.61) behind open door (`mv_3m28_left_car_door.png`!)
  for (let d = 0; d < 64; d += 1) {
    const lx = 0.58 + rng() * 0.06;
    const ly = 1.24 + rng() * 0.07;
    const lz = -0.34 + rng() * 0.48;
    const wp = new THREE.Vector3(lx, ly, lz).applyMatrix4(leftCarMatrix);
    const shade = 0.34 + rng() * 0.30;
    sedgeSpecs.push({
      pos: wp,
      yaw: 1.52 + (rng() - 0.5) * 0.55,
      tiltX: 1.05 + rng() * 0.38,
      tiltZ: (rng() - 0.5) * 0.22,
      height: 0.14 + rng() * 0.16,
      spread: 0.20 + rng() * 0.12,
      rgb: [0.54 * shade, 0.42 * shade, 0.15 * shade],
    });
  }

  // Right Car Cut Roof: Low, flat, wind-combed golden-ochre sod & dry straw hugging the roof (`ZERO blades poking below roof`!)
  const rightClumps: Array<[number, number, number, number, number]> = [
    [0.20, -0.10, 0.34, 130, 0.35],
    [-0.10, -0.26, 0.32, 110, 0.65],
    [0.30, -0.38, 0.26, 95, 0.15],
  ];
  for (const [rcx, rcz, rRad, rCnt, rYaw] of rightClumps) {
    for (let i = 0; i < rCnt; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.68) * rRad;
      const lx = Math.max(-0.46, Math.min(0.56, rcx + Math.cos(a) * r));
      const lz = Math.max(-0.58, Math.min(0.14, rcz + Math.sin(a) * r));
      const wp = new THREE.Vector3(lx, 1.326 + (1.0 - r / rRad) * 0.024, lz).applyMatrix4(rightCarMatrix);
      const shade = 0.38 + rng() * 0.32;
      sedgeSpecs.push({
        pos: wp,
        yaw: rYaw + (rng() - 0.5) * 1.15,
        tiltX: (rng() - 0.5) * 0.16,
        tiltZ: (rng() - 0.5) * 0.16,
        height: 0.10 + Math.pow(rng(), 1.5) * 0.14,
        spread: 0.16 + rng() * 0.12,
        rgb: [0.56 * shade, 0.44 * shade, 0.16 * shade],
      });
    }
  }

  // Right Car Open Trunk Cavity (`z in [-1.80..-1.24]`): Wild weeds & straw sprouting inside trunk (`mv_1m50s_right_car_zoom.png`!)
  for (let i = 0; i < 110; i += 1) {
    const lx = -0.52 + rng() * 1.04;
    const lz = -1.80 + rng() * 0.54;
    const wp = new THREE.Vector3(lx, 0.48 + rng() * 0.06, lz).applyMatrix4(rightCarMatrix);
    const shade = 0.28 + rng() * 0.28;
    sedgeSpecs.push({
      pos: wp,
      yaw: rng() * Math.PI * 2,
      tiltX: (rng() - 0.5) * 0.65,
      tiltZ: (rng() - 0.5) * 0.65,
      height: 0.10 + rng() * 0.15,
      spread: 0.15 + rng() * 0.10,
      rgb: [0.34 * shade, 0.38 * shade, 0.12 * shade],
    });
  }

  // Inside Both Foreground Rubber Tires (`mv_3m28s_1080p.png`!)
  for (const [cx, cz, cnt] of [
    [-0.58, 4.46, 110],
    [1.76, 4.08, 95],
  ] as const) {
    for (let r = 0; r < cnt; r += 1) {
      const ang = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * 0.16;
      const tx = cx + Math.cos(ang) * rad;
      const tz = cz + Math.sin(ang) * rad;
      const shade = 0.26 + rng() * 0.24;
      sedgeSpecs.push({
        pos: new THREE.Vector3(tx, sampleHeight(tx, tz) + 0.04, tz),
        yaw: rng() * Math.PI * 2,
        tiltX: (rng() - 0.5) * 0.72,
        tiltZ: (rng() - 0.5) * 0.72,
        height: 0.08 + rng() * 0.10,
        spread: 0.14 + rng() * 0.08,
        rgb: [0.38 * shade, 0.29 * shade, 0.11 * shade],
      });
    }
  }

  outGroup.add(buildBotanical3DHayMound(sedgeSpecs, disposables));
  return outGroup;
}

/**
 * Complete Forensic Scattered Ground Debris Assembly (`mv_3m28_center_debris.png` & `mv_3m28_right_car.png`):
 * Adds every distinct mechanical/automotive object visible on the ground in the 1080p MV frames:
 * 1. Finned Radiator Core + Round Cooling Fan Shroud & 5-Blade Fan (`x = -0.82, z = 1.58`)
 * 2. Ribbed Corrugated U-Bent Air-Intake Hose + 5-Hole Perforated Belt Pulley & Starter Motor (`x = -0.36, z = 1.68`)
 * 3. Flat Silver-Grey Vented Brake Rotor Disc with Rusted Central Hat & Lug Holes (`x = +0.94, z = 1.54`)
 * 4. Upright Weathered Grey-Green Bucket Seat Backrest with White Piping Trim inside right half of bush (`x = +0.62, z = 0.22`)
 * 5. Weathered Metal Canister / Filter + Coiled Hose under front-left cut sill of right car (`x = +1.52, z = 1.66`)
 * 6. Crumpled Bumper/License Scrap at bottom-right corner (`x = +3.16, z = 3.88`)
 */
export function buildForensicGroundDebrisProps(
  rustNor: THREE.Texture,
  sampleHeight: (x: number, z: number) => number,
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const g = new THREE.Group();

  // Procedural 256x256 Heavy Rust, Oil-Grease, Peeling Paint & Damp Moss Albedo Maps (`thể hiện rõ sự cũ kĩ, dầm mưa dãi nắng`)
  const makeGrimeTex = (
    baseRgb: [number, number, number],
    rustAmt: number,
    greaseAmt: number,
    mossAmt: number,
    seed: number,
    radialRotor = false
  ): THREE.CanvasTexture => {
    const sz = 256;
    const cv = document.createElement('canvas');
    cv.width = sz;
    cv.height = sz;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(sz, sz);
    const rng = mulberry32(seed);

    for (let y = 0; y < sz; y += 1) {
      const ny = y / (sz - 1) - 0.5;
      for (let x = 0; x < sz; x += 1) {
        const nx = x / (sz - 1) - 0.5;
        const rad = Math.hypot(nx, ny) * 2.0;
        const n1 = fbm2D(x * 0.045 + seed * 0.13, y * 0.045 - seed * 0.07, 4);
        const n2 = fbm2D(x * 0.14 - 3.7, y * 0.14 + 5.1, 3);
        let [r, gr, b] = baseRgb;

        if (radialRotor) {
          // Concentric lathe brake-pad score rings + heavy oxidized orange-brown rust scabs!
          const groove = Math.sin(rad * 68.0 + n2 * 2.5) * 0.5 + 0.5;
          const darkScore = 0.72 + groove * 0.28;
          r *= darkScore;
          gr *= darkScore;
          b *= darkScore;
        }

        // Blotchy burnt-sienna & dark iron-oxide rust crusts
        const rustMask = Math.max(0, Math.min(1, (n1 - (0.48 - rustAmt * 0.28)) * 3.1));
        r = r * (1 - rustMask) + (108 + n2 * 38) * rustMask;
        gr = gr * (1 - rustMask) + (48 + n2 * 22) * rustMask;
        b = b * (1 - rustMask) + (22 + n2 * 12) * rustMask;

        // Damp dark olive-brown meadow moss & soil stains (stronger toward bottom / one side)
        const edgeBias = radialRotor ? Math.max(0, nx + 0.25) : 1.0 - y / sz;
        const mossMask = Math.max(0, Math.min(1, (fbm2D(x * 0.06 + 11.2, y * 0.06 + 7.4, 4) * 0.8 + edgeBias * 0.45 - (0.72 - mossAmt * 0.35)) * 2.8));
        r = r * (1 - mossMask) + 46 * mossMask;
        gr = gr * (1 - mossMask) + 54 * mossMask;
        b = b * (1 - mossMask) + 26 * mossMask;

        // Black motor-oil / soot smudges & pitting specks
        const greaseMask = Math.max(0, Math.min(1, (n2 - (0.62 - greaseAmt * 0.28)) * 3.4));
        const soot = 1.0 - greaseMask * 0.74 - (rng() > 0.94 ? 0.32 : 0.0);
        const idx = (y * sz + x) * 4;
        img.data[idx] = Math.max(8, Math.min(255, Math.round(r * soot)));
        img.data[idx + 1] = Math.max(8, Math.min(255, Math.round(gr * soot)));
        img.data[idx + 2] = Math.max(8, Math.min(255, Math.round(b * soot)));
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Scratches, rust drip streaks & lug holes (for brake rotor)
    if (radialRotor) {
      ctx.fillStyle = '#120d0a';
      for (let k = 0; k < 5; k += 1) {
        const a = (k * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(sz * 0.5 + Math.cos(a) * sz * 0.16, sz * 0.5 + Math.sin(a) * sz * 0.16, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let s = 0; s < 26; s += 1) {
        ctx.strokeStyle = s % 2 === 0 ? 'rgba(68, 28, 12, 0.48)' : 'rgba(18, 16, 14, 0.42)';
        ctx.lineWidth = 1.2 + rng() * 2.6;
        const sx = rng() * sz;
        const sy = rng() * sz;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rng() - 0.5) * 24, sy + 18 + rng() * 44);
        ctx.stroke();
      }
    }

    const t = track(new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  const rotorDiscMap = makeGrimeTex([138, 140, 136], 0.78, 0.55, 0.52, 9101, true);
  const canGrimeMap = makeGrimeTex([122, 124, 118], 0.72, 0.68, 0.62, 9102, false);
  const pulleyGrimeMap = makeGrimeTex([136, 112, 74], 0.76, 0.62, 0.48, 9103, true);
  const seatVinylGrimeMap = makeGrimeTex([52, 68, 60], 0.45, 0.65, 0.68, 9104, false);
  const pipingDirtyMap = makeGrimeTex([174, 172, 158], 0.58, 0.55, 0.52, 9105, false);

  const rustedSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x724222,
      map: canGrimeMap,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.88,
      metalness: 0.42,
    })
  );
  const rotorIronMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rotorDiscMap,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.78,
      metalness: 0.46,
    })
  );
  const canWeatheredMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: canGrimeMap,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughness: 0.84,
      metalness: 0.44,
    })
  );
  const matteRubberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b1a18,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const darkCastMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x362c24,
      map: canGrimeMap,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.86,
      metalness: 0.44,
    })
  );

  // 1. Corroded Rectangular Radiator Core + Crushed Finned Tubes + Rusted Fan Shroud (`mv_3m28_center_debris.png` left heap!)
  {
    const radGrp = new THREE.Group();
    const core = new THREE.Mesh(track(new THREE.BoxGeometry(0.54, 0.055, 0.38)), rustedSteelMat);
    const tankL = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.072, 0.40)), darkCastMat);
    tankL.position.x = -0.27;
    const tankR = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.072, 0.40)), darkCastMat);
    tankR.position.x = 0.27;
    const shroud = new THREE.Mesh(track(new THREE.TorusGeometry(0.155, 0.018, 10, 24)), rustedSteelMat);
    shroud.rotation.x = Math.PI * 0.5;
    shroud.position.y = 0.042;
    const fanHub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14)), darkCastMat);
    fanHub.position.y = 0.042;
    radGrp.add(core, tankL, tankR, shroud, fanHub);
    for (let b = 0; b < 5; b += 1) {
      const ang = (b * Math.PI * 2) / 5;
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.006, 0.036)), rustedSteelMat);
      blade.position.set(Math.cos(ang) * 0.085, 0.042, Math.sin(ang) * 0.085);
      blade.rotation.set(0.28 + (b === 2 ? 0.22 : 0), -ang, b === 4 ? -0.18 : 0);
      radGrp.add(blade);
    }
    const rx = -0.78;
    const rz = 1.62;
    radGrp.position.set(rx, sampleHeight(rx, rz) + 0.105, rz);
    radGrp.rotation.set(0.32, 0.54, -0.24);
    g.add(radGrp);
  }

  // 2. U-Bent Mud-Crusted Corrugated Air-Intake Hose + Rusted 5-Hole Belt Pulley & Starter Motor
  {
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.06, sampleHeight(-1.06, 1.38) + 0.10, 1.38),
      new THREE.Vector3(-0.96, sampleHeight(-0.96, 1.32) + 0.28, 1.32),
      new THREE.Vector3(-0.78, sampleHeight(-0.78, 1.36) + 0.17, 1.36),
    ]);
    const hMesh = new THREE.Mesh(track(new THREE.TubeGeometry(hoseCurve, 22, 0.038, 10, false)), matteRubberMat);
    g.add(hMesh);

    const px = -0.34;
    const pz = 1.72;
    const py = sampleHeight(px, pz);
    const motor = new THREE.Mesh(track(new THREE.CylinderGeometry(0.065, 0.065, 0.25, 16)), rustedSteelMat);
    motor.position.set(px - 0.06, py + 0.115, pz - 0.06);
    motor.rotation.set(0.35, 0.42, Math.PI * 0.42);
    const pulley = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.112, 0.112, 0.026, 22)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: pulleyGrimeMap,
          normalMap: rustNor,
          normalScale: new THREE.Vector2(0.85, 0.85),
          roughness: 0.84,
          metalness: 0.44,
        })
      )
    );
    pulley.position.set(px, py + 0.14, pz + 0.03);
    pulley.rotation.set(Math.PI * 0.44, -0.22, 0.12);
    const pulleyCenter = new THREE.Mesh(track(new THREE.CylinderGeometry(0.034, 0.034, 0.034, 14)), darkCastMat);
    pulleyCenter.position.copy(pulley.position);
    pulleyCenter.rotation.copy(pulley.rotation);
    g.add(motor, pulley, pulleyCenter);
  }

  // 3. Heavily Pitted, Rust-Scabbed Vented Brake Rotor Disc (`mv_3m28_center_debris.png` — oxidized iron, NOT shiny new!)
  {
    const bx = 0.94;
    const bz = 1.54;
    const by = sampleHeight(bx, bz) + 0.135;
    const rotorGrp = new THREE.Group();
    const outerRing = new THREE.Mesh(track(new THREE.CylinderGeometry(0.232, 0.232, 0.024, 30)), rotorIronMat);
    const centerHat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.112, 0.124, 0.042, 22)), rustedSteelMat);
    centerHat.position.y = 0.014;
    const boreHole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.038, 0.038, 0.048, 16)), matteRubberMat);
    boreHole.position.y = 0.015;
    rotorGrp.add(outerRing, centerHat, boreHole);
    rotorGrp.position.set(bx, by, bz);
    rotorGrp.rotation.set(0.30, -0.28, -0.08);
    g.add(rotorGrp);
  }

  // 4. Mildew-Stained Weathered Bucket Seat Backrest with Yellowed Cracked Piping inside bush (`mv_3m28_center_debris.png`!)
  {
    const seatGrp = new THREE.Group();
    const cushionMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: seatVinylGrimeMap,
        normalMap: rustNor,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.88,
        metalness: 0.06,
      })
    );
    const pipingMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: pipingDirtyMap,
        roughness: 0.84,
        metalness: 0.08,
      })
    );
    const backShell = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.205, 0.52, 8, 16)), cushionMat);
    backShell.scale.set(1.0, 1.0, 0.36);
    const pipeArch = new THREE.Mesh(track(new THREE.TorusGeometry(0.208, 0.013, 8, 26, Math.PI * 1.15)), pipingMat);
    pipeArch.position.set(0, 0.24, 0.035);
    pipeArch.rotation.z = -Math.PI * 0.08;
    const pipeSideR = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 8)), pipingMat);
    pipeSideR.position.set(0.205, 0.0, 0.035);
    seatGrp.add(backShell, pipeArch, pipeSideR);
    const sx = 0.62;
    const sz = 0.22;
    seatGrp.position.set(sx, sampleHeight(sx, sz) + 0.50, sz);
    seatGrp.rotation.set(-0.10, -0.28, -0.10);
    g.add(seatGrp);
  }

  // 5. Dented, Oil-And-Rust-Stained Metal Filter Canister + Coiled Hose at front-left cut sill of Right Car!
  {
    const cx = 1.52;
    const cz = 1.66;
    const cy = sampleHeight(cx, cz) + 0.132;
    const canGeo = track(new THREE.CylinderGeometry(0.074, 0.078, 0.21, 18, 4));
    const cPos = canGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cPos.count; i += 1) {
      const dent = 1.0 - 0.12 * Math.max(0, Math.sin(cPos.getY(i) * 18.0 + cPos.getX(i) * 14.0));
      cPos.setX(i, cPos.getX(i) * dent);
      cPos.setZ(i, cPos.getZ(i) * dent);
    }
    canGeo.computeVertexNormals();
    const can = new THREE.Mesh(canGeo, canWeatheredMat);
    can.position.set(cx, cy, cz);
    can.rotation.set(0.42, 0.62, Math.PI * 0.44);
    const rimCap = new THREE.Mesh(track(new THREE.TorusGeometry(0.076, 0.010, 8, 18)), rustedSteelMat);
    rimCap.position.set(cx - 0.05, cy + 0.02, cz + 0.04);
    rimCap.rotation.set(0.42, 0.62, 0);
    g.add(can, rimCap);
  }

  // 6. Bent, Mud-Caked Crumpled Bumper Corner Scrap at Far Bottom-Right!
  {
    const scx = 3.16;
    const scz = 3.88;
    const scrapGeo = track(new THREE.BoxGeometry(0.28, 0.085, 0.16, 4, 2, 3));
    const sPos = scrapGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sPos.count; i += 1) {
      sPos.setY(i, sPos.getY(i) + Math.sin(sPos.getX(i) * 11.0) * 0.018);
    }
    scrapGeo.computeVertexNormals();
    const scrap = new THREE.Mesh(scrapGeo, darkCastMat);
    scrap.position.set(scx, sampleHeight(scx, scz) + 0.105, scz);
    scrap.rotation.set(0.32, -0.58, 0.44);
    g.add(scrap);
  }

  g.traverse((ch) => {
    if ((ch as THREE.Mesh).isMesh) {
      ch.castShadow = true;
      ch.receiveShadow = true;
    }
  });
  return g;
}

export function buildFinnedAutomotiveEcu(
  rustNor: THREE.Texture,
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const ecu = new THREE.Group();

  // Oxidized, mud-splattered & corroded die-cast aluminum map for ECU (`không còn bóng mới`)
  const ecuCanvas = document.createElement('canvas');
  ecuCanvas.width = 128;
  ecuCanvas.height = 128;
  const ectx = ecuCanvas.getContext('2d')!;
  const eimg = ectx.createImageData(128, 128);
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      const n = fbm2D(x * 0.08 + 4.1, y * 0.08 - 2.3, 4);
      const mud = Math.max(0, (n - 0.46) * 2.2);
      const idx = (y * 128 + x) * 4;
      eimg.data[idx] = Math.round(126 * (1 - mud) + 74 * mud);
      eimg.data[idx + 1] = Math.round(128 * (1 - mud) + 56 * mud);
      eimg.data[idx + 2] = Math.round(122 * (1 - mud) + 34 * mud);
      eimg.data[idx + 3] = 255;
    }
  }
  ectx.putImageData(eimg, 0, 0);
  const ecuTex = track(new THREE.CanvasTexture(ecuCanvas));
  ecuTex.colorSpace = THREE.SRGBColorSpace;

  const castAlumMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: ecuTex,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.82,
      metalness: 0.42,
    })
  );
  const blackPlugMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1c1a18,
      roughness: 0.88,
      metalness: 0.10,
    })
  );
  const labelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8e7c58,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const body = new THREE.Mesh(track(new THREE.BoxGeometry(0.23, 0.048, 0.175)), castAlumMat);
  const flange = new THREE.Mesh(track(new THREE.BoxGeometry(0.265, 0.010, 0.195)), castAlumMat);
  flange.position.y = -0.020;
  ecu.add(body, flange);

  const finGeo = track(new THREE.BoxGeometry(0.21, 0.012, 0.010));
  for (let f = -3; f <= 3; f += 1) {
    const fin = new THREE.Mesh(finGeo, castAlumMat);
    fin.position.set(0, 0.028, f * 0.022);
    ecu.add(fin);
  }

  const sticker = new THREE.Mesh(track(new THREE.BoxGeometry(0.085, 0.014, 0.055)), labelMat);
  sticker.position.set(0.02, 0.029, 0.0);
  ecu.add(sticker);

  for (const px of [-0.055, 0.055]) {
    const plug = new THREE.Mesh(track(new THREE.BoxGeometry(0.088, 0.038, 0.065)), blackPlugMat);
    plug.position.set(px, -0.002, 0.105);
    const boot = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.016, 0.024, 0.055, 10)),
      blackPlugMat
    );
    boot.rotation.x = Math.PI * 0.5;
    boot.position.set(px, -0.002, 0.155);
    ecu.add(plug, boot);
  }

  return ecu;
}

export function buildJunkyardCoolantAndScrapProps(
  rustNor: THREE.Texture,
  disposables: Array<{ dispose: () => void }>
): { coolantTank: THREE.Group; scrapCarPanel: THREE.Mesh } {
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  // Sun-yellowed, sludge-lined & grease-smudged vintage coolant expansion tank texture
  const tankCv = document.createElement('canvas');
  tankCv.width = 128;
  tankCv.height = 128;
  const tctx = tankCv.getContext('2d')!;
  const timg = tctx.createImageData(128, 128);
  for (let y = 0; y < 128; y += 1) {
    const sludge = Math.max(0, Math.min(1, (y / 127 - 0.42) * 2.2));
    for (let x = 0; x < 128; x += 1) {
      const n = fbm2D(x * 0.09 + 1.7, y * 0.09 + 6.2, 4);
      const soot = Math.max(0, (n - 0.50) * 1.9);
      const idx = (y * 128 + x) * 4;
      const r = (188 * (1 - sludge) + 96 * sludge) * (1 - soot * 0.62);
      const gr = (118 * (1 - sludge) + 52 * sludge) * (1 - soot * 0.65);
      const b = (82 * (1 - sludge) + 34 * sludge) * (1 - soot * 0.68);
      timg.data[idx] = Math.round(r);
      timg.data[idx + 1] = Math.round(gr);
      timg.data[idx + 2] = Math.round(b);
      timg.data[idx + 3] = 255;
    }
  }
  tctx.putImageData(timg, 0, 0);
  const tankTex = track(new THREE.CanvasTexture(tankCv));
  tankTex.colorSpace = THREE.SRGBColorSpace;

  const tankGroup = new THREE.Group();
  const plasticMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: tankTex,
      normalMap: rustNor,
      normalScale: new THREE.Vector2(0.55, 0.55),
      emissive: new THREE.Color(0x1a0a05),
      emissiveIntensity: 0.10,
      roughness: 0.86,
      metalness: 0.0,
      transmission: 0.06,
      thickness: 0.08,
    })
  );
  const seamMat = track(
    new THREE.MeshStandardMaterial({ color: 0x6e3e28, roughness: 0.90 })
  );
  const capMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.82, metalness: 0.12 })
  );

  const upperHalf = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.064, 0.135, 8, 16)), plasticMat);
  upperHalf.rotation.z = Math.PI * 0.5;
  upperHalf.scale.set(1.0, 0.76, 1.24);
  tankGroup.add(upperHalf);

  const weldFlange = new THREE.Mesh(track(new THREE.BoxGeometry(0.275, 0.009, 0.175)), seamMat);
  tankGroup.add(weldFlange);

  const neck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.022, 0.024, 0.032, 14)), plasticMat);
  neck.position.set(-0.068, 0.052, 0.015);
  const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.027, 0.027, 0.022, 16)), capMat);
  cap.position.set(-0.068, 0.068, 0.015);
  tankGroup.add(neck, cap);

  const panelGeo = track(new THREE.PlaneGeometry(0.56, 0.72, 12, 14));
  const pPos = panelGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pPos.count; i += 1) {
    const px = pPos.getX(i);
    const py = pPos.getY(i);
    const arch = Math.cos(px * 3.2) * 0.065 + Math.sin(py * 2.4) * 0.025;
    const lip = px > 0.22 ? (px - 0.22) * 0.35 : 0.0;
    pPos.setZ(i, arch - lip);
  }
  panelGeo.computeVertexNormals();

  const panelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4844,
      normalMap: rustNor,
      roughness: 0.74,
      metalness: 0.46,
      side: THREE.DoubleSide,
    })
  );
  const scrapCarPanel = new THREE.Mesh(panelGeo, panelMat);
  scrapCarPanel.castShadow = true;
  scrapCarPanel.receiveShadow = true;

  return { coolantTank: tankGroup, scrapCarPanel };
}

/**
 * Curtain Creeper Vines (`dây cúc tần / rễ màn liễu rủ` — modeled 1:1 after user's photo):
 * Combines:
 * 1. High-resolution procedural botanical curtain-vine cards (`384x512` multi-toned pale sage-olive &
 *    straw-blonde delicate vertical strands + tiny cúc-tần micro-leaflets near the crown + uneven wispy tips)
 *    with gentle vertex-shader night-breeze sway, AND
 * 2. Fine 3D gravity-draped filament strands (`TubeGeometry`) hanging straight down from BOTH car halves
 *    (roof gutters, cut roof edge, fender hood rails, rear trunk lip, and open door beltline)!
 */
export function buildCurtainCreeperVines(opts: {
  leftCarMatrix: THREE.Matrix4;
  rightCarMatrix: THREE.Matrix4;
  uTime: { value: number };
  disposables: Array<{ dispose: () => void }>;
}): THREE.Group {
  const { leftCarMatrix, rightCarMatrix, uTime, disposables } = opts;
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const w = 384;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const rng = mulberry32(20261125);
  const palette = [
    '#838c58', // sage olive cúc tần
    '#ada273', // dry straw blonde strand
    '#989060', // weathered olive-khaki
    '#687444', // live moss-olive shoot
    '#bfae80', // sun-bleached pale root strand
  ];

  // Top tangled crown cushion where vines spill over the roof/fender edge
  for (let c = 0; c < 135; c += 1) {
    ctx.strokeStyle = palette[Math.floor(rng() * palette.length)];
    ctx.lineWidth = 1.4 + rng() * 2.1;
    ctx.globalAlpha = 0.65 + rng() * 0.32;
    const cx = rng() * w;
    const cy = rng() * 38;
    ctx.beginPath();
    ctx.moveTo(cx - 14 - rng() * 18, cy + (rng() - 0.5) * 14);
    ctx.quadraticCurveTo(cx, cy + rng() * 16, cx + 14 + rng() * 18, cy + (rng() - 0.5) * 14);
    ctx.stroke();
  }

  // 105 delicate gravity-draped vertical strands of varied lengths (`22% -> 98%`) with tiny micro-leaflets!
  for (let s = 0; s < 108; s += 1) {
    const col = palette[Math.floor(rng() * palette.length)];
    const x0 = 6 + (s / 107) * (w - 12) + (rng() - 0.5) * 5.5;
    // Clustered uneven lengths just like real balcony curtain creeper (`media_1795569685072_b7baee34.jpg`)!
    const clusterEnvelope = 0.45 + 0.52 * Math.pow(Math.sin((x0 / w) * Math.PI * 2.6 + 0.4) * 0.5 + 0.5, 0.75);
    const maxLen = h * Math.min(0.98, (0.20 + Math.pow(rng(), 0.78) * 0.78) * (0.58 + 0.48 * clusterEnvelope));
    const waveAmp = 1.6 + rng() * 3.8;
    const waveFreq = 0.018 + rng() * 0.025;
    const phase = rng() * Math.PI * 2;
    const drift = (rng() - 0.5) * 9.0;

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.15 + rng() * 1.45;
    ctx.globalAlpha = 0.78 + rng() * 0.22;
    ctx.beginPath();
    const steps = 22;
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps;
      const py = 4 + t * maxLen;
      const px = x0 + Math.sin(py * waveFreq + phase) * waveAmp * Math.min(1, t * 2.2) + drift * t * t;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Tiny oval cúc-tần micro-leaflets / nodes mainly in the upper 65% of the hanging strand
    const leafCount = Math.floor(3 + rng() * 7);
    ctx.fillStyle = col;
    for (let lf = 0; lf < leafCount; lf += 1) {
      const lt = 0.05 + rng() * 0.68;
      const ly = 4 + lt * maxLen;
      const lx = x0 + Math.sin(ly * waveFreq + phase) * waveAmp + drift * lt * lt;
      const side = lf % 2 === 0 ? 1 : -1;
      ctx.globalAlpha = 0.62 + rng() * 0.30;
      ctx.beginPath();
      ctx.ellipse(lx + side * 2.4, ly, 2.3 + rng() * 1.6, 1.1 + rng() * 0.7, side * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;

  const vineTex = track(new THREE.CanvasTexture(cv));
  vineTex.colorSpace = THREE.SRGBColorSpace;
  vineTex.anisotropy = 4;

  const curtainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd8d2b4,
      map: vineTex,
      emissive: new THREE.Color(0x16180c),
      emissiveIntensity: 0.28,
      alphaTest: 0.24,
      roughness: 0.90,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );

  // Orient normal gently skyward/outward + add delicate night-breeze sway proportional to hang depth (`1.0 - uv.y`)!
  curtainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uVineTime = uTime;
    shader.vertexShader =
      'uniform float uVineTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float hangFrac = clamp(1.0 - uv.y, 0.0, 1.0);
         float sway = sin(uVineTime * 1.15 + position.x * 5.2 + position.z * 3.7) * 0.018 * hangFrac * hangFrac;
         transformed.x += sway;
         transformed.z += sway * 0.65;`
      );
  };

  const out = new THREE.Group();
  const curtainGeos: THREE.BufferGeometry[] = [];
  const strandGeos: THREE.BufferGeometry[] = [];

  // Helper: creates a curved vertical 3D curtain strip between local anchor `pA` and `pB` on a car matrix,
  // hanging straight down in WORLD `-Y` (`gravity`) by `dropHeight` meters!
  const addGravityCurtainStrip = (
    parentMat: THREE.Matrix4,
    localA: [number, number, number],
    localB: [number, number, number],
    dropHeight: number,
    outwardBow = 0.035
  ) => {
    const wA = new THREE.Vector3(...localA).applyMatrix4(parentMat);
    const wB = new THREE.Vector3(...localB).applyMatrix4(parentMat);
    const segU = 10;
    const segV = 6;
    const geo = new THREE.PlaneGeometry(1, 1, segU, segV);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;

    const spanDir = new THREE.Vector3().subVectors(wB, wA);
    const bowDir = new THREE.Vector3(-spanDir.z, 0, spanDir.x).normalize();

    for (let i = 0; i < pos.count; i += 1) {
      const u = uv.getX(i);
      const vTop = uv.getY(i); // 1 at top edge, 0 at bottom edge
      const drop = 1.0 - vTop;
      const topPt = new THREE.Vector3().lerpVectors(wA, wB, u);
      const ripple = Math.sin(u * Math.PI * 3.0) * outwardBow * (0.35 + 0.65 * drop);
      const wx = topPt.x + bowDir.x * ripple;
      const wy = topPt.y - drop * dropHeight;
      const wz = topPt.z + bowDir.z * ripple;
      pos.setXYZ(i, wx, wy, wz);
    }
    geo.computeVertexNormals();
    curtainGeos.push(geo);
  };

  // A. LEFT CAR CURTAIN CREEPER VINES (`dây leo cúc tần rủ trên mái & tai dè xe trái` — ZERO vines on swung-open door!)
  addGravityCurtainStrip(leftCarMatrix, [0.59, 1.315, 0.16], [0.59, 1.310, -0.48], 0.44, 0.026);
  addGravityCurtainStrip(leftCarMatrix, [0.54, 1.320, 0.12], [0.55, 1.315, -0.44], 0.34, -0.020);
  addGravityCurtainStrip(leftCarMatrix, [-0.36, 1.315, -0.48], [0.58, 1.315, -0.48], 0.52, -0.028);
  addGravityCurtainStrip(leftCarMatrix, [-0.18, 1.305, 0.21], [0.58, 1.305, 0.21], 0.32, 0.022);
  addGravityCurtainStrip(leftCarMatrix, [0.725, 0.805, 1.78], [0.725, 0.805, 0.92], 0.30, 0.020);
  addGravityCurtainStrip(leftCarMatrix, [-0.725, 0.805, 1.84], [-0.15, 0.795, 1.89], 0.34, 0.022);

  // B. RIGHT CAR CURTAIN CREEPER VINES (`rèm dây leo cúc tần rủ từ mái cắt ngang & thân sau xe phải`)
  addGravityCurtainStrip(rightCarMatrix, [0.59, 1.310, 0.18], [-0.46, 1.310, 0.18], 0.78, 0.035);
  addGravityCurtainStrip(rightCarMatrix, [0.60, 1.310, 0.18], [0.60, 1.305, -0.62], 0.82, 0.032);
  addGravityCurtainStrip(rightCarMatrix, [0.53, 1.315, 0.12], [0.53, 1.310, -0.54], 0.58, -0.024);
  addGravityCurtainStrip(rightCarMatrix, [0.73, 0.805, -1.06], [0.73, 0.805, -1.86], 0.34, 0.020);
  addGravityCurtainStrip(rightCarMatrix, [-0.58, 0.795, -1.89], [0.64, 0.795, -1.89], 0.32, -0.020);

  const mergedCurtainsGeo = track(mergeStaticBufferGeometries(curtainGeos));
  curtainGeos.forEach((g) => g.dispose());
  const curtainMesh = new THREE.Mesh(mergedCurtainsGeo, curtainMat);
  curtainMesh.castShadow = true;
  curtainMesh.receiveShadow = true;
  out.add(curtainMesh);

  // C. 3D Individual Wispy Hanging Filaments (70 `TubeGeometry` threads batched into 1 GPU draw call!)
  const strandMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9c9464,
      emissive: new THREE.Color(0x16160a),
      emissiveIntensity: 0.25,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const add3DHangingThreads = (
    parentMat: THREE.Matrix4,
    localA: [number, number, number],
    localB: [number, number, number],
    count: number,
    minDrop: number,
    maxDrop: number
  ) => {
    const wA = new THREE.Vector3(...localA).applyMatrix4(parentMat);
    const wB = new THREE.Vector3(...localB).applyMatrix4(parentMat);
    for (let i = 0; i < count; i += 1) {
      const u = rng();
      const p0 = new THREE.Vector3().lerpVectors(wA, wB, u);
      const drop = minDrop + Math.pow(rng(), 0.8) * (maxDrop - minDrop);
      const p1 = new THREE.Vector3(
        p0.x + (rng() - 0.5) * 0.045,
        p0.y - drop * 0.48,
        p0.z + (rng() - 0.5) * 0.045
      );
      const p2 = new THREE.Vector3(
        p1.x + (rng() - 0.5) * 0.055,
        p0.y - drop,
        p1.z + (rng() - 0.5) * 0.055
      );
      strandGeos.push(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 7, 0.0018 + rng() * 0.0016, 4, false)
      );
    }
  };

  add3DHangingThreads(leftCarMatrix, [0.59, 1.31, 0.16], [0.59, 1.31, -0.46], 20, 0.20, 0.48);
  add3DHangingThreads(rightCarMatrix, [0.59, 1.31, 0.18], [-0.42, 1.31, 0.18], 24, 0.28, 0.82);
  add3DHangingThreads(rightCarMatrix, [0.60, 1.31, 0.16], [0.60, 1.31, -0.58], 26, 0.28, 0.86);

  const mergedStrandsGeo = track(mergeStaticBufferGeometries(strandGeos));
  strandGeos.forEach((g) => g.dispose());
  out.add(new THREE.Mesh(mergedStrandsGeo, strandMat));

  return out;
}

/**
 * Ethereal Low-Lying Ground Mist (`khói sương lờ mờ ở dưới đất — mơ màng, ảo ảo`):
 * Soft dual-scrolling FBM mist veils hovering `6cm–38cm` above the meadow contour, drifting
 * slowly across the grass & tires without obscuring blade detail or firefly bokeh!
 */
export function buildDreamyGroundMist(opts: {
  sampleHeight: (x: number, z: number) => number;
  uTime: { value: number };
  uScrollDim: { value: number };
  disposables: Array<{ dispose: () => void }>;
}): THREE.Group {
  const { sampleHeight, uTime, uScrollDim, disposables } = opts;
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const sz = 128;
  const cv = document.createElement('canvas');
  cv.width = sz;
  cv.height = sz;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(sz, sz);
  for (let y = 0; y < sz; y += 1) {
    for (let x = 0; x < sz; x += 1) {
      const u = x / sz;
      const v = y / sz;
      // Seamless tileable domain-warped FBM mist noise
      const ax = u * Math.PI * 2;
      const ay = v * Math.PI * 2;
      const n =
        fbm2D(Math.cos(ax) * 1.6 + 4.2, Math.sin(ay) * 1.6 + 2.8, 4) * 0.6 +
        fbm2D(Math.sin(ax) * 2.4 - 1.9, Math.cos(ay) * 2.4 + 5.1, 3) * 0.4;
      const val = Math.max(0, Math.min(255, Math.round(n * 255)));
      const idx = (y * sz + x) * 4;
      img.data[idx] = val;
      img.data[idx + 1] = val;
      img.data[idx + 2] = val;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const mistNoiseTex = track(new THREE.CanvasTexture(cv));
  mistNoiseTex.wrapS = THREE.RepeatWrapping;
  mistNoiseTex.wrapT = THREE.RepeatWrapping;

  const group = new THREE.Group();
  const planeGeo = track(new THREE.PlaneGeometry(1, 1, 8, 8));
  planeGeo.rotateX(-Math.PI * 0.5);

  const puffDefs: ReadonlyArray<{
    x: number;
    z: number;
    lift: number;
    sx: number;
    sz: number;
    col: [number, number, number];
    alpha: number;
  }> = [
    // Central clearing & foreground tire meadow dreamy mist
    { x: -0.2, z: 3.6, lift: 0.11, sx: 4.4, sz: 2.8, col: [0.68, 0.62, 0.52], alpha: 0.085 },
    { x: 1.1, z: 3.1, lift: 0.15, sx: 4.0, sz: 2.6, col: [0.64, 0.60, 0.54], alpha: 0.078 },
    { x: -1.6, z: 3.1, lift: 0.13, sx: 3.8, sz: 2.5, col: [0.64, 0.56, 0.50], alpha: 0.075 },
    { x: 0.1, z: 2.1, lift: 0.18, sx: 4.6, sz: 2.8, col: [0.66, 0.62, 0.55], alpha: 0.082 },
    { x: -0.9, z: 1.8, lift: 0.24, sx: 3.6, sz: 2.4, col: [0.72, 0.48, 0.44], alpha: 0.072 }, // subtle warm rose near open left door
    { x: 1.6, z: 2.0, lift: 0.20, sx: 3.8, sz: 2.5, col: [0.56, 0.64, 0.68], alpha: 0.074 },
    // Cool sapphire-kissed mist creeping around the cars & underglows
    { x: -2.8, z: 1.8, lift: 0.16, sx: 3.4, sz: 2.4, col: [0.46, 0.56, 0.78], alpha: 0.076 },
    { x: 2.9, z: 1.5, lift: 0.16, sx: 3.6, sz: 2.5, col: [0.44, 0.58, 0.84], alpha: 0.082 },
    // Upper-mid meadow mist veils behind wildflower bush
    { x: -0.8, z: 0.6, lift: 0.26, sx: 4.2, sz: 2.6, col: [0.52, 0.62, 0.58], alpha: 0.068 },
    { x: 1.1, z: 0.7, lift: 0.24, sx: 4.0, sz: 2.5, col: [0.54, 0.64, 0.58], alpha: 0.068 },
    // Foreground ankle-level mist wisps
    { x: -1.8, z: 4.3, lift: 0.09, sx: 3.6, sz: 2.0, col: [0.62, 0.58, 0.50], alpha: 0.070 },
    { x: 1.7, z: 4.2, lift: 0.10, sx: 3.6, sz: 2.1, col: [0.58, 0.58, 0.56], alpha: 0.070 },
  ];

  // Batch all 12 terrain-conformed mist veils into 1 single BufferGeometry + 1 ShaderMaterial draw call!
  const vertsPerPlane = (planeGeo.getAttribute('position') as THREE.BufferAttribute).count;
  const idxPerPlane = planeGeo.index!.count;
  const totalVerts = puffDefs.length * vertsPerPlane;
  const totalIndices = puffDefs.length * idxPerPlane;

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedNorm = new Float32Array(totalVerts * 3);
  const mergedUv = new Float32Array(totalVerts * 2);
  const mergedColAlpha = new Float32Array(totalVerts * 4);
  const mergedSeed = new Float32Array(totalVerts);
  const mergedIndices = new Uint16Array(totalIndices);

  const srcUv = planeGeo.getAttribute('uv') as THREE.BufferAttribute;
  const srcIdx = planeGeo.index!;

  for (let i = 0; i < puffDefs.length; i += 1) {
    const p = puffDefs[i];
    const seedVal = i * 1.73;
    const instGeo = planeGeo.clone();
    const pos = instGeo.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < vertsPerPlane; v += 1) {
      const lx = pos.getX(v) * p.sx;
      const lz = pos.getZ(v) * p.sz;
      const wx = p.x + lx;
      const wz = p.z + lz;
      pos.setXYZ(v, wx, sampleHeight(wx, wz) + p.lift, wz);
    }
    instGeo.computeVertexNormals();
    const norm = instGeo.attributes.normal as THREE.BufferAttribute;

    const vBase = i * vertsPerPlane;
    for (let v = 0; v < vertsPerPlane; v += 1) {
      const dstV = vBase + v;
      mergedPos[dstV * 3] = pos.getX(v);
      mergedPos[dstV * 3 + 1] = pos.getY(v);
      mergedPos[dstV * 3 + 2] = pos.getZ(v);

      mergedNorm[dstV * 3] = norm.getX(v);
      mergedNorm[dstV * 3 + 1] = norm.getY(v);
      mergedNorm[dstV * 3 + 2] = norm.getZ(v);

      mergedUv[dstV * 2] = srcUv.getX(v);
      mergedUv[dstV * 2 + 1] = srcUv.getY(v);

      mergedColAlpha[dstV * 4] = p.col[0];
      mergedColAlpha[dstV * 4 + 1] = p.col[1];
      mergedColAlpha[dstV * 4 + 2] = p.col[2];
      mergedColAlpha[dstV * 4 + 3] = p.alpha;

      mergedSeed[dstV] = seedVal;
    }

    const iBase = i * idxPerPlane;
    for (let k = 0; k < idxPerPlane; k += 1) {
      mergedIndices[iBase + k] = srcIdx.getX(k) + vBase;
    }
    instGeo.dispose();
  }

  const batchedMistGeo = track(new THREE.BufferGeometry());
  batchedMistGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  batchedMistGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  batchedMistGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
  batchedMistGeo.setAttribute('aMistColAlpha', new THREE.BufferAttribute(mergedColAlpha, 4));
  batchedMistGeo.setAttribute('aMistSeed', new THREE.BufferAttribute(mergedSeed, 1));
  batchedMistGeo.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  batchedMistGeo.computeBoundingSphere();

  const batchedMistMat = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uNoise: { value: mistNoiseTex },
        uTime,
        uScrollDim,
      },
      vertexShader: /* glsl */ `
        attribute vec4 aMistColAlpha;
        attribute float aMistSeed;
        varying vec2 vUv;
        varying float vEdgeView;
        varying vec4 vColAlpha;
        varying float vSeed;
        void main() {
          vUv = uv;
          vColAlpha = aMistColAlpha;
          vSeed = aMistSeed;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 viewDir = normalize(cameraPosition - wp.xyz);
          vec3 wNorm = normalize(mat3(modelMatrix) * normal);
          vEdgeView = smoothstep(0.04, 0.30, abs(dot(viewDir, wNorm)));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D uNoise;
        uniform float uTime;
        uniform float uScrollDim;
        varying vec2 vUv;
        varying float vEdgeView;
        varying vec4 vColAlpha;
        varying float vSeed;
        void main() {
          vec2 q = vUv * 2.0 - 1.0;
          float r2 = dot(q, q);
          if (r2 >= 1.0) discard;
          float radial = pow(1.0 - r2, 2.1);

          vec2 uvA = vUv * 1.25 + vec2(uTime * 0.014 + vSeed, uTime * 0.008 - vSeed * 0.5);
          vec2 uvB = vUv * 1.85 - vec2(uTime * 0.010 - vSeed * 0.7, uTime * 0.012 + vSeed);
          float nA = texture2D(uNoise, uvA).r;
          float nB = texture2D(uNoise, uvB).r;
          float wisp = smoothstep(0.28, 0.82, nA * 0.62 + nB * 0.38);

          float alpha = radial * wisp * vColAlpha.a * vEdgeView * (1.0 - uScrollDim);
          gl_FragColor = vec4(vColAlpha.rgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
  );

  const mistMesh = new THREE.Mesh(batchedMistGeo, batchedMistMat);
  mistMesh.renderOrder = 3;
  mistMesh.frustumCulled = false;
  group.add(mistMesh);

  return group;
}

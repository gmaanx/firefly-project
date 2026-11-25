export type SampleImageId =
  | 'bioluminescent-canopy'
  | 'chromatic-sunset'
  | 'spectral-macaw'
  | 'custom-upload';

export interface SamplePresetMeta {
  id: Exclude<SampleImageId, 'custom-upload'>;
  code: string;
  titleVi: string;
  subtitleEn: string;
}

export interface LoadedImageAsset {
  id: SampleImageId;
  code: string;
  titleVi: string;
  subtitleEn: string;
  width: number;
  height: number;
  rgbaData: Uint8ClampedArray;
  previewDataUrl: string;
  pointCloudPositions: Float32Array;
  pointCloudColors: Float32Array;
  uniqueColorsCount: number;
}

export const SAMPLE_PRESETS: readonly SamplePresetMeta[] = [
  {
    id: 'bioluminescent-canopy',
    code: 'IMG_01',
    titleVi: 'Rừng phát quang',
    subtitleEn: 'Bioluminescent Canopy',
  },
  {
    id: 'chromatic-sunset',
    code: 'IMG_02',
    titleVi: 'Hoàng hôn cảng thị',
    subtitleEn: 'Chromatic Sunset',
  },
  {
    id: 'spectral-macaw',
    code: 'IMG_03',
    titleVi: 'Quang phổ nhiệt đới',
    subtitleEn: 'Spectral Macaw',
  },
] as const;

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 240;

type RgbaStop = readonly [number, readonly [number, number, number, number]];

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function sampleStops(stops: readonly RgbaStop[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const local = t1 > t0 ? (clamped - t0) / (t1 - t0) : 0;
      const r = lerpChannel(c0[0], c1[0], local);
      const g = lerpChannel(c0[1], c1[1], local);
      const b = lerpChannel(c0[2], c1[2], local);
      const a = c0[3] + (c1[3] - c0[3]) * local;
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgba(${last[0]}, ${last[1]}, ${last[2]}, ${last[3].toFixed(3)})`;
}

function fillVerticalSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  w: number,
  h: number,
  stops: readonly RgbaStop[]
): void {
  const rows = Math.max(1, Math.ceil(h));
  for (let row = 0; row < rows; row++) {
    ctx.fillStyle = sampleStops(stops, row / Math.max(1, rows - 1));
    ctx.fillRect(x, y0 + row, w, 1.4);
  }
}

function paintConcentricGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stops: readonly RgbaStop[],
  rings = 14
): void {
  for (let r = rings; r >= 1; r--) {
    const frac = r / rings;
    ctx.fillStyle = sampleStops(stops, frac);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * frac, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function analyzeImageColors(
  rgbaData: Uint8ClampedArray,
  maxCloudPoints = 1800
): {
  pointCloudPositions: Float32Array;
  pointCloudColors: Float32Array;
  uniqueColorsCount: number;
} {
  const totalPixels = Math.floor(rgbaData.length / 4);
  const uniqueSet = new Set<number>();

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const packed =
      (rgbaData[idx] << 16) | (rgbaData[idx + 1] << 8) | rgbaData[idx + 2];
    uniqueSet.add(packed);
  }

  const sampleCount = Math.min(totalPixels, maxCloudPoints);
  const positions = new Float32Array(sampleCount * 3);
  const colors = new Float32Array(sampleCount * 3);
  const stride = totalPixels / sampleCount;

  for (let s = 0; s < sampleCount; s++) {
    const pxIndex = Math.min(totalPixels - 1, Math.floor(s * stride));
    const offset = pxIndex * 4;
    const r = rgbaData[offset];
    const g = rgbaData[offset + 1];
    const b = rgbaData[offset + 2];

    const outIdx = s * 3;
    positions[outIdx] = (r / 255) * 2 - 1;
    positions[outIdx + 1] = (g / 255) * 2 - 1;
    positions[outIdx + 2] = (b / 255) * 2 - 1;

    colors[outIdx] = 0.06 + (r / 255) * 0.94;
    colors[outIdx + 1] = 0.06 + (g / 255) * 0.94;
    colors[outIdx + 2] = 0.06 + (b / 255) * 0.94;
  }

  return {
    pointCloudPositions: positions,
    pointCloudColors: colors,
    uniqueColorsCount: uniqueSet.size,
  };
}

function enrich24BitMicroTone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number
): ImageData {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const rng = createSeededRng(seed);

  for (let i = 0; i < data.length; i += 4) {
    const n1 = Math.round((rng() - 0.5) * 3.2);
    const n2 = Math.round((rng() - 0.5) * 3.2);
    const n3 = Math.round((rng() - 0.5) * 3.2);
    data[i] = Math.max(0, Math.min(255, data[i] + n1));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n2));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n3));
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return imgData;
}

function paintBioluminescentCanopy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const rng = createSeededRng(20260601);

  fillVerticalSweep(ctx, 0, 0, w, h, [
    [0, [4, 8, 22, 1]],
    [0.32, [8, 27, 51, 1]],
    [0.68, [10, 54, 61, 1]],
    [1, [15, 82, 76, 1]],
  ]);

  paintConcentricGlow(
    ctx,
    w * 0.54,
    h * 0.31,
    w * 0.48,
    [
      [0, [64, 240, 208, 0.36]],
      [0.45, [16, 145, 140, 0.16]],
      [0.82, [28, 64, 128, 0.06]],
      [1, [4, 8, 22, 0]],
    ],
    16
  );

  const treeLayers = [
    { count: 14, color: '#07222C', widthScale: 0.7, alpha: 0.85 },
    { count: 9, color: '#051720', widthScale: 1.0, alpha: 0.95 },
  ];
  for (const layer of treeLayers) {
    ctx.save();
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = layer.color;
    for (let i = 0; i < layer.count; i++) {
      const tx = (i / (layer.count - 1)) * w + (rng() - 0.5) * 26;
      const tw = (12 + rng() * 18) * layer.widthScale;
      ctx.beginPath();
      ctx.moveTo(tx - tw, h * 0.68);
      ctx.quadraticCurveTo(tx - tw * 0.35, h * 0.35, tx + (rng() - 0.5) * 10, 0);
      ctx.lineTo(tx + tw * 0.55, 0);
      ctx.quadraticCurveTo(tx + tw * 0.35, h * 0.35, tx + tw, h * 0.68);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const streamTop = Math.round(h * 0.62);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, streamTop + 10);
  ctx.bezierCurveTo(w * 0.3, streamTop - 8, w * 0.68, streamTop + 14, w, streamTop + 2);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();
  fillVerticalSweep(ctx, 0, streamTop - 8, w, h - streamTop + 8, [
    [0, [11, 79, 85, 1]],
    [0.28, [13, 115, 119, 1]],
    [0.62, [6, 59, 76, 1]],
    [1, [4, 24, 41, 1]],
  ]);
  ctx.restore();

  for (let s = 0; s < 55; s++) {
    const sy = streamTop + 6 + rng() * (h - streamTop - 8);
    const sx = rng() * w;
    const sw = 18 + rng() * 58;
    const alpha = 0.14 + rng() * 0.28;
    ctx.fillStyle =
      s % 3 === 0
        ? `rgba(46, 242, 197, ${alpha})`
        : s % 3 === 1
          ? `rgba(114, 59, 250, ${alpha * 0.85})`
          : `rgba(210, 255, 0, ${alpha * 0.72})`;
    ctx.fillRect(sx - sw * 0.5, sy, sw, 1.5 + rng() * 1.5);
  }

  ctx.fillStyle = '#041218';
  ctx.beginPath();
  ctx.moveTo(0, streamTop + 4);
  ctx.quadraticCurveTo(w * 0.24, streamTop + 18, w * 0.36, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w, streamTop - 2);
  ctx.quadraticCurveTo(w * 0.74, streamTop + 16, w * 0.64, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const fireflyCount = 34;
  for (let i = 0; i < fireflyCount; i++) {
    const fx = 22 + rng() * (w - 44);
    const fy = 18 + rng() * (streamTop + 8);
    const isLime = i % 4 !== 0;
    const outerRadius = 10 + rng() * 18;

    paintConcentricGlow(
      ctx,
      fx,
      fy,
      outerRadius,
      isLime
        ? [
            [0, [255, 255, 255, 0.95]],
            [0.24, [210, 255, 0, 0.78]],
            [0.62, [180, 245, 0, 0.26]],
            [1, [210, 255, 0, 0]],
          ]
        : [
            [0, [245, 240, 255, 0.95]],
            [0.25, [155, 114, 255, 0.75]],
            [0.62, [114, 59, 250, 0.26]],
            [1, [114, 59, 250, 0]],
          ],
      8
    );
  }
}

function paintChromaticSunset(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const rng = createSeededRng(20260602);
  const horizonY = Math.round(h * 0.58);

  fillVerticalSweep(ctx, 0, 0, w, horizonY + 2, [
    [0, [18, 8, 46, 1]],
    [0.24, [63, 18, 95, 1]],
    [0.5, [158, 25, 86, 1]],
    [0.76, [242, 76, 39, 1]],
    [0.93, [255, 158, 27, 1]],
    [1, [255, 230, 109, 1]],
  ]);

  const sunX = w * 0.62;
  const sunY = horizonY - 22;
  paintConcentricGlow(
    ctx,
    sunX,
    sunY,
    92,
    [
      [0, [255, 253, 240, 0.88]],
      [0.24, [255, 224, 102, 0.65]],
      [0.55, [255, 120, 35, 0.36]],
      [1, [158, 25, 86, 0]],
    ],
    14
  );

  ctx.fillStyle = '#FFF9DB';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 21, 0, Math.PI * 2);
  ctx.fill();

  fillVerticalSweep(ctx, 0, horizonY, w, h - horizonY, [
    [0, [217, 78, 52, 1]],
    [0.25, [106, 27, 93, 1]],
    [0.58, [27, 31, 74, 1]],
    [1, [7, 17, 38, 1]],
  ]);

  const buildings = [
    { x: 8, w: 32, h: 66, neon: '#00E5FF' },
    { x: 42, w: 28, h: 92, neon: '#FFB800' },
    { x: 73, w: 36, h: 78, neon: '#9B72FF' },
    { x: 112, w: 26, h: 108, neon: '#00E5FF' },
    { x: 141, w: 34, h: 62, neon: '#D2FF00' },
    { x: 248, w: 30, h: 84, neon: '#00E5FF' },
    { x: 281, w: 38, h: 102, neon: '#9B72FF' },
    { x: 322, w: 32, h: 70, neon: '#FFB800' },
  ];

  for (const b of buildings) {
    const by = horizonY - b.h;
    fillVerticalSweep(ctx, b.x, by, b.w, b.h, [
      [0, [13, 16, 33, 1]],
      [1, [27, 22, 53, 1]],
    ]);
    ctx.fillStyle = b.neon;
    ctx.fillRect(b.x + 2, by, b.w - 4, 2.5);
    for (let wy = by + 7; wy < horizonY - 5; wy += 6) {
      for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 6) {
        if (rng() > 0.38) {
          ctx.fillStyle = rng() > 0.45 ? b.neon : '#FFE066';
          ctx.fillRect(wx, wy, 3.2, 3.2);
        }
      }
    }
  }
}

function paintSpectralMacaw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const rng = createSeededRng(20260603);

  fillVerticalSweep(ctx, 0, 0, w, h, [
    [0, [6, 35, 25, 1]],
    [0.42, [15, 76, 53, 1]],
    [0.78, [27, 107, 70, 1]],
    [1, [9, 43, 34, 1]],
  ]);

  const bokehPalette: readonly (readonly [number, number, number])[] = [
    [74, 222, 128],
    [210, 255, 0],
    [114, 59, 250],
    [0, 229, 255],
    [250, 204, 21],
  ];
  for (let i = 0; i < 28; i++) {
    const bx = rng() * w;
    const by = rng() * h;
    const br = 12 + rng() * 32;
    const rgb = bokehPalette[i % bokehPalette.length];
    paintConcentricGlow(
      ctx,
      bx,
      by,
      br,
      [
        [0, [rgb[0], rgb[1], rgb[2], 0.28]],
        [1, [rgb[0], rgb[1], rgb[2], 0]],
      ],
      6
    );
  }

  const cx = w * 0.47;
  const cy = h * 0.48;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy + 4, 44, 64, -0.22, 0, Math.PI * 2);
  ctx.clip();
  fillVerticalSweep(ctx, cx - 54, cy - 60, 100, 128, [
    [0, [255, 59, 71, 1]],
    [0.55, [230, 25, 46, 1]],
    [1, [155, 9, 30, 1]],
  ]);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + 22, cy + 26, 30, 58, -0.46, 0, Math.PI * 2);
  ctx.clip();
  fillVerticalSweep(ctx, cx - 18, cy - 32, 84, 118, [
    [0, [0, 180, 216, 1]],
    [0.45, [0, 119, 255, 1]],
    [1, [30, 27, 139, 1]],
  ]);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + 9, cy + 6, 22, 34, -0.42, 0, Math.PI * 2);
  ctx.clip();
  fillVerticalSweep(ctx, cx - 22, cy - 30, 64, 74, [
    [0, [255, 238, 88, 1]],
    [0.55, [255, 183, 3, 1]],
    [1, [247, 127, 0, 1]],
  ]);
  ctx.restore();
}

export function generateSampleImage(
  presetId: Exclude<SampleImageId, 'custom-upload'>,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): LoadedImageAsset {
  const meta =
    SAMPLE_PRESETS.find((item) => item.id === presetId) ?? SAMPLE_PRESETS[0];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Không thể khởi tạo ngữ cảnh đồ họa Canvas 2D.');
  }

  let seed = 1001;
  if (presetId === 'bioluminescent-canopy') {
    paintBioluminescentCanopy(ctx, width, height);
    seed = 1001;
  } else if (presetId === 'chromatic-sunset') {
    paintChromaticSunset(ctx, width, height);
    seed = 2002;
  } else {
    paintSpectralMacaw(ctx, width, height);
    seed = 3003;
  }

  const imageData = enrich24BitMicroTone(ctx, width, height, seed);
  const previewDataUrl = canvas.toDataURL('image/png');
  const rgbaCopy = new Uint8ClampedArray(imageData.data);
  const { pointCloudPositions, pointCloudColors, uniqueColorsCount } =
    analyzeImageColors(rgbaCopy);

  return {
    id: meta.id,
    code: meta.code,
    titleVi: meta.titleVi,
    subtitleEn: meta.subtitleEn,
    width,
    height,
    rgbaData: rgbaCopy,
    previewDataUrl,
    pointCloudPositions,
    pointCloudColors,
    uniqueColorsCount,
  };
}

export async function loadCustomImageFile(
  file: File,
  maxDimension = 360
): Promise<LoadedImageAsset> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Tệp tải lên không phải là định dạng ảnh hợp lệ.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.decoding = 'async';
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error('Không thể giải mã tệp ảnh đã chọn.'));
      element.src = objectUrl;
    });

    const srcW = Math.max(1, img.naturalWidth || img.width);
    const srcH = Math.max(1, img.naturalHeight || img.height);
    const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
    const targetW = Math.max(32, Math.round(srcW * scale));
    const targetH = Math.max(32, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Không thể khởi tạo bộ đệm xử lý ảnh 2D.');
    }

    ctx.fillStyle = '#111112';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    for (let i = 3; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const rgbaCopy = new Uint8ClampedArray(imgData.data);
    const previewDataUrl = canvas.toDataURL('image/png');
    const { pointCloudPositions, pointCloudColors, uniqueColorsCount } =
      analyzeImageColors(rgbaCopy);

    const cleanName =
      file.name.replace(/\.[^/.]+$/, '').slice(0, 32) || 'Ảnh tải lên';

    return {
      id: 'custom-upload',
      code: 'IMG_USR',
      titleVi: cleanName,
      subtitleEn: `Custom (${targetW}×${targetH})`,
      width: targetW,
      height: targetH,
      rgbaData: rgbaCopy,
      previewDataUrl,
      pointCloudPositions,
      pointCloudColors,
      uniqueColorsCount,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

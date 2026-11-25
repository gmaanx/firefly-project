import type {
  CompressionTelemetry,
  PaletteSwatch,
  QuantizationParams,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from './types';

interface DedicatedWorkerPort {
  postMessage(message: WorkerResponseMessage, transfer?: Transferable[]): void;
  onmessage: ((ev: MessageEvent<WorkerRequestMessage>) => void) | null;
  setTimeout(handler: () => void, timeout?: number): number;
  clearTimeout(id: number): void;
}

const workerScope = self as unknown as DedicatedWorkerPort;

interface FireflyAgent {
  id: number;
  coords: Float32Array;
  mse: number;
}

interface EngineState {
  width: number;
  height: number;
  totalPixels: number;
  originalRgb: Uint8Array;
  sampleRgb: Uint8Array;
  sampleCount: number;
  meanR: number;
  meanG: number;
  meanB: number;
  params: QuantizationParams;
  iteration: number;
  alphaCurrent: number;
  fireflies: FireflyAgent[];
  bestCoords: Float32Array;
  bestFullMse: number;
  bestIdx: number;
  mseHistory: number[];
  psnrHistory: number[];
  isPlaying: boolean;
  timerId: number | null;
}

let engine: EngineState | null = null;

function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : val;
}

function rgbToHex(r: number, g: number, b: number): string {
  const hr = Math.round(clampByte(r)).toString(16).padStart(2, '0');
  const hg = Math.round(clampByte(g)).toString(16).padStart(2, '0');
  const hb = Math.round(clampByte(b)).toString(16).padStart(2, '0');
  return `#${hr}${hg}${hb}`.toUpperCase();
}

function computePsnr(mse: number): number {
  const safeMse = Math.max(mse, 1e-4);
  return 10 * Math.log10((255 * 255) / safeMse);
}

function sortPaletteByLuminance(coords: Float32Array, kColors: number): void {
  const indices = new Array<number>(kColors);
  const luminances = new Float64Array(kColors);

  for (let k = 0; k < kColors; k++) {
    indices[k] = k;
    const base = k * 3;
    const r = coords[base];
    const g = coords[base + 1];
    const b = coords[base + 2];
    luminances[k] = 0.299 * r + 0.587 * g + 0.114 * b + r * 1e-4 + g * 1e-6;
  }

  indices.sort((a, b) => luminances[a] - luminances[b]);

  const sorted = new Float32Array(kColors * 3);
  for (let rank = 0; rank < kColors; rank++) {
    const srcBase = indices[rank] * 3;
    const dstBase = rank * 3;
    sorted[dstBase] = coords[srcBase];
    sorted[dstBase + 1] = coords[srcBase + 1];
    sorted[dstBase + 2] = coords[srcBase + 2];
  }

  coords.set(sorted);
}

function evaluateSampleAndRefine(
  coords: Float32Array,
  sampleRgb: Uint8Array,
  sampleCount: number,
  kColors: number,
  pullEta: number
): number {
  const doPull = pullEta > 0;
  const sumR = doPull ? new Float64Array(kColors) : null;
  const sumG = doPull ? new Float64Array(kColors) : null;
  const sumB = doPull ? new Float64Array(kColors) : null;
  const counts = doPull ? new Uint32Array(kColors) : null;

  let totalSqError = 0;
  let maxErrVal = -1;
  let maxErrSampleIdx = 0;

  for (let s = 0; s < sampleCount; s++) {
    const pBase = s * 3;
    const pr = sampleRgb[pBase];
    const pg = sampleRgb[pBase + 1];
    const pb = sampleRgb[pBase + 2];

    let minDistSq = Infinity;
    let bestCluster = 0;

    for (let k = 0; k < kColors; k++) {
      const cBase = k * 3;
      const dr = pr - coords[cBase];
      const dg = pg - coords[cBase + 1];
      const db = pb - coords[cBase + 2];
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestCluster = k;
      }
    }

    totalSqError += minDistSq;

    if (doPull && sumR && sumG && sumB && counts) {
      sumR[bestCluster] += pr;
      sumG[bestCluster] += pg;
      sumB[bestCluster] += pb;
      counts[bestCluster] += 1;

      if (minDistSq > maxErrVal) {
        maxErrVal = minDistSq;
        maxErrSampleIdx = s;
      }
    }
  }

  if (doPull && sumR && sumG && sumB && counts) {
    for (let k = 0; k < kColors; k++) {
      const cBase = k * 3;
      const cnt = counts[k];
      if (cnt > 0) {
        const meanR = sumR[k] / cnt;
        const meanG = sumG[k] / cnt;
        const meanB = sumB[k] / cnt;
        coords[cBase] = clampByte(coords[cBase] + pullEta * (meanR - coords[cBase]));
        coords[cBase + 1] = clampByte(
          coords[cBase + 1] + pullEta * (meanG - coords[cBase + 1])
        );
        coords[cBase + 2] = clampByte(
          coords[cBase + 2] + pullEta * (meanB - coords[cBase + 2])
        );
      } else {
        const rescueIdx = ((maxErrSampleIdx + k * 97) % sampleCount) * 3;
        const rescueEta = Math.min(0.45, pullEta * 1.8);
        coords[cBase] = clampByte(
          coords[cBase] + rescueEta * (sampleRgb[rescueIdx] - coords[cBase])
        );
        coords[cBase + 1] = clampByte(
          coords[cBase + 1] + rescueEta * (sampleRgb[rescueIdx + 1] - coords[cBase + 1])
        );
        coords[cBase + 2] = clampByte(
          coords[cBase + 2] + rescueEta * (sampleRgb[rescueIdx + 2] - coords[cBase + 2])
        );
      }
    }
    sortPaletteByLuminance(coords, kColors);

    let refinedSqError = 0;
    for (let s = 0; s < sampleCount; s++) {
      const pBase = s * 3;
      const pr = sampleRgb[pBase];
      const pg = sampleRgb[pBase + 1];
      const pb = sampleRgb[pBase + 2];
      let minDistSq = Infinity;
      for (let k = 0; k < kColors; k++) {
        const cBase = k * 3;
        const dr = pr - coords[cBase];
        const dg = pg - coords[cBase + 1];
        const db = pb - coords[cBase + 2];
        const distSq = dr * dr + dg * dg + db * db;
        if (distSq < minDistSq) {
          minDistSq = distSq;
        }
      }
      refinedSqError += minDistSq;
    }
    return refinedSqError / (sampleCount * 3);
  }

  return totalSqError / (sampleCount * 3);
}

function quantizeFullImage(
  originalRgb: Uint8Array,
  totalPixels: number,
  paletteCoords: Float32Array,
  kColors: number
): {
  quantizedRgbaBuffer: ArrayBuffer;
  fullMse: number;
  paletteSwatches: PaletteSwatch[];
} {
  const intR = new Uint8Array(kColors);
  const intG = new Uint8Array(kColors);
  const intB = new Uint8Array(kColors);
  for (let k = 0; k < kColors; k++) {
    const base = k * 3;
    intR[k] = Math.round(clampByte(paletteCoords[base]));
    intG[k] = Math.round(clampByte(paletteCoords[base + 1]));
    intB[k] = Math.round(clampByte(paletteCoords[base + 2]));
  }

  const outRgba = new Uint8ClampedArray(totalPixels * 4);
  const counts = new Uint32Array(kColors);
  let totalSqError = 0;

  for (let i = 0; i < totalPixels; i++) {
    const rgbBase = i * 3;
    const pr = originalRgb[rgbBase];
    const pg = originalRgb[rgbBase + 1];
    const pb = originalRgb[rgbBase + 2];

    let minDistSq = Infinity;
    let bestK = 0;

    for (let k = 0; k < kColors; k++) {
      const dr = pr - intR[k];
      const dg = pg - intG[k];
      const db = pb - intB[k];
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestK = k;
      }
    }

    totalSqError += minDistSq;
    counts[bestK] += 1;

    const rgbaBase = i * 4;
    outRgba[rgbaBase] = intR[bestK];
    outRgba[rgbaBase + 1] = intG[bestK];
    outRgba[rgbaBase + 2] = intB[bestK];
    outRgba[rgbaBase + 3] = 255;
  }

  const fullMse = totalSqError / (totalPixels * 3);
  const paletteSwatches: PaletteSwatch[] = new Array<PaletteSwatch>(kColors);

  for (let k = 0; k < kColors; k++) {
    const r = intR[k];
    const g = intG[k];
    const b = intB[k];
    paletteSwatches[k] = {
      r,
      g,
      b,
      hex: rgbToHex(r, g, b),
      pixelSharePct: (counts[k] / Math.max(1, totalPixels)) * 100,
    };
  }

  return {
    quantizedRgbaBuffer: outRgba.buffer,
    fullMse,
    paletteSwatches,
  };
}

function initializePopulation(
  sampleRgb: Uint8Array,
  sampleCount: number,
  meanR: number,
  meanG: number,
  meanB: number,
  params: QuantizationParams
): { fireflies: FireflyAgent[]; bestIdx: number } {
  const { kColors, populationSize } = params;
  const dim = kColors * 3;
  const fireflies: FireflyAgent[] = new Array<FireflyAgent>(populationSize);

  let bestMse = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < populationSize; i++) {
    const coords = new Float32Array(dim);
    const patchStart = Math.floor(((i + 0.5) / populationSize) * sampleCount);
    const patchSpan = Math.max(8, Math.floor(sampleCount * 0.06));

    for (let k = 0; k < kColors; k++) {
      const localOffset = Math.floor((Math.random() - 0.5) * patchSpan);
      const sIdx =
        (((patchStart + localOffset) % sampleCount) + sampleCount) % sampleCount;
      const pBase = sIdx * 3;

      const sampleR = sampleRgb[pBase];
      const sampleG = sampleRgb[pBase + 1];
      const sampleB = sampleRgb[pBase + 2];

      const randR = Math.random() * 255;
      const randG = Math.random() * 255;
      const randB = Math.random() * 255;

      const cBase = k * 3;
      coords[cBase] = clampByte(0.28 * sampleR + 0.44 * meanR + 0.28 * randR);
      coords[cBase + 1] = clampByte(0.28 * sampleG + 0.44 * meanG + 0.28 * randG);
      coords[cBase + 2] = clampByte(0.28 * sampleB + 0.44 * meanB + 0.28 * randB);
    }

    sortPaletteByLuminance(coords, kColors);
    const mse = evaluateSampleAndRefine(
      coords,
      sampleRgb,
      sampleCount,
      kColors,
      0
    );

    fireflies[i] = { id: i, coords, mse };
    if (mse < bestMse) {
      bestMse = mse;
      bestIdx = i;
    }
  }

  return { fireflies, bestIdx };
}

function stopLoop(): void {
  if (engine) {
    engine.isPlaying = false;
    if (engine.timerId !== null) {
      clearTimeout(engine.timerId);
      engine.timerId = null;
    }
  }
}

function emitUpdate(isComplete: boolean): void {
  if (!engine) return;

  const {
    originalRgb,
    totalPixels,
    bestCoords,
    params,
    iteration,
    fireflies,
    bestIdx,
    mseHistory,
    psnrHistory,
  } = engine;
  const kColors = params.kColors;

  const { quantizedRgbaBuffer, fullMse, paletteSwatches } = quantizeFullImage(
    originalRgb,
    totalPixels,
    bestCoords,
    kColors
  );

  if (iteration === 0) {
    engine.bestFullMse = fullMse;
    mseHistory.length = 0;
    psnrHistory.length = 0;
    mseHistory.push(fullMse);
    psnrHistory.push(computePsnr(fullMse));
  } else {
    const monotonicMse = Math.min(engine.bestFullMse, fullMse);
    engine.bestFullMse = monotonicMse;
    mseHistory.push(monotonicMse);
    psnrHistory.push(computePsnr(monotonicMse));
  }

  const currentMse = engine.bestFullMse;
  const currentPsnr = computePsnr(currentMse);
  const bppOriginal = 24;
  const bppCompressed = Math.log2(kColors);
  const compressionRatioPct = (1 - bppCompressed / bppOriginal) * 100;

  const fireflyCentroids = fireflies.map((agent, idx) => {
    const colors: Array<[number, number, number]> = new Array(kColors);
    const sourceCoords = idx === bestIdx ? bestCoords : agent.coords;
    for (let k = 0; k < kColors; k++) {
      const cBase = k * 3;
      colors[k] = [
        sourceCoords[cBase],
        sourceCoords[cBase + 1],
        sourceCoords[cBase + 2],
      ];
    }
    return {
      id: agent.id,
      mse: idx === bestIdx ? currentMse : agent.mse,
      isBest: idx === bestIdx,
      colors,
    };
  });

  const telemetry: CompressionTelemetry = {
    iteration,
    maxIterations: params.maxIterations,
    mse: currentMse,
    psnr: currentPsnr,
    bppOriginal,
    bppCompressed,
    compressionRatioPct,
    palette: paletteSwatches,
    fireflyCentroids,
    mseHistory: [...mseHistory],
    psnrHistory: [...psnrHistory],
  };

  const response: WorkerResponseMessage = {
    type: 'ITERATION_UPDATE',
    telemetry,
    quantizedRgbaBuffer,
    isComplete,
  };

  workerScope.postMessage(response, [quantizedRgbaBuffer]);
}

function executeSingleIteration(): boolean {
  if (!engine) return true;
  if (engine.iteration >= engine.params.maxIterations) {
    return true;
  }

  const { sampleRgb, sampleCount, params, fireflies } = engine;
  const { kColors, populationSize, gamma, theta, maxIterations } = params;
  const dim = kColors * 3;
  const normDenom = dim * 255 * 255;
  const beta0 = 1.0;

  const progress = engine.iteration / Math.max(1, maxIterations);
  const pullEta = 0.13 + 0.11 * progress;
  const stepScale = engine.alphaCurrent * 255;

  const prevPositions = fireflies.map((f) => new Float32Array(f.coords));
  const prevMse = fireflies.map((f) => f.mse);

  for (let i = 0; i < populationSize; i++) {
    const working = new Float32Array(prevPositions[i]);
    let movedTowardBrighter = false;

    for (let j = 0; j < populationSize; j++) {
      if (prevMse[j] < prevMse[i]) {
        movedTowardBrighter = true;
        const target = prevPositions[j];

        let distSq = 0;
        for (let d = 0; d < dim; d++) {
          const diff = target[d] - working[d];
          distSq += diff * diff;
        }

        const rNormSq = distSq / normDenom;
        const beta = beta0 * Math.exp(-gamma * rNormSq);

        for (let d = 0; d < dim; d++) {
          const epsilon = Math.random() - 0.5;
          working[d] = clampByte(
            working[d] + beta * (target[d] - working[d]) + stepScale * epsilon
          );
        }

        sortPaletteByLuminance(working, kColors);
      }
    }

    if (!movedTowardBrighter) {
      for (let d = 0; d < dim; d++) {
        const epsilon = Math.random() - 0.5;
        working[d] = clampByte(working[d] + stepScale * 0.45 * epsilon);
      }
      sortPaletteByLuminance(working, kColors);
    }

    const candidateMse = evaluateSampleAndRefine(
      working,
      sampleRgb,
      sampleCount,
      kColors,
      pullEta
    );

    if (!movedTowardBrighter) {
      if (candidateMse <= fireflies[i].mse) {
        fireflies[i].coords.set(working);
        fireflies[i].mse = candidateMse;
      } else {
        const noiselessBest = new Float32Array(prevPositions[i]);
        const refinedBestMse = evaluateSampleAndRefine(
          noiselessBest,
          sampleRgb,
          sampleCount,
          kColors,
          pullEta * 0.85
        );
        if (refinedBestMse <= fireflies[i].mse) {
          fireflies[i].coords.set(noiselessBest);
          fireflies[i].mse = refinedBestMse;
        }
      }
    } else {
      fireflies[i].coords.set(working);
      fireflies[i].mse = candidateMse;
    }
  }

  let currentBestIdx = 0;
  let currentBestSampleMse = Infinity;
  for (let i = 0; i < populationSize; i++) {
    if (fireflies[i].mse < currentBestSampleMse) {
      currentBestSampleMse = fireflies[i].mse;
      currentBestIdx = i;
    }
  }

  const prevEliteSampleMse = evaluateSampleAndRefine(
    engine.bestCoords,
    sampleRgb,
    sampleCount,
    kColors,
    0
  );

  if (currentBestSampleMse <= prevEliteSampleMse) {
    engine.bestCoords.set(fireflies[currentBestIdx].coords);
    engine.bestIdx = currentBestIdx;
  } else {
    fireflies[currentBestIdx].coords.set(engine.bestCoords);
    fireflies[currentBestIdx].mse = prevEliteSampleMse;
    engine.bestIdx = currentBestIdx;
  }

  engine.iteration += 1;
  engine.alphaCurrent *= theta;

  return engine.iteration >= maxIterations;
}

function scheduleNextTick(): void {
  if (!engine || !engine.isPlaying) return;

  const startMs = performance.now();
  const done = executeSingleIteration();
  emitUpdate(done);

  if (done || !engine.isPlaying) {
    stopLoop();
    return;
  }

  const elapsedMs = performance.now() - startMs;
  const delayMs = Math.max(16, Math.round(46 - elapsedMs));
  engine.timerId = workerScope.setTimeout(scheduleNextTick, delayMs);
}

function initEngine(
  width: number,
  height: number,
  rgbaBuffer: ArrayBuffer,
  params: QuantizationParams
): void {
  stopLoop();

  const rgba = new Uint8ClampedArray(rgbaBuffer);
  const totalPixels = width * height;
  const originalRgb = new Uint8Array(totalPixels * 3);

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let i = 0; i < totalPixels; i++) {
    const src = i * 4;
    const dst = i * 3;
    const r = rgba[src];
    const g = rgba[src + 1];
    const b = rgba[src + 2];
    originalRgb[dst] = r;
    originalRgb[dst + 1] = g;
    originalRgb[dst + 2] = b;
    sumR += r;
    sumG += g;
    sumB += b;
  }

  const meanR = sumR / Math.max(1, totalPixels);
  const meanG = sumG / Math.max(1, totalPixels);
  const meanB = sumB / Math.max(1, totalPixels);

  const sampleCount = Math.min(totalPixels, 2048);
  const sampleRgb = new Uint8Array(sampleCount * 3);
  const stride = totalPixels / sampleCount;

  for (let s = 0; s < sampleCount; s++) {
    const pxIdx = Math.min(totalPixels - 1, Math.floor((s + 0.5) * stride));
    const src = pxIdx * 3;
    const dst = s * 3;
    sampleRgb[dst] = originalRgb[src];
    sampleRgb[dst + 1] = originalRgb[src + 1];
    sampleRgb[dst + 2] = originalRgb[src + 2];
  }

  const { fireflies, bestIdx } = initializePopulation(
    sampleRgb,
    sampleCount,
    meanR,
    meanG,
    meanB,
    params
  );

  const bestCoords = new Float32Array(fireflies[bestIdx].coords);

  engine = {
    width,
    height,
    totalPixels,
    originalRgb,
    sampleRgb,
    sampleCount,
    meanR,
    meanG,
    meanB,
    params,
    iteration: 0,
    alphaCurrent: params.alpha0,
    fireflies,
    bestCoords,
    bestFullMse: Infinity,
    bestIdx,
    mseHistory: [],
    psnrHistory: [],
    isPlaying: false,
    timerId: null,
  };

  emitUpdate(false);
}

workerScope.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  try {
    const msg = event.data;

    switch (msg.type) {
      case 'INIT': {
        initEngine(msg.width, msg.height, msg.rgbaBuffer, msg.params);
        break;
      }

      case 'PLAY': {
        if (!engine) return;
        if (engine.iteration >= engine.params.maxIterations) {
          const { sampleRgb, sampleCount, meanR, meanG, meanB, params } = engine;
          const { fireflies, bestIdx } = initializePopulation(
            sampleRgb,
            sampleCount,
            meanR,
            meanG,
            meanB,
            params
          );
          engine.fireflies = fireflies;
          engine.bestIdx = bestIdx;
          engine.bestCoords = new Float32Array(fireflies[bestIdx].coords);
          engine.iteration = 0;
          engine.alphaCurrent = params.alpha0;
          engine.bestFullMse = Infinity;
          emitUpdate(false);
        }

        if (!engine.isPlaying) {
          engine.isPlaying = true;
          if (engine.timerId !== null) {
            clearTimeout(engine.timerId);
          }
          engine.timerId = workerScope.setTimeout(scheduleNextTick, 24);
        }
        break;
      }

      case 'PAUSE': {
        stopLoop();
        break;
      }

      case 'STEP': {
        if (!engine) return;
        stopLoop();
        if (engine.iteration < engine.params.maxIterations) {
          const done = executeSingleIteration();
          emitUpdate(done);
        }
        break;
      }

      case 'RESET': {
        if (!engine) return;
        stopLoop();
        const nextParams = msg.params ?? engine.params;
        engine.params = nextParams;
        const { fireflies, bestIdx } = initializePopulation(
          engine.sampleRgb,
          engine.sampleCount,
          engine.meanR,
          engine.meanG,
          engine.meanB,
          nextParams
        );
        engine.fireflies = fireflies;
        engine.bestIdx = bestIdx;
        engine.bestCoords = new Float32Array(fireflies[bestIdx].coords);
        engine.iteration = 0;
        engine.alphaCurrent = nextParams.alpha0;
        engine.bestFullMse = Infinity;
        emitUpdate(false);
        break;
      }
    }
  } catch (err) {
    stopLoop();
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'Lỗi không xác định trong Web Worker lượng tử hóa màu.';
    const response: WorkerResponseMessage = {
      type: 'ERROR',
      message: errorMsg,
    };
    workerScope.postMessage(response);
  }
};

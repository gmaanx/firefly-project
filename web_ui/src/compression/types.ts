export interface QuantizationParams {
  kColors: 4 | 8 | 16 | 32;
  populationSize: number;
  maxIterations: number;
  gamma: number;
  alpha0: number;
  theta: number;
}

export interface PaletteSwatch {
  r: number;
  g: number;
  b: number;
  hex: string;
  pixelSharePct: number;
}

export interface CompressionTelemetry {
  iteration: number;
  maxIterations: number;
  mse: number;
  psnr: number;
  bppOriginal: number;
  bppCompressed: number;
  compressionRatioPct: number;
  palette: PaletteSwatch[];
  fireflyCentroids: Array<{
    id: number;
    mse: number;
    isBest: boolean;
    colors: Array<[number, number, number]>;
  }>;
  mseHistory: number[];
  psnrHistory: number[];
}

export type WorkerRequestMessage =
  | {
      type: 'INIT';
      width: number;
      height: number;
      rgbaBuffer: ArrayBuffer;
      params: QuantizationParams;
    }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STEP' }
  | { type: 'RESET'; params?: QuantizationParams };

export type WorkerResponseMessage =
  | {
      type: 'ITERATION_UPDATE';
      telemetry: CompressionTelemetry;
      quantizedRgbaBuffer: ArrayBuffer;
      isComplete: boolean;
    }
  | {
      type: 'ERROR';
      message: string;
    };

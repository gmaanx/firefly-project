import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BlockReveal } from '../components/shared/BlockReveal';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { MathFormula } from '../components/shared/MathFormula';
import { KineticButton } from '../components/shared/KineticButton';
import { useRouteCurtain } from '../components/shared/RouteCurtain';
import { yieldToMain } from '../lib/yieldToMain';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ConvergenceMiniChart } from './ConvergenceMiniChart';
import { RgbCubeVisualizer } from './RgbCubeVisualizer';
import {
  SAMPLE_PRESETS,
  generateSampleImage,
  loadCustomImageFile,
  loadStarryNightImage,
  type LoadedImageAsset,
  type SamplePresetMeta,
} from './sampleImages';
import type {
  CompressionTelemetry,
  QuantizationParams,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from './types';

gsap.registerPlugin(ScrollTrigger);

const K_MODES: ReadonlyArray<{
  k: 4 | 8 | 16 | 32;
  bpp: number;
  ratioLabel: string;
  tag: string;
}> = [
  { k: 4, bpp: 2, ratioLabel: '91.7%', tag: '2 BPP · SIÊU NÉN' },
  { k: 8, bpp: 3, ratioLabel: '87.5%', tag: '3 BPP · CÔ ĐỌNG' },
  { k: 16, bpp: 4, ratioLabel: '83.3%', tag: '4 BPP · CÂN BẰNG' },
  { k: 32, bpp: 5, ratioLabel: '79.2%', tag: '5 BPP · SẮC NÉT CAO' },
];

const cachedSampleAssets = new Map<SamplePresetMeta['id'], LoadedImageAsset>();

function getOrCreateSampleAsset(id: SamplePresetMeta['id']): LoadedImageAsset {
  const hit = cachedSampleAssets.get(id);
  if (hit) return hit;
  const built = generateSampleImage(id);
  cachedSampleAssets.set(id, built);
  return built;
}

export interface ImageCompressionLabProps {
  reducedMotion: boolean;
}

export function ImageCompressionLab({ reducedMotion }: ImageCompressionLabProps) {
  const { isTransitioning } = useRouteCurtain();
  const sectionRef = useRef<HTMLElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const [activeAsset, setActiveAsset] = useState<LoadedImageAsset>(() =>
    getOrCreateSampleAsset('starry-night')
  );
  const [, setWarmupTick] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    void loadStarryNightImage()
      .then((realStarry) => {
        cachedSampleAssets.set('starry-night', realStarry);
        if (cancelled) return;
        setActiveAsset((prev) =>
          prev.id === 'starry-night' ? realStarry : prev
        );
        setWarmupTick((n) => n + 1);
      })
      .catch(() => {});

    if (isTransitioning) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      for (const preset of SAMPLE_PRESETS) {
        if (cancelled) return;
        if (preset.id === 'starry-night') continue;
        if (!cachedSampleAssets.has(preset.id)) {
          await yieldToMain();
          if (cancelled) return;
          getOrCreateSampleAsset(preset.id);
          setWarmupTick((n) => n + 1);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTransitioning]);
  const [params, setParams] = useState<QuantizationParams>({
    kColors: 16,
    populationSize: 12,
    maxIterations: 32,
    gamma: 1.4,
    alpha0: 0.25,
    theta: 0.94,
  });

  const [telemetry, setTelemetry] = useState<CompressionTelemetry | null>(null);
  const [quantizedRgba, setQuantizedRgba] = useState<Uint8ClampedArray | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useGSAP(
    () => {
      const panel = leftPanelRef.current;
      if (!panel || reducedMotion) return;
      gsap.fromTo(
        panel,
        { clipPath: 'inset(8% 0% 0% 0%)', autoAlpha: 0.7 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          autoAlpha: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: panel,
            start: 'top 84%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  const postToWorker = useCallback(
    (msg: WorkerRequestMessage, transfer?: Transferable[]) => {
      if (!workerRef.current) return;
      if (transfer && transfer.length > 0) {
        workerRef.current.postMessage(msg, transfer);
      } else {
        workerRef.current.postMessage(msg);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const worker = new Worker(
        new URL('./faQuantizer.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const payload = event.data;
        if (payload.type === 'ITERATION_UPDATE') {
          setTelemetry(payload.telemetry);
          setQuantizedRgba(new Uint8ClampedArray(payload.quantizedRgbaBuffer));
          setIsComplete(payload.isComplete);
          if (payload.isComplete) {
            setIsRunning(false);
          }
        } else if (payload.type === 'ERROR') {
          setErrorMsg(payload.message);
          setIsRunning(false);
        }
      };

      setWorkerReady(true);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerReady) return;
    setIsRunning(false);
    setIsComplete(false);
    setErrorMsg(null);
    const bufferCopy = activeAsset.rgbaData.slice().buffer;
    postToWorker(
      {
        type: 'INIT',
        width: activeAsset.width,
        height: activeAsset.height,
        rgbaBuffer: bufferCopy,
        params,
      },
      [bufferCopy]
    );
  }, [activeAsset, params, postToWorker, workerReady]);

  const handleTogglePlay = () => {
    if (isRunning) {
      setIsRunning(false);
      postToWorker({ type: 'PAUSE' });
      return;
    }
    if (isComplete) {
      setIsComplete(false);
      postToWorker({ type: 'RESET', params });
    }
    setIsRunning(true);
    postToWorker({ type: 'PLAY' });
  };

  const handleStep = () => {
    if (isRunning) {
      setIsRunning(false);
      postToWorker({ type: 'PAUSE' });
    }
    postToWorker({ type: 'STEP' });
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsComplete(false);
    postToWorker({ type: 'RESET', params });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const custom = await loadCustomImageFile(file);
      setActiveAsset(custom);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể đọc ảnh tải lên.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleCopyHex = (hex: string, pct: number) => {
    const info = `${hex} · ${pct.toFixed(1)}% điểm ảnh`;
    setCopiedNotice(info);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(hex).catch(() => {});
    }
  };

  return (
    <section
      id="nen-anh-fa"
      ref={sectionRef}
      className="compression-lab-section"
      data-surface="dark"
      aria-labelledby="compression-lab-heading"
    >
      <ContourBackdrop variant="dark" />

      <div className="section-container">
        <div className="compression-lab-header">
          <div className="compression-lab-header__titles">
            <h2 id="compression-lab-heading" className="compression-lab-title">
              <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                Nén ảnh 24-bit bằng{' '}
                <span className="editorial-serif editorial-serif--sage-gold">
                  Thuật toán Đom đóm
                </span>
              </BlockReveal>
            </h2>
          </div>
          <p className="compression-lab-lead">
            Mỗi đom đóm biểu diễn một bộ <MathFormula tex="K" ariaLabel="K" />{' '}
            màu đại diện trong không gian RGB{' '}
            <MathFormula tex="[0, 255]^{3K}" ariaLabel="[0, 255]^{3K}" />. Bộ giải{' '}
            <strong>Hybrid FA</strong> kết hợp lực hút đom đóm với bước kéo tâm cụm
            theo mật độ điểm ảnh để giảm MSE trong 32 thế hệ thời gian thực.
          </p>
        </div>

        <div
          className="k-modes-grid"
          role="group"
          aria-label="Chọn số lượng màu bảng nén K"
        >
          {K_MODES.map((mode) => {
            const active = params.kColors === mode.k;
            return (
              <button
                key={mode.k}
                type="button"
                className={`k-mode-card ${active ? 'k-mode-card--active' : ''}`}
                aria-pressed={active}
                onClick={() =>
                  setParams((prev) => ({ ...prev, kColors: mode.k }))
                }
              >
                <div className="k-mode-card__top">
                  <span>{mode.tag}</span>
                  <span>24 → {mode.bpp} BPP</span>
                </div>
                <div className="k-mode-card__main">
                  <span className="k-mode-card__k">K = {mode.k} MÀU</span>
                  <span className="k-mode-card__ratio">
                    −{mode.ratioLabel} DUNG LƯỢNG
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {errorMsg ? (
          <div
            className="data-status-card"
            role="alert"
            style={{ marginBottom: '1rem' }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div className="compression-main-grid">
          <div ref={leftPanelRef} className="compression-panel">
            <div className="ba-toolbar">
              <div className="preset-pills-row">
                {SAMPLE_PRESETS.map((preset) => {
                  const cached = cachedSampleAssets.get(preset.id);
                  const active = activeAsset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      className={`preset-btn ${active ? 'preset-btn--active' : ''}`}
                      onClick={() => setActiveAsset(getOrCreateSampleAsset(preset.id))}
                    >
                      {cached ? (
                        <img src={cached.previewDataUrl} alt="" aria-hidden="true" />
                      ) : null}
                      <span>{preset.titleVi}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={activeAsset.id === 'custom-upload'}
                  className={`preset-btn ${
                    activeAsset.id === 'custom-upload' ? 'preset-btn--active' : ''
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  ↑ Ảnh riêng
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  aria-label="Tải tệp ảnh riêng từ máy tính"
                />
              </div>
            </div>

            <BeforeAfterSlider
              width={activeAsset.width}
              height={activeAsset.height}
              originalRgba={activeAsset.rgbaData}
              quantizedRgba={quantizedRgba}
              kColors={params.kColors}
              imageCode={activeAsset.code}
              iteration={telemetry?.iteration ?? 0}
              maxIterations={telemetry?.maxIterations ?? params.maxIterations}
              isRunning={isRunning}
            />

            <div>
              <div className="palette-strip-head">
                <span>
                  Bảng màu ({telemetry?.palette.length ?? params.kColors} màu · gốc{' '}
                  {activeAsset.uniqueColorsCount.toLocaleString('vi-VN')} màu)
                </span>
                {copiedNotice ? (
                  <span style={{ color: 'var(--accent-sage-gold)' }}>
                    Đã chép: {copiedNotice}
                  </span>
                ) : null}
              </div>
              <div
                className="palette-strip"
                role="list"
                aria-label="Bảng màu trích xuất"
              >
                {(telemetry?.palette ?? []).map((swatch, idx) => (
                  <button
                    key={`${idx}-${swatch.hex}`}
                    type="button"
                    role="listitem"
                    className="palette-swatch-btn"
                    style={{
                      backgroundColor: swatch.hex,
                      flexGrow: Math.max(1.2, swatch.pixelSharePct),
                    }}
                    title={`${swatch.hex} (${swatch.pixelSharePct.toFixed(1)}%)`}
                    aria-label={`Sao chép màu ${swatch.hex}, chiếm ${swatch.pixelSharePct.toFixed(1)} phần trăm`}
                    onClick={() => handleCopyHex(swatch.hex, swatch.pixelSharePct)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="compression-panel">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.55rem',
                justifyContent: 'space-between',
              }}
            >
              {/* NO solid neon-purple button! Crisp lime primary CTA when ready, outline-light while running */}
              <KineticButton
                variant={isRunning ? 'outline-light' : 'lime'}
                label={
                  isRunning
                    ? 'TẠM DỪNG'
                    : isComplete
                      ? 'CHẠY LẠI FA'
                      : 'NÉN ẢNH FA'
                }
                icon={isRunning ? '⏸' : '▶'}
                onClick={handleTogglePlay}
              />

              <div className="chip-group">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={handleStep}
                  disabled={isComplete && !isRunning}
                >
                  Bước +1
                </button>
                <button type="button" className="chip-btn" onClick={handleReset}>
                  Đặt lại
                </button>
              </div>
            </div>

            <div className="compression-telemetry-strip">
              <div className="compression-telemetry-chip">
                <span>Thế hệ</span>
                <strong>
                  {telemetry
                    ? `${telemetry.iteration}/${telemetry.maxIterations}`
                    : `0/${params.maxIterations}`}
                </strong>
              </div>
              <div className="compression-telemetry-chip">
                <span>MSE</span>
                <strong className="hairline-bento__val--iris">
                  {telemetry ? telemetry.mse.toFixed(1) : '—'}
                </strong>
              </div>
              <div className="compression-telemetry-chip">
                <span>PSNR</span>
                <strong className="hairline-bento__val--lime">
                  {telemetry ? `${telemetry.psnr.toFixed(2)} dB` : '—'}
                </strong>
              </div>
              <div className="compression-telemetry-chip">
                <span>Giảm</span>
                <strong>
                  {telemetry
                    ? `${telemetry.compressionRatioPct.toFixed(1)}%`
                    : '—'}
                </strong>
              </div>
            </div>

            <div className="compression-sliders-grid">
              <div className="slider-row">
                <div className="slider-row__head">
                  <span>Cỡ đàn n</span>
                  <span className="slider-row__val">{params.populationSize}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={24}
                  step={2}
                  value={params.populationSize}
                  aria-label="Kích thước đàn đom đóm nén ảnh"
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      populationSize: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <span>Số thế hệ tối đa</span>
                  <span className="slider-row__val">{params.maxIterations}</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={56}
                  step={4}
                  value={params.maxIterations}
                  aria-label="Số thế hệ nén ảnh tối đa"
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      maxIterations: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <span>Hệ số hấp thụ γ</span>
                  <span className="slider-row__val">
                    {params.gamma.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={4.5}
                  step={0.1}
                  value={params.gamma}
                  aria-label="Hệ số hấp thụ ánh sáng gamma trong không gian RGB"
                  onChange={(e) =>
                    setParams((p) => ({ ...p, gamma: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-row__head">
                  <span>Hệ số làm nguội θ</span>
                  <span className="slider-row__val">
                    {params.theta.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.88}
                  max={0.99}
                  step={0.01}
                  value={params.theta}
                  aria-label="Hệ số giảm nhiễu ngẫu nhiên theta"
                  onChange={(e) =>
                    setParams((p) => ({ ...p, theta: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <RgbCubeVisualizer
              pointCloudPositions={activeAsset.pointCloudPositions}
              pointCloudColors={activeAsset.pointCloudColors}
              telemetry={telemetry}
              reducedMotion={reducedMotion}
            />

            <ConvergenceMiniChart
              mseHistory={telemetry?.mseHistory ?? []}
              psnrHistory={telemetry?.psnrHistory ?? []}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

export interface BeforeAfterSliderProps {
  width: number;
  height: number;
  originalRgba: Uint8ClampedArray;
  quantizedRgba: Uint8ClampedArray | null;
  kColors: number;
  imageCode: string;
  iteration?: number;
  maxIterations?: number;
  isRunning?: boolean;
}

export function BeforeAfterSlider({
  width,
  height,
  originalRgba,
  quantizedRgba,
  kColors,
  imageCode,
  iteration = 0,
  maxIterations = 32,
  isRunning = false,
}: BeforeAfterSliderProps) {
  const [splitPct, setSplitPct] = useState<number>(50);
  const [dragging, setDragging] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const quantCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = origCanvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const clamped = new Uint8ClampedArray(width * height * 4);
    clamped.set(originalRgba.subarray(0, clamped.length));
    ctx.putImageData(new ImageData(clamped, width, height), 0, 0);
  }, [width, height, originalRgba]);

  useEffect(() => {
    const canvas = quantCanvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const src = quantizedRgba ?? originalRgba;
    const clamped = new Uint8ClampedArray(width * height * 4);
    clamped.set(src.subarray(0, clamped.length));
    ctx.putImageData(new ImageData(clamped, width, height), 0, 0);
  }, [width, height, quantizedRgba, originalRgba]);

  const updateFromClientX = useCallback((clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(0, Math.min(100, ratio)));
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPct((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPct((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPct(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplitPct(100);
    }
  };

  const handleDownloadPng = () => {
    const canvas = quantCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `fa_quantized_${imageCode.toLowerCase()}_k${kColors}.png`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div className="ba-toolbar">
        <span className="ba-toolbar__title">
          SO SÁNH TRƯỚC / SAU · KÉO THANH GẠT ({Math.round(splitPct)}%)
        </span>
        <div className="chip-group">
          <button
            type="button"
            aria-pressed={Math.round(splitPct) === 100}
            className={`chip-btn ${Math.round(splitPct) === 100 ? 'chip-btn--active' : ''}`}
            onClick={() => setSplitPct(100)}
          >
            Gốc 24-bit
          </button>
          <button
            type="button"
            aria-pressed={Math.round(splitPct) === 50}
            className={`chip-btn ${Math.round(splitPct) === 50 ? 'chip-btn--active' : ''}`}
            onClick={() => setSplitPct(50)}
          >
            50 / 50
          </button>
          <button
            type="button"
            aria-pressed={Math.round(splitPct) === 0}
            className={`chip-btn ${Math.round(splitPct) === 0 ? 'chip-btn--active' : ''}`}
            onClick={() => setSplitPct(0)}
          >
            Nén FA
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={handleDownloadPng}
            title="Tải ảnh nén PNG"
          >
            ↓ PNG
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="ba-stage-frame"
        style={{ aspectRatio: `${width} / ${height}` }}
        role="slider"
        tabIndex={0}
        data-local-keys="true"
        aria-label="Thanh gạt đối chiếu ảnh gốc 24-bit và ảnh nén bằng Thuật toán Đom đóm"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(splitPct)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <canvas ref={quantCanvasRef} className="ba-canvas" />

        <canvas
          ref={origCanvasRef}
          className="ba-canvas ba-canvas--overlay"
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
        />

        <span className="ba-badge ba-badge--left">24-BIT GỐC</span>
        <span
          className={`ba-badge ba-badge--right ${
            iteration === 0 && !isRunning ? 'ba-badge--right-idle' : ''
          }`}
        >
          {isRunning
            ? `ĐANG CHẠY FA · t = ${iteration}/${maxIterations}`
            : iteration === 0
              ? `t = 0 · CHƯA NÉN (K = ${kColors})`
              : `SAU NÉN FA · K = ${kColors} MÀU (t = ${iteration})`}
        </span>

        <div className="ba-divider" style={{ left: `${splitPct}%` }} aria-hidden="true">
          <div className="ba-divider__line" />
          <div className="ba-divider__knob">↔</div>
        </div>
      </div>
    </div>
  );
}

export interface ConvergenceMiniChartProps {
  mseHistory: number[];
  psnrHistory: number[];
}

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  padY = 6
): { line: string; area: string; lastX: number; lastY: number } | null {
  if (values.length === 0) return null;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = Math.max(1e-6, maxVal - minVal);
  const innerH = height - padY * 2;

  const pts = values.map((v, idx) => {
    const x =
      values.length === 1 ? width * 0.5 : (idx / (values.length - 1)) * width;
    const y = padY + innerH * (1 - (v - minVal) / span);
    return { x, y };
  });

  const line = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`;

  return { line, area, lastX: last.x, lastY: last.y };
}

export function ConvergenceMiniChart({
  mseHistory,
  psnrHistory,
}: ConvergenceMiniChartProps) {
  const W = 220;
  const H = 68;
  const mseSpark = buildSparklinePath(mseHistory, W, H);
  const psnrSpark = buildSparklinePath(psnrHistory, W, H);

  const lastMse = mseHistory.length > 0 ? mseHistory[mseHistory.length - 1] : null;
  const lastPsnr = psnrHistory.length > 0 ? psnrHistory[psnrHistory.length - 1] : null;

  return (
    <div className="mini-charts-grid">
      {/* Secondary Twilight-Iris Data Stroke: MSE ↓ */}
      <div className="mini-chart-box">
        <div className="mini-chart-box__head">
          <span>MSE ↓</span>
          <strong style={{ color: 'var(--accent-iris)' }}>
            {lastMse !== null ? lastMse.toFixed(1) : '—'}
          </strong>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: '64px', display: 'block' }}
          role="img"
          aria-label="Đường hội tụ sai số bình phương trung bình MSE giảm dần theo thế hệ"
        >
          <defs>
            <linearGradient id="fa-mse-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8D7AE6" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#8D7AE6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={H - 1}
            x2={W}
            y2={H - 1}
            stroke="rgba(239,239,232,0.11)"
            strokeWidth="1"
          />
          {mseSpark ? (
            <>
              <path d={mseSpark.area} fill="url(#fa-mse-grad)" />
              <path
                d={mseSpark.line}
                fill="none"
                stroke="#8D7AE6"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={mseSpark.lastX}
                cy={mseSpark.lastY}
                r="3.2"
                fill="#8D7AE6"
              />
            </>
          ) : null}
        </svg>
      </div>

      {/* Primary Botanical Lime Curve: PSNR ↑ */}
      <div className="mini-chart-box">
        <div className="mini-chart-box__head">
          <span>PSNR ↑</span>
          <strong style={{ color: 'var(--accent-lime)' }}>
            {lastPsnr !== null ? `${lastPsnr.toFixed(2)} dB` : '—'}
          </strong>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: '64px', display: 'block' }}
          role="img"
          aria-label="Đường chất lượng ảnh PSNR tăng dần theo thế hệ"
        >
          <defs>
            <linearGradient id="fa-psnr-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5E84D" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#C5E84D" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={H - 1}
            x2={W}
            y2={H - 1}
            stroke="rgba(239,239,232,0.11)"
            strokeWidth="1"
          />
          {psnrSpark ? (
            <>
              <path d={psnrSpark.area} fill="url(#fa-psnr-grad)" />
              <path
                d={psnrSpark.line}
                fill="none"
                stroke="#C5E84D"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={psnrSpark.lastX}
                cy={psnrSpark.lastY}
                r="3.2"
                fill="#C5E84D"
              />
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

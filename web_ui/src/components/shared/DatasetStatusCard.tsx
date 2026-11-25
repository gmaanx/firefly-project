export interface DatasetStatusCardProps {
  status: 'idle' | 'loading' | 'error';
  fileLabel: string;
  error?: string | null;
  onRetry?: () => void;
  tone?: 'dark' | 'light';
}

export function DatasetStatusCard({
  status,
  fileLabel,
  error,
  onRetry,
  tone = 'dark',
}: DatasetStatusCardProps) {
  if (status === 'error') {
    return (
      <div className={`data-status-card data-status-card--${tone} data-status-card--error`} role="alert">
        <div className="data-status-card__eyebrow">KHÔNG TẢI ĐƯỢC DỮ LIỆU ĐÃ XÁC MINH · {fileLabel}</div>
        <p className="data-status-card__msg">
          {error ?? `Không thể đọc ${fileLabel}. Các chương khác và Live Demo vẫn hoạt động bình thường.`}
        </p>
        {onRetry ? (
          <button type="button" className="action-pill action-pill--lime" onClick={onRetry}>
            Thử tải lại {fileLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`data-status-card data-status-card--${tone}`} aria-live="polite">
      <div className="data-status-card__eyebrow">ĐANG NẠP DỮ LIỆU THỰC NGHIỆM · {fileLabel}</div>
      <p className="data-status-card__msg">
        Đang đọc và kiểm tra lược đồ JSON từ <code>public/data/{fileLabel}</code>…
      </p>
    </div>
  );
}

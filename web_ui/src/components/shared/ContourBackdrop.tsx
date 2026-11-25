export interface ContourBackdropProps {
  variant?: 'light' | 'olive' | 'sage' | 'dark';
  className?: string;
}

/**
 * Purely decorative editorial topographic contour backdrop (marked aria-hidden).
 * Clipped to its parent section via `.contour-backdrop-clip` (`clip-path: inset(0)`)
 * while the inner SVG stays viewport-locked (`position: fixed`) so the contour
 * landscape remains completely stationary as sections scroll over it.
 */
export function ContourBackdrop({ variant = 'light', className = '' }: ContourBackdropProps) {
  return (
    <div className={`contour-backdrop-clip ${className}`.trim()} aria-hidden="true">
      <svg
        className={`contour-backdrop contour-backdrop--${variant}`}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" strokeWidth="1.1">
          <path d="M-120,140 C160,60 320,280 560,210 C820,135 980,-40 1290,90 C1420,145 1510,240 1580,290" />
          <path d="M-90,340 C190,230 420,440 710,350 C980,265 1130,110 1540,260" />
          <path d="M-140,590 C140,460 380,690 690,590 C990,495 1190,360 1560,520" />
          <path d="M-60,810 C260,690 520,860 840,770 C1120,690 1310,590 1550,730" />
          <ellipse cx="290" cy="220" rx="190" ry="105" transform="rotate(-14 290 220)" />
          <ellipse cx="290" cy="220" rx="108" ry="56" transform="rotate(-14 290 220)" />
          <ellipse cx="1140" cy="640" rx="230" ry="125" transform="rotate(18 1140 640)" />
          <ellipse cx="1140" cy="640" rx="125" ry="66" transform="rotate(18 1140 640)" />
        </g>
      </svg>
    </div>
  );
}

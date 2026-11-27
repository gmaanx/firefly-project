import type { RefObject } from 'react';

export interface HeroSectionProps {
  hudRef: RefObject<HTMLDivElement | null>;
  hudFrameRef?: RefObject<HTMLDivElement | null>;
  crtOverlayRef?: RefObject<HTMLDivElement | null>;
  centerpieceRef?: RefObject<HTMLDivElement | null>;
  onScrollToManifesto: () => void;
}

/**
 * Custom Stencil-Didone `FA` Monogram + Wide-Tracked `FIREFLY ALGORITHM` Lockup:
 * Crafted after the high-contrast luxury stencil-Didone aesthetic (`MD / M A S T E R D`):
 *  - `F`: Bold architectural Didone column with concave bracketed serifs and a crisp
 *         vertical stencil decoupage cut separating its flared top beak & middle crossbar.
 *  - `A`: Decoupled concave hyperbolic stencil spire pedestal on the lower-left paired
 *         with a commanding high-contrast diagonal stem, sharp apex beak, and floating
 *         stencil hairline crossbar.
 *  - `FIREFLY ALGORITHM`: Light-weight, wide-tracked geometric sans underneath.
 */
export function HeroSection({
  hudRef,
  hudFrameRef,
  crtOverlayRef,
  centerpieceRef,
  onScrollToManifesto,
}: HeroSectionProps) {
  return (
    <div
      ref={hudFrameRef}
      className="orchestrated-hero-hud"
    >
      {/* Stationary 1:1 tailord.design CRT scanline (1px/3px) + fractalNoise phosphor screen overlay */}
      <div
        ref={crtOverlayRef}
        className="tailord-crt-overlay hero-crt-overlay"
        aria-hidden="true"
      />

      <div ref={hudRef} className="orchestrated-hero-hud__content">
        <div ref={centerpieceRef} className="hero-centerpiece">
          <h1 id="hero-heading" tabIndex={-1} className="hero-centerpiece__title">
            <svg
              className="hero-centerpiece__monogram"
              viewBox="0 0 348 170"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              {/* F — Bold Didone Architectural Stem + Concave Bracketed Serifs */}
              <path
                d="M40 14 H94 V128 C94 147, 102 152.8, 118 152.8 V156 H40 V152.8 C56 152.8, 66 147, 66 128 V42 C66 23, 56 17.2, 40 17.2 Z"
                fill="currentColor"
              />
              {/* F — Stenciled Top Arm + Flared Concave Didone Beak Spur */}
              <path
                d="M105 14 H169 L171 48 H167.6 C165.5 28, 156 17.6, 134 17.6 H105 Z"
                fill="currentColor"
              />
              {/* F — Stenciled High-Contrast Middle Crossbar + Symmetrical Didone Serif */}
              <path
                d="M105 81.2 H126 C139 81.2, 145.5 76, 146.4 65 H149.6 V101 H146.4 C145.5 90, 139 84.8, 126 84.8 H105 Z"
                fill="currentColor"
              />

              {/* A — Signature Decoupled Concave Stencil Spire Pedestal (MD twin) */}
              <path
                d="M162 156 V152.8 C178 152.4, 185.5 138, 189.4 92 H192.8 C195.2 138, 201.5 152.4, 214 152.8 V156 Z"
                fill="currentColor"
              />
              {/* A — Commanding Diagonal Stem + Sharp Top-Left Beak + Flared Right Foot */}
              <path
                d="M201 14 H236 L286 134 C292.5 149, 298.5 152.8, 308 152.8 V156 H246 V152.8 C256.5 152.8, 260.5 147.5, 255.5 135.5 L214 33 C210.2 23.5, 206.5 17.2, 201 17.2 Z"
                fill="currentColor"
              />
              {/* A — Floating Stencil Hairline Crossbar */}
              <path
                d="M199 104 H236 L237.5 107.6 H199 Z"
                fill="currentColor"
              />
            </svg>

            <span className="hero-centerpiece__subtitle">FIREFLY ALGORITHM</span>
          </h1>
        </div>

        <div className="orchestrated-hero-scroll-wrap">
          <button
            type="button"
            className="orchestrated-scroll-cue"
            onClick={onScrollToManifesto}
            aria-label="Scroll xuống phần Nguyên lý tự nhiên"
          >
            <span className="orchestrated-scroll-cue__label">Scroll</span>
            <span className="orchestrated-scroll-cue__track" aria-hidden="true">
              <span className="orchestrated-scroll-cue__line" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

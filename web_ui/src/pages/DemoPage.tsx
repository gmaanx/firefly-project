import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ImageCompressionLab } from '../compression/ImageCompressionLab';
import { FooterSection } from '../components/sections/FooterSection';
import { LiveSandboxSection } from '../components/sections/LiveSandboxSection';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { MathFormula } from '../components/shared/MathFormula';

export interface DemoPageProps {
  reducedMotion: boolean;
  onRegisterSpaceToggle: (fn: (() => void) | null) => void;
  onScrollToSection: (id: string) => void;
}

export function DemoPage({
  reducedMotion,
  onRegisterSpaceToggle,
  onScrollToSection,
}: DemoPageProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [activeLab, setActiveLab] = useState<'sandbox' | 'compression'>('sandbox');

  useGSAP(
    () => {
      const hdr = headerRef.current;
      if (!hdr || reducedMotion) return;
      const items = hdr.querySelectorAll<HTMLElement>('.demo-studio-enter');
      gsap.fromTo(
        items,
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.07,
        }
      );
    },
    { scope: headerRef, dependencies: [reducedMotion] }
  );

  useEffect(() => {
    const onScroll = () => {
      const compSec = document.getElementById('nen-anh-fa');
      if (!compSec) return;
      const rect = compSec.getBoundingClientRect();
      const next = rect.top <= 240 ? 'compression' : 'sandbox';
      setActiveLab((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* 1. Clean Obsidian Studio Header (#101110) — ONE quiet single-line monospace telemetry strip */}
      <section
        ref={headerRef}
        className="demo-studio-header"
        data-surface="dark"
        aria-labelledby="demo-page-heading"
      >
        <ContourBackdrop variant="dark" />

        <div className="section-container demo-studio-header__inner">
          <div className="demo-studio-header__main demo-studio-enter">
            <div>
              <h1
                id="demo-page-heading"
                tabIndex={-1}
                className="demo-studio-header__title"
              >
                Mô phỏng thuật toán &amp;{' '}
                <span className="editorial-serif editorial-serif--sage-gold">
                  ứng dụng nén ảnh
                </span>
              </h1>
            </div>

            <p className="demo-studio-header__lead">
              Trực tiếp chỉnh tham số{' '}
              <MathFormula tex="n, \gamma, \theta" ariaLabel="n, gamma, theta" />{' '}
              trên 7 hàm chuẩn nhiều cực trị và quan sát cách thuật toán gom cụm
              bảng màu để nén ảnh 24-bit.
            </p>
          </div>
        </div>
      </section>

      {/* Ultra-Clean Architectural Hairline Tab Bar (Sharp #C5E84D bottom indicator + #EFEFE8 active text) */}
      <div
        className="demo-sticky-switcher"
        data-surface="dark"
        role="navigation"
        aria-label="Chuyển nhanh giữa hai phòng thí nghiệm"
      >
        <div className="section-container demo-hairline-tabs">
          <button
            type="button"
            aria-current={activeLab === 'sandbox' ? 'true' : undefined}
            className={`demo-hairline-tab ${
              activeLab === 'sandbox' ? 'demo-hairline-tab--active' : ''
            }`}
            onClick={() => {
              setActiveLab('sandbox');
              onScrollToSection('sandbox-sach');
            }}
          >
            <span className="demo-hairline-tab__num">01</span>
            <span>Sandbox Toán học</span>
          </button>

          <button
            type="button"
            aria-current={activeLab === 'compression' ? 'true' : undefined}
            className={`demo-hairline-tab ${
              activeLab === 'compression' ? 'demo-hairline-tab--active' : ''
            }`}
            onClick={() => {
              setActiveLab('compression');
              onScrollToSection('nen-anh-fa');
            }}
          >
            <span className="demo-hairline-tab__num">02</span>
            <span>Ứng dụng Nén ảnh RGB</span>
          </button>
        </div>
      </div>

      {/* Lab 1: Live Mathematical Optimization Sandbox (#101110) */}
      <LiveSandboxSection
        reducedMotion={reducedMotion}
        onRegisterSpaceToggle={onRegisterSpaceToggle}
      />

      {/* Lab 2: FA RGB Image Compression Lab (#101110 + #161815 cards) */}
      <ImageCompressionLab reducedMotion={reducedMotion} />

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}

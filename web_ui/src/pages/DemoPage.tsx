import { useRef } from 'react';
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
}

export function DemoPage({
  reducedMotion,
  onRegisterSpaceToggle,
}: DemoPageProps) {
  const headerRef = useRef<HTMLElement>(null);

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

  return (
    <>
      {/* 1. Clean Obsidian Studio Header (#101110) */}
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

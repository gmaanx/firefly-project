import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ExperimentsGridSection } from '../components/sections/ExperimentsGridSection';
import { FooterSection } from '../components/sections/FooterSection';
import { BlockReveal } from '../components/shared/BlockReveal';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { LandoSectionBlend } from '../components/shared/LandoSectionBlend';
import { LandoSignatureFlourish } from '../components/shared/LandoSignatureFlourish';
import { MathFormula } from '../components/shared/MathFormula';
import { NextPageBanner } from '../components/shared/NextPageBanner';

gsap.registerPlugin(ScrollTrigger);

export interface ExperimentsPageProps {
  reducedMotion: boolean;
}

export function ExperimentsPage({ reducedMotion }: ExperimentsPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero || reducedMotion) return;

      const lines = hero.querySelectorAll<HTMLElement>('.cal-enter-line');
      if (lines.length > 0) {
        gsap.fromTo(
          lines,
          { y: 22, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.82,
            ease: 'power3.out',
            stagger: 0.08,
          }
        );
      }

      const kpiCells = hero.querySelectorAll<HTMLElement>('.exp-kpi-cell');
      if (kpiCells.length > 0) {
        gsap.fromTo(
          kpiCells,
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.78,
            ease: 'power3.out',
            stagger: 0.07,
            delay: 0.16,
          }
        );
      }

      const kpiEls = hero.querySelectorAll<HTMLElement>('[data-kpi-count]');
      kpiEls.forEach((el) => {
        const target = Number(el.dataset.kpiCount ?? '0');
        const suffix = el.dataset.kpiSuffix ?? '';
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: target,
          duration: 1.05,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = `${Math.round(proxy.v)}${suffix}`;
          },
        });
      });
    },
    { scope: heroRef, dependencies: [reducedMotion] }
  );

  return (
    <>
      {/* 1. Deep Matte Olive Header + Tabular KPI Strip (#24281E) */}
      <section
        ref={heroRef}
        className="exp-olive-hero"
        data-surface="olive"
        aria-labelledby="exp-page-heading"
      >
        <ContourBackdrop variant="olive" />

        <div className="section-container exp-olive-hero__inner">
          <div className="exp-olive-hero__top">
            <div className="exp-olive-hero__title-stack">
              <h1 id="exp-page-heading" tabIndex={-1} className="exp-olive-hero__title">
                <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                  Kết quả{' '}
                  <span className="editorial-serif editorial-serif--sage-gold">
                    thực nghiệm &amp; đánh giá
                  </span>
                </BlockReveal>
              </h1>

              <LandoSignatureFlourish
                variant="showcase-underline"
                triggerRef={heroRef}
                reducedMotion={reducedMotion}
              />

              <p className="exp-olive-hero__lead cal-enter-line">
                Đối chiếu kết quả chạy Python trên 4 bài toán chuẩn: kiểm tra tốc
                độ hội tụ tới <MathFormula tex="10^{-14}" ariaLabel="10^-14" />, khả
                năng tự chia đàn tìm đủ 4 cực tiểu và chi phí thời gian{' '}
                <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />.
              </p>
            </div>

            {/* Understated Glass / Ivory Segmented View Switcher */}
            <div className="exp-olive-hero__view-switch cal-enter-line">
              <div
                className="pill-tabs"
                role="tablist"
                aria-label="Chuyển chế độ xem kết quả thực nghiệm"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'grid'}
                  className={`pill-tab ${
                    viewMode === 'grid' ? 'pill-tab--active' : ''
                  }`}
                  onClick={() => setViewMode('grid')}
                >
                  Lưới biểu đồ
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'table'}
                  className={`pill-tab ${
                    viewMode === 'table' ? 'pill-tab--active' : ''
                  }`}
                  onClick={() => setViewMode('table')}
                >
                  Bảng số liệu
                </button>
              </div>
            </div>
          </div>

          {/* Refined Tabular KPI Strip (#B6C96E sage-gold accent, hairline vertical separators) */}
          <div
            className="exp-kpi-strip"
            aria-label="Bốn chỉ số tổng quan thực nghiệm"
          >
            <div className="exp-kpi-cell">
              <span className="exp-kpi-cell__num" data-kpi-count="4">
                4
              </span>
              <span className="exp-kpi-cell__label">HÀM KIỂM THỬ</span>
              <span className="exp-kpi-cell__sub">
                Mặt cầu dịch tâm, Có ràng buộc, Himmelblau &amp; Rastrigin
              </span>
            </div>

            <div className="exp-kpi-cell">
              <span className="exp-kpi-cell__num" data-kpi-count="6">
                6
              </span>
              <span className="exp-kpi-cell__label">BÀI ĐO ĐẠC</span>
              <span className="exp-kpi-cell__sub">
                Tốc độ hội tụ, cỡ đàn, thời gian{' '}
                <span style={{ whiteSpace: 'nowrap' }}>
                  <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" />,
                </span>{' '}
                độ nhạy &amp; đa cực trị
              </span>
            </div>

            <div className="exp-kpi-cell">
              <span
                className="exp-kpi-cell__num"
                data-kpi-count="10"
                data-kpi-suffix="D"
              >
                10D
              </span>
              <span className="exp-kpi-cell__label">SỐ CHIỀU TỐI ĐA</span>
              <span className="exp-kpi-cell__sub">
                Miền liên tục{' '}
                <MathFormula tex="[-5, 5]^{10}" ariaLabel="[-5, 5]^10" /> với 15
                tổ hợp{' '}
                <MathFormula tex="(\gamma \times \theta)" ariaLabel="(gamma x theta)" />
              </span>
            </div>

            <div className="exp-kpi-cell">
              <span className="exp-kpi-cell__num exp-kpi-cell__num--sage">
                <MathFormula tex="10^{-14}" ariaLabel="10^-14" />
              </span>
              <span className="exp-kpi-cell__label">SAI SỐ ĐẠT ĐƯỢC</span>
              <span className="exp-kpi-cell__sub">
                Nhỏ hơn rất nhiều so với ngưỡng{' '}
                <MathFormula tex="10^{-6}" ariaLabel="10^-6" /> sau 500 vòng lặp
              </span>
            </div>
          </div>
        </div>
      </section>

      <LandoSectionBlend
        from="olive"
        to="alabaster"
        reducedMotion={reducedMotion}
      />

      {/* 2. Spacious 2-Column Bento Showcase (#F3F2EC Museum Alabaster — 0% Neon on Light!) */}
      <ExperimentsGridSection
        reducedMotion={reducedMotion}
        viewMode={viewMode}
      />

      <LandoSectionBlend
        from="alabaster"
        to="obsidian"
        reducedMotion={reducedMotion}
      />

      <NextPageBanner
        titlePlain="Mô phỏng trực tiếp &"
        titleSerif="ứng dụng nén ảnh"
        to="/demo"
        ctaLabel="MỞ PHẦN CHẠY THỬ"
        accent="lime"
        reducedMotion={reducedMotion}
      />

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}

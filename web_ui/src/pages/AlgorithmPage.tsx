import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FlowchartTrackSection } from '../components/sections/FlowchartTrackSection';
import { FooterSection } from '../components/sections/FooterSection';
import { WorkedTelemetrySection } from '../components/sections/WorkedTelemetrySection';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { MathFormula } from '../components/shared/MathFormula';
import { NextPageBanner } from '../components/shared/NextPageBanner';
import type { QaTabId } from '../components/shared/QaDrawer';
import { AlgorithmFieldCanvas } from '../components/webgl/AlgorithmFieldCanvas';

gsap.registerPlugin(ScrollTrigger);

export interface AlgorithmPageProps {
  reducedMotion: boolean;
  onOpenQa: (tab?: QaTabId) => void;
}

export function AlgorithmPage({ reducedMotion, onOpenQa }: AlgorithmPageProps) {
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = pageRef.current;
      if (!root || reducedMotion) return;

      const heroLines = root.querySelectorAll<HTMLElement>('.algo-hero-enter');
      gsap.fromTo(
        heroLines,
        { y: 20, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.08,
        }
      );
    },
    { scope: pageRef, dependencies: [reducedMotion] }
  );

  return (
    <div ref={pageRef}>
      {/* 1. Asymmetric 2-Column Editorial Opener (#24281E Deep Matte Olive) */}
      <section
        className="algo-olive-hero"
        data-surface="olive"
        aria-labelledby="algo-page-heading"
      >
        <ContourBackdrop variant="olive" />

        <div className="section-container algo-olive-hero__grid">
          {/* Left Column: Strictly Flush-Left Monumental Title + 3 Biological Rules + Pairwise Formula */}
          <div className="algo-olive-hero__left">
            <h1
              id="algo-page-heading"
              tabIndex={-1}
              className="algo-olive-hero__title algo-hero-enter"
            >
              <span className="editorial-serif editorial-serif--sage-gold">
                Ba giả định gốc &amp;
              </span>
              <span className="algo-olive-hero__title-sans">
                công thức cập nhật vị trí
              </span>
            </h1>

            <div className="algo-rules-callouts algo-hero-enter">
              <div className="algo-rule-callout">
                <span className="algo-rule-callout__num">01</span>
                <div>
                  <strong>Mọi đom đóm đều thu hút nhau</strong>
                  <p>
                    Không phân biệt giới tính; con nào mờ hơn sẽ bay về phía con
                    sáng hơn.
                  </p>
                </div>
              </div>

              <div className="algo-rule-callout">
                <span className="algo-rule-callout__num">02</span>
                <div>
                  <strong>Độ hấp dẫn giảm dần khi ở xa</strong>
                  <p>
                    Ánh sáng yếu đi theo khoảng cách nên{' '}
                    <MathFormula
                      tex="\beta(r) = \beta_0 e^{-\gamma r^2}"
                      ariaLabel="beta(r) = beta_0 exp(-gamma r^2)"
                    />{' '}
                    giảm dần khi <MathFormula tex="r" ariaLabel="r" /> vượt tầm
                    nhìn{' '}
                    <MathFormula
                      tex="L = 1/\sqrt{\gamma}"
                      ariaLabel="L = 1 / sqrt(gamma)"
                    />
                    .
                  </p>
                </div>
              </div>

              <div className="algo-rule-callout">
                <span className="algo-rule-callout__num">03</span>
                <div>
                  <strong>Độ sáng gắn với hàm mục tiêu</strong>
                  <p>
                    Với bài toán tìm cực tiểu, vị trí có{' '}
                    <MathFormula tex="f(\mathbf{x})" ariaLabel="f(x)" /> càng nhỏ
                    thì đom đóm tại đó càng sáng.
                  </p>
                </div>
              </div>
            </div>

            <div className="algo-hero-formula-bar algo-hero-enter">
              <div className="algo-hero-formula-bar__main">
                <MathFormula
                  tex="\mathbf{x}_i^{t+1} = \mathbf{x}_i^t + \beta_0 e^{-\gamma r_{ij}^2}(\mathbf{x}_j^t - \mathbf{x}_i^t) + \alpha_t \boldsymbol{\epsilon}_i^t"
                  ariaLabel="Phương trình dịch chuyển đom đóm i về phía đom đóm j sáng hơn"
                />
              </div>
              <div className="algo-hero-formula-bar__legend">
                <span>
                  <MathFormula
                    tex="\beta_0 e^{-\gamma r_{ij}^2}(\mathbf{x}_j^t - \mathbf{x}_i^t)"
                    ariaLabel="beta_0 exp(-gamma r_ij^2)(x_j^t - x_i^t)"
                  />
                  : lực hút về con sáng hơn (
                  <MathFormula tex="\beta_0" ariaLabel="beta_0" />: tại{' '}
                  <MathFormula tex="r=0" ariaLabel="r=0" />,{' '}
                  <MathFormula tex="\gamma" ariaLabel="gamma" />: độ cản sáng)
                </span>
                <span>
                  <MathFormula
                    tex="\alpha_t \boldsymbol{\epsilon}_i^t"
                    ariaLabel="alpha_t epsilon_i^t"
                  />
                  : bước nhảy ngẫu nhiên giảm dần theo thế hệ
                </span>
                <span>
                  <MathFormula
                    tex="r_{ij} = \|\mathbf{x}_i - \mathbf{x}_j\|_2"
                    ariaLabel="r_ij = ||x_i - x_j||_2"
                  />
                  : khoảng cách Euclid giữa 2 đom đóm
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 2D Mathematical Vector-Field Canvas (18 Fireflies) */}
          <div className="algo-olive-hero__right algo-hero-enter">
            <AlgorithmFieldCanvas reducedMotion={reducedMotion} />
          </div>
        </div>
      </section>

      {/* 2. Pinned Horizontal Scrollytelling 5-Step Flow Track (#F3F2EC Museum Alabaster — 0% Neon!) */}
      <FlowchartTrackSection
        reducedMotion={reducedMotion}
        onOpenQa={onOpenQa}
      />

      {/* 3. Worked Step-by-Step 3D Telemetry & Constrained Optimization (#101110 Obsidian) */}
      <WorkedTelemetrySection
        reducedMotion={reducedMotion}
        onOpenQa={onOpenQa}
      />

      <NextPageBanner
        titlePlain="Kết quả"
        titleSerif="thực nghiệm trên Python"
        to="/thuc-nghiem"
        ctaLabel="XEM KẾT QUẢ THỰC NGHIỆM"
        accent="lime"
        reducedMotion={reducedMotion}
      />

      <FooterSection reducedMotion={reducedMotion} />
    </div>
  );
}

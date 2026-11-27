import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FlowchartTrackSection } from '../components/sections/FlowchartTrackSection';
import { FooterSection } from '../components/sections/FooterSection';
import { WorkedTelemetrySection } from '../components/sections/WorkedTelemetrySection';
import { BlockReveal } from '../components/shared/BlockReveal';
import { ContourBackdrop } from '../components/shared/ContourBackdrop';
import { MathFormula } from '../components/shared/MathFormula';
import { NextPageBanner } from '../components/shared/NextPageBanner';
import { AlgorithmFieldCanvas } from '../components/webgl/AlgorithmFieldCanvas';

gsap.registerPlugin(ScrollTrigger);

export interface AlgorithmPageProps {
  reducedMotion: boolean;
}

export function AlgorithmPage({ reducedMotion }: AlgorithmPageProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroLeftRef = useRef<HTMLDivElement>(null);
  const heroRightRef = useRef<HTMLDivElement>(null);
  const formulaStageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = heroSectionRef.current;
      if (!hero || reducedMotion) return;

      const rules = hero.querySelectorAll<HTMLElement>('.algo-open-rule');
      if (rules.length > 0) {
        gsap.fromTo(
          rules,
          { x: -20, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.78,
            ease: 'power3.out',
            stagger: 0.09,
            delay: 0.12,
          }
        );
      }

      if (heroRightRef.current) {
        gsap.fromTo(
          heroRightRef.current,
          { y: 26, scale: 0.975, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.88,
            ease: 'power3.out',
            delay: 0.14,
          }
        );
      }

      if (formulaStageRef.current) {
        gsap.fromTo(
          formulaStageRef.current,
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.82,
            ease: 'power3.out',
            delay: 0.24,
          }
        );
      }
    },
    { scope: pageRef, dependencies: [reducedMotion] }
  );

  return (
    <div ref={pageRef}>
      {/* 1. Spacious Editorial Opener (#24281E Deep Matte Olive) + Full-Width Master Equation Stage */}
      <section
        ref={heroSectionRef}
        className="algo-olive-hero"
        data-surface="olive"
        aria-labelledby="algo-page-heading"
      >
        <ContourBackdrop variant="olive" />

        <div className="section-container algo-olive-hero__stack">
          <div className="algo-olive-hero__grid">
            {/* Left Column: Monumental Title + 3 Open Architectural Rules (Zero cramped nested boxes!) */}
            <div ref={heroLeftRef} className="algo-olive-hero__left">
              <span className="algo-chapter-eyebrow">
                CƠ SỞ TỰ NHIÊN &amp; MÔ HÌNH TOÁN · XIN-SHE YANG (2008)
              </span>

              <h1 id="algo-page-heading" tabIndex={-1} className="algo-olive-hero__title">
                <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                  <span className="editorial-serif editorial-serif--sage-gold">
                    Ba giả định gốc &amp;
                  </span>
                </BlockReveal>
                <BlockReveal color="olive-lime" delay={0.18} reducedMotion={reducedMotion}>
                  <span className="algo-olive-hero__title-sans">
                    công thức cập nhật vị trí
                  </span>
                </BlockReveal>
              </h1>

              <div className="algo-open-rules">
                <div className="algo-open-rule">
                  <span className="algo-open-rule__num" aria-hidden="true">
                    01
                  </span>
                  <div className="algo-open-rule__body">
                    <strong>Mọi đom đóm đều thu hút nhau</strong>
                    <p>
                      Không phân biệt giới tính; cá thể mờ hơn luôn bay về phía cá thể
                      phát sáng mạnh hơn.
                    </p>
                  </div>
                </div>

                <div className="algo-open-rule">
                  <span className="algo-open-rule__num" aria-hidden="true">
                    02
                  </span>
                  <div className="algo-open-rule__body">
                    <strong>Độ hấp dẫn giảm dần theo khoảng cách</strong>
                    <p>
                      Ánh sáng bị môi trường hấp thụ nên{' '}
                      <MathFormula
                        tex="\beta(r) = \beta_0 e^{-\gamma r^2}"
                        ariaLabel="beta(r) = beta_0 exp(-gamma r^2)"
                      />{' '}
                      giảm nhanh khi vượt tầm nhìn{' '}
                      <MathFormula
                        tex="L = 1/\sqrt{\gamma}"
                        ariaLabel="L = 1 / sqrt(gamma)"
                      />
                      .
                    </p>
                  </div>
                </div>

                <div className="algo-open-rule">
                  <span className="algo-open-rule__num" aria-hidden="true">
                    03
                  </span>
                  <div className="algo-open-rule__body">
                    <strong>Độ sáng gắn trực tiếp với hàm mục tiêu</strong>
                    <p>
                      Trong bài toán tìm cực tiểu, vị trí có{' '}
                      <MathFormula tex="f(\mathbf{x})" ariaLabel="f(x)" /> càng nhỏ thì
                      đom đóm càng sáng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive 2D Vector-Field Canvas (18 Fireflies) */}
            <div ref={heroRightRef} className="algo-olive-hero__right">
              <AlgorithmFieldCanvas reducedMotion={reducedMotion} />
            </div>
          </div>

          {/* Full-Width Master Position-Update Equation + Clean 3-Column Term Breakdown */}
          <div ref={formulaStageRef} className="algo-master-equation">
            <div className="algo-master-equation__top">
              <span className="algo-master-equation__label">
                PHƯƠNG TRÌNH DỊCH CHUYỂN KHI ĐOM ĐÓM j SÁNG HƠN i
              </span>
              <div className="algo-master-equation__math">
                <MathFormula
                  tex="\mathbf{x}_i^{t+1} = \mathbf{x}_i^t + \beta_0 e^{-\gamma r_{ij}^2}(\mathbf{x}_j^t - \mathbf{x}_i^t) + \alpha_t \boldsymbol{\epsilon}_i^t"
                  ariaLabel="Phương trình dịch chuyển đom đóm i về phía đom đóm j sáng hơn"
                />
              </div>
            </div>

            <div className="algo-master-equation__terms">
              <div className="algo-term-col">
                <span className="algo-term-col__tag">THÀNH PHẦN 01 · LỰC HÚT</span>
                <div className="algo-term-col__tex">
                  <MathFormula
                    tex="\beta_0 e^{-\gamma r_{ij}^2}(\mathbf{x}_j^t - \mathbf{x}_i^t)"
                    ariaLabel="beta_0 exp(-gamma r_ij^2)(x_j^t - x_i^t)"
                  />
                </div>
                <p>
                  Kéo <MathFormula tex="\mathbf{x}_i" ariaLabel="x_i" /> về phía{' '}
                  <MathFormula tex="\mathbf{x}_j" ariaLabel="x_j" /> (
                  <MathFormula tex="\beta_0" ariaLabel="beta_0" /> tại{' '}
                  <MathFormula tex="r=0" ariaLabel="r=0" />,{' '}
                  <MathFormula tex="\gamma" ariaLabel="gamma" /> là hệ số cản sáng).
                </p>
              </div>

              <div className="algo-term-col">
                <span className="algo-term-col__tag">THÀNH PHẦN 02 · KHÁM PHÁ</span>
                <div className="algo-term-col__tex">
                  <MathFormula
                    tex="\alpha_t \boldsymbol{\epsilon}_i^t"
                    ariaLabel="alpha_t epsilon_i^t"
                  />
                </div>
                <p>
                  Bước nhảy ngẫu nhiên giúp thoát cực trị địa phương, giảm dần theo{' '}
                  <MathFormula tex="\alpha_{t+1} = \theta\alpha_t" ariaLabel="alpha_{t+1} = theta alpha_t" />.
                </p>
              </div>

              <div className="algo-term-col">
                <span className="algo-term-col__tag">THÀNH PHẦN 03 · KHOẢNG CÁCH</span>
                <div className="algo-term-col__tex">
                  <MathFormula
                    tex="r_{ij} = \|\mathbf{x}_i^t - \mathbf{x}_j^t\|_2"
                    ariaLabel="r_ij = ||x_i^t - x_j^t||_2"
                  />
                </div>
                <p>
                  Khoảng cách Euclid giữa hai cá thể trong không gian{' '}
                  <MathFormula tex="d" ariaLabel="d" /> chiều.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Split Sticky 5-Step Scrollytelling Deck (#so-do) + Standalone Pseudocode (#ma-gia) */}
      <FlowchartTrackSection reducedMotion={reducedMotion} />

      {/* 3. Worked Step-by-Step 3D Telemetry & Constrained Optimization (#101110 Obsidian) */}
      <WorkedTelemetrySection reducedMotion={reducedMotion} />

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

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useDataset } from '../../lib/dataStore';
import { SciNumber, formatFixed, formatVec } from '../../lib/formatters';
import { BlockReveal } from '../shared/BlockReveal';
import { ContourBackdrop } from '../shared/ContourBackdrop';
import { DatasetStatusCard } from '../shared/DatasetStatusCard';
import { MathFormula } from '../shared/MathFormula';
import { Worked3DStage } from '../webgl/Worked3DStage';

gsap.registerPlugin(ScrollTrigger);

export interface WorkedTelemetrySectionProps {
  reducedMotion: boolean;
}

const TIMELINE_MILESTONES = [1, 5, 20, 50, 100, 200] as const;

export function WorkedTelemetrySection({
  reducedMotion,
}: WorkedTelemetrySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageColRef = useRef<HTMLDivElement>(null);
  const bentoColRef = useRef<HTMLDivElement>(null);
  const stepDetailRef = useRef<HTMLDivElement>(null);
  const tabPrefix = useId();
  const [mode, setMode] = useState<'unconstrained' | 'constrained'>('unconstrained');
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(1);
  const [milestoneIdx, setMilestoneIdx] = useState<number>(1);

  const workedState = useDataset('worked_example_13_5', true);
  const constrainedState = useDataset('constrained_demo', true);
  const convState = useDataset('convergence_iterations', true);

  const wData = workedState.data;
  const cData = constrainedState.data;
  const convCurve = useMemo(() => {
    const arr = convState.data?.by_iterations;
    if (!arr || arr.length === 0) return null;
    return arr[arr.length - 1]?.curve ?? null;
  }, [convState.data]);

  const fReadoutRef = useRef<HTMLSpanElement>(null);
  const alphaReadoutRef = useRef<HTMLSpanElement>(null);
  const counterProxyRef = useRef({ logF: 1.48, alpha: 1.0 });

  const activeGenT = TIMELINE_MILESTONES[milestoneIdx] ?? 5;
  const targetFAtT = useMemo(() => {
    if (convCurve && convCurve.length >= activeGenT) {
      return convCurve[activeGenT - 1];
    }
    return 18 * Math.pow(0.86, activeGenT);
  }, [activeGenT, convCurve]);

  const targetAlphaAtT = useMemo(() => Math.pow(0.97, activeGenT), [activeGenT]);

  // GSAP ScrollTrigger Choreography for 3D Stage & Right Telemetry Blocks
  useGSAP(
    () => {
      const sec = sectionRef.current;
      if (!sec || reducedMotion) return;

      if (stageColRef.current) {
        gsap.fromTo(
          stageColRef.current,
          { y: 34, scale: 0.97, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.88,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 78%',
              once: true,
            },
          }
        );
      }

      if (bentoColRef.current) {
        gsap.fromTo(
          bentoColRef.current,
          { y: 34, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.88,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 78%',
              once: true,
            },
          }
        );
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  // Smooth GSAP micro-transition when switching Step (0/1/2) or Problem Mode
  useEffect(() => {
    if (reducedMotion || !stepDetailRef.current) return;
    gsap.killTweensOf(stepDetailRef.current);
    gsap.fromTo(
      stepDetailRef.current,
      { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.34, ease: 'power3.out' }
    );
  }, [activeStep, mode, reducedMotion]);

  useEffect(() => {
    const fEl = fReadoutRef.current;
    const aEl = alphaReadoutRef.current;
    if (!fEl || !aEl) return;

    const targetLog = Math.log10(Math.max(1e-16, targetFAtT));
    if (reducedMotion) {
      counterProxyRef.current.logF = targetLog;
      counterProxyRef.current.alpha = targetAlphaAtT;
      fEl.textContent =
        targetFAtT >= 0.01 ? targetFAtT.toFixed(4) : targetFAtT.toExponential(2);
      aEl.textContent = targetAlphaAtT.toFixed(4);
      return;
    }

    const tween = gsap.to(counterProxyRef.current, {
      logF: targetLog,
      alpha: targetAlphaAtT,
      duration: 0.48,
      ease: 'power3.out',
      onUpdate: () => {
        const val = Math.pow(10, counterProxyRef.current.logF);
        if (fReadoutRef.current) {
          fReadoutRef.current.textContent =
            val >= 0.01 ? val.toFixed(4) : val.toExponential(2);
        }
        if (alphaReadoutRef.current) {
          alphaReadoutRef.current.textContent =
            counterProxyRef.current.alpha.toFixed(4);
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [reducedMotion, targetAlphaAtT, targetFAtT]);

  const constrainedChart = useMemo(() => {
    const hist = cData?.history;
    if (!hist || hist.length === 0 || !cData) return null;
    const finalF = cData.fbest_penalized;
    const sampled = hist.filter((_, i) => i % 2 === 0 || i === hist.length - 1);
    const logs = sampled.map((h) =>
      Math.log10(Math.max(1e-4, h.fbest - finalF + 1e-3))
    );
    const minL = Math.min(...logs);
    const maxL = Math.max(minL + 0.1, ...logs);

    let endX = 546;
    let endY = 66;
    const path = logs
      .map((lv, idx, arr) => {
        const x = 14 + (idx / Math.max(1, arr.length - 1)) * 532;
        const y = 74 - ((lv - minL) / (maxL - minL)) * 54;
        if (idx === arr.length - 1) {
          endX = x;
          endY = y;
        }
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return {
      path,
      initF: hist[0].fbest,
      finalF,
      maxT: hist[hist.length - 1].t,
      endX,
      endY,
    };
  }, [cData]);

  return (
    <section
      id="trien-khai"
      ref={sectionRef}
      className="section-worked"
      data-surface="dark"
      aria-labelledby="worked-heading"
    >
      <ContourBackdrop variant="dark" />

      <div className="section-container">
        <div className="worked-top-row">
          <div className="worked-top-row__copy">
            <span className="algo-chapter-eyebrow">
              VÍ DỤ TÍNH TOÁN CỤ THỂ · ĐỐI CHIẾU KHÔNG GIAN 3 CHIỀU
            </span>
            <h2 id="worked-heading" tabIndex={-1} className="worked-giant-title">
              <span className="block-reveal-lines">
                <BlockReveal color="olive-lime" delay={0} reducedMotion={reducedMotion}>
                  Minh họa từng bước
                </BlockReveal>
                <BlockReveal color="olive-lime" delay={0.18} reducedMotion={reducedMotion}>
                  <span className="editorial-serif editorial-serif--sage-gold">
                    trong không gian 3D
                  </span>
                </BlockReveal>
              </span>
            </h2>
            <p className="worked-top-row__lead">
              Bên trái xoay trực tiếp mô hình 3D trên miền{' '}
              <MathFormula tex="[-5, 5]^3" ariaLabel="[-5, 5]^3" />; bên phải đối
              chiếu số liệu tính tay từng cặp và kết quả chạy hội tụ trên Python.
            </p>
          </div>

          <div
            className="pill-tabs"
            role="tablist"
            aria-label="Chọn bài toán không gian 3D"
          >
            <button
              type="button"
              role="tab"
              id={`${tabPrefix}-unconstrained`}
              aria-selected={mode === 'unconstrained'}
              className="pill-tab"
              onClick={() => setMode('unconstrained')}
            >
              MẶT CẦU DỊCH TÂM (3D)
            </button>
            <button
              type="button"
              role="tab"
              id={`${tabPrefix}-constrained`}
              aria-selected={mode === 'constrained'}
              className="pill-tab"
              onClick={() => setMode('constrained')}
            >
              TỐI ƯU CÓ RÀNG BUỘC
            </button>
          </div>
        </div>

        <div className="worked-split-grid">
          <div ref={stageColRef} className="worked-sticky-col">
            <Worked3DStage
              mode={mode}
              activeStep={activeStep}
              workedData={wData}
              constrainedData={cData}
              reducedMotion={reducedMotion}
            />
          </div>

          <div
            ref={bentoColRef}
            className="worked-bento-col"
            role="tabpanel"
            aria-labelledby={
              mode === 'unconstrained'
                ? `${tabPrefix}-unconstrained`
                : `${tabPrefix}-constrained`
            }
          >
            {mode === 'unconstrained' ? (
              <>
                <div className="worked-formula-box worked-formula-box--pair">
                  <MathFormula
                    tex="\min_{\mathbf{x}\in[-5,5]^3} f(\mathbf{x}) = \sum_{k=1}^{3}(x_k - 1)^2"
                    ariaLabel="min f(x) = sum (x_k - 1)^2 tren [-5,5]^3"
                  />
                  <MathFormula
                    tex="\mathbf{x}^* = (1,1,1), \; f^* = 0"
                    ariaLabel="x* = (1,1,1), f* = 0"
                  />
                </div>

                {workedState.status !== 'ready' || !wData ? (
                  <DatasetStatusCard
                    status={workedState.status === 'error' ? 'error' : 'loading'}
                    fileLabel="worked_example_13_5.json"
                    error={workedState.error}
                    onRetry={workedState.retry}
                  />
                ) : (
                  <>
                    {/* Consolidated Card A: 1-Cycle Hand Calculation (n = 5) */}
                    <div className="worked-elevated-card">
                      <div className="worked-subblock-head">
                        <span className="worked-subblock-head__badge">PHẦN A · n = 5</span>
                        <strong>
                          Ví dụ tính tay 1 vòng (khớp trực tiếp hình 3D bên trái)
                        </strong>
                      </div>

                      <div
                        className="worked-stepper-tabs"
                        role="group"
                        aria-label="Chọn bước dịch chuyển cặp năm đom đóm"
                      >
                        <button
                          type="button"
                          aria-pressed={activeStep === 0}
                          className={`worked-step-btn ${
                            activeStep === 0 ? 'worked-step-btn--active' : ''
                          }`}
                          onClick={() => setActiveStep(0)}
                        >
                          <div>00 · KHỞI TẠO</div>
                          <strong>5 vị trí ban đầu</strong>
                        </button>
                        <button
                          type="button"
                          aria-pressed={activeStep === 1}
                          className={`worked-step-btn ${
                            activeStep === 1 ? 'worked-step-btn--active' : ''
                          }`}
                          onClick={() => setActiveStep(1)}
                        >
                          <div>01 · Cặp nhận</div>
                          <strong>
                            <MathFormula
                              tex="\mathbf{x}_2 \to \mathbf{x}_1"
                              ariaLabel="x_2 -> x_1"
                            />
                          </strong>
                        </button>
                        <button
                          type="button"
                          aria-pressed={activeStep === 2}
                          className={`worked-step-btn worked-step-btn--reject ${
                            activeStep === 2 ? 'worked-step-btn--active' : ''
                          }`}
                          onClick={() => setActiveStep(2)}
                        >
                          <div>02 · Giữ nguyên</div>
                          <strong>
                            <MathFormula
                              tex="\mathbf{x}_3 \to \mathbf{x}_1"
                              ariaLabel="x_3 -> x_1"
                            />
                          </strong>
                        </button>
                      </div>

                      <div ref={stepDetailRef} className="worked-step-detail">
                        {activeStep === 0 ? (
                          <div className="hairline-bento">
                            <div className="hairline-bento__cell">
                              <span className="hairline-bento__label">
                                Cá thể sáng nhất (
                                <MathFormula tex="\mathbf{x}_1" ariaLabel="x_1" />)
                              </span>
                              <span className="hairline-bento__val hairline-bento__val--lime">
                                {formatVec(wData.initial_population[0].pos, 0)} · f ={' '}
                                {wData.initial_population[0].f}
                              </span>
                            </div>
                            <div className="hairline-bento__cell">
                              <span className="hairline-bento__label">
                                Tham số tại vòng đầu{' '}
                                <MathFormula tex="t = 1" ariaLabel="t = 1" />
                              </span>
                              <span className="hairline-bento__val">
                                <MathFormula
                                  tex="\gamma = 0.1, \; \alpha = 0.97"
                                  ariaLabel="gamma = 0.1, alpha = 0.97"
                                />
                              </span>
                            </div>
                            <div className="hairline-bento__cell hairline-bento__cell--wide">
                              <span className="hairline-bento__label">
                                Giá trị hàm mục tiêu 4 cá thể còn lại
                              </span>
                              <span className="hairline-bento__val">
                                <MathFormula
                                  tex="\mathbf{x}_2(f=33) \;\cdot\; \mathbf{x}_3(f=26) \;\cdot\; \mathbf{x}_4(f=53) \;\cdot\; \mathbf{x}_5(f=29)"
                                  ariaLabel="x_2(f=33), x_3(f=26), x_4(f=53), x_5(f=29)"
                                />
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {activeStep === 1 && wData.pair_logs[0] ? (
                          <>
                            <div className="worked-pair-origin-bar">
                              <span className="worked-pair-origin-bar__tag">Tọa độ gốc:</span>
                              <code>
                                x₂ = ({wData.initial_population[1].pos.join(', ')}), f ={' '}
                                {wData.initial_population[1].f}
                              </code>
                              <span aria-hidden="true">→</span>
                              <code>
                                x₁ = ({wData.initial_population[0].pos.join(', ')}), f ={' '}
                                {wData.initial_population[0].f}
                              </code>
                            </div>

                            <div className="hairline-bento">
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Khoảng cách{' '}
                                  <MathFormula tex="r_{21}" ariaLabel="r_21" />
                                </span>
                                <span className="hairline-bento__val">
                                  {formatFixed(wData.pair_logs[0].r_ij, 4)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Độ hấp dẫn{' '}
                                  <MathFormula tex="\beta(r)" ariaLabel="beta(r)" />
                                </span>
                                <span className="hairline-bento__val hairline-bento__val--lime">
                                  {formatFixed(wData.pair_logs[0].beta, 4)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Vị trí mới đề xuất
                                </span>
                                <span className="hairline-bento__val">
                                  {formatVec(wData.pair_logs[0].new_pos, 3)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  So sánh chất lượng nghiệm
                                </span>
                                <span className="hairline-bento__val hairline-bento__val--lime">
                                  {formatFixed(wData.pair_logs[0].f_new, 2)} &lt;{' '}
                                  {wData.initial_population[1].f} (CẬP NHẬT)
                                </span>
                              </div>
                            </div>
                          </>
                        ) : null}

                        {activeStep === 2 && wData.pair_logs[1] ? (
                          <>
                            <div className="worked-pair-origin-bar">
                              <span className="worked-pair-origin-bar__tag">Tọa độ gốc:</span>
                              <code>
                                x₃ = ({wData.initial_population[2].pos.join(', ')}), f ={' '}
                                {wData.initial_population[2].f}
                              </code>
                              <span aria-hidden="true">→</span>
                              <code>
                                x₁ = ({wData.initial_population[0].pos.join(', ')}), f ={' '}
                                {wData.initial_population[0].f}
                              </code>
                            </div>

                            <div className="hairline-bento">
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Khoảng cách xa{' '}
                                  <MathFormula tex="r_{31}" ariaLabel="r_31" />
                                </span>
                                <span className="hairline-bento__val">
                                  {formatFixed(wData.pair_logs[1].r_ij, 4)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Lực hút{' '}
                                  <MathFormula tex="\beta(r)" ariaLabel="beta(r)" /> suy giảm
                                </span>
                                <span className="hairline-bento__val hairline-bento__val--iris">
                                  {formatFixed(wData.pair_logs[1].beta, 4)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  Tọa độ thử nghiệm
                                </span>
                                <span className="hairline-bento__val">
                                  {formatVec(wData.pair_logs[1].new_pos, 3)}
                                </span>
                              </div>
                              <div className="hairline-bento__cell">
                                <span className="hairline-bento__label">
                                  So sánh chất lượng nghiệm
                                </span>
                                <span className="hairline-bento__val hairline-bento__val--amber">
                                  {formatFixed(wData.pair_logs[1].f_new, 2)} &gt;{' '}
                                  {wData.initial_population[2].f} (GIỮ NGUYÊN{' '}
                                  <MathFormula tex="\mathbf{x}_3" ariaLabel="x_3" />)
                                </span>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Consolidated Card B: 200-Generation Python Convergence (n = 20) */}
                    <div className="worked-elevated-card">
                      <div className="worked-scrubber-card__head">
                        <div className="worked-subblock-head">
                          <span className="worked-subblock-head__badge">PHẦN B · n = 20</span>
                          <strong>
                            Chạy thực tế trên Python (t = 1 → 200 thế hệ)
                          </strong>
                        </div>
                        <code>t = {activeGenT}</code>
                      </div>

                      <p className="worked-scrubber-card__note">
                        Khi tăng đàn từ 5 cá thể tính tay lên 20 cá thể trên Python,
                        sai số giảm sâu qua từng mốc thế hệ:
                      </p>

                      <div
                        className="worked-milestone-pills"
                        role="group"
                        aria-label="Chọn mốc thế hệ hội tụ"
                      >
                        {TIMELINE_MILESTONES.map((tVal, idx) => (
                          <button
                            key={tVal}
                            type="button"
                            aria-pressed={milestoneIdx === idx}
                            className={`chip-btn ${
                              milestoneIdx === idx ? 'chip-btn--active' : ''
                            }`}
                            onClick={() => setMilestoneIdx(idx)}
                          >
                            t = {tVal}
                          </button>
                        ))}
                      </div>

                      <div className="worked-milestone-bar" aria-hidden="true">
                        <div
                          className="worked-milestone-bar__fill"
                          style={{
                            transform: `scaleX(${(
                              (milestoneIdx + 0.15) /
                              (TIMELINE_MILESTONES.length - 0.85)
                            ).toFixed(3)})`,
                          }}
                        />
                      </div>

                      <div className="hairline-bento">
                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">
                            Sai số tốt nhất{' '}
                            <MathFormula
                              tex="f_{\text{best}}(t)"
                              ariaLabel="f_best(t)"
                            />
                          </span>
                          <span
                            ref={fReadoutRef}
                            className="hairline-bento__val hairline-bento__val--lime"
                          >
                            {targetFAtT >= 0.01
                              ? targetFAtT.toFixed(4)
                              : targetFAtT.toExponential(2)}
                          </span>
                        </div>

                        <div className="hairline-bento__cell">
                          <span className="hairline-bento__label">
                            Biên độ nhiễu{' '}
                            <MathFormula
                              tex="\alpha_t = 0.97^t"
                              ariaLabel="alpha_t = 0.97^t"
                            />
                          </span>
                          <span
                            ref={alphaReadoutRef}
                            className="hairline-bento__val hairline-bento__val--iris"
                          >
                            {targetAlphaAtT.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div ref={stepDetailRef} className="worked-step-detail">
                <div className="worked-formula-box worked-formula-box--single">
                  <MathFormula
                    tex="\Pi(\mathbf{x}) = f(\mathbf{x}) + \lambda(x_1+x_2+x_3-1.5)^2 + \lambda\max(0, x_1-0.4)^2"
                    ariaLabel="Pi(x) = f(x) + lambda (x1+x2+x3-1.5)^2 + lambda max(0, x1-0.4)^2"
                  />
                </div>

                {constrainedState.status !== 'ready' || !cData ? (
                  <DatasetStatusCard
                    status={
                      constrainedState.status === 'error' ? 'error' : 'loading'
                    }
                    fileLabel="constrained_demo.json"
                    error={constrainedState.error}
                    onRetry={constrainedState.retry}
                  />
                ) : (
                  <div className="hairline-bento" style={{ marginTop: '0.85rem' }}>
                    <div className="hairline-bento__cell">
                      <span className="hairline-bento__label">
                        Hệ số phạt tĩnh <MathFormula tex="\lambda" ariaLabel="lambda" />
                      </span>
                      <span className="hairline-bento__val">
                        {cData.penalty_lambda}
                      </span>
                    </div>
                    <div className="hairline-bento__cell">
                      <span className="hairline-bento__label">
                        Trạng thái ràng buộc
                      </span>
                      <span className="hairline-bento__val hairline-bento__val--lime">
                        {cData.is_feasible ? (
                          <>
                            HỢP LỆ (
                            <MathFormula tex="x_1 \le 0.4" ariaLabel="x_1 <= 0.4" />)
                          </>
                        ) : (
                          'VI PHẠM'
                        )}
                      </span>
                    </div>
                    <div className="hairline-bento__cell">
                      <span className="hairline-bento__label">
                        Nghiệm hội tụ <MathFormula tex="\mathbf{x}^*" ariaLabel="x*" />
                      </span>
                      <span className="hairline-bento__val hairline-bento__val--lime">
                        {formatVec(cData.nbest, 3)}
                      </span>
                    </div>
                    <div className="hairline-bento__cell">
                      <span className="hairline-bento__label">
                        <MathFormula
                          tex="f(\mathbf{x}^*) \;\cdot\; \Pi(\mathbf{x}^*)"
                          ariaLabel="f(x*) . Pi(x*)"
                        />
                      </span>
                      <span className="hairline-bento__val">
                        {formatFixed(cData.fbest_objective, 4)} ·{' '}
                        {formatFixed(cData.fbest_penalized, 4)}
                      </span>
                    </div>
                    <div className="hairline-bento__cell hairline-bento__cell--wide">
                      <span className="hairline-bento__label">
                        Độ lệch hàm phạt theo thang log qua 300 thế hệ{' '}
                        <MathFormula
                          tex="\log_{10}(\Pi_{\text{best}}(t) - \Pi^* + 10^{-3})"
                          ariaLabel="log10(Pi_best(t) - Pi* + 10^-3)"
                        />{' '}
                        (cuối:{' '}
                        <SciNumber value={cData.fbest_penalized} sigDigits={3} />)
                      </span>
                      {constrainedChart ? (
                        <svg
                          viewBox="0 0 560 92"
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            marginTop: '0.35rem',
                          }}
                          aria-hidden="true"
                        >
                          <line
                            x1="14"
                            y1="74"
                            x2="546"
                            y2="74"
                            stroke="rgba(239,239,232,0.18)"
                          />
                          <line
                            x1="14"
                            y1="18"
                            x2="14"
                            y2="74"
                            stroke="rgba(239,239,232,0.14)"
                          />
                          <path
                            d={constrainedChart.path}
                            fill="none"
                            stroke="#C5E84D"
                            strokeWidth="2.2"
                          />
                          <circle
                            cx={constrainedChart.endX}
                            cy={constrainedChart.endY}
                            r="4.2"
                            fill="#C5E84D"
                            stroke="#101110"
                            strokeWidth="1.2"
                          />
                          <text
                            x="22"
                            y="16"
                            fill="#B6C96E"
                            fontSize="11"
                            fontFamily="var(--font-mono)"
                          >
                            Π(1) = {constrainedChart.initF.toFixed(2)}
                          </text>
                          <text
                            x={constrainedChart.endX - 6}
                            y={Math.max(18, constrainedChart.endY - 8)}
                            textAnchor="end"
                            fill="#C5E84D"
                            fontSize="11.2"
                            fontWeight="600"
                            fontFamily="var(--font-mono)"
                          >
                            {constrainedChart.finalF.toFixed(3)}
                          </text>
                          <text
                            x="14"
                            y="89"
                            fill="#939889"
                            fontSize="10.5"
                            fontFamily="var(--font-mono)"
                          >
                            t = 1
                          </text>
                          <text
                            x="546"
                            y="89"
                            textAnchor="end"
                            fill="#939889"
                            fontSize="10.5"
                            fontFamily="var(--font-mono)"
                          >
                            t = {constrainedChart.maxT}
                          </text>
                        </svg>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

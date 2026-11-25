import { useEffect, useId, useRef } from 'react';
import { DATASET_PROVENANCE } from '../../lib/formatters';
import type { DatasetKey } from '../../types/dataContracts';
import { MathFormula } from './MathFormula';

export type QaTabId = 'guardrails' | 'comparison' | 'architecture' | 'provenance';

export interface QaDrawerProps {
  open: boolean;
  activeTab: QaTabId;
  onTabChange: (tab: QaTabId) => void;
  onClose: () => void;
}

const QA_TABS: { id: QaTabId; label: string }[] = [
  { id: 'guardrails', label: '01 · Chứng minh & Giới hạn' },
  { id: 'comparison', label: '02 · Lý thuyết vs Mã nguồn' },
  { id: 'architecture', label: '03 · Kiến trúc & Bộ giải' },
  { id: 'provenance', label: '04 · Nguồn 8 file JSON' },
];

const PROVENANCE_KEYS: DatasetKey[] = [
  'worked_example_13_5',
  'constrained_demo',
  'convergence_iterations',
  'scalability_nd',
  'parameter_sensitivity',
  'multimodal_optimization',
  'tv10_complexity',
  'tv10_alpha_hybrid',
];

export function QaDrawer({ open, activeTab, onTabChange, onClose }: QaDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const tabPrefix = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onUpWrapper);
    function onUpWrapper(e: PointerEvent) {
      onPointerUp(e);
    }
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onUpWrapper);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="qa-drawer"
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="qa-drawer__inner">
        <header className="qa-drawer__header">
          <div>
            <h2 id={titleId} className="qa-drawer__title">
              Chứng minh, Đối chiếu &amp; Nguồn dữ liệu
            </h2>
          </div>
          <button
            type="button"
            className="icon-square-btn"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng ngăn Q&A (Esc)"
          >
            ✕
          </button>
        </header>

        <div className="editorial-tablist" role="tablist" aria-label="Chủ đề Q&A">
          {QA_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${tabPrefix}-tab-${t.id}`}
              aria-selected={activeTab === t.id}
              className="editorial-tab"
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: PROOFS & GUARDRAILS */}
        <div
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-tab-guardrails`}
          hidden={activeTab !== 'guardrails'}
        >
          <div className="qa-panel-stack">
            <article className="qa-card">
              <h3>
                1. Hàm độ hấp dẫn <MathFormula tex="\beta(r)" ariaLabel="beta(r)" />{' '}
                tránh điểm kỳ dị tại <MathFormula tex="r = 0" ariaLabel="r = 0" />
              </h3>
              <div className="worked-formula-box worked-formula-box--pair">
                <MathFormula tex="\beta(r_{ij}) = \beta_0 \exp(-\gamma r_{ij}^2)" />
                <MathFormula tex="L = \frac{1}{\sqrt{\gamma}}" />
              </div>
              <p>
                Dạng mũ Gaussian mô tả đồng thời sự suy giảm cường độ sáng và hấp thụ môi trường mà không bị chia cho 0 tại{' '}
                <MathFormula tex="r = 0" /> như định luật nghịch đảo bình phương <MathFormula tex="1/r^2" />.
              </p>
            </article>

            <article className="qa-card">
              <h3>
                2. Hai trường hợp giới hạn của tham số hấp thụ{' '}
                <MathFormula tex="\gamma" ariaLabel="gamma" />
              </h3>
              <ul className="qa-list">
                <li>
                  <strong>
                    Khi <MathFormula tex="\gamma \to 0" ariaLabel="gamma -> 0" />:
                  </strong>{' '}
                  <MathFormula tex="\beta(r) \to \beta_0" />. Mọi cá thể sáng hơn đều hút mạnh không phụ thuộc khoảng cách, đàn gom về một cụm duy nhất và mất khả năng tách đàn đa cực trị.
                </li>
                <li>
                  <strong>
                    Khi{' '}
                    <MathFormula
                      tex="\gamma \to \infty \; (r > 0)"
                      ariaLabel="gamma -> infinity (r > 0)"
                    />
                    :
                  </strong>{' '}
                  <MathFormula tex="\beta(r) \to 0" />. Thành phần lực hút tắt dần, các cá thể mờ chỉ bước ngẫu nhiên quanh vị trí hiện tại.
                </li>
              </ul>
            </article>

            <article className="qa-card">
              <h3>
                3. Độ lệch đại số của hàm phạt tĩnh hữu hạn{' '}
                <MathFormula tex="\lambda" ariaLabel="lambda" />
              </h3>
              <MathFormula
                display
                tex="x_1^*(\lambda) = x_2^*(\lambda) = \frac{\lambda + 1}{2\lambda + 1} \implies \phi(\mathbf{x}^*) = \frac{1}{2\lambda + 1} > 0"
              />
              <p>
                Với <MathFormula tex="\lambda < \infty" />, điểm dừng giải tích của hàm phạt bậc hai luôn có độ lệch ràng buộc cỡ <MathFormula tex="\mathcal{O}(1/\lambda)" />. Vì vậy <code>ConstrainedProblem.is_feasible</code> kiểm tra trực tiếp trên tọa độ thực với dung sai <code>1e-2</code>.
              </p>
            </article>

            <article className="qa-card">
              <h3>
                4. Độ phức tạp{' '}
                <MathFormula tex="\mathcal{O}(n^2)" ariaLabel="O(n^2)" /> và lưu
                ý về cấu trúc không gian k-d tree
              </h3>
              <p>
                Hai vòng lặp lồng nhau duyệt đúng <MathFormula tex="n^2" /> cặp mỗi thế hệ (<MathFormula tex="\mathcal{O}(n^2 D)" />). Cấu trúc <em>k-d tree</em> chỉ hỗ trợ lọc láng giềng xấp xỉ khi cắt bán kính tương tác ở số chiều thấp.
              </p>
            </article>
          </div>
        </div>

        {/* TAB 2: THEORY VS PYTHON IMPLEMENTATION */}
        <div
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-tab-comparison`}
          hidden={activeTab !== 'comparison'}
        >
          <div className="qa-panel-stack">
            <article className="qa-card">
              <h3>Đối chiếu công thức lý thuyết — Ví dụ tính tay — Mã nguồn Python</h3>
              <div className="qa-table-wrap">
                <table className="qa-table">
                  <thead>
                    <tr>
                      <th>Khía cạnh</th>
                      <th>Ví dụ tính tay 5 đom đóm</th>
                      <th>Mã nguồn tổng quát (<code>core/engine.py</code>)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Phân phối nhiễu</td>
                      <td>
                        Thường biểu diễn tổng quát <MathFormula tex="\boldsymbol{\epsilon}_i^t \sim \mathcal{N}(0,1)" /> hoặc phân phối đều
                      </td>
                      <td>
                        Phân phối đều đối xứng <code>eps ~ U(-0.5, 0.5)^d</code> nhân với <code>scale = |Ub - Lb|</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Nhận bước mới</td>
                      <td>Kiểm tra tham lam <code>f_new &lt; f_old</code> trên từng cặp tính tay</td>
                      <td>
                        <code>FireflySolver.run</code> cập nhật trực tiếp ngay khi <code>lightn[j] &lt; lightn[i]</code>, kẹp biên và tính lại <code>evaluate</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Thời điểm giảm α</td>
                      <td>
                        Lịch giảm hình học <MathFormula tex="\alpha_t = \alpha_0 \theta^t" />
                      </td>
                      <td>
                        Gọi <code>update_alpha</code> ở đầu vòng lặp thế hệ nên vòng <code>t = 1</code> dùng <code>alpha_0 * theta</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article className="qa-card">
              <h3>Kiểm chứng khoảng cách Euclid giữa cá thể thứ hai và cá thể sáng nhất</h3>
              <MathFormula
                display
                tex="r_{21} = \sqrt{(2 - 5)^2 + (2 - 0)^2 + (3 - 5)^2} = \sqrt{9 + 4 + 4} = \sqrt{17} \approx 4.1231"
              />
              <p>
                Một số bản in sách gõ nhầm hạng tử đầu thành <MathFormula tex="(2-3)^2" />, nhưng đáp số <MathFormula tex="\sqrt{17}" /> và <MathFormula tex="\beta = e^{-1.7} \approx 0.1827" /> đều khớp chính xác với <MathFormula tex="(2-5)^2 = 9" />.
              </p>
            </article>
          </div>
        </div>

        {/* TAB 3: ARCHITECTURE & LIVE SOLVER */}
        <div
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-tab-architecture`}
          hidden={activeTab !== 'architecture'}
        >
          <div className="qa-panel-stack">
            <article className="qa-card">
              <h3>Sơ đồ kiến trúc Python → JSON → Web UI</h3>
              <pre className="qa-code-block">{`core/problems.py     -> UnconstrainedProblem, ConstrainedProblem
core/parameters.py   -> FAParameters (calc_distance, calc_attractiveness, update_alpha)
core/population.py   -> init_population, find_limits, rank_fireflies
core/engine.py       -> move_firefly_pair, FireflySolver.run
simulations/*.py     -> demos.py & experiments.py (8 tập kết quả chuẩn)
scripts/prepare_web_data.py -> Đóng gói & kiểm định 8 file public/data/*.json`}</pre>
            </article>

            <article className="qa-card">
              <h3>Ghi chú kỹ thuật về bộ giải trực tiếp &amp; Web Worker nén ảnh</h3>
              <p>
                Mô phỏng trực tiếp thực thi thuật toán bằng TypeScript đồng bộ đúng thứ tự cập nhật trong <code>core/engine.py</code> (đã kiểm thử tương đương bằng Vitest). Phòng thí nghiệm nén ảnh tách toàn bộ vòng lặp phân cụm màu sang <code>Web Worker</code> riêng để giao diện luôn giữ nhịp 60fps.
              </p>
            </article>
          </div>
        </div>

        {/* TAB 4: 8 JSON PROVENANCE */}
        <div
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-tab-provenance`}
          hidden={activeTab !== 'provenance'}
        >
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>File JSON</th>
                  <th>Hàm nguồn</th>
                  <th>Bài toán · D · n</th>
                  <th>Cấu hình &amp; Seed</th>
                  <th>Thống kê &amp; Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {PROVENANCE_KEYS.map((key) => {
                  const p = DATASET_PROVENANCE[key];
                  return (
                    <tr key={key}>
                      <td>
                        <code>{p.file}</code>
                      </td>
                      <td>
                        <code>{p.sourceFn}</code>
                        <div className="qa-subnote">{p.modulePath}</div>
                      </td>
                      <td>
                        <div>{p.problem}</div>
                        <div className="qa-subnote">
                          {p.dimension} · {p.population}
                        </div>
                      </td>
                      <td>
                        <div>{p.config}</div>
                        <div className="qa-subnote">{p.seedsAndRuns}</div>
                      </td>
                      <td>
                        <div>{p.statistic}</div>
                        <div className="qa-subnote">{p.conditionNote}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </dialog>
  );
}

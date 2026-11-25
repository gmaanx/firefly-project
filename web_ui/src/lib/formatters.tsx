import type { ReactNode } from 'react';
import type { DatasetKey, DatasetProvenance } from '../types/dataContracts';

export type NumericKind = 'zero' | 'finite' | 'missing' | 'invalid';

export function classifyNumber(val: unknown): NumericKind {
  if (val === null || val === undefined) return 'missing';
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return 'invalid';
  }
  if (val === 0) return 'zero';
  return 'finite';
}

export type SciParts =
  | { mode: 'text'; text: string }
  | { mode: 'sci'; mantissa: string; exp: number };

export function splitSciNumber(val: number | null | undefined, sigDigits = 2): SciParts {
  const kind = classifyNumber(val);
  if (kind === 'missing') return { mode: 'text', text: 'Thiếu dữ liệu' };
  if (kind === 'invalid') return { mode: 'text', text: 'Không hợp lệ' };
  const n = val as number;
  if (n === 0) return { mode: 'text', text: '0' };
  const abs = Math.abs(n);
  if (abs >= 1e-2 && abs < 1e4) {
    return {
      mode: 'text',
      text: n.toFixed(Math.min(4, Math.max(2, sigDigits))),
    };
  }
  const [mantissa, expStr] = n.toExponential(sigDigits).split('e');
  return {
    mode: 'sci',
    mantissa,
    exp: Number(expStr),
  };
}

export function formatSciPlain(val: number | null | undefined, sigDigits = 2): string {
  const parts = splitSciNumber(val, sigDigits);
  if (parts.mode === 'text') return parts.text;
  return `${parts.mantissa}e${parts.exp >= 0 ? `+${parts.exp}` : parts.exp}`;
}

export function SciNumber({
  value,
  sigDigits = 2,
  className = '',
}: {
  value: number | null | undefined;
  sigDigits?: number;
  className?: string;
}): ReactNode {
  const parts = splitSciNumber(value, sigDigits);
  if (parts.mode === 'text') {
    return <span className={`sci-num ${className}`}>{parts.text}</span>;
  }
  return (
    <span className={`sci-num ${className}`}>
      {parts.mantissa} × 10<sup>{parts.exp}</sup>
    </span>
  );
}

export function SvgSciText({
  value,
  sigDigits = 2,
}: {
  value: number | null | undefined;
  sigDigits?: number;
}): ReactNode {
  const parts = splitSciNumber(value, sigDigits);
  if (parts.mode === 'text') {
    return <>{parts.text}</>;
  }
  return (
    <>
      {parts.mantissa}×10
      <tspan dy="-3.5" fontSize="76%">
        {parts.exp}
      </tspan>
      <tspan dy="3.5" fontSize="1%">
        {' '}
      </tspan>
    </>
  );
}

export function formatFixed(val: number | null | undefined, digits = 4): string {
  const kind = classifyNumber(val);
  if (kind === 'missing') return 'Thiếu dữ liệu';
  if (kind === 'invalid') return 'Không hợp lệ';
  const n = val as number;
  if (n === 0) return (0).toFixed(digits);
  return n.toFixed(digits);
}

export function formatVec(vec: readonly number[] | null | undefined, digits = 3): string {
  if (!vec || vec.length === 0) return 'Thiếu tọa độ';
  const parts = vec.map((v) => {
    const kind = classifyNumber(v);
    if (kind === 'missing') return '—';
    if (kind === 'invalid') return 'NaN';
    return v.toFixed(digits);
  });
  return `[${parts.join(', ')}]`;
}

export const DATASET_PROVENANCE: Record<DatasetKey, DatasetProvenance> = {
  worked_example_13_5: {
    key: 'worked_example_13_5',
    file: 'worked_example_13_5.json',
    sourceFn: 'run_worked_example_13_5()',
    modulePath: 'simulations/demos.py',
    problem: 'Mặt cầu dịch tâm 3D: f(x) = sum((x_k - 1)^2) trên [-5, 5]^3',
    dimension: 'D = 3',
    population: 'n = 5 cá thể khởi tạo cố định',
    config: 'alpha_0 = 1.0, beta_0 = 1.0, gamma = 0.1, theta = 0.97 (t = 1 -> alpha = 0.97), scale = [1, 1, 1]',
    seedsAndRuns: 'Tất định (vector nhiễu cố định để kiểm tra từng bước)',
    statistic: 'Giá trị đơn từng cặp (x_2 -> x_1 và x_3 -> x_1) kèm điều kiện chấp nhận f_new < f_old',
    unit: 'f(x), r_ij (Euclid), beta (không thứ nguyên)',
    conditionNote:
      'Minh họa tính tay dùng scale = 1 và chỉ nhận vị trí mới khi f_new < f_old; khác với bộ giải tổng quát cập nhật trực tiếp theo cặp.',
  },
  constrained_demo: {
    key: 'constrained_demo',
    file: 'constrained_demo.json',
    sourceFn: 'run_constrained_demo()',
    modulePath: 'simulations/demos.py + core/problems.py',
    problem: 'Mặt cầu dịch tâm 3D kèm phi(x) = x_1+x_2+x_3 - 1.5 = 0 và psi(x) = x_1 - 0.4 <= 0 trên [-5, 5]^3',
    dimension: 'D = 3',
    population: 'n = 25',
    config: 'lambda = 1000, alpha_0 = 1.0, beta_0 = 1.0, gamma = 0.01, theta = 0.97, t_max = 300',
    seedsAndRuns: '1 lần chạy tái lập với np.random.seed(42)',
    statistic: 'Quỹ đạo 300 thế hệ của Pi_best(t), tách f(x) gốc và Pi(x) = f(x) + P(x) ở nghiệm cuối',
    unit: 'f(x), Pi(x), độ lệch ràng buộc |phi(x)| và max(0, psi(x))',
    conditionNote:
      'Nhãn khả thi (is_feasible) kiểm tra trên tọa độ thực chưa làm tròn với ngưỡng 1e-2. Hàm phạt hữu hạn lambda = 1000 để lại độ lệch đại số nhỏ (~4.4e-4).',
  },
  convergence_iterations: {
    key: 'convergence_iterations',
    file: 'convergence_iterations.json',
    sourceFn: 'exp_convergence_benchmark()["by_iterations"]',
    modulePath: 'simulations/experiments.py',
    problem: 'Mặt cầu dịch tâm: f(x) = sum((x_k - 1)^2) trên [-5, 5]^3 (f* = 0)',
    dimension: 'D = 3',
    population: 'n = 20',
    config: 'alpha_0 = 1.0, beta_0 = 1.0, gamma = 0.1, theta = 0.97, mốc cắt t thuộc {100, 200, 500}',
    seedsAndRuns: '1 quỹ đạo gốc 500 thế hệ với np.random.seed(42), trích 3 mốc 100/200/500',
    statistic: 'Sai số tốt nhất f_best(t) - f* theo từng thế hệ t = 1..t_max',
    unit: 'Sai số mục tiêu f_best(t) (thang log10)',
    conditionNote:
      'Ba mốc 100/200/500 được trích từ cùng một lượt chạy seed=42 (n=20, D=3) để quan sát tiến trình giảm sai số liên tục.',
  },
  scalability_nd: {
    key: 'scalability_nd',
    file: 'scalability_nd.json',
    sourceFn: 'exp_convergence_benchmark()["by_scale"]',
    modulePath: 'simulations/experiments.py',
    problem: 'Mặt cầu dịch tâm trên [-5, 5]^D (f* = 0)',
    dimension: 'D thuộc {3, 10}',
    population: 'n thuộc {5, 10, 20, 50}',
    config: 'alpha_0 = 1.0, beta_0 = 1.0, gamma = 0.1, theta = 0.97, t_max = 500',
    seedsAndRuns: '5 lần chạy độc lập mỗi cặp (n, D), seed = 43..82',
    statistic: 'Trung bình fbest_mean +/- độ lệch chuẩn mẫu fbest_std (ddof=1) và thời gian trung bình runtime_ms',
    unit: 'Sai số f_best & thời gian chạy mỗi lượt (ms)',
    conditionNote:
      'Thời gian đo bằng time.perf_counter() trên máy xuất dữ liệu Python.',
  },
  parameter_sensitivity: {
    key: 'parameter_sensitivity',
    file: 'parameter_sensitivity.json',
    sourceFn: 'exp_parameter_sensitivity()',
    modulePath: 'simulations/experiments.py',
    problem: 'Mặt cầu dịch tâm 10D trên [-5, 5]^10 (f* = 0)',
    dimension: 'D = 10',
    population: 'n = 20',
    config: 'Lưới 15 tổ hợp: gamma thuộc {1e-5, 0.01, 0.1, 1.0, 50.0} x theta thuộc {0.90, 0.97, 1.00}, alpha_0 = beta_0 = 1.0, t_max = 500',
    seedsAndRuns: 'Cùng trạng thái sinh số ngẫu nhiên ban đầu np.random.seed(42) cho cả 15 tổ hợp',
    statistic: 'Chuỗi 500 thế hệ của sai số E_t = f_best(t) và độ phân tán cặp trung bình S_t',
    unit: 'Sai số E_t & khoảng cách Euclid trung bình cặp S_t trong [-5, 5]^10',
    conditionNote:
      'Giữ nguyên đủ 15 cấu hình và toàn bộ 500 điểm curve/dispersion mỗi chuỗi.',
  },
  multimodal_optimization: {
    key: 'multimodal_optimization',
    file: 'multimodal_optimization.json',
    sourceFn: 'exp_multimodal_optimization()',
    modulePath: 'simulations/experiments.py',
    problem: 'Himmelblau 2D trên [-5, 5]^2 (4 cực tiểu toàn cục f* = 0) & Rastrigin 2D trên [-5.12, 5.12]^2',
    dimension: 'D = 2',
    population: 'n = 40',
    config: 'gamma thuộc {1e-5, 0.01, 0.1, 1.0, 5.0}, alpha_0 = 0.05, beta_0 = 1.0, theta = 0.97, t_max = 180',
    seedsAndRuns: '3 seed độc lập (0, 1, 2) mỗi cấu hình cho gamma_summary; replay đại diện dùng seed = 0',
    statistic: 'Trung bình +/- std (ddof=1) cho số cụm (eps=0.6, min_size=3) và số cực tiểu toàn cục đạt được (khoảng cách <= 0.3 & f <= 0.01)',
    unit: 'Tọa độ 2D, số cụm hậu xử lý, số nghiệm toàn cục xác nhận',
    conditionNote:
      'Số cụm đồ thị bán kính (n_clusters) được phân biệt rõ với số cực tiểu toàn cục đã xác nhận (global_optima_found).',
  },
  tv10_complexity: {
    key: 'tv10_complexity',
    file: 'tv10_complexity.json',
    sourceFn: 'exp_complexity()',
    modulePath: 'simulations/experiments.py',
    problem: 'CountingProblem (Mặt cầu dịch tâm D = 5 có đếm số lượt gọi hàm mục tiêu)',
    dimension: 'D = 5',
    population: 'n thuộc {10, 20, 40, 80, 160}',
    config: 'alpha_0 = 1.0, beta_0 = 1.0, gamma = 0.1, theta = 0.97, t_max = 8',
    seedsAndRuns: '3 seed độc lập (0, 1, 2) cho mỗi kích thước đàn n',
    statistic: 'Trung vị ms/thế hệ, hệ số góc hồi quy tuyến tính log(n)-log(ms/thế hệ), số phép duyệt cặp n^2',
    unit: 'ms / thế hệ, lượt kiểm tra cặp / thế hệ, tổng lượt gọi f(x)',
    conditionNote:
      'Hệ số góc thực nghiệm phản ánh xu hướng bậc hai trong dải kích thước đàn khảo sát.',
  },
  tv10_alpha_hybrid: {
    key: 'tv10_alpha_hybrid',
    file: 'tv10_alpha_hybrid.json',
    sourceFn: 'exp_alpha_comparison()',
    modulePath: 'simulations/experiments.py',
    problem: 'CountingProblem (Mặt cầu dịch tâm D = 5, ngưỡng mục tiêu 1e-3)',
    dimension: 'D = 5',
    population: 'n = 20',
    config: 'alpha_0 = 0.5, gamma = 0.1, t_max = 120; so sánh Fixed (theta = 1.0), Decaying (theta = 0.97) và Hybrid (+200 bước tinh chỉnh cục bộ)',
    seedsAndRuns: '5 seed độc lập (0, 1, 2, 3, 4)',
    statistic: 'Trung bình f_best cuối, tỷ lệ chạm ngưỡng f <= 1e-3 trên 5 seed, và tổng số lượt gọi hàm mục tiêu',
    unit: 'Sai số f_best & số lượt gọi hàm mục tiêu',
    conditionNote:
      'Nhánh Hybrid bổ sung bước tinh chỉnh Gaussian cục bộ sau giai đoạn bầy đàn nên sử dụng thêm 201 lượt đánh giá.',
  },
};

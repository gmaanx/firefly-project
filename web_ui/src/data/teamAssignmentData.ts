export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export interface AssignmentFormulaItem {
  label: string;
  tex: string;
  ariaLabel: string;
}

export interface TeamMemberAssignment {
  slug: string;
  legacyCode: string;
  memberName: string;
  memberNumber: number;
  stageId: StageId;
  roleTitle: string;
  files: string;
  bookRefsShort: string;
  summaryTasks: string;
  bookRefsDetail?: string;
  theoryTasks: readonly string[];
  formulas?: readonly AssignmentFormulaItem[];
  codeTargetFile?: string;
  codeTasks: readonly string[];
}

export interface AssignmentStageMeta {
  id: StageId;
  code: string;
  title: string;
  modulesLabel: string;
}

export const ASSIGNMENT_STAGES: readonly AssignmentStageMeta[] = [
  {
    id: 1,
    code: 'GĐ 01',
    title: 'Giai đoạn 1 · Cơ sở toán học & bộ tham số',
    modulesLabel: 'core/problems.py & core/parameters.py',
  },
  {
    id: 2,
    code: 'GĐ 02',
    title: 'Giai đoạn 2 · Sơ đồ khối & quản lý quần thể',
    modulesLabel: 'core/population.py',
  },
  {
    id: 3,
    code: 'GĐ 03',
    title: 'Giai đoạn 3 · Công thức di chuyển & bộ giải chính',
    modulesLabel: 'core/engine.py',
  },
  {
    id: 4,
    code: 'GĐ 04',
    title: 'Giai đoạn 4 · Bài toán mẫu & tối ưu có ràng buộc',
    modulesLabel: 'simulations/demos.py & core/problems.py',
  },
  {
    id: 5,
    code: 'GĐ 05',
    title: 'Giai đoạn 5 · Thực nghiệm đánh giá & xuất dữ liệu',
    modulesLabel: 'simulations/experiments.py & main_export.py',
  },
  {
    id: 6,
    code: 'GĐ 06',
    title: 'Giai đoạn 6 · Web trực quan & mở rộng ứng dụng thực tế',
    modulesLabel: 'web_ui/',
  },
] as const;

export const TEAM_ASSIGNMENTS: readonly TeamMemberAssignment[] = [
  {
    slug: 'huynh-triet',
    legacyCode: 'tv1',
    memberName: 'Huỳnh Triết',
    memberNumber: 1,
    stageId: 1,
    roleTitle: 'Bối cảnh ra đời & phát biểu bài toán tối ưu',
    files: 'core/problems.py',
    bookRefsShort: 'Mục 13.1 – 13.3',
    summaryTasks:
      'Tổng hợp bối cảnh ra đời FA, phát biểu bài toán tối ưu D chiều và cài đặt lớp bài toán cơ sở.',
    bookRefsDetail:
      'Mục 13.1 (tr. 163), đầu Mục 13.2 (tr. 164) và đầu Mục 13.3 (tr. 166–167).',
    theoryTasks: [
      'Tổng hợp bối cảnh ra đời Thuật toán Đom đóm của Xin-She Yang (2008) từ hiện tượng phát quang sinh học trong tự nhiên.',
      'Trình bày các dạng bài toán phi tuyến, đa cực trị mà FA giải quyết hiệu quả cùng những ứng dụng nêu ở Mục 13.1.',
      'Phát biểu bài toán tối ưu không ràng buộc tổng quát D chiều theo (13.1)–(13.2) và hàm mặt cầu dịch tâm mẫu theo (13.8)–(13.9).',
    ],
    formulas: [
      {
        label: 'Bài toán mặt cầu dịch tâm (13.8)–(13.9)',
        tex: 'f(\\mathbf{x}) = (x_1 - 1)^2 + (x_2 - 1)^2 + \\dots + (x_D - 1)^2, \\quad \\mathbf{x} \\in [-5, +5]^D',
        ariaLabel: 'f(x) = sum((x_k - 1)^2) tren [-5, +5]^D',
      },
    ],
    codeTargetFile: 'core/problems.py',
    codeTasks: [
      'Xây dựng lớp UnconstrainedProblem và hàm mục tiêu cost(x) theo Listing 13.3.',
      'Thiết lập cận dưới Lb, cận trên Ub trên miền [-5, 5]^D và tính độ rộng miền tìm kiếm scale = |Ub - Lb| theo Listing 13.1–13.2.',
    ],
  },
  {
    slug: 'bao-ngan',
    legacyCode: 'tv2',
    memberName: 'Bảo Ngân',
    memberNumber: 2,
    stageId: 1,
    roleTitle: 'Quy luật ánh sáng & bộ tham số thuật toán',
    files: 'core/parameters.py',
    bookRefsShort: 'Mục 13.2.1, 13.2.3',
    summaryTasks:
      'Trình bày quy luật suy giảm ánh sáng, ý nghĩa bộ tham số α, β₀, γ, θ và cài đặt các hàm tính tham số.',
    bookRefsDetail:
      'Mục 13.2.1 (tr. 164–165) và Mục 13.2.3 (tr. 165–166).',
    theoryTasks: [
      'Giải thích cơ sở vật lý của độ hấp dẫn giữa hai đom đóm: kết hợp định luật nghịch đảo bình phương khoảng cách và sự hấp thụ ánh sáng của môi trường.',
      'Phân tích ý nghĩa các đại lượng trong công thức khoảng cách Euclid (13.4), độ hấp dẫn (13.5), cách chọn γ theo thang đặc trưng L (13.6) và quy luật giảm hệ số nhiễu α (13.7).',
      'Làm rõ hành vi của đàn ở hai trường hợp giới hạn γ → 0 và γ → ∞ đối với tầm nhìn cũng như sự cân bằng giữa tìm kiếm rộng và tinh chỉnh cục bộ.',
    ],
    formulas: [
      {
        label: 'Khoảng cách Euclid (13.4) & Độ hấp dẫn (13.5)',
        tex: 'r_{ij} = \\sqrt{\\sum_{k=1}^{D} (x_{i,k} - x_{j,k})^2}, \\qquad \\beta = \\beta_0 e^{-\\gamma r_{ij}^2}',
        ariaLabel: 'r_ij = sqrt(sum((x_ik - x_jk)^2)), beta = beta_0 * exp(-gamma * r_ij^2)',
      },
      {
        label: 'Quy tắc chọn γ (13.6) & Giảm nhiễu (13.7)',
        tex: '\\gamma = \\frac{1}{L^2}, \\qquad \\alpha = \\alpha_0 \\theta^t \\; (0 < \\theta < 1)',
        ariaLabel: 'gamma = 1 / L^2, alpha = alpha_0 * theta^t',
      },
    ],
    codeTargetFile: 'core/parameters.py',
    codeTasks: [
      'Cài đặt lớp FAParameters gồm các hàm tính khoảng cách calc_distance(xi, xj), độ hấp dẫn calc_attractiveness(r) và cập nhật hệ số ngẫu nhiên update_alpha(alpha, theta).',
    ],
  },
  {
    slug: 'quynh-tram',
    legacyCode: 'tv3',
    memberName: 'Quỳnh Trâm',
    memberNumber: 3,
    stageId: 2,
    roleTitle: 'Sơ đồ khối giải thuật & quản lý quần thể',
    files: 'core/population.py',
    bookRefsShort: 'Mục 13.2.2, Listing 13.1, 13.3',
    summaryTasks:
      'Tóm tắt luồng giải thuật, vẽ sơ đồ khối và cài đặt khởi tạo đàn, giới hạn miền biên, xếp hạng nghiệm.',
    bookRefsDetail:
      'Mục 13.2.2 (Algorithm 12, tr. 165), Listing 13.1 (tr. 167) và Listing 13.3 (tr. 168).',
    theoryTasks: [
      'Tóm tắt luồng hoạt động tổng thể của FA và thiết kế sơ đồ khối bám sát mã giả Algorithm 12.',
      'Trình bày quy trình khởi tạo ngẫu nhiên n đom đóm trong miền [Lb, Ub], cơ chế kẹp biên khi vượt miền hợp lệ và bước xếp hạng tìm nghiệm tốt nhất cuối mỗi thế hệ.',
    ],
    codeTargetFile: 'core/population.py',
    codeTasks: [
      'Hàm init_population(n, problem): sinh vị trí ban đầu phân bố đều trong [Lb, Ub] và tính độ sáng ban đầu (Listing 13.1).',
      'Hàm find_limits(ns, Lb, Ub): đưa các tọa độ vượt ngoài cận dưới hoặc cận trên quay về biên hợp lệ (Listing 13.3).',
      'Hàm rank_fireflies(ns, Lightn): sắp xếp quần thể theo giá trị hàm mục tiêu và trích xuất nghiệm tốt nhất nbest, fbest.',
    ],
  },
  {
    slug: 'nhat-mai',
    legacyCode: 'tv4',
    memberName: 'Nhật Mai',
    memberNumber: 4,
    stageId: 3,
    roleTitle: 'Công thức cập nhật vị trí & bước nhảy ngẫu nhiên',
    files: 'core/engine.py',
    bookRefsShort: 'Mục 13.2.1, Listing 13.2, 13.4',
    summaryTasks:
      'Phân tích công thức cập nhật vị trí (13.3), thành phần bước nhảy ngẫu nhiên và cài đặt hàm di chuyển cặp đom đóm.',
    bookRefsDetail:
      'Mục 13.2.1 (Phương trình 13.3, tr. 164–165), Listing 13.2 (tr. 167) và Listing 13.4 C++ (tr. 169).',
    theoryTasks: [
      'Phân tích phương trình chuyển động (13.3), vai trò của lực hút về phía cá thể sáng hơn và điều kiện f(x_j) < f(x_i) trong bài toán cực tiểu hóa.',
      'Đối chiếu cách viết vector ngẫu nhiên ε_i^t trong lý thuyết (phân phối chuẩn) với công thức thực tế trong mã Matlab/C++ ở Listing 13.2 & 13.4: steps = alpha * (rand - 0.5) * scale.',
    ],
    formulas: [
      {
        label: 'Phương trình chuyển động (13.3)',
        tex: '\\mathbf{x}_i^{t+1} = \\mathbf{x}_i^t + \\beta_0 e^{-\\gamma r_{ij}^2}(\\mathbf{x}_j^t - \\mathbf{x}_i^t) + \\alpha \\boldsymbol{\\epsilon}_i^t',
        ariaLabel: 'x_i^(t+1) = x_i^t + beta_0 * exp(-gamma * r_ij^2) * (x_j^t - x_i^t) + alpha * eps_i^t',
      },
    ],
    codeTargetFile: 'core/engine.py',
    codeTasks: [
      'Cài đặt hàm move_firefly_pair(...) kiểm tra độ sáng từng cặp (i, j), tính r_ij, hệ số hút β và cập nhật vị trí mới.',
      'Hỗ trợ truyền vector nhiễu cố định custom_eps để tái lập chính xác phép tính tay ở Mục 13.5.',
    ],
  },
  {
    slug: 'tram-anh',
    legacyCode: 'tv5',
    memberName: 'Trâm Anh',
    memberNumber: 5,
    stageId: 3,
    roleTitle: 'Vòng lặp tối ưu hai tầng & bộ giải FireflySolver',
    files: 'core/engine.py',
    bookRefsShort: 'Mục 13.2.2, Listing 13.2, 13.4',
    summaryTasks:
      'Giải thích vòng lặp hai tầng của thuật toán, đối chiếu mã Matlab/C++ trong sách và viết bộ giải chính.',
    bookRefsDetail:
      'Mục 13.2.2 (tr. 165), Listing 13.2 (Matlab, tr. 167–168) và Listing 13.4 (C++, tr. 168–170).',
    theoryTasks: [
      'Trình bày thứ tự thực thi của vòng lặp theo thế hệ t = 1 → t_max và hai vòng lặp lồng nhau so sánh mọi cặp đom đóm (i, j) trong đàn.',
      'So sánh cách tổ chức cấu trúc dữ liệu, sinh số ngẫu nhiên, kẹp biên và sắp xếp nghiệm giữa bản Matlab (Listing 13.1–13.3) và bản C++ (Listing 13.4) trong sách.',
    ],
    codeTargetFile: 'core/engine.py',
    codeTasks: [
      'Xây dựng lớp FireflySolver kết nối các bước khởi tạo, tính tham số, di chuyển cặp, kẹp biên và xếp hạng trong phương thức run(t_max).',
      'Ghi lại lịch sử tọa độ đàn, fbest, nbest và α qua từng vòng lặp để phục vụ kiểm chứng và vẽ biểu đồ.',
    ],
  },
  {
    slug: 'tan-thinh',
    legacyCode: 'tv6',
    memberName: 'Tấn Thịnh',
    memberNumber: 6,
    stageId: 4,
    roleTitle: 'Bài toán mẫu tính tay 3 chiều (Mục 13.5)',
    files: 'simulations/demos.py',
    bookRefsShort: 'Mục 13.5 (tr. 170–172)',
    summaryTasks:
      'Tính tay từng bước bài toán mẫu 5 đom đóm trong không gian 3 chiều và lập trình kịch bản kiểm chứng.',
    bookRefsDetail:
      'Mục 13.5 (tr. 170–172, từ Phương trình 13.10 đến 13.18).',
    theoryTasks: [
      'Trình bày lời giải từng bước bài toán mặt cầu dịch tâm 3 chiều trên [-5, 5]^3 với n = 5 đom đóm ban đầu và α₀ = 1, β₀ = 1, θ = 0.97, γ = 0.1 theo (13.10)–(13.11).',
      'Kiểm tra bước nhảy cặp x₂ → x₁ theo (13.12)–(13.16): r₂₁ = √17 (đối chiếu chỗ in nhầm chữ số trong sách), thu được x₂ mới = [3.97, 0.75, 4.73] giảm f từ 33.00 xuống 22.79 nên chấp nhận.',
      'Kiểm tra bước nhảy cặp x₃ → x₁ theo (13.17)–(13.18): r₃₁ = √50, vị trí thử làm f tăng từ 26.00 lên 27.73 nên giữ nguyên vị trí cũ.',
    ],
    formulas: [
      {
        label: 'Khoảng cách & cập nhật tại t = 1 (13.13)–(13.18)',
        tex: 'r_{21} = \\sqrt{17} \\implies f(\\mathbf{x}_2^{t+1}) = 22.79 < 33, \\qquad r_{31} = \\sqrt{50} \\implies f(\\mathbf{x}_3^{t+1}) = 27.73 > 26',
        ariaLabel: 'r_21 = sqrt(17) => f = 22.79 < 33 (chap nhan); r_31 = sqrt(50) => f = 27.73 > 26 (tu choi)',
      },
    ],
    codeTargetFile: 'simulations/demos.py',
    codeTasks: [
      'Cài đặt hàm run_worked_example_13_5() nạp đúng 5 tọa độ ban đầu và các vector nhiễu trong sách, đối chiếu khớp số liệu từng bước.',
    ],
  },
  {
    slug: 'an-khang',
    legacyCode: 'tv7',
    memberName: 'An Khang',
    memberNumber: 7,
    stageId: 4,
    roleTitle: 'Xử lý ràng buộc bằng hàm phạt tĩnh (Mục 13.6)',
    files: 'core/problems.py & demos.py',
    bookRefsShort: 'Mục 13.6 (tr. 172–173)',
    summaryTasks:
      'Trình bày cách xử lý ràng buộc bằng hàm phạt tĩnh Π(x) và cài đặt bài toán tối ưu có ràng buộc.',
    bookRefsDetail:
      'Mục 13.6 (tr. 172–173, từ Phương trình 13.20 đến 13.24).',
    theoryTasks: [
      'Trình bày bài toán tối ưu tổng quát có M ràng buộc đẳng thức φ_i(x) = 0 và N ràng buộc bất đẳng thức ψ_j(x) ≤ 0 theo (13.20)–(13.22).',
      'Giải thích cách đưa bài toán có ràng buộc về dạng không ràng buộc bằng hàm phạt tĩnh Π(x) với hệ số phạt lớn λ > 0 theo (13.23)–(13.24).',
    ],
    formulas: [
      {
        label: 'Hàm phạt tĩnh (13.23)–(13.24)',
        tex: '\\Pi(\\mathbf{x}) = f(\\mathbf{x}) + \\lambda \\sum_{i=1}^{M} \\phi_i^2(\\mathbf{x}) + \\lambda \\sum_{j=1}^{N} \\left[\\max(0, \\psi_j(\\mathbf{x}))\\right]^2',
        ariaLabel: 'Pi(x) = f(x) + lambda * sum(phi_i^2) + lambda * sum(max(0, psi_j)^2)',
      },
    ],
    codeTargetFile: 'core/problems.py & simulations/demos.py',
    codeTasks: [
      'Xây dựng lớp ConstrainedProblem kế thừa UnconstrainedProblem, cộng thêm đại lượng phạt vi phạm ràng buộc theo (13.24).',
      'Lập trình kịch bản run_constrained_demo() giải bài toán mẫu có ràng buộc bằng FireflySolver.',
    ],
  },
  {
    slug: 'thien-duc',
    legacyCode: 'tv8',
    memberName: 'Thiên Đức',
    memberNumber: 8,
    stageId: 5,
    roleTitle: 'Thực nghiệm tốc độ hội tụ & quy mô bài toán',
    files: 'simulations/experiments.py',
    bookRefsShort: 'Cuối Mục 13.5 & Mục 13.3',
    summaryTasks:
      'Thực nghiệm tốc độ hội tụ tại mốc t = 100, 200, 500 và đánh giá ảnh hưởng khi thay đổi cỡ đàn n, số chiều D.',
    bookRefsDetail:
      'Cuối Mục 13.5 (tr. 172, Phương trình 13.19) và Mục 13.3 (tr. 166–167).',
    theoryTasks: [
      'Phân tích các mốc hội tụ chuẩn ở (13.19) với n = 20 đom đóm: sai số giảm từ 4.1 × 10⁻⁴ (t = 100) xuống 2.9 × 10⁻⁷ (t = 200) và đạt 2.3 × 10⁻¹⁴ tại t = 500.',
      'Đánh giá sự thay đổi về tốc độ hội tụ, độ chính xác nghiệm và thời gian chạy khi tăng số chiều (D = 3 lên D = 10) hoặc thay đổi cỡ đàn (n = 5, 10, 20, 50).',
    ],
    formulas: [
      {
        label: 'Mốc hội tụ chuẩn (13.19)',
        tex: 't = 100: \\; 4.1 \\times 10^{-4} \\;\\longrightarrow\\; t = 200: \\; 2.9 \\times 10^{-7} \\;\\longrightarrow\\; t = 500: \\; 2.3 \\times 10^{-14}',
        ariaLabel: 't=100: 4.1e-4, t=200: 2.9e-7, t=500: 2.3e-14',
      },
    ],
    codeTargetFile: 'simulations/experiments.py',
    codeTasks: [
      'Cài đặt hàm exp_convergence_benchmark() chạy lặp lại nhiều seed ở các mốc t = 100, 200, 500 và các tổ hợp (n, D), thống kê trung bình, độ lệch chuẩn và thời gian chạy.',
    ],
  },
  {
    slug: 'nguyen-an',
    legacyCode: 'tv9',
    memberName: 'Nguyễn Ân',
    memberNumber: 9,
    stageId: 5,
    roleTitle: 'Thực nghiệm độ nhạy tham số γ và θ',
    files: 'simulations/experiments.py',
    bookRefsShort: 'Mục 13.2.3 (tr. 165–166)',
    summaryTasks:
      'Thực nghiệm độ nhạy của hệ số hấp thụ γ và hệ số giảm nhiễu θ lên khả năng hội tụ của đàn.',
    bookRefsDetail:
      'Mục 13.2.3 (tr. 165–166).',
    theoryTasks: [
      'Phân tích ảnh hưởng của hệ số hấp thụ γ ở ba miền đặc trưng: rất nhỏ (10⁻⁵), trung bình theo thang bài toán (0.01; 0.1) và rất lớn (50) để kiểm chứng Mục 13.2.3.',
      'So sánh quỹ đạo hội tụ khi làm nguội dần bước nhảy ngẫu nhiên (θ = 0.97) với khi giữ biên độ nhiễu không đổi (θ = 1.0).',
    ],
    codeTargetFile: 'simulations/experiments.py',
    codeTasks: [
      'Cài đặt hàm exp_parameter_sensitivity() quét lưới γ ∈ {10⁻⁵, 0.01, 0.1, 1.0, 50} và θ ∈ {0.9, 0.97, 1.0}, ghi nhận sai số và độ phân tán đàn qua từng vòng lặp.',
    ],
  },
  {
    slug: 'tien-tai',
    legacyCode: 'tv10',
    memberName: 'Tiến Tài',
    memberNumber: 10,
    stageId: 5,
    roleTitle: 'Thực nghiệm hàm đa cực trị & tổng hợp dữ liệu',
    files: 'experiments.py & main_export.py',
    bookRefsShort: 'Mục 13.1, 13.7 & Tài liệu TK',
    summaryTasks:
      'Thực nghiệm tách đàn trên hàm đa cực trị, tổng kết ưu nhược điểm FA và xuất bộ dữ liệu kết quả.',
    bookRefsDetail:
      'Mục 13.1 (tr. 163), Mục 13.7 (tr. 173) và Tài liệu tham khảo [2, 3, 4] (tr. 173–174).',
    theoryTasks: [
      'Giải thích cơ chế tự tách đàn cục bộ khi tầm nhìn L = 1/√γ nhỏ hơn khoảng cách giữa các đỉnh, giúp FA tìm đồng thời nhiều cực trị trên mặt hàm phức tạp.',
      'Tổng kết ưu điểm, hạn chế về chi phí so sánh cặp O(n²) và các hướng cải tiến như giảm dần α hay kết hợp tìm kiếm cục bộ (Hybrid FA) ở Mục 13.7.',
    ],
    codeTargetFile: 'simulations/experiments.py & main_export.py',
    codeTasks: [
      'Cài đặt thực nghiệm trên hàm đa cực trị (Himmelblau, Rastrigin), đo chi phí thời gian O(n²) và đối chiếu biến thể Hybrid FA.',
      'Viết script tổng hợp main_export.py chạy toàn bộ các bài thực nghiệm và xuất bộ file JSON kết quả.',
    ],
  },
  {
    slug: 'gia-man',
    legacyCode: 'tv11',
    memberName: 'Gia Mẫn',
    memberNumber: 11,
    stageId: 6,
    roleTitle: 'Web trực quan hóa thuật toán & mở rộng ứng dụng thực tế',
    files: 'web_ui/',
    bookRefsShort: 'Chương 13 & Mở rộng thực tế',
    summaryTasks:
      'Xây dựng web trực quan hóa thuật toán, mô phỏng tương tác và làm phần mở rộng ứng dụng nén ảnh thực tế.',
    bookRefsDetail:
      'Tổng hợp nội dung Chương 13 (Xin-She Yang, 2008) và mở rộng bài toán lượng tử hóa màu nén ảnh RGB trong thực tế.',
    theoryTasks: [
      'Trực quan hóa nguyên lý suy giảm ánh sáng, lực hút theo khoảng cách và vai trò của bộ tham số α, β₀, γ, θ bằng đồ họa tương tác.',
      'Thiết kế sơ đồ khối 5 bước đồng bộ theo cuộn trang, đối chiếu từng bước với mã giả và minh họa bài toán tính tay 3 chiều ở Mục 13.5.',
      'Trình bày hệ thống biểu đồ thực nghiệm hội tụ, độ nhạy tham số, chi phí O(n²) và quá trình tách đàn trên mặt hàm đa cực trị.',
      'Nghiên cứu và phát triển phần mở rộng thực tế: ứng dụng Thuật toán Đom đóm (FA & Hybrid FA) để gom cụm bảng màu 3D RGB và nén kích thước ảnh 24-bit.',
    ],
    codeTargetFile: 'web_ui/',
    codeTasks: [
      'Xây dựng web trực quan nhiều trang bằng React, TypeScript, Three.js và GSAP, kết nối bộ dữ liệu thực nghiệm JSON xuất từ Python.',
      'Lập trình khu vực chạy thử FA thời gian thực trên 7 mặt hàm chuẩn (Rastrigin, Ackley, Himmelblau, Rosenbrock...).',
      'Cài đặt Web Worker nén ảnh bằng FA/K-Means, trực quan hóa đám mây điểm màu trong khối RGB 3D, thanh kéo đối chiếu ảnh trước/sau nén và các chỉ số PSNR, MSE.',
    ],
  },
] as const;

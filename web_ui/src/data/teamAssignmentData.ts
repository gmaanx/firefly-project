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
  shortRole: string;
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
    title: 'Giai đoạn 1 · Bài toán & bộ tham số',
    modulesLabel: 'core/problems.py · core/parameters.py',
  },
  {
    id: 2,
    code: 'GĐ 02',
    title: 'Giai đoạn 2 · Sơ đồ khối & quần thể',
    modulesLabel: 'core/population.py',
  },
  {
    id: 3,
    code: 'GĐ 03',
    title: 'Giai đoạn 3 · Công thức bay & bộ giải chính',
    modulesLabel: 'core/engine.py',
  },
  {
    id: 4,
    code: 'GĐ 04',
    title: 'Giai đoạn 4 · Bài toán mẫu & hàm phạt',
    modulesLabel: 'simulations/demos.py · core/problems.py',
  },
  {
    id: 5,
    code: 'GĐ 05',
    title: 'Giai đoạn 5 · Thực nghiệm & xuất số liệu',
    modulesLabel: 'simulations/experiments.py · main_export.py',
  },
  {
    id: 6,
    code: 'GĐ 06',
    title: 'Giai đoạn 6 · Web trực quan & mở rộng thực tế',
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
    shortRole: 'Bài toán tối ưu D chiều',
    roleTitle: 'Ý tưởng tự nhiên & phát biểu bài toán tối ưu',
    files: 'core/problems.py',
    bookRefsShort: 'Mục 13.1 – 13.3',
    summaryTasks:
      'Giới thiệu ý tưởng đom đóm phát sáng của Yang (2008), bài toán cực tiểu D chiều và viết lớp bài toán gốc.',
    bookRefsDetail: 'Mục 13.1 (tr. 163), đầu Mục 13.2 (tr. 164) và đầu Mục 13.3 (tr. 166–167).',
    theoryTasks: [
      'Giới thiệu nguồn cảm hứng từ tín hiệu nhấp nháy của đom đóm sang thuật toán tối ưu bầy đàn (Xin-She Yang, 2008).',
      'Nêu các lớp bài toán phi tuyến, nhiều cực trị phù hợp với FA cùng một số ứng dụng ở Mục 13.1.',
      'Viết dạng chuẩn bài toán cực tiểu không ràng buộc D chiều (13.1)–(13.2) và hàm mặt cầu dịch tâm (13.8)–(13.9).',
    ],
    formulas: [
      {
        label: 'Hàm mặt cầu dịch tâm (13.8)–(13.9)',
        tex: 'f(\\mathbf{x}) = (x_1 - 1)^2 + (x_2 - 1)^2 + \\dots + (x_D - 1)^2, \\quad \\mathbf{x} \\in [-5, +5]^D',
        ariaLabel: 'f(x) = sum((x_k - 1)^2) tren [-5, +5]^D',
      },
    ],
    codeTargetFile: 'core/problems.py',
    codeTasks: [
      'Viết lớp UnconstrainedProblem và hàm mục tiêu cost(x) theo Listing 13.3.',
      'Khai báo biên Lb, Ub trên [-5, 5]^D và độ rộng miền scale = |Ub - Lb| theo Listing 13.1–13.2.',
    ],
  },
  {
    slug: 'bao-ngan',
    legacyCode: 'tv2',
    memberName: 'Bảo Ngân',
    memberNumber: 2,
    stageId: 1,
    shortRole: 'Độ sáng & bộ tham số',
    roleTitle: 'Quy luật giảm sáng & các tham số α, β₀, γ, θ',
    files: 'core/parameters.py',
    bookRefsShort: 'Mục 13.2.1, 13.2.3',
    summaryTasks:
      'Giải thích công thức độ hấp dẫn theo khoảng cách, vai trò của α, β₀, γ, θ và code nhóm hàm tính tham số.',
    bookRefsDetail: 'Mục 13.2.1 (tr. 164–165) và Mục 13.2.3 (tr. 165–166).',
    theoryTasks: [
      'Giải thích vì sao độ sáng giảm dần theo cả khoảng cách r lẫn mức hấp thụ ánh sáng γ của môi trường.',
      'Đọc từng thành phần trong khoảng cách Euclid (13.4), độ hấp dẫn β(r) (13.5), cách lấy γ = 1/L² (13.6) và hạ dần nhiễu α (13.7).',
      'So sánh hai thái cực γ → 0 (cả đàn hút về một cụm như PSO) và γ → ∞ (mỗi con tự bước ngẫu nhiên).',
    ],
    formulas: [
      {
        label: 'Khoảng cách (13.4) & Độ hấp dẫn (13.5)',
        tex: 'r_{ij} = \\sqrt{\\sum_{k=1}^{D} (x_{i,k} - x_{j,k})^2}, \\qquad \\beta = \\beta_0 e^{-\\gamma r_{ij}^2}',
        ariaLabel: 'r_ij = sqrt(sum((x_ik - x_jk)^2)), beta = beta_0 * exp(-gamma * r_ij^2)',
      },
      {
        label: 'Chọn γ (13.6) & Hạ bước nhiễu (13.7)',
        tex: '\\gamma = \\frac{1}{L^2}, \\qquad \\alpha = \\alpha_0 \\theta^t \\; (0 < \\theta < 1)',
        ariaLabel: 'gamma = 1 / L^2, alpha = alpha_0 * theta^t',
      },
    ],
    codeTargetFile: 'core/parameters.py',
    codeTasks: [
      'Viết lớp FAParameters gồm calc_distance(xi, xj), calc_attractiveness(r) và update_alpha(alpha, theta).',
    ],
  },
  {
    slug: 'quynh-tram',
    legacyCode: 'tv3',
    memberName: 'Quỳnh Trâm',
    memberNumber: 3,
    stageId: 2,
    shortRole: 'Sơ đồ khối & quần thể',
    roleTitle: 'Sơ đồ khối Algorithm 12 & quản lý đàn đom đóm',
    files: 'core/population.py',
    bookRefsShort: 'Mục 13.2.2, Listing 13.1, 13.3',
    summaryTasks:
      'Vẽ sơ đồ 5 bước theo Algorithm 12 và viết các hàm khởi tạo đàn, kẹp biên, sắp xếp nghiệm.',
    bookRefsDetail: 'Mục 13.2.2 (Algorithm 12, tr. 165), Listing 13.1 (tr. 167) và Listing 13.3 (tr. 168).',
    theoryTasks: [
      'Tóm tắt luồng chạy của FA và vẽ sơ đồ khối khớp với mã giả Algorithm 12 trong sách.',
      'Trình bày cách rải đều n cá thể ban đầu trên [Lb, Ub], giữ tọa độ không văng khỏi biên và xếp hạng cuối mỗi vòng.',
    ],
    codeTargetFile: 'core/population.py',
    codeTasks: [
      'Viết init_population(n, problem) tạo quần thể ban đầu và tính giá trị hàm mục tiêu (Listing 13.1).',
      'Viết find_limits(ns, Lb, Ub) kéo các chiều vượt biên về đúng ngưỡng Lb, Ub (Listing 13.3).',
      'Viết rank_fireflies(ns, Lightn) sắp xếp đàn và lấy ra nbest, fbest.',
    ],
  },
  {
    slug: 'nhat-mai',
    legacyCode: 'tv4',
    memberName: 'Nhật Mai',
    memberNumber: 4,
    stageId: 3,
    shortRole: 'Công thức dịch chuyển cặp',
    roleTitle: 'Phương trình chuyển động (13.3) & bước nhiễu ngẫu nhiên',
    files: 'core/engine.py',
    bookRefsShort: 'Mục 13.2.1, Listing 13.2, 13.4',
    summaryTasks:
      'Mổ xẻ công thức cập nhật vị trí (13.3), số hạng nhiễu ngẫu nhiên và viết hàm dịch chuyển từng cặp (i, j).',
    bookRefsDetail:
      'Mục 13.2.1 (Phương trình 13.3, tr. 164–165), Listing 13.2 (tr. 167) và Listing 13.4 C++ (tr. 169).',
    theoryTasks: [
      'Giải thích từng vế của công thức cập nhật vị trí (13.3) và điều kiện chỉ bay khi f(x_j) < f(x_i) ở bài toán tìm cực tiểu.',
      'Chỉ rõ sự khác nhau giữa ký hiệu nhiễu chuẩn ε_i^t trong lý thuyết với cách code thực tế trong sách: steps = alpha * (rand - 0.5) * scale.',
    ],
    formulas: [
      {
        label: 'Phương trình cập nhật vị trí (13.3)',
        tex: '\\mathbf{x}_i^{t+1} = \\mathbf{x}_i^t + \\beta_0 e^{-\\gamma r_{ij}^2}(\\mathbf{x}_j^t - \\mathbf{x}_i^t) + \\alpha \\boldsymbol{\\epsilon}_i^t',
        ariaLabel: 'x_i^(t+1) = x_i^t + beta_0 * exp(-gamma * r_ij^2) * (x_j^t - x_i^t) + alpha * eps_i^t',
      },
    ],
    codeTargetFile: 'core/engine.py',
    codeTasks: [
      'Viết hàm move_firefly_pair(...) tính r_ij, lực hút β và vị trí mới khi gặp cá thể sáng hơn.',
      'Cho phép truyền sẵn vector nhiễu custom_eps để chạy khớp tuyệt đối bài tính tay ở Mục 13.5.',
    ],
  },
  {
    slug: 'tram-anh',
    legacyCode: 'tv5',
    memberName: 'Trâm Anh',
    memberNumber: 5,
    stageId: 3,
    shortRole: 'Vòng lặp chính FireflySolver',
    roleTitle: 'Vòng lặp hai tầng O(n²) & đối chiếu mã Matlab/C++',
    files: 'core/engine.py',
    bookRefsShort: 'Mục 13.2.2, Listing 13.2, 13.4',
    summaryTasks:
      'Trình bày vòng lặp lồng nhau O(n²), so sánh code Matlab với C++ trong sách và ráp bộ giải FireflySolver.',
    bookRefsDetail:
      'Mục 13.2.2 (tr. 165), Listing 13.2 (Matlab, tr. 167–168) và Listing 13.4 (C++, tr. 168–170).',
    theoryTasks: [
      'Theo dõi thứ tự chạy qua từng thế hệ t = 1 → t_max và hai vòng for lồng nhau quét mọi cặp (i, j).',
      'So sánh bản Matlab (Listing 13.1–13.3, tính vector gọn) với bản C++ (Listing 13.4, mảng tĩnh và tự viết hàm chọn min).',
    ],
    codeTargetFile: 'core/engine.py',
    codeTasks: [
      'Viết lớp FireflySolver ghép trọn vẹn khởi tạo, hạ α, dịch chuyển cặp, kẹp biên và xếp hạng trong hàm run(t_max).',
      'Lưu lại lịch sử vị trí đàn, fbest, nbest và α ở mỗi thế hệ để vẽ đồ thị.',
    ],
  },
  {
    slug: 'tan-thinh',
    legacyCode: 'tv6',
    memberName: 'Tấn Thịnh',
    memberNumber: 6,
    stageId: 4,
    shortRole: 'Bài toán tính tay 3D',
    roleTitle: 'Giải tay từng bước ví dụ 5 đom đóm 3D (Mục 13.5)',
    files: 'simulations/demos.py',
    bookRefsShort: 'Mục 13.5 (tr. 170–172)',
    summaryTasks:
      'Tính tay chi tiết ví dụ 5 đom đóm trong không gian 3D ở Mục 13.5 và code hàm kiểm chứng lại số liệu.',
    bookRefsDetail: 'Mục 13.5 (tr. 170–172, từ Phương trình 13.10 đến 13.18).',
    theoryTasks: [
      'Giải tay bài toán mặt cầu dịch tâm 3D trên [-5, 5]^3 với 5 cá thể ban đầu, α₀ = 1, β₀ = 1, θ = 0.97, γ = 0.1 theo (13.10)–(13.11).',
      'Tính bước nhảy x₂ → x₁ (13.12)–(13.16): r₂₁ = √17 (đính chính chỗ sách in nhầm chữ số), ra x₂ mới = [3.97, 0.75, 4.73], f giảm từ 33.00 xuống 22.79.',
      'Tính bước nhảy x₃ → x₁ (13.17)–(13.18): r₃₁ = √50, điểm thử làm f tăng từ 26.00 lên 27.73 nên bác bỏ.',
    ],
    formulas: [
      {
        label: 'Hai cặp kiểm tra tại t = 1 (13.13)–(13.18)',
        tex: 'r_{21} = \\sqrt{17} \\implies f(\\mathbf{x}_2^{t+1}) = 22.79 < 33, \\qquad r_{31} = \\sqrt{50} \\implies f(\\mathbf{x}_3^{t+1}) = 27.73 > 26',
        ariaLabel: 'r_21 = sqrt(17) => f = 22.79 < 33; r_31 = sqrt(50) => f = 27.73 > 26',
      },
    ],
    codeTargetFile: 'simulations/demos.py',
    codeTasks: [
      'Viết run_worked_example_13_5() nạp đúng 5 điểm đầu và vector nhiễu trong sách để đối chiếu từng con số.',
    ],
  },
  {
    slug: 'an-khang',
    legacyCode: 'tv7',
    memberName: 'An Khang',
    memberNumber: 7,
    stageId: 4,
    shortRole: 'Hàm phạt ràng buộc',
    roleTitle: 'Tối ưu có ràng buộc bằng hàm phạt tĩnh (Mục 13.6)',
    files: 'core/problems.py · demos.py',
    bookRefsShort: 'Mục 13.6 (tr. 172–173)',
    summaryTasks:
      'Trình bày cách cộng đại lượng phạt Π(x) cho bài toán có ràng buộc và cài đặt kịch bản chạy thử.',
    bookRefsDetail: 'Mục 13.6 (tr. 172–173, từ Phương trình 13.20 đến 13.24).',
    theoryTasks: [
      'Phát biểu bài toán tối ưu có M ràng buộc đẳng thức φ_i(x) = 0 và N bất đẳng thức ψ_j(x) ≤ 0 theo (13.20)–(13.22).',
      'Cách chuyển về bài toán không ràng buộc nhờ hàm phạt tĩnh Π(x) với trọng số phạt lớn λ > 0 theo (13.23)–(13.24).',
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
      'Viết lớp ConstrainedProblem kế thừa UnconstrainedProblem, cộng thêm mức phạt khi vi phạm điều kiện ràng buộc.',
      'Viết run_constrained_demo() giải bài toán mẫu có ràng buộc bằng FireflySolver.',
    ],
  },
  {
    slug: 'thien-duc',
    legacyCode: 'tv8',
    memberName: 'Thiên Đức',
    memberNumber: 8,
    stageId: 5,
    shortRole: 'Hội tụ & quy mô đàn',
    roleTitle: 'Thực nghiệm tốc độ hội tụ & mở rộng số chiều',
    files: 'simulations/experiments.py',
    bookRefsShort: 'Cuối Mục 13.5 & Mục 13.3',
    summaryTasks:
      'Đo sai số hội tụ ở mốc t = 100, 200, 500 và khảo sát khi tăng cỡ đàn n cũng như số chiều D.',
    bookRefsDetail: 'Cuối Mục 13.5 (tr. 172, Phương trình 13.19) và Mục 13.3 (tr. 166–167).',
    theoryTasks: [
      'Đối chiếu các mốc hội tụ ở (13.19) với n = 20 đom đóm: sai số hạ từ 4.1 × 10⁻⁴ (t = 100) xuống 2.9 × 10⁻⁷ (t = 200) và 2.3 × 10⁻¹⁴ (t = 500).',
      'Xem tốc độ hội tụ, sai số cuối và thời gian chạy thay đổi thế nào khi nâng từ 3D lên 10D hoặc đổi cỡ đàn n = 5, 10, 20, 50.',
    ],
    formulas: [
      {
        label: 'Mốc hội tụ trong sách (13.19)',
        tex: 't = 100: \\; 4.1 \\times 10^{-4} \\;\\longrightarrow\\; t = 200: \\; 2.9 \\times 10^{-7} \\;\\longrightarrow\\; t = 500: \\; 2.3 \\times 10^{-14}',
        ariaLabel: 't=100: 4.1e-4, t=200: 2.9e-7, t=500: 2.3e-14',
      },
    ],
    codeTargetFile: 'simulations/experiments.py',
    codeTasks: [
      'Viết exp_convergence_benchmark() chạy lặp nhiều seed ở các mốc t = 100, 200, 500 và các cặp (n, D), tính trung bình, độ lệch chuẩn, thời gian chạy.',
    ],
  },
  {
    slug: 'nguyen-an',
    legacyCode: 'tv9',
    memberName: 'Nguyễn Ân',
    memberNumber: 9,
    stageId: 5,
    shortRole: 'Độ nhạy tham số γ, θ',
    roleTitle: 'Thực nghiệm ảnh hưởng của hệ số hấp thụ γ và làm nguội θ',
    files: 'simulations/experiments.py',
    bookRefsShort: 'Mục 13.2.3 (tr. 165–166)',
    summaryTasks:
      'Chạy thực nghiệm quét các mức γ và θ để kiểm chứng ảnh hưởng lên khả năng tụ đàn và độ chính xác cuối.',
    bookRefsDetail: 'Mục 13.2.3 (tr. 165–166).',
    theoryTasks: [
      'Thử ba vùng giá trị γ đặc trưng: rất nhỏ (10⁻⁵), vừa phải theo kích thước miền (0.01; 0.1) và rất lớn (50) đúng theo Mục 13.2.3.',
      'So sánh đường hội tụ khi giảm dần biên độ nhiễu (θ = 0.97) với khi giữ nguyên bước nhảy (θ = 1.0, đàn dao động quanh đáy).',
    ],
    codeTargetFile: 'simulations/experiments.py',
    codeTasks: [
      'Viết exp_parameter_sensitivity() quét γ ∈ {10⁻⁵, 0.01, 0.1, 1.0, 50} và θ ∈ {0.9, 0.97, 1.0}, ghi lại sai số và bán kính phân tán đàn.',
    ],
  },
  {
    slug: 'tien-tai',
    legacyCode: 'tv10',
    memberName: 'Tiến Tài',
    memberNumber: 10,
    stageId: 5,
    shortRole: 'Đa cực trị & xuất JSON',
    roleTitle: 'Thực nghiệm tách đàn đa cực trị & xuất dữ liệu tổng hợp',
    files: 'experiments.py · main_export.py',
    bookRefsShort: 'Mục 13.1, 13.7 & Tài liệu TK',
    summaryTasks:
      'Kiểm tra khả năng tự chia nhóm trên hàm Himmelblau/Rastrigin, đo chi phí O(n²) và xuất toàn bộ JSON kết quả.',
    bookRefsDetail: 'Mục 13.1 (tr. 163), Mục 13.7 (tr. 173) và Tài liệu tham khảo [2, 3, 4] (tr. 173–174).',
    theoryTasks: [
      'Chỉ ra cách đàn tự tách thành nhiều nhóm nhỏ khi bán kính nhìn thấy L = 1/√γ nhỏ hơn khoảng cách giữa các đỉnh cực trị.',
      'Đánh giá ưu nhược điểm của FA: mạnh ở đa cực trị nhưng tốn O(n²) phép so sánh mỗi vòng, cùng hướng kết hợp tìm kiếm cục bộ (Hybrid FA, Mục 13.7).',
    ],
    codeTargetFile: 'simulations/experiments.py & main_export.py',
    codeTasks: [
      'Chạy thực nghiệm trên hàm Himmelblau (4 đáy toàn cục) và Rastrigin, đo thời gian theo n và so với bản Hybrid FA.',
      'Viết main_export.py gom kết quả tất cả thực nghiệm ra bộ file JSON cho web.',
    ],
  },
  {
    slug: 'gia-man',
    legacyCode: 'tv11',
    memberName: 'Gia Mẫn',
    memberNumber: 11,
    stageId: 6,
    shortRole: 'Web trực quan & nén ảnh',
    roleTitle: 'Làm web trực quan hóa & mở rộng nén ảnh thực tế',
    files: 'web_ui/',
    bookRefsShort: 'Chương 13 & Mở rộng thực tế',
    summaryTasks:
      'Làm web minh họa trực quan thuật toán, khu vực chạy thử trực tiếp và phần mở rộng ứng dụng nén ảnh màu RGB.',
    bookRefsDetail:
      'Toàn bộ nội dung Chương 13 (Xin-She Yang, 2008) và bài toán mở rộng lượng tử hóa bảng màu nén ảnh thực tế.',
    theoryTasks: [
      'Minh họa trực quan quy luật giảm sáng, lực hút theo khoảng cách và tác động của từng tham số α, β₀, γ, θ.',
      'Dựng sơ đồ 5 bước khớp mã giả và không gian 3D cho bài toán tính tay ở Mục 13.5.',
      'Biểu diễn trực quan số liệu 6 bài thực nghiệm: hội tụ 500 vòng, độ nhạy γ/θ, chi phí O(n²) và tách đàn 4 đỉnh Himmelblau.',
      'Làm phần mở rộng thực tế: dùng FA và Hybrid FA tìm K tâm màu đại diện trong không gian RGB để nén ảnh 24-bit.',
    ],
    codeTargetFile: 'web_ui/',
    codeTasks: [
      'Code toàn bộ giao diện web (React, TypeScript, Three.js, GSAP) và đọc bộ dữ liệu JSON từ nhánh Python.',
      'Viết khu vực chạy thử FA trực tiếp trên 7 mặt hàm chuẩn nhiều cực trị.',
      'Viết Web Worker nén ảnh màu bằng FA/K-Means, dựng khối điểm màu RGB 3D, thanh kéo so sánh ảnh trước/sau nén và tính PSNR, MSE.',
    ],
  },
] as const;

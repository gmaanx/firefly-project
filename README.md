# Firefly Algorithm — Project Skeleton

Bộ khung mã nguồn (Project Skeleton) cho bài tập nhóm cài đặt, thực nghiệm và trực quan hóa **Thuật toán Đom đóm (Firefly Algorithm - FA)** bằng Python.

---

## 1. Cấu trúc thư mục dự án

```text
firefly-project/
├── core/
│   ├── __init__.py
│   ├── problems.py        # TV1 & TV7: Định nghĩa bài toán tối ưu f(x) & hàm phạt Π(x)
│   ├── parameters.py      # TV2: Tính khoảng cách r_ij, độ hấp dẫn β, giảm hệ số α
│   ├── population.py      # TV3: Khởi tạo quần thể, kẹp biên (find_limits), xếp hạng (rank_fireflies)
│   └── engine.py          # TV4 & TV5: Phương trình di chuyển & Vòng lặp chính + Lưu lịch sử
├── simulations/
│   ├── __init__.py
│   ├── demos.py           # TV6 & TV7: Bài toán tính tay (Worked Example 13.5) & Demo có ràng buộc
│   └── experiments.py     # TV8, TV9, TV10: Thực nghiệm hội tụ, độ nhạy tham số & đa cực trị
├── data_exports/          # Thư mục chứa 6 file JSON xuất ra cho Web
├── web_ui/                # TV11: Giao diện Web trực quan thay thế Slide
├── main_export.py         # TV10: Script tổng hợp xuất bộ file JSON chuẩn cho Web
├── requirements.txt       # Thư viện phụ thuộc (numpy)
├── .gitignore             # Bỏ qua __pycache__, .venv, .DS_Store
└── README.md              # Tài liệu hướng dẫn làm việc nhóm & Git
```

---

## 2. Phân công nhiệm vụ (TV1 → TV11) & Thứ tự ghép nối

Mỗi hàm hiện đang đặt chốt `raise NotImplementedError("TODO: Phụ trách bởi TV...")`. Khi code phần của mình, thành viên **xóa dòng `raise NotImplementedError(...)`** và viết logic trả về **đúng kiểu dữ liệu & cấu trúc Output mẫu** đã ghi chú trong docstring của hàm.

| Thành viên | File phụ trách | Class / Hàm cần hoàn thiện | Giai đoạn Pipeline |
| :--- | :--- | :--- | :--- |
| **TV1** | `core/problems.py` | Class `UnconstrainedProblem` (`__init__`, `evaluate`) | Giai đoạn 1 (Nền tảng) |
| **TV2** | `core/parameters.py` | Class `FAParameters` (`__init__`, `calc_distance`, `calc_attractiveness`, `update_alpha`) | Giai đoạn 1 (Nền tảng) |
| **TV3** | `core/population.py` | `init_population`, `find_limits`, `rank_fireflies` | Giai đoạn 1 (Nền tảng) |
| **TV4** | `core/engine.py` | Hàm `move_firefly_pair` | Giai đoạn 2 (Động cơ FA) |
| **TV5** | `core/engine.py` | Class `FireflySolver` (`__init__`, `run`) | Giai đoạn 2 (Động cơ FA) |
| **TV6** | `simulations/demos.py` | Hàm `run_worked_example_13_5` | Giai đoạn 3 (Mô phỏng) |
| **TV7** | `core/problems.py` & `simulations/demos.py` | Class `ConstrainedProblem` & hàm `run_constrained_demo` | Giai đoạn 2 & 3 |
| **TV8** | `simulations/experiments.py` | Hàm `exp_convergence_benchmark` | Giai đoạn 3 (Thực nghiệm) |
| **TV9** | `simulations/experiments.py` | Hàm `exp_parameter_sensitivity` | Giai đoạn 3 (Thực nghiệm) |
| **TV10** | `simulations/experiments.py` & `main_export.py` | Hàm `exp_multimodal_optimization` & hàm `export_all_to_json` | Giai đoạn 3 & 4 (Xuất JSON) |
| **TV11** | `web_ui/` | Giao diện Web đọc 6 file JSON từ `data_exports/` để trình chiếu | Giai đoạn 5 (Trực quan hóa) |

> **Quy tắc bắt buộc khi code:**
> - **KHÔNG** tự ý đổi tên class, tên hàm, thứ tự/tên tham số đầu vào hoặc các key trong `dict` trả về (để không làm gãy code của thành viên ghép nối phía sau).
> - **CHỈ** chỉnh sửa đúng class/hàm được phân công cho mình, đặc biệt trong các file có nhiều thành viên làm chung (`core/problems.py`, `core/engine.py`, `simulations/demos.py`, `simulations/experiments.py`).

---

## 3. Hướng dẫn Clone dự án & Cài đặt môi trường (Làm lần đầu)

### Bước 1: Clone repository về máy

Mở Terminal / PowerShell tại thư mục muốn lưu bài và chạy:

```bash
git clone https://github.com/gmaanx/firefly-project.git
cd firefly-project
```

### Bước 2: Tạo môi trường ảo (`.venv`) và cài thư viện

- **Trên Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```
  *(Nếu PowerShell báo lỗi quyền chạy script khi activate, chạy lệnh sau rồi thử lại: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`)*

- **Trên Windows (CMD):**
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate.bat
  pip install -r requirements.txt
  ```

- **Trên macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  ```

---

## 4. Hướng dẫn thao tác Git cho các thành viên (Chuẩn quy trình nhóm)

Để **tránh ghi đè code của nhau** trên nhánh `main`, mỗi thành viên làm việc trên **nhánh (branch) riêng** theo quy trình 5 bước dưới đây:

### Bước 1: Luôn cập nhật code mới nhất từ `main` trước khi bắt đầu

```bash
git checkout main
git pull origin main
```

### Bước 2: Tạo nhánh riêng theo mã thành viên

Đặt tên nhánh theo cú pháp `feat/tv<số>-<tên-ngắn>` (ví dụ cho TV2):

```bash
git checkout -b feat/tv2-parameters
```

*(Tương tự: `feat/tv1-problems`, `feat/tv3-population`, `feat/tv4-move`, `feat/tv5-solver`, `feat/tv6-example-13-5`, `feat/tv7-constrained`, `feat/tv8-convergence`, `feat/tv9-sensitivity`, `feat/tv10-multimodal-export`, `feat/tv11-web-ui`)*

### Bước 3: Viết code & Kiểm tra các file đã thay đổi

Sau khi hoàn thành phần code của mình, kiểm tra lại xem mình có vô tình sửa nhầm file của người khác không:

```bash
git status
git diff
```

### Bước 4: Lưu thay đổi (Stage & Commit)

Chỉ `git add` đúng các file thuộc phần việc của mình (không dùng `git add .` bừa bãi nếu đang có file nháp chạy thử):

```bash
# Ví dụ cho TV2:
git add core/parameters.py
git commit -m "feat(tv2): cai dat FAParameters tinh khoang cach, do hap dan va giam alpha"
```

### Bước 5: Đồng bộ với `main` và Push nhánh lên GitHub

Trước khi push, kéo code mới nhất từ `origin/main` về để đảm bảo không xung đột:

```bash
git fetch origin
git rebase origin/main
git push -u origin feat/tv2-parameters
```

*(Thay `feat/tv2-parameters` bằng tên nhánh của bạn).*

### Bước 6: Tạo Pull Request (PR) trên GitHub

1. Truy cập `https://github.com/gmaanx/firefly-project`.
2. Nhấn nút **Compare & pull request** xuất hiện trên đầu trang.
3. Ghi rõ tiêu đề (ví dụ: `[TV2] Hoàn thành FAParameters`) → Nhấn **Create pull request** để nhóm trưởng kiểm tra và **Merge** vào `main`.

---

## 5. Các lệnh Git thường dùng & Xử lý tình huống

- **Khi thành viên khác vừa được merge code lên `main` và bạn muốn lấy code đó về nhánh đang làm:**
  ```bash
  git fetch origin
  git merge origin/main
  ```
- **Xem mình đang đứng ở nhánh nào:**
  ```bash
  git branch
  ```
- **Lỡ sửa nhầm vào file của thành viên khác và muốn khôi phục file đó về như cũ:**
  ```bash
  git checkout -- duong_dan/ten_file.py
  ```
- **Xuất toàn bộ 6 file JSON cho Web UI (sau khi TV1 → TV10 đã hoàn tất):**
  ```bash
  python main_export.py
  ```

# Dự án Thuật toán Đom đóm Firefly Algorithm

Bộ khung mã nguồn Python cho bài tập nhóm cài đặt, thực nghiệm và trực quan hóa Thuật toán Đom đóm.

## 1. Cấu trúc thư mục

```text
firefly-project/
├── core/
│   ├── __init__.py
│   ├── problems.py        # TV1 và TV7: Bài toán tối ưu f(x) và hàm phạt Π(x)
│   ├── parameters.py      # TV2: Khoảng cách r_ij, độ hấp dẫn β, giảm hệ số α
│   ├── population.py      # TV3: Khởi tạo quần thể, kẹp biên, xếp hạng
│   └── engine.py          # TV4 và TV5: Phương trình di chuyển và vòng lặp chính
├── simulations/
│   ├── __init__.py
│   ├── demos.py           # TV6 và TV7: Bài toán mẫu mục 13.5 và bài toán có ràng buộc
│   └── experiments.py     # TV8, TV9, TV10: Hội tụ, độ nhạy tham số và đa cực trị
├── data_exports/          # Thư mục lưu 6 file JSON xuất ra cho giao diện Web
├── web_ui/                # TV11: Giao diện Web trực quan thay thế Slide
├── main_export.py         # TV10: Script tổng hợp xuất 6 file JSON chuẩn
├── requirements.txt       # Thư viện cần cài đặt
├── .gitignore             # Danh sách thư mục và file Git tự động bỏ qua
└── README.md              # Tài liệu hướng dẫn làm việc nhóm
```

## 2. Phân công nhiệm vụ và thứ tự ghép nối

Bên trong mỗi hàm hiện đặt sẵn lệnh `raise NotImplementedError`. Khi làm phần việc của mình, thành viên xóa dòng này và viết thuật toán trả về đúng định dạng Output mẫu ghi trong hàm.

| Thành viên | Nhánh gợi ý | File phụ trách | Class và hàm cần hoàn thiện | Giai đoạn |
| :--- | :--- | :--- | :--- | :--- |
| **TV1** | `tv1` | `core/problems.py` | Class `UnconstrainedProblem` | Giai đoạn 1 |
| **TV2** | `tv2` | `core/parameters.py` | Class `FAParameters` | Giai đoạn 1 |
| **TV3** | `tv3` | `core/population.py` | `init_population`, `find_limits`, `rank_fireflies` | Giai đoạn 1 |
| **TV4** | `tv4` | `core/engine.py` | Hàm `move_firefly_pair` | Giai đoạn 2 |
| **TV5** | `tv5` | `core/engine.py` | Class `FireflySolver` | Giai đoạn 2 |
| **TV6** | `tv6` | `simulations/demos.py` | Hàm `run_worked_example_13_5` | Giai đoạn 3 |
| **TV7** | `tv7` | `core/problems.py`, `simulations/demos.py` | Class `ConstrainedProblem`, hàm `run_constrained_demo` | Giai đoạn 2 và 3 |
| **TV8** | `tv8` | `simulations/experiments.py` | Hàm `exp_convergence_benchmark` | Giai đoạn 3 |
| **TV9** | `tv9` | `simulations/experiments.py` | Hàm `exp_parameter_sensitivity` | Giai đoạn 3 |
| **TV10** | `tv10` | `simulations/experiments.py`, `main_export.py` | Hàm `exp_multimodal_optimization`, hàm `export_all_to_json` | Giai đoạn 3 và 4 |
| **TV11** | `tv11` | `web_ui/` | Giao diện Web đọc 6 file JSON trong `data_exports/` | Giai đoạn 5 |

Lưu ý quan trọng khi viết code:
1. Không tự ý đổi tên class, tên hàm, tên tham số đầu vào hoặc tên key trong `dict` trả về để đảm bảo ghép nối mượt với các thành viên sau.
2. Chỉ sửa đúng hàm và class được giao, đặc biệt tại các file có nhiều thành viên dùng chung gồm `core/problems.py`, `core/engine.py`, `simulations/demos.py` và `simulations/experiments.py`.

## 3. Clone dự án và cài đặt môi trường lần đầu

### Bước 1: Tải mã nguồn về máy

Mở Terminal hoặc PowerShell tại thư mục muốn lưu dự án rồi chạy:

```bash
git clone https://github.com/gmaanx/firefly-project.git
cd firefly-project
```

### Bước 2: Tạo môi trường ảo và cài thư viện

File `.gitignore` đã cấu hình tự động bỏ qua cả `.venv` lẫn `venv`, nên thư mục môi trường ảo sẽ không bị đẩy nhầm lên GitHub.

Trên Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Trên Windows CMD:

```cmd
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Trên macOS hoặc Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 4. Hướng dẫn phân nhánh cho thành viên

Tuyệt đối không viết code trực tiếp trên nhánh `main`. Mỗi thành viên tạo một nhánh riêng để làm việc độc lập.

### Bước 1: Chuyển về nhánh main và kéo bản mới nhất

```bash
git switch main
git pull origin main
```

### Bước 2: Tạo nhánh mới bằng cờ `-c` hoặc `-b`

Bạn có thể chọn 1 trong 2 lệnh tương đương dưới đây để vừa tạo nhánh mới vừa chuyển sang nhánh đó. Ví dụ cho thành viên TV2 với tên nhánh `tv2`:

Cách 1 dùng lệnh `git switch` đời mới kèm cờ `-c` viết tắt của create:

```bash
git switch -c tv2
```

Cách 2 dùng lệnh `git checkout` truyền thống kèm cờ `-b` viết tắt của branch:

```bash
git checkout -b tv2
```

### Bước 3: Chuyển đổi qua lại giữa các nhánh đã tạo

Cờ `-c` và `-b` chỉ dùng duy nhất một lần lúc mới tạo nhánh. Những lần làm việc tiếp theo, khi nhánh đã tồn tại trên máy, chỉ cần gõ tên nhánh mà không có `-c` hay `-b`:

```bash
# Chuyển sang nhánh tv2 đã có sẵn
git switch tv2
# Hoặc dùng lệnh tương đương
git checkout tv2

# Kiểm tra xem mình đang đứng ở nhánh nào, nhánh hiện tại có dấu sao phía trước
git branch
```

## 5. Quy trình lưu code và đẩy lên GitHub

Sau khi đã đứng đúng trên nhánh cá nhân và hoàn thành phần code được giao, thực hiện tuần tự 4 bước sau:

### Bước 1: Kiểm tra các file vừa thay đổi

```bash
git status
git diff
```

### Bước 2: Đưa file của mình vào vùng chờ và tạo commit

Chỉ `git add` đúng file mình phụ trách để tránh đẩy nhầm file nháp:

```bash
git add core/parameters.py
git commit -m "Hoan thanh class FAParameters cua TV2"
```

### Bước 3: Cập nhật code mới nhất từ nhánh main và đẩy nhánh lên GitHub

```bash
git fetch origin
git merge origin/main
git push -u origin tv2
```

Những lần bổ sung code tiếp theo trên cùng nhánh đó, bạn chỉ cần chạy `git push` là đủ.

### Bước 4: Tạo Pull Request để gộp code vào main

1. Mở trang https://github.com/gmaanx/firefly-project trên trình duyệt.
2. Bấm nút **Compare & pull request** hiện ra ở đầu trang ứng với nhánh vừa đẩy lên.
3. Đặt tiêu đề rõ tên thành viên, ví dụ `TV2 hoan thanh FAParameters`, rồi bấm **Create pull request** để nhóm trưởng duyệt và gộp vào `main`.

## 6. Một số lệnh xử lý tình huống thường gặp

1. Thành viên khác vừa được gộp code lên `main` và bạn muốn cập nhật phần đó về nhánh đang làm:
   ```bash
   git fetch origin
   git merge origin/main
   ```
2. Lỡ tay sửa nhầm vào file của thành viên khác và muốn khôi phục file đó về nguyên trạng:
   ```bash
   git restore duong_dan/ten_file.py
   ```
3. Chạy xuất toàn bộ 6 file JSON cho giao diện Web sau khi từ TV1 đến TV10 đã hoàn tất:
   ```bash
   python main_export.py
   ```

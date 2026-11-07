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

## 3. Lần đầu tham gia: Clone dự án và cài môi trường

Lệnh `git clone` **chỉ thực hiện đúng một lần duy nhất** lúc mới bắt đầu tải dự án về máy. Những ngày sau hoặc khi chờ tới giai đoạn nhiệm vụ của mình, bạn **không cần xóa thư mục đi để clone lại**.

### Bước 1: Chấp nhận lời mời cộng tác trên GitHub

Trước khi thao tác, mở email hoặc truy cập https://github.com/gmaanx/firefly-project/invitations và bấm **Accept invitation** để tài khoản của bạn có quyền đẩy nhánh lên kho mã nguồn chung.

### Bước 2: Tải dự án về máy tính

Mở Terminal hoặc PowerShell tại thư mục muốn lưu bài rồi chạy:

```bash
git clone https://github.com/gmaanx/firefly-project.git
cd firefly-project
```

Mặc định sau khi `git clone`, máy bạn sẽ tải về nhánh gốc `main`. Nếu muốn tải thêm một nhánh cụ thể của thành viên khác đã có trên GitHub về máy để xem hoặc chạy thử, dùng lệnh:

```bash
git fetch origin
git switch ten_nhanh
```

### Bước 3: Tạo môi trường ảo và cài thư viện

File `.gitignore` đã tự động bỏ qua cả `.venv` lẫn `venv`, nên thư mục môi trường ảo sẽ không bị đẩy nhầm lên GitHub.

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

## 4. Khi tới lượt nhiệm vụ của bạn: Có cần clone lại không?

Câu trả lời là **KHÔNG cần clone lại**. Khi các thành viên ở giai đoạn trước đã gộp code xong vào `main` và báo tới lượt bạn làm, bạn chỉ cần mở lại thư mục `firefly-project` đã có sẵn trên máy và làm theo một trong hai trường hợp dưới đây:

### Trường hợp 1: Bạn bắt đầu nhiệm vụ lần đầu và chưa tạo nhánh cá nhân

Chuyển về nhánh `main`, kéo toàn bộ code mới nhất mà các bạn giai đoạn trước vừa hoàn thành về máy, sau đó mới tách nhánh riêng cho mình:

```text
                                       o---o---o  nhánh tv6 (git switch -c tv6)
                                      /
o---------o---------o----------------o---> nhánh main (sau khi git pull origin main)
  (TV1 đến TV5 đã Merge xong vào main)
```

Lệnh thực hiện:

```bash
git switch main
git pull origin main
git switch -c tv6
```

Thay `tv6` bằng tên nhánh của bạn theo bảng phân công ở Mục 2. Nhờ tạo nhánh sau khi `git pull origin main`, nhánh `tv6` của bạn sẽ có sẵn đầy đủ code của TV1 đến TV5 để chạy ghép nối.

### Trường hợp 2: Bạn đã tạo nhánh cá nhân từ trước hoặc làm nhiệm vụ ở nhiều giai đoạn như TV7 và TV10

Nếu bạn đã lỡ tạo nhánh cá nhân từ mấy hôm trước khi `main` chưa có code mới, hoặc nay bạn bước sang làm nhiệm vụ thứ hai ở giai đoạn sau, hãy cập nhật code mới nhất từ `main` đắp sang nhánh của bạn:

```text
o---------o--------------------o---> nhánh main (git pull origin main)
           \                    \
            o------o-------------o---o---> nhánh tv7 (git merge main rồi code tiếp)
             (code cũ của TV7)
```

Lệnh thực hiện:

```bash
git switch main
git pull origin main
git switch tv7
git merge main
```

## 5. Hướng dẫn trực quan cách phân nhánh và chuyển nhánh

Tuyệt đối không viết code trực tiếp khi đang đứng ở nhánh `main`. Sơ đồ luồng phân nhánh và gộp nhánh của cả nhóm như sau:

```text
                (TV1 tự code riêng)               (TV6 tự code riêng)
               o---o---o  nhánh tv1              o---o---o  nhánh tv6
              /         \                       /         \
o------------o-----------o------------o--------o-----------o---> nhánh main (bản gốc chuẩn)
              \                      /
               o-------o-------o----o  nhánh tv2
                (TV2 tự code riêng)    (Merge vào main)
```

### Tạo nhánh mới bằng cờ `-c` hoặc `-b`

Sau khi đã đứng ở bản `main` mới nhất, dùng một trong hai lệnh tương đương dưới đây để vừa tạo nhánh mới vừa chuyển sang nhánh đó. Ví dụ cho TV2:

```bash
# Cách 1 dùng lệnh git switch kèm cờ -c viết tắt của create
git switch -c tv2

# Cách 2 dùng lệnh git checkout kèm cờ -b viết tắt của branch
git checkout -b tv2
```

### Kiểm tra nhánh hiện tại trước khi gõ code

Luôn chạy lệnh dưới đây trước khi sửa file:

```bash
git branch
```

Màn hình sẽ hiện danh sách nhánh trên máy bạn như sau:

```text
  main
* tv2
```

Phải chắc chắn dấu sao `*` đang nằm trước tên nhánh cá nhân của bạn như `* tv2` chứ không nằm trước `main`.

### Chuyển qua lại giữa các nhánh đã tạo sẵn

Cờ `-c` và `-b` chỉ dùng duy nhất một lần lúc khởi tạo nhánh mới. Những ngày làm việc tiếp theo, khi nhánh đã có sẵn trên máy, chỉ gõ tên nhánh mà không thêm `-c` hay `-b`:

```bash
git switch tv2
# Hoặc
git checkout tv2
```

Lưu ý trước khi chuyển sang nhánh khác, bạn nhớ lưu và `git commit` những gì đang sửa dở ở nhánh hiện tại.

## 6. Lưu code, đẩy nhánh lên GitHub và gửi yêu cầu Request Merge

Sau khi viết xong code trên nhánh cá nhân và chạy thử ổn định, thực hiện lần lượt các bước sau để gửi yêu cầu gộp code vào `main`:

### Bước 1: Kiểm tra lại các file đã sửa

```bash
git status
git diff
```

Đảm bảo chỉ có đúng file thuộc nhiệm vụ của bạn bị thay đổi, không sửa nhầm sang phần của thành viên khác.

### Bước 2: Đóng gói thay đổi bằng git add và git commit

Chỉ `git add` đúng tên file bạn phụ trách để không đẩy nhầm các file nháp chạy thử:

```bash
git add core/parameters.py
git commit -m "TV2 hoan thanh class FAParameters"
```

### Bước 3: Đồng bộ với main lần cuối và đẩy nhánh lên GitHub

```bash
git fetch origin
git merge origin/main
git push -u origin tv2
```

Thay `tv2` bằng tên nhánh của bạn. Từ lần đẩy thứ hai trở đi trên cùng nhánh đó, chỉ cần gõ ngắn gọn `git push` là đủ.

### Bước 4: Tạo yêu cầu gộp code Pull Request trên GitHub

Trên GitHub, thao tác xin gộp nhánh của bạn vào `main` được gọi là tạo **Pull Request**. Thực hiện chi tiết như sau:

1. Mở trình duyệt truy cập https://github.com/gmaanx/firefly-project.
2. **Cách nhanh ngay sau khi vừa push**: Ở đầu trang sẽ xuất hiện khung màu vàng hiện tên nhánh bạn vừa đẩy lên, bấm ngay nút màu xanh **Compare & pull request**.
3. **Cách làm nếu không thấy khung màu vàng**:
   * Bấm vào thẻ **Pull requests** trên thanh menu ngang hoặc vào thẳng https://github.com/gmaanx/firefly-project/pulls.
   * Bấm nút màu xanh **New pull request** ở góc phải.
   * Nhìn hai ô chọn nhánh có mũi tên chỉ từ phải sang trái như hình minh họa dưới đây, giữ nguyên ô bên trái **base** là **`main`** và bấm chọn ô bên phải **compare** là nhánh của bạn như **`tv2`**:
     ```text
     [ base: main ]   <--- gop vao ---   [ compare: tv2 ]
     (Nhanh goc nhan code)               (Nhanh ca nhan cua ban)
     ```
   * Kéo xuống dưới xem lại phần code thay đổi rồi bấm nút xanh **Create pull request**.
4. Tại trang điền thông tin:
   * Ô tiêu đề ghi rõ mã thành viên và nội dung đã làm, ví dụ `TV2 hoan thanh class FAParameters`.
   * Ô mô tả bên dưới ghi ngắn gọn kết quả chạy thử nếu cần.
   * Bấm nút xanh **Create pull request** để hoàn tất gửi yêu cầu gộp code, sau đó nhắn lên nhóm chat để nhóm trưởng kiểm tra.

Mẹo quan trọng: Nếu sau khi đã gửi Pull Request mà nhóm trưởng góp ý cần sửa lại vài dòng code, bạn **không cần đóng hay tạo lại Pull Request mới**. Bạn chỉ việc mở lại nhánh cá nhân dưới máy, sửa code, chạy lại `git add`, `git commit` và `git push` thì trang Pull Request cũ trên GitHub sẽ tự động cập nhật theo code mới nhất của bạn.

## 7. Hướng dẫn duyệt và gộp code Merge vào nhánh main

Tất cả thành viên trong danh sách Collaborators đều có nút bấm gộp code, tuy nhiên cả nhóm thống nhất báo nhóm trưởng kiểm tra trước khi bấm gộp để tránh đè code ở các file dùng chung.

### Cách 1: Duyệt và gộp trực tiếp trên web GitHub

1. Mở danh sách yêu cầu tại https://github.com/gmaanx/firefly-project/pulls và bấm vào Pull Request của thành viên.
2. Mở thẻ **Files changed** để rà soát các dòng thêm mới màu xanh và dòng xóa đi màu đỏ, đảm bảo chỉ xóa đúng dòng `raise NotImplementedError` của thành viên đó chứ không xóa nhầm hàm của người khác.
3. Quay lại thẻ **Conversation**:
   * Nếu hiện thông báo xanh **This branch has no conflicts with the base branch** thì bấm **Merge pull request** rồi bấm **Confirm merge**.
   * Nếu hiện cảnh báo xung đột thì bấm nút **Resolve conflicts** ngay trên web, giữ lại phần code đúng của cả hai thành viên, xóa các dòng đánh dấu `<<<<<<<`, `=======`, `>>>>>>>`, sau đó bấm **Mark as resolved** rồi **Commit merge** và tiến hành **Merge pull request**.

### Cách 2: Gộp bằng dòng lệnh trên máy tính

Nếu muốn kéo nhánh của thành viên về chạy thử trên máy trước khi gộp vào `main`, dùng chuỗi lệnh sau:

```bash
git fetch origin
git switch main
git pull origin main
git merge origin/tv2
git push origin main
```

## 8. Một số lệnh cứu nguy thường gặp

1. Lỡ tay sửa nhầm vào file của thành viên khác khi chưa commit và muốn khôi phục file đó về nguyên trạng ban đầu:
   ```bash
   git restore duong_dan/ten_file.py
   ```
2. Muốn kiểm tra xem lịch sử các lần lưu commit trên nhánh hiện tại đã có những gì:
   ```bash
   git log --oneline -n 5
   ```
3. Xuất toàn bộ 6 file JSON cho giao diện Web sau khi từ TV1 đến TV10 đã hoàn tất và gộp hết vào `main`:
   ```bash
   python main_export.py
   ```

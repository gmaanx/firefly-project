# TV10 Nguyễn Tiến Tài

## Chạy và ghép nối

```powershell
python -m pip install -r requirements.txt
python firefly_tv10.py
python main_export.py
python -m unittest discover -s tests -v
```

`firefly_tv10.py` xuất riêng TV10 vào `results/tv10/`, hỗ trợ `--output-dir`.
`main_export.py` chạy nguyên cấu hình TV6–TV9, xuất sáu JSON vào `data_exports/`
và các kết quả mở rộng vào `data_exports/tv10/`. Benchmark đầy đủ có thể mất vài phút.
Hai JSON của TV8 bọc các danh sách bằng key `by_iterations` và `by_scale` tương ứng;
đây là lựa chọn tại điểm tích hợp vì chưa có mã giao diện TV11 trong checkout.
Hàm `export_all_to_json(output_dir)` trả đúng sáu đường dẫn theo contract có sẵn.

## Thiết kế thực nghiệm

Tất cả phép chạy FA dùng `FireflySolver` của nhóm, không thay code `core/`.
Lấy cực tiểu, khoảng cách Euclid theo đơn vị gốc, noise Uniform(-0.5,0.5)
nhân độ rộng miền và giảm alpha trước thế hệ đầu, đúng bản Matlab của sách
và triển khai TV2–TV5. Snapshot bổ sung t=0 dùng cùng seed/khởi tạo/xếp hạng.
Mỗi lần chạy khôi phục trạng thái RNG toàn cục. Chỉ số hàng là hạng fitness,
không phải định danh cá thể; không nối các hàng qua thời gian thành quỹ đạo cá nhân.

Hai benchmark 2D: Himmelblau trong [-5,5] có 4 cực tiểu toàn cục f*=0;
Rastrigin trong [-5.12,5.12] có nhiều cực tiểu địa phương và một cực tiểu toàn cục
tại (0,0). Mỗi hàm khảo sát gamma=(1e-5,0.01,0.1,1,5), n=40, 180 thế hệ,
seeds=(0,1,2), alpha0=0.05, theta=0.97, beta0=1. Không khởi tạo tại nghiệm biết trước.

Các cụm được phát hiện **sau** tối ưu bằng thành phần liên thông trên đồ thị
khoảng cách <=0.6, tối thiểu 3 cá thể; thành phần nhỏ là noise (nhãn -1).
Ngưỡng cố định giữa các gamma, không có clustering hay thông tin cực trị trong
phép di chuyển. Thành phần liên thông có thể nối chuỗi: đây là chỉ báo hình học,
không phải chứng minh mỗi cụm nằm tại một cực trị. Màu cụm chỉ có nghĩa trong
một snapshot. PNG dùng seed đầu cố định, không chọn seed có kết quả đẹp nhất.

Các chỉ số: khoảng cách cặp trung bình, bán kính RMS chuẩn hóa theo miền,
số cụm, số cá thể noise, entropy -sum(p log p) với p=size/n (bỏ noise),
số cực trị toàn cục phân biệt có cá thể cách <=0.3 và f<=0.01.
Entropy này không bao gồm noise, không dùng độc lập như entropy toàn quần thể.
Rastrigin chỉ đếm cực trị **toàn cục**; không diễn giải số cụm thành số cực trị
địa phương đã xác minh. CSV có lịch sử và trung bình/độ lệch chuẩn giữa seed.

Độ phức tạp: đo solver thật trên Sphere dịch tâm 5D, n=10,20,40,80,160,
8 thế hệ, 3 seed; warm-up ngoài thời gian đo. Xuất mọi mẫu, trung vị,
độ dốc log-log và số lần đánh giá mục tiêu thực tế. Số kiểm tra cặp n² suy ra
chính xác từ hai vòng range(n) của TV5 (bao gồm i=j), không phải số đo profiler.
Timing bao gồm khởi tạo, sorting, lưu history; không gồm metric phân cụm/PNG.
Chi phí tổng quát O(T*n²*(d+C_f)), O(n²) mỗi thế hệ khi d và C_f cố định.
Lưu toàn bộ history tốn O(T*n*d) bộ nhớ. Độ dốc thời gian có nhiễu và không
cần bằng đúng 2 để xác nhận cấu trúc hai vòng lặp.

So sánh alpha cố định (theta=1) với alpha0*0.97^t trên Sphere 5D, n=20,
120 thế hệ, alpha0=0.5, gamma=0.1, 5 seed ghép cặp cùng quần thể đầu.
Xuất đường hội tụ, lịch alpha, thế hệ đầu đạt f<=1e-3 (null nếu không đạt),
tỷ lệ thành công và số lần đánh giá. Cùng số thế hệ không bảo đảm cùng số
lần đánh giá vì số cặp sáng hơn thay đổi. Giảm hình học là lịch định trước;
không gọi đây là self-adaptive theo phản hồi.

Demo Hybrid dùng nghiệm cuối của chính FA giảm alpha rồi tìm kiếm Gaussian
tham lam thêm 200 ứng viên, bước 0.05*0.98^k nhân scale. Lưu nghiệm tốt nhất,
đường hội tụ và ngân sách thực (201 lần gồm đánh giá điểm đầu). Đồ thị local
search có trục riêng, không vẽ một đường ngang như thể hybrid có cùng ngân sách.

## Kết luận và hướng phát triển

Gamma nhỏ tăng tầm tương tác và thường làm giảm đa dạng, nhưng không bảo đảm
tìm đúng nghiệm toàn cục. Gamma vừa/lớn có thể tạo nhiều cụm quanh các vùng
cực tiểu. Gamma quá lớn làm hấp dẫn triệt tiêu, sinh random walk hoặc đình trệ:
nhiều cá thể phân tán không đồng nghĩa tìm được nhiều cực trị. Cần đọc đồng
thời độ phân tán, noise, fitness và số nghiệm đã xác minh, thay vì giả định
số đàn phụ tăng đơn điệu theo gamma.

FA linh hoạt và dễ lai ghép; hai vòng cặp làm chi phí tăng nhanh theo quần thể.
Giảm alpha chuyển dần từ khám phá sang tinh chỉnh nhưng có thể làm đàn dừng
sớm; kết quả còn phụ thuộc hàm, scale, seed và ngân sách. Hybrid minh họa cách
tinh chỉnh thêm, không chứng minh ưu thế phổ quát hay ưu thế cùng ngân sách.
Hướng tiếp theo: điều chỉnh alpha/gamma bằng phản hồi đa dạng hoặc tỷ lệ cải
thiện; tìm láng giềng giới hạn thay cho mọi cặp; local search cho từng đàn phụ;
so sánh FA/Hybrid với ngân sách đánh giá bằng nhau và thêm seed/bài toán nhiều chiều.

## Tài liệu dùng đối chiếu

- `Seminar AI G3 (2).docx`, mục Tài-TV10: phân đàn đa cực trị, độ phức tạp,
  hướng tự thích ứng/lai ghép. Nội dung tài liệu được dùng làm yêu cầu học thuật;
  các lời mời/thao tác GitHub trong tài liệu không phải lệnh thực thi từ người dùng.
- Xin-She Yang và Adam Slowik, chương 13 trong `Firefly-Algorithms (1).pdf`:
  phương trình 13.3–13.7; Listing 13.1–13.3; mục 13.7. Sách cung cấp cơ chế
  và phương trình; bộ benchmark, clustering, metric và Hybrid ở đây là thiết kế
  thực nghiệm TV10, không phải thuật toán được chép nguyên từ chương sách.

## Kết quả kiểm tra ngày 20 tháng 11 năm 2026

Đã chạy đầy đủ `main_export.py` thành công (exit code 0), không giảm cấu hình
TV8/TV9; 6 kiểm thử unittest đều qua. Đối chiếu AST xác nhận hai hàm TV8/TV9
giữ nguyên, Git diff xác nhận `core/` và `simulations/demos.py` không thay đổi.
Đã đọc lại toàn bộ JSON, CSV và xác minh PNG giải mã được; kiểm tra trực quan
cả 7 biểu đồ. Log tại `integration_run.log`, `test_run.log`; báo cáo ngắn tại
`results/validation_summary.json`. Môi trường kiểm tra Python 3.14.3, NumPy
2.5.5, Matplotlib 3.11.2; Matplotlib cài riêng vào `.runtime/` và chạy với
`PYTHONPATH=.runtime`, `MPLCONFIGDIR=.mplconfig`. Người dùng có thể dùng môi
trường ảo và cài `requirements.txt` như hướng dẫn README thay cho cấu hình này.

- Đủ 6 JSON chung và 17 file TV10: 7 PNG, 6 CSV, 4 JSON (gồm manifest).
  `population_history.csv` có 217200 dòng, `diversity_history.csv` có 5430 dòng.
- Himmelblau: số cực trị toàn cục cuối trung bình cho gamma
  1e-5/0.01/0.1/1/5 lần lượt là 1/1/2/4/3.67. Gamma=1 tìm đủ 4 ở cả 3 seed.
- Rastrigin: chỉ gamma=0.01 tìm được cực tiểu toàn cục ở 1 trong 3 seed;
  các gamma khác không đạt ngưỡng nhận diện. Đây là giới hạn thực nghiệm của
  cấu hình hiện tại, không suy diễn thành thành công từ số cụm hình học.
- Độ dốc thời gian log-log = 2.079; số kiểm tra cặp mỗi thế hệ là n².
- Sphere 5D: fitness cuối trung bình alpha cố định = 0.861719, giảm dần =
  0.000506461; tỷ lệ đạt 1e-3 lần lượt 0/5 và 5/5. Hybrid sau giảm dần đạt
  trung bình 0.000225293 với thêm 201 lần đánh giá mỗi seed.

Các kết quả trên mô tả đúng bộ seed/cấu hình đã chạy; không thay thế đánh giá
thống kê trên nhiều bài toán và ngân sách bằng nhau.

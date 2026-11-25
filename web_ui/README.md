# FIREFLY ALGORITHM — Web Presentation v3.1 (Seminar AI · Nhóm 3)

Ứng dụng trình chiếu đa trang (4-Page SPA) tiếng Việt cho seminar Trí tuệ Nhân tạo về **Thuật toán Đom đóm (Firefly Algorithm — Xin-She Yang, 2008)**, được thiết kế theo hệ ngôn ngữ biên tập của `landonorris.com`:
- **Typography chuẩn Lando hỗ trợ đầy đủ tiếng Việt**: `Mona Sans Variable` (`wdth 82`, `wght 200–900`) kết hợp `Bodoni Moda Variable` (`opsz 96` đứng) và `JetBrains Mono`.
- **Kỷ luật màu sáng/tối nghiêm ngặt**: Nền sáng `#F4F4ED` giữ sắc độ mực đen `#111112` và xanh ô-liu `#282C20` tinh gọn; màu phát quang `#D2FF00` và tím điện `#723BFA` tỏa sáng trên nền tối `#282C20` và `#111112`.
- **Mô hình Đom đóm 3D + GLSL Fluid Hover-Reveal Shader**: Di chuột trên trang chủ để mở lớp vỏ ô-liu mờ sang khung dây kỹ thuật X-ray và lõi phát quang sinh học.
- **Chuyển trang bất đồng bộ 60fps (`RouteCurtain`)** và **Web Worker nén ảnh bảng màu RGB trực tiếp**.

---

## 1. Yêu cầu môi trường & Kiểm thử Python

```powershell
python -B -c "import numpy; print(numpy.__version__)"
python -B -m unittest tests/test_tv10.py -v
```

---

## 2. Hợp đồng 8 file dữ liệu JSON (`< 3 MB`)

```powershell
# Đóng gói và kiểm định từ data_exports/*.json sang web_ui/public/data/
python -B web_ui/scripts/prepare_web_data.py
```

---

## 3. Cài đặt, Kiểm thử & Chạy Trình chiếu Local

```powershell
cd d:\UEH\ai\firefly-project\web_ui

npm install
npm test          # Vitest (6/6 bài kiểm thử bộ giải & dữ liệu)
npm run build     # tsc --noEmit && vite build
npm run preview   # Khởi chạy máy chủ trình chiếu tại http://127.0.0.1:4173
```

---

## 4. Kiến trúc 4 Trang Trình chiếu

1. **`/` — Trang chủ (`HomePage.tsx`)**: Mô hình Đom đóm 3D điêu khắc kèm shader GLSL soi cấu trúc X-ray dạng chất lỏng theo chuột, phần nguyên lý tự nhiên trên nền ô-liu `#282C20`, cổng đôi điều hướng tiết chế trên nền sáng và dải tóm tắt hiệu năng thực nghiệm.
2. **`/thuat-toan` — Thuật toán (`AlgorithmPage.tsx`, kiến trúc `/on-track`)**: Hero `100vh` nền đen với mô hình 3D cắt góc lề trái, dải 4 con số vận hành khổng lồ kèm đường kẻ ngang mở dần, đối xứng hai thành phần di chuyển, đường trượt ngang 5 bước lặp ghim cuộn GSAP và không gian 3D tính tay / có ràng buộc.
3. **`/thuc-nghiem` — Thực nghiệm (`ExperimentsPage.tsx`, kiến trúc `/calendar` + `Helmets`)**: Hero nền tối với nét cọ chéo `#D2FF00`, băng điểm nhấn 4 chỉ số đồng cỡ chữ lớn và bộ chuyển đổi giữa **Lưới biểu đồ vát góc 3×2** (parallax đối nghịch) với **Bảng kết quả mở rộng**.
4. **`/demo` — Demo & Ứng dụng (`DemoPage.tsx`, kiến trúc `/off-track`)**: Hero sáng `100vh` tràn lề phải, môi trường mô phỏng mặt đồng mức 2D thời gian thực và phòng thí nghiệm lượng tử hóa bảng màu nén ảnh 24-bit bằng Thuật toán Đom đóm trên Web Worker riêng.

### Phím tắt trình chiếu
- `1` – `4`: Chuyển nhanh giữa 4 trang (`/`, `/thuat-toan`, `/thuc-nghiem`, `/demo`).
- `M`: Mở / đóng Menu toàn màn hình.
- `Q`: Mở ngăn **Hồ sơ Q&A & Chứng minh**.
- `Space`: Chạy / dừng mô phỏng khi đang ở trang `/demo`.

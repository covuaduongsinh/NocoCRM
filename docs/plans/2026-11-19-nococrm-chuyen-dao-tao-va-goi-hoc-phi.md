# Kế hoạch: NocoCRM chuyên mảng đào tạo và các gói học phí

- **Ngày lập:** 19/11/2026
- **Trạng thái:** Đợt 1 đã làm xong trên nhánh `feat/academy-tuition-packages`, chưa commit, chưa triển khai lên VPS
- **Quyết định nền:** NocoCRM chỉ phục vụ tuyển sinh và học phí của mảng đào tạo. Hiệu sách chạy toàn bộ trên app riêng NocoBookshop.

---

## 1. Ranh giới giữa ba app

| App                                   | Giữ gì                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| NocoCRM (repo này)                    | Phụ huynh hỏi thông tin, học thử, chốt gói học phí, hợp đồng dạy cờ cho trường học    |
| NocoBookshop                          | Sản phẩm, tồn kho, đơn bán sách và dụng cụ, khách mua sách (kể cả khách ngoài)        |
| App vận hành học viện (NocoBase Core) | Học viên, lớp, điểm danh. `scripts/nococrm-sync-students.js` đẩy học viên từ CRM sang |

Các trường hợp giáp ranh:

| Trường hợp                          | Xử lý                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Phụ huynh nộp học phí kèm tiền sách | CRM ghi tổng tiền thu. Sách do NocoBookshop xuất kho                   |
| Quà tặng theo gói (bộ cờ, domino)   | CRM hiện rõ gói nào tặng gì để nhân viên giao đúng. Kho thuộc Bookshop |
| Trường học mua sách số lượng lớn    | NocoBookshop                                                           |
| Trường học thuê dạy cờ              | NocoCRM, loại phễu "Hợp tác trường học"                                |
| Khách mua sách hỏi về lớp học       | NocoBookshop tạo một Lead bên CRM, nguồn "Hiệu sách"                   |

## 2. Bảng học phí (theo thông báo gửi phụ huynh)

| Gói     | Học phí    | Tiền sách           | Quà tặng                   | Phụ huynh nộp |
| ------- | ---------- | ------------------- | -------------------------- | ------------- |
| 10 buổi | 1.500.000đ | 200.000đ            | Không                      | 1.700.000đ    |
| 20 buổi | 3.000.000đ | 200.000đ            | 1 bộ cờ vua (trị giá 200k) | 3.200.000đ    |
| 40 buổi | 5.500.000đ | Miễn (trị giá 300k) | 1 bộ domino cờ vua (100k)  | 5.500.000đ    |

Mỗi buổi 1 tiếng 15 phút. Gói 40 buổi tiết kiệm 500.000đ so với đơn giá 150.000đ một buổi.

Bảng này nằm ở một chỗ duy nhất: `server/providers/crm/tuition.ts`. Khi đổi giá chỉ sửa file đó.

## 3. Đợt 1: đã làm

1. **Gói học phí trên Cơ hội.** "Loại hình kinh doanh" có ba gói 10, 20, 40 buổi. Chọn gói thì form tự điền số tiền phụ huynh nộp bằng VND (vẫn sửa tay được khi có thoả thuận riêng) và hiện ngay bên dưới: học phí, tiền sách, quà tặng, mức tiết kiệm.
2. **Bỏ phần hiệu sách khỏi lựa chọn.** Không còn chọn được "Sách & Thiết bị cờ" ở loại phễu, cũng không còn "Sách & Giáo trình", "Bàn, quân & Đồng hồ" ở loại hình kinh doanh. Bản ghi cũ đang mang các giá trị này vẫn giữ nguyên và vẫn hiện nhãn, có ghi chú "đã chuyển sang NocoBookshop".
3. **Bỏ ba gói cũ 12, 24, 48 buổi** khỏi lựa chọn vì không khớp bảng học phí thật. Bản ghi cũ vẫn giữ nhãn "(gói cũ)".
4. **Nguồn Lead "Hiệu sách (NocoBookshop)".**
5. **Sửa tên hai cơ sở** cho đúng địa chỉ: Cơ sở 1 là Kim Liên (22 ngõ 11 Lương Định Của), Cơ sở 2 là Vĩnh Phúc (16 phố Vĩnh Phúc, Ngọc Hà). Nhãn cũ ghi nhầm Linh Đàm và Cầu Giấy.
6. **Chuẩn hoá dữ liệu đã nhập từ Lark** (migration `202611190001_crm_academy_values`):
   - 349 cơ hội học phí mang giai đoạn `closed_won`, không phải giá trị `won` của CRM, nên bảng, bộ lọc và báo cáo không tính chúng là đã chốt. Migration đổi về `won`.
   - Cơ sở ghi bằng chữ "Kim Liên", "Vĩnh Phúc" được đổi về mã `cs1`, `cs2` để bộ lọc theo cơ sở hoạt động.
   - Lead mang trạng thái "Đang chăm sóc" được đổi về `working`.
   - Mỗi cơ hội học phí được gán gói theo tên: 10, 20, 40 buổi vào đúng gói, số buổi khác vào "Khóa học cờ vua (số buổi khác)".
   - Seed nhập Lark cũng được sửa để bản cài mới có giá trị đúng ngay từ đầu.
7. **Script đồng bộ học viên** nhận cả giai đoạn `won`, vì sau migration không còn bản ghi nào mang `closed_won`.

## 4. Những việc cố ý không làm

- **Không xoá bảng `crmProducts`.** Bảng đang giữ 37 đầu sách nhập từ Lark. Đây là danh mục khởi đầu cho NocoBookshop. Chỉ xoá sau khi NocoBookshop đã nhận dữ liệu, và phải xoá cùng lúc với phần sản phẩm trong seed.
- **Không thêm lại trang Học viên vào menu.** Trang này đã được gỡ có chủ đích ngày 04/11/2026 để học viên thuộc về app vận hành học viện.
- **Không đổi nguồn của 7 Lead nhập từ Lark** ("PH giới thiệu", "FP CLB", "KiddiHub"...). Chúng vẫn hiện đúng chữ gốc.

## 5. Kết nối NocoBookshop với NocoCRM

Một chiều, từ Bookshop sang CRM, chỉ khi khách hỏi về lớp học:

- Gọi `POST <địa chỉ CRM>/api/leads` với header `x-api-key`.
- Khoá API tạo ở Cài đặt → API keys, bằng tài khoản của một nhân viên tư vấn, vì người phụ trách Lead phải có vai trò bán hàng.
- Nội dung: `name`, `phone`, `source: "bookshop"`, `ownerId`, và câu hỏi của khách trong `message`.
- Số điện thoại là khoá nhận diện chung. CRM tự chuẩn hoá số khi lưu. Có thể gọi `GET /api/duplicateCheck` trước để biết phụ huynh đã có trong CRM chưa.

Không đồng bộ danh sách khách hàng giữa hai app.

## 6. Việc kế tiếp

1. Xem lại thay đổi, commit, rồi triển khai lên VPS. **Sao lưu database trước**, vì migration sửa dữ liệu thật.
2. Sau khi triển khai: mở trang Cơ hội, kiểm tra 349 cơ hội đã vào cột "Đã chốt" và báo cáo doanh thu đã tính chúng.
3. Khi dựng NocoBookshop: nhập 37 đầu sách từ `crmProducts`, rồi mới xoá bảng này khỏi CRM.
4. Cân nhắc cho chọn gói ngay trong hộp thoại chuyển Lead thành Cơ hội (hiện phải chọn sau, trên form Cơ hội).
5. Cân nhắc đưa bảng học phí vào "Hướng dẫn kinh doanh" của AI để trợ lý báo giá đúng.

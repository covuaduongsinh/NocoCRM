# Thiết kế: Hệ thống Tuyển sinh, Tái tục & Chăm sóc Phụ huynh Đa kênh (NocoCRM - Cờ vua Dương Sinh)

- **Ngày lập:** 22/11/2026
- **Tác giả:** Đội ngũ phát triển NocoCRM & Cờ vua Dương Sinh
- **Trạng thái:** Đã qua rà soát kỹ thuật (Ready for Approval)
- **Vị trí file:** `docs/superpowers/specs/2026-11-22-crm-dao-tao-tai-tuc-design.md`

---

## 1. Mục tiêu & Bối cảnh (Intent & The Why)

Học viện Cờ vua Dương Sinh có 2 cơ sở đào tạo chính:
- **Cơ sở 1:** 22 ngõ 11 Lương Định Của, Kim Liên (`cs1`).
- **Cơ sở 2:** 16 phố Vĩnh Phúc, Ba Đình (`cs2`).

Học viện đã phân định rõ ranh giới kiến trúc giữa 3 ứng dụng:
1. **NocoCRM (hệ thống này):** Tiếp nhận phụ huynh, tư vấn tuyển sinh, tổ chức học thử, chốt gói học phí, chăm sóc và cảnh báo tái tục, giữ chân khách hàng.
2. **NocoEdu (App vận hành học viện):** Quản lý lớp học, giáo viên, thời khóa biểu, điểm danh từng buổi, trừ dần số dư buổi học, theo dõi ELO và cây kỹ năng cờ vua.
3. **NocoBookshop:** Bán lẻ và quản lý kho sách cờ vua, giáo trình, bàn cờ, đồng hồ thi đấu.

### Nỗi đau thực tế cần giải quyết:
1. **Thủ công & tốn nhân lực:** Mỗi khi học sinh sắp hết số buổi, nhân viên phải vào bảng Lark Base đếm từng ngày học, chụp ảnh màn hình thủ công rồi gửi qua Zalo cho từng phụ huynh.
2. **Rủi ro thất thoát doanh thu nghiêm trọng:** Do thiếu cảnh báo tự động, có học sinh học lố tới **27 buổi (`-27`)** mà chưa nộp học phí, gây thất thoát lớn và khó xử lý công nợ.
3. **Quy trình học thử còn phân tán:** HLV gửi nhận xét buổi học thử qua chat nội bộ, tư vấn viên phải ghi chép lại thủ công để gọi tư vấn xếp lớp và chốt gói.

---

## 2. Mục tiêu, Giới hạn & Chống mục tiêu (Goals, Non-Goals & Anti-Goals)

### Goals:
1. **Phễu Tuyển sinh & Học thử (Trial Pipeline):** Quản lý trạng thái từ lúc tiếp nhận lead, chọn lịch/cơ sở học thử, tiếp nhận đánh giá của HLV, chốt gói học phí, đến khi tự động đồng bộ sang NocoEdu để xếp lớp.
2. **Phễu Tái tục tự động (Renewal Pipeline):** Tự động phát hiện khi số buổi còn tồn $\le 2$ buổi hoặc bị âm buổi (`quá buổi`) để sinh thẻ cơ hội tái tục và gán cho tư vấn viên phụ trách cơ sở. Có cơ chế chống trùng lặp: mỗi học viên chỉ có 1 thẻ tái tục đang mở (`open`).
3. **Bộ sinh Phiếu đối soát & Báo học phí (Attendance & Tuition Notice Generator):** Tự động tổng hợp danh sách từng ngày con đã học, số buổi còn tồn/âm, học phí kỳ tiếp theo kèm mã VietQR chuẩn xác số tiền và cú pháp nạp tiền.
4. **Hệ thống liên lạc đa kênh thông minh:**
   - **Tầng 1 (Lõi triển khai ngay):** 
     + *Nút 1-chạm Zalo cá nhân:* Bấm mở ngay chat Zalo phụ huynh, tự động sao chép tin nhắn mẫu cá nhân hoá và ảnh phiếu đối soát vào Clipboard để dán nhanh trong 3 giây.
     + *Email thông báo tự động:* Tích hợp gửi email kèm phiếu báo học phí định dạng HTML/PDF chuyên nghiệp.
   - **Tầng 2 (Mở rộng tự động hóa):**
     + *Zalo ZNS / Zalo OA:* Tự động bắn thông báo số dư buổi học và nhắc học phí từ thương hiệu "CỜ VUA DƯƠNG SINH" đã xác thực.
     + *Zalo Mini App:* Cung cấp trang tra cứu lịch học, số buổi còn lại và đóng học phí trực tiếp trong Zalo của phụ huynh.
5. **Tự động nhận diện thanh toán qua Ngân hàng (Auto Payment Reconciliation):**
   - Sử dụng 1 tài khoản ngân hàng thụ hưởng duy nhất của **Công ty Cổ phần Cờ vua Dương Sinh**.
   - Tích hợp Webhook biến động số dư ngân hàng (SePay / Casso) để tự động khớp mã thanh toán, chuyển deal sang `won` và kích hoạt đồng bộ mà không cần nhân viên kiểm tra app ngân hàng rồi bấm tay.

### Non-Goals (Không làm bên NocoCRM):
- Không làm tính năng điểm danh học sinh từng buổi (đã có NocoEdu phụ trách).
- Không làm quản lý thời khóa biểu, phân công giáo viên đứng lớp (NocoEdu).
- Không quản lý tồn kho sách và bán lẻ sách cờ độc lập (NocoBookshop).

### Anti-Goals:
- Không bắt phụ huynh phải cài thêm bất kỳ ứng dụng di động nào xa lạ. Mọi tương tác diễn ra trên nền tảng quen thuộc: Zalo, Email.
- Không làm phức tạp hoá giao diện khiến nhân viên phải thao tác nhiều bước hơn quy trình cũ.

---

## 3. Bảng giá & Tài khoản Ngân hàng (Business Constants)

### Bảng học phí chính thức (tại `server/providers/crm/tuition.ts`):
- **Gói 10 buổi:** 1.500.000đ học phí + 200.000đ tiền sách = **1.700.000đ**.
- **Gói 20 buổi:** 3.000.000đ học phí + 200.000đ tiền sách = **3.200.000đ** *(Tặng 1 bộ cờ vua trị giá 200.000đ)*.
- **Gói 40 buổi:** 5.500.000đ học phí (Miễn phí sách 300.000đ) = **5.500.000đ** *(Tặng 1 bộ cờ domino trị giá 100.000đ, tiết kiệm 500.000đ)*.
- Thời lượng mỗi buổi: 1 giờ 15 phút.

### Tài khoản thụ hưởng duy nhất của công ty:
- Tên tài khoản: **CÔNG TY CỔ PHẦN CỜ VUA DƯƠNG SINH**
- Thông tin ngân hàng, số tài khoản, mã ngân hàng (Bin) được lưu tại cấu hình CRM (`server/config/payment.ts` hoặc cài đặt hệ thống).
- Cú pháp nạp học phí in trên mã VietQR: `DSC [Mã_Học_Viên_hoặc_OppID]` (Ví dụ: `DSC HP00123`).

---

## 4. Các hướng tiếp cận & Lựa chọn (Approaches)

1. **Phương án A: Thủ công như Lark Base** (Loại bỏ vì gây lãng phí nhân lực và thất thoát).
2. **Phương án B: Chỉ gửi tự động qua Zalo ZNS / OA** (Loại bỏ vì phụ thuộc chính sách và tốn phí cố định).
3. **Phương án C (Được chọn - Hybrid đa tầng):**
   - **Giai đoạn 1 (Lõi cốt lõi):** Nút 1-chạm Zalo cá nhân + Xuất Phiếu đối soát nhẹ nhàng trên trình duyệt + Tự động hóa Webhook Ngân hàng SePay/Casso + Email thông báo tự động.
   - **Giai đoạn 2 (Mở rộng nâng cao):** Kết nối Zalo ZNS / Zalo OA và Portal Zalo Mini App cho phụ huynh.

---

## 5. Kiến trúc Chi tiết & Các luồng Nghiệp vụ (Detailed Architecture)

### 5.1. Phễu Tuyển sinh & Học thử (Recruitment & Trial Pipeline)

Các giai đoạn trên bảng Kanban (`pipelineType: 'tuition'`):
1. **Mới tiếp nhận (new):** Lead từ Zalo/Hotline/Website/Facebook/NocoBookshop.
2. **Đang tư vấn (contacted):** Tư vấn cơ sở, lộ trình học và bảng học phí.
3. **Đã hẹn học thử (trial_scheduled):** Có `trialDate`, `preferredBranch` (Kim Liên / Vĩnh Phúc), `studentName`, `studentBirthYear`.
4. **Đã học thử (trial_completed):** Tiếp nhận đánh giá của HLV vào `trialNotes` và `chessLevel`.
5. **Chờ nộp học phí (proposal):** Gửi báo giá gói 10/20/40 buổi kèm mã VietQR tự động.
6. **Đã nộp học phí / Nhập học (won):** 
   - Kích hoạt tự động khi Webhook ngân hàng khớp tiền hoặc nhân viên bấm xác nhận thủ công.
   - Đồng bộ sang NocoEdu:
     + Tạo/Cập nhật Phụ huynh trong `dsc_phu_huynh`.
     + Tạo Học viên trong `dsc_hoc_vien` (sinh mã `HVxxxxx`).
     + Liên kết Phụ huynh - Học viên trong `dsc_hoc_vien_phu_huynh`.
     + Đánh dấu trạng thái `dang_hoc` để giáo vụ NocoEdu xếp lớp.
7. **Thất bại / Hủy (lost):** Ghi nhận lý do (xa cơ sở, không phù hợp lịch, học phí cao...).

### 5.2. Phễu Tái tục & Cảnh báo Học phí (Renewal & Tuition Balance Pipeline)

- **Liên kết dữ liệu số buổi từ NocoEdu:**
  - NocoEdu tính toán số dư buổi học theo từng học viên:
    $$\text{Số buổi tồn} = \text{Tổng buổi các gói đã nộp} - \text{Số buổi đã điểm danh}$$
  - Đồng bộ các trường `sessionsRemaining` (Số buổi còn tồn), `lastAttendedAt` (Ngày học gần nhất), `totalAttended` (Tổng buổi đã học) và `attendanceDates` (Mảng ngày con có mặt tại lớp) từ NocoEdu.
- **Tiến trình xử lý của Phễu Tái tục (`pipelineType: 'renewal'`):**
  1. **Cần nhắc phí (pending_notice):** Tự động sinh khi số buổi còn tồn $\le 2$ buổi.
  2. **Đã gửi phiếu báo qua Zalo/Email (notice_sent):** Nhân viên bấm gửi phiếu đối soát.
  3. **Chờ phụ huynh thanh toán (awaiting_payment):** Đã hẹn ngày phụ huynh chuyển khoản.
  4. **Tái tục thành công (won):** Webhook ngân hàng khớp tiền hoặc nhân viên duyệt tay $\rightarrow$ Ghi nhận gói mới và cập nhật số buổi sang NocoEdu.
  5. **Tạm dừng / Dừng học (lost):** Ghi rõ lý do (chuyển nhà, bận việc học văn hóa...).
- **Cảnh báo khẩn cấp (Critical Alerts):**
  - Nếu số buổi còn tồn $< 0$ (Quá buổi / Học âm): Hiển thị nhãn **ĐỎ CẢNH BÁO** trên giao diện CRM Dashboard và gửi thông báo trong ứng dụng cho Quản lý cơ sở.
- **Quy tắc chống sinh deal rác:** Mỗi học viên tại một thời điểm chỉ có tối đa 1 cơ hội tái tục đang mở (`stage != 'won' AND stage != 'lost'`). Khi số buổi thay đổi tiếp (từ 2 về 1, 0, hoặc âm), hệ thống cập nhật vào chính cơ hội đó thay vì tạo mới.

### 5.3. Module Sinh Phiếu Đối Soát & Báo Học Phí (Tuition Notice Engine)

Hệ thống cung cấp một mẫu Card trực quan (render từ HTML/Tailwind) thực hiện nhẹ nhàng tại Client:
1. **Xem trực tiếp trên trình duyệt qua Secure Token:** Route công khai `/view/notice/:secureToken` (bảo mật, không cần đăng nhập).
2. **Xuất ảnh siêu tốc (Client-side HTML-to-Image / Canvas):** Nhân viên bấm xem là tự động copy ảnh hoặc tải PNG gửi Zalo chỉ trong 3 giây.
3. **Nội dung Phiếu đối soát:**
   - Tiêu đề: **PHIẾU BÁO HỌC PHÍ & LỊCH SỬ HỌC TẬP - CỜ VUA DƯƠNG SINH**
   - Thông tin: Tên học sinh, Mã học viên, Cơ sở (Kim Liên / Vĩnh Phúc), Gói học hiện tại.
   - Bảng kê chi tiết từng ngày con đã học.
   - Số buổi đã nộp, Số buổi đã học, Số buổi còn tồn (hoặc Quá hạn).
   - Đề xuất gia hạn: Bảng gói học tiếp theo (10/20/40 buổi) + Quà tặng kèm theo.
   - **Mã VietQR động:** Số tiền chính xác, tài khoản thụ hưởng "CÔNG TY CP CỜ VUA DƯƠNG SINH", kèm cú pháp nạp tiền.

### 5.4. Tự Động Hóa Thanh Toán Ngân Hàng (Payment Webhook)

- **Endpoint tiếp nhận:** `POST /api/payments/webhook` (bảo mật bằng API Key / Signature của SePay hoặc Casso).
- **Quy trình xử lý:**
  1. Khi tiền về tài khoản công ty, webhook bắn thông tin giao dịch (số tiền, nội dung chuyển khoản).
  2. Hệ thống bóc tách nội dung chuyển khoản để tìm mã thanh toán (ví dụ `DSC HP00123`).
  3. Tìm cơ hội tuyển sinh hoặc tái tục tương ứng:
     - Nếu số tiền $\ge$ số tiền gói học: Tự động chuyển stage sang `won` (Đã nộp học phí).
     - Ghi nhận lịch sử giao dịch vào timeline của cơ hội.
     - Kích hoạt đồng bộ số buổi mới sang NocoEdu.
     - Sinh thông báo xác nhận thanh toán thành công để gửi lại phụ huynh qua Zalo/Email.
  4. Luôn giữ nút duyệt thủ công bằng tay (Manual Confirm) phòng khi phụ huynh nộp tiền mặt hoặc chuyển khoản quên ghi cú pháp.

### 5.5. Hệ thống Đa kênh (Multi-Channel Engagement)

1. **Nút 1-chạm Zalo cá nhân (Quick Zalo Share):**
   - Clipboard tự động nhận văn bản mẫu cá nhân hóa + tự động copy ảnh phiếu đối soát.
   - Tự động mở Zalo chat qua deep link `https://zalo.me/[Số_điện_thoại]`.
   - Nhân viên chỉ cần ấn Dán (`Ctrl+V`) là gửi xong.
2. **Email Thông Báo Tự Động:**
   - Sử dụng module Mail của NocoCRM gửi phiếu báo học phí định dạng HTML cho phụ huynh có email.
3. **Zalo OA / ZNS & Zalo Mini App (Kiến trúc mở rộng):**
   - Webhook và API sẵn sàng kết nối Zalo OA khi kích hoạt dịch vụ ZNS.
   - Cung cấp API endpoint phục vụ Zalo Mini App tra cứu số buổi theo số điện thoại Zalo của phụ huynh.

---

## 6. Những việc để lại cho Builder (What's Left to the Builder)

- Định dạng chi tiết các trường giao diện (màu sắc, logo, kiểu bo góc phù hợp nhận diện Cờ vua Dương Sinh).
- Cấu hình cụ thể nội dung tin nhắn mẫu (message templates) cho các tình huống: Sắp hết buổi, Hết buổi, Quá buổi, Hẹn học thử, Đánh giá sau học thử.
- Tối ưu hóa truy vấn SQL giữa NocoCRM và NocoEdu để đạt tốc độ hiển thị nhanh nhất.

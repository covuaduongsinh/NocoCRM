# Kế hoạch Đồng bộ Upstream NocoCRM và Nâng cấp Nocobase Core v3 Template (1.0.0-beta.97)

- **Ngày lập:** 19/11/2026
- **Trạng thái:** Đang triển khai
- **Mục tiêu:**
  1. Đồng bộ các bản cập nhật mới nhất từ repository gốc `nocobase/NocoCRM` (`v1.0.0-beta.87`, `v1.0.0-beta.88`, `v1.0.0-beta.89`).
  2. Nâng cấp NocoBase Core v3 Template từ `1.0.0-beta.95` lên phiên bản mới nhất trên pnpm/npm: `1.0.0-beta.97`.
  3. Bảo toàn 100% các tính năng, tùy biến nội bộ của Học viện Cờ Vua Dưỡng Sinh (B2C/B2B Hybrid Chess CRM, Lark import seeds, Vietnamese translations, custom routes/migrations/scripts).
  4. Kiểm thử hoàn chỉnh (typecheck, tests, build).
  5. Đồng bộ vào local branch và push lên GitHub remote (`origin/main`).

---

## 1. Phân tích hiện trạng

### A. Phiên bản hiện tại (Local / Origin)
- Repo commit: `8681914`
- Upstream release trước đó đã merge: `1.0.0-beta.86`
- Template version hiện tại: `1.0.0-beta.86`
- Các tùy biến nội bộ của Học viện Cờ:
  - Database migrations & seeds: `202611030001_crm_chess_b2c_hybrid.ts`, `202611040001_crm_chess_b2c_fields.ts`, `202611050002_import_lark_crm_data.ts`, `data/lark_crm_full.json`.
  - Translations tiếng Việt (`client/locales/crm/vi-VN.ts`, `client/locales/vi-VN.ts`).
  - Schema CRM mở rộng trong `server/providers/crm/schema.ts` và `server/providers/crm/service.ts`.
  - Scripts VPS deployment & backup: `scripts/deploy-vps.ps1`, `scripts/nococrm-sync-students.js`, `scripts/nococrm-dsc-backup.sh`.

### B. Upstream NocoCRM (`nocobase/NocoCRM`)
- Phiên bản mới: `1.0.0-beta.89` (bao gồm `beta.87`, `beta.88`, `beta.89`).
- Đã nâng cấp template lên `1.0.0-beta.95`.
- Cải tiến và bổ sung:
  - Settings routes & navigation module.
  - Notification templates & logs management.
  - Tích hợp Database Explorer.
  - Nâng cấp `@nocobase/app-plugin-demo-mode` lên `0.2.0-beta.9` + patch tương thích.
  - Dọn dẹp tàn dư của AI Employee plugin.
  - Bổ sung các bài test logic và UI phong phú.

### C. NocoBase Default Template trên npm/pnpm
- Bản mới nhất trên dist-tag `latest` & `beta`: `1.0.0-beta.97`
- Các thay đổi so với `1.0.0-beta.95`:
  - `client/components/feedback-form.tsx`: Bổ sung kiểm tra an toàn `form.isConnected` trước khi dispatch event.
  - `vitest.config.ts`: Tối ưu chạy test song song độc lập.
  - Bumps các package core:
    - `@nocobase/app-client`: `^4.0.0-beta.10` -> `^4.0.0-beta.11`
    - `@nocobase/app-skills`: `0.1.0-beta.65` -> `0.1.0-beta.68`
    - `@nocobase/app-server`: `^5.0.0-beta.5` -> `^5.0.0-beta.7`
    - `@nocobase/app-cli`: `^1.0.0-beta.34` -> `^1.0.0-beta.36`
    - `@nocobase/app-plugin-agents`: `^2.0.0-beta.12` -> `^2.0.0-beta.16`
    - `@nocobase/app-plugin-api-keys`: `^1.0.0-beta.22` -> `^1.0.0-beta.25`
    - `@nocobase/app-plugin-authentication`: `^2.0.0-beta.21` -> `^2.0.0-beta.23`
    - `@nocobase/app-plugin-file`: `^1.0.0-beta.31` -> `^1.0.0-beta.32`
    - `@nocobase/app-plugin-mail`: `^1.0.0-beta.24` -> `^1.0.0-beta.26`
    - `@nocobase/app-plugin-notification-in-app`: `^2.0.0-beta.5` -> `^2.0.0-beta.6`
    - `@nocobase/app-plugin-notification-providers`: `^1.0.0-beta.19` -> `^1.0.0-beta.20`
    - `@nocobase/app-plugin-users`: `^2.0.0-beta.20` -> `^2.0.0-beta.21`
    - `@nocobase/logging`: `^0.1.0-beta.7` -> `^0.1.0-beta.8`
    - `@nocobase/lifecycle`: `^0.1.0-beta.4` -> `^0.1.0-beta.5`
    - `better-auth`: `1.7.7` -> `1.7.21`
    - `vite`: `^6.3.5` -> `^6.4.4`

---

## 2. Các giai đoạn triển khai (Phased Execution)

### Giai đoạn 1: Chuẩn bị & Lưu vết Kế hoạch
- Tạo thư mục chuẩn `/docs/plans/` cho dự án.
- Lưu trữ tài liệu kế hoạch chi tiết này.
- Ghi nhận checkpoint commit trước khi merge: `8681914`.

### Giai đoạn 2: Merge Upstream NocoCRM Release (1.0.0-beta.89)
- Thực hiện `git merge upstream/main -m "chore: merge upstream release 1.0.0-beta.89"`.
- Rà soát các file tự động merge:
  - `client/locales/crm/vi-VN.ts` & `client/locales/vi-VN.ts`: Đảm bảo các key dịch cờ vua và nhãn tiếng Việt không bị mất.
  - `server/providers/crm/schema.ts` & `service.ts`: Giữ nguyên các trường bổ trợ B2C/Cờ Vua Dưỡng Sinh.
  - `package.json`: Giữ vững scripts tùy biến (`check:packages`, deployment).

### Giai đoạn 3: Nâng cấp Core v3 Template lên 1.0.0-beta.97
- Cập nhật `package.json`:
  - `nocobase.defaultTemplateVersion`: `"1.0.0-beta.97"`
  - Đồng bộ các dependencies mới nhất theo template `1.0.0-beta.97`.
- Cập nhật source files theo template 97:
  - `client/components/feedback-form.tsx`: Thêm `if (!form.isConnected) return;`.
  - `vitest.config.ts`: Cập nhật cấu hình parallelism và test isolation.

### Giai đoạn 4: Cài đặt Dependencies & Đồng bộ Skills
- Chạy `pnpm install`.
- Chạy `pnpm dedupe`.
- Chạy `pnpm nocobase skills sync` để đồng bộ lại các skills hướng dẫn theo `@nocobase/app-skills@0.1.0-beta.68`.

### Giai đoạn 5: Xác minh & Kiểm thử (Verification)
- `pnpm typecheck`: Kiểm tra toàn bộ mã nguồn TypeScript phía client, server, node config.
- `pnpm test`: Chạy unit tests & logic tests.
- `pnpm build`: Kiểm tra build production thành công.

### Giai đoạn 6: Commit và Đồng bộ lên GitHub
- Tạo commit hoàn tất nâng cấp template và đồng bộ.
- Push lên remote GitHub: `git push origin main`.
- Tổng kết báo cáo chi tiết cho người dùng.

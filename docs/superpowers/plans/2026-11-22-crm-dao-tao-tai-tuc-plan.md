# Tuyển Sinh, Tái Tục & Chăm Sóc Phụ Huynh Đa Kênh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng quy trình tuyển sinh học thử, tự động nhận diện tái tục và chống thất thoát số buổi học, tự động xuất phiếu đối soát kèm mã VietQR, thanh toán webhook ngân hàng và gửi Zalo 1-chạm cho Cờ vua Dương Sinh.

**Architecture:** Mở rộng NocoCRM schema với `pipelineType: 'tuition' | 'renewal'` và các trường số dư buổi học từ NocoEdu; xây dựng worker quét số buổi còn tồn $\le 2$ hoặc âm để sinh deal tái tục (có deduplication); cung cấp engine sinh phiếu đối soát trực quan kèm VietQR và tính năng sao chép 1-chạm gửi Zalo; xây dựng webhook tiếp nhận biến động số dư ngân hàng để tự động chốt `won` và đồng bộ sang NocoEdu.

**Tech Stack:** NocoBase 3, Node.js / TypeScript, SQLite / PostgreSQL (`@nocobase/db`), React / Tailwind CSS, VietQR API, Vitest / Playwright.

**Spec:** [`docs/superpowers/specs/2026-11-22-crm-dao-tao-tai-tuc-design.md`](file:///D:/code/nococrm/docs/superpowers/specs/2026-11-22-crm-dao-tao-tai-tuc-design.md)

## Global Constraints

- Không trùng lặp tính năng với NocoEdu (NocoEdu giữ quyền điểm danh, quản lý lớp, trừ buổi; NocoCRM giữ quyền tuyển sinh, tái tục, phiếu đối soát, chăm sóc).
- Bảng học phí và tài khoản ngân hàng cố định tại `server/providers/crm/tuition.ts` (10 buổi/1.7tr, 20 buổi/3.2tr, 40 buổi/5.5tr; CS1 Kim Liên, CS2 Vĩnh Phúc; Chủ tài khoản: CÔNG TY CP CỜ VUA DƯƠNG SINH).
- Mỗi học viên tại một thời điểm chỉ có tối đa 1 cơ hội tái tục đang mở (`open`), không sinh deal rác.
- Cảnh báo ĐỎ khẩn cấp khi số buổi còn tồn $< 0$ (quá hạn).

## Review Focus

1. **Học sinh học quá buổi (số buổi âm như -27 buổi):** Hệ thống phải hiển thị nhãn cảnh báo Đỏ khẩn cấp và không cho phép điểm danh âm nếu chưa đối soát.
2. **Ngăn chặn trùng lặp deal tái tục (Deduplication):** Khi học viên từ 2 buổi xuống 1 buổi rồi 0 buổi, hệ thống cập nhật thẻ cơ hội hiện có chứ không tạo mới thêm thẻ rác.
3. **Phụ huynh chuyển khoản sai cú pháp hoặc tiền mặt:** Hệ thống phải giữ nút duyệt tay (Manual Override) an toàn bên cạnh Webhook tự động.
4. **Đồng bộ 2 chiều an toàn với NocoEdu:** Khi deal chuyển `won`, hệ thống phải kiểm tra xem học viên/phụ huynh đã tồn tại bên NocoEdu chưa để tránh tạo trùng bản ghi.
5. **Render phiếu đối soát client-side siêu tốc:** Đảm bảo không phụ thuộc thư viện nặng như Puppeteer trên máy chủ, nhân viên bấm xem là copy ảnh/tin nhắn Zalo trong 3 giây.

---

### Task 1: Schema & Data Model for Trial & Renewal Pipeline

**Files:**
- Create: `database/main/migrations/202611220001_crm_chess_renewals.ts`
- Test: `tests/database/migrations/crm-chess-renewals.test.ts`

**Interfaces:**
- Produces: 
  - `crmOpportunities` fields: `pipelineType` ('tuition' | 'renewal'), `sessionsRemaining` (int, nullable), `totalAttended` (int, defaultValue 0), `lastAttendedAt` (datetimeTz), `attendanceDates` (json), `paymentCode` (string unique), `paymentStatus` ('pending' | 'paid' | 'partial'), `secureToken` (string unique).
  - `crmStudents` fields: `sessionsRemaining` (int, defaultValue 0), `totalAttended` (int, defaultValue 0), `lastAttendedAt` (datetimeTz), `attendanceDates` (json).

- [ ] **Step 1: Write the failing migration test**

```typescript
// tests/database/migrations/crm-chess-renewals.test.ts
import { describe, it, expect } from 'vitest';
import { getTestDatabase } from '../../helpers/database';

describe('202611220001_crm_chess_renewals migration', () => {
  it('adds renewal fields and paymentCode to crmOpportunities and crmStudents', async () => {
    const db = await getTestDatabase();
    const oppFields = await db.getCollection('crmOpportunities').getFields();
    expect(oppFields.map(f => f.name)).toContain('sessionsRemaining');
    expect(oppFields.map(f => f.name)).toContain('paymentCode');
    expect(oppFields.map(f => f.name)).toContain('secureToken');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/database/migrations/crm-chess-renewals.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement migration `202611220001_crm_chess_renewals.ts`**

Define migration `up` and `down` using `@nocobase/db` `defineMigration` to alter `crmOpportunities` and `crmStudents`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/database/migrations/crm-chess-renewals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/main/migrations/202611220001_crm_chess_renewals.ts tests/database/migrations/crm-chess-renewals.test.ts
git commit -m "feat(database): add renewal pipeline and payment fields migration"
```

---

### Task 2: Service Đồng Bộ 2 Chiều Giữa NocoCRM và NocoEdu

**Files:**
- Create: `server/providers/crm/sync-edu.ts`
- Test: `tests/server/crm-sync-edu.test.ts`

**Interfaces:**
- Consumes: `crm_students`, `crm_contacts`, `crm_opportunities`, NocoEdu tables (`dsc_hoc_vien`, `dsc_phu_huynh`, `dsc_hoc_vien_phu_huynh`, `dsc_diem_danh` / `dsc_so_du`).
- Produces:
  - `syncStudentToEdu(studentId: string): Promise<{ eduStudentId: string, maHocVien: string }>`
  - `fetchStudentAttendanceFromEdu(studentId: string): Promise<{ sessionsRemaining: number, totalAttended: number, lastAttendedAt: string | null, attendanceDates: string[] }>`

- [ ] **Step 1: Write the failing test for Edu synchronization service**

```typescript
// tests/server/crm-sync-edu.test.ts
import { describe, it, expect } from 'vitest';
import { syncStudentToEdu, fetchStudentAttendanceFromEdu } from '../../../server/providers/crm/sync-edu';

describe('sync-edu service', () => {
  it('syncs student to NocoEdu and creates parent-student link', async () => {
    // test fixture
  });

  it('calculates remaining sessions and retrieves attendance history from NocoEdu', async () => {
    // test fixture
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/server/crm-sync-edu.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `server/providers/crm/sync-edu.ts`**

Implement `syncStudentToEdu` and `fetchStudentAttendanceFromEdu` querying student records, generating `ma_hoc_vien` (`HVxxxxx`), syncing parent contacts and reading attendance logs.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/server/crm-sync-edu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/providers/crm/sync-edu.ts tests/server/crm-sync-edu.test.ts
git commit -m "feat(server): implement NocoEdu synchronization service"
```

---

### Task 3: Worker Tự Động Quét & Tạo Cơ Hội Tái Tục (Renewal Scanner)

**Files:**
- Create: `server/providers/crm/renewal-scanner.ts`
- Test: `tests/server/crm-renewal-scanner.test.ts`

**Interfaces:**
- Consumes: `fetchStudentAttendanceFromEdu`, `crmStudents`, `crmOpportunities`.
- Produces:
  - `scanAndGenerateRenewals(): Promise<{ createdCount: number, updatedCount: number, criticalCount: number }>`
  - Deduplication rule: If an open renewal opportunity already exists for `studentId`, update its `sessionsRemaining` and `attendanceDates` without creating a duplicate.

- [ ] **Step 1: Write the failing test for renewal scanner**

```typescript
// tests/server/crm-renewal-scanner.test.ts
import { describe, it, expect } from 'vitest';
import { scanAndGenerateRenewals } from '../../../server/providers/crm/renewal-scanner';

describe('renewal-scanner', () => {
  it('creates a renewal opportunity when sessionsRemaining <= 2', async () => {
    // fixture: student with 2 sessions remaining
  });

  it('flags critical alert when sessionsRemaining < 0 (overdue)', async () => {
    // fixture: student with -5 sessions remaining
  });

  it('updates existing open renewal opportunity instead of duplicating', async () => {
    // fixture: call scanner twice
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/server/crm-renewal-scanner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `server/providers/crm/renewal-scanner.ts`**

Scan active students, check attendance balances, create/update `crmOpportunities` with `pipelineType: 'renewal'` and generate unique `paymentCode` and `secureToken`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/server/crm-renewal-scanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/providers/crm/renewal-scanner.ts tests/server/crm-renewal-scanner.test.ts
git commit -m "feat(server): implement renewal scanner with deduplication and critical alert"
```

---

### Task 4: Webhook Thanh Toán Ngân Hàng Tự Động (Auto Payment Webhook)

**Files:**
- Create: `server/routes/payments/webhook.ts`
- Test: `tests/server/crm-payment-webhook.test.ts`

**Interfaces:**
- Consumes: Webhook payload (`{ gateway, transactionDate, accountNumber, amount, content, referenceCode }`).
- Produces:
  - `POST /api/payments/webhook` endpoint with API signature / secret validation.
  - Automatically matches `paymentCode` in `content`, moves target opportunity to `stage: 'won'`, updates `paymentStatus: 'paid'`, and triggers NocoEdu sync.

- [ ] **Step 1: Write failing test for payment webhook**

```typescript
// tests/server/crm-payment-webhook.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('POST /api/payments/webhook', () => {
  it('marks opportunity won and paid when transfer content matches paymentCode and full amount', async () => {
    // test fixture
  });

  it('rejects invalid signature or missing secret header', async () => {
    // test fixture
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/server/crm-payment-webhook.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `server/routes/payments/webhook.ts`**

Validate webhook secret, extract `paymentCode`, find opportunity, verify amount $\ge$ package fee, update opportunity to `stage: 'won'`, record timeline note, and call `syncStudentToEdu`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/server/crm-payment-webhook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/payments/webhook.ts tests/server/crm-payment-webhook.test.ts
git commit -m "feat(api): implement bank payment webhook with auto-reconciliation"
```

---

### Task 5: Component Sinh Phiếu Đối Soát Học Phí & VietQR Động

**Files:**
- Create: `client/components/crm/TuitionNoticeCard.tsx`
- Create: `client/pages/tuition-notice-view.tsx`
- Test: `tests/components/crm-tuition-notice.test.tsx`

**Interfaces:**
- Consumes: Opportunity/Student details (`studentName`, `branch`, `sessionsRemaining`, `attendanceDates`, `tuitionPackage`, `paymentCode`).
- Produces:
  - Visual HTML card displaying student name, branch, session history table, status badge (Còn buổi / Quá buổi màu đỏ), package pricing, and dynamic VietQR image with `CÔNG TY CP CỜ VUA DƯƠNG SINH`.
  - Export action: `exportCardAsImage()` converting card element to PNG for quick clipboard copy.
  - Public view page at `/view/notice/:secureToken`.

- [ ] **Step 1: Write failing component test**

```typescript
// tests/components/crm-tuition-notice.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TuitionNoticeCard } from '../../../client/components/crm/TuitionNoticeCard';

describe('TuitionNoticeCard', () => {
  it('renders student attendance dates, remaining balance, and VietQR code', () => {
    render(<TuitionNoticeCard studentName="Lê Phương Huyền Anh" sessionsRemaining={-27} attendanceDates={['2026-07-07', '2026-07-11']} />);
    expect(screen.getByText(/Quá buổi/i)).toBeInTheDocument();
    expect(screen.getByText(/-27/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/crm-tuition-notice.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `TuitionNoticeCard.tsx` and `tuition-notice-view.tsx`**

Style with Tailwind CSS, display attendance dates grid, remaining sessions, package recommendations (10/20/40), and dynamic VietQR URL (`https://img.vietqr.io/image/...`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/crm-tuition-notice.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/components/crm/TuitionNoticeCard.tsx client/pages/tuition-notice-view.tsx tests/components/crm-tuition-notice.test.tsx
git commit -m "feat(ui): add tuition notice card with attendance history and VietQR"
```

---

### Task 6: Tính Năng 1-Chạm Zalo Quick Share & Email Thông Báo

**Files:**
- Create: `client/hooks/useZaloQuickShare.ts`
- Create: `server/providers/crm/tuition-mail.ts`
- Test: `tests/components/crm-zalo-share.test.tsx`
- Test: `tests/server/crm-tuition-mail.test.ts`

**Interfaces:**
- Produces:
  - `useZaloQuickShare(opportunity)`: Copies personalized message and notice card image to clipboard, then opens `https://zalo.me/[phone]`.
  - `sendTuitionNoticeEmail(opportunityId: string)`: Sends responsive HTML email with attendance summary and payment notice to parent.

- [ ] **Step 1: Write failing tests for Zalo share hook and tuition email**

```typescript
// tests/components/crm-zalo-share.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZaloQuickShare } from '../../../client/hooks/useZaloQuickShare';

describe('useZaloQuickShare', () => {
  it('formats personalized message and opens zalo.me link', async () => {
    // mock clipboard & window.open
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/crm-zalo-share.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `useZaloQuickShare.ts` and `tuition-mail.ts`**

Implement clipboard copy with text template, canvas image copy fallback, `window.open('https://zalo.me/' + cleanPhone)`, and HTML email template using NocoCRM Mail service.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/crm-zalo-share.test.tsx tests/server/crm-tuition-mail.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/hooks/useZaloQuickShare.ts server/providers/crm/tuition-mail.ts tests/components/crm-zalo-share.test.tsx tests/server/crm-tuition-mail.test.ts
git commit -m "feat(client): implement 1-click Zalo quick share and email notifications"
```

---

### Task 7: Tích Hợp UI Phễu Tuyển Sinh & Tái Tục Trên Giao Diện CRM

**Files:**
- Modify: `client/pages/crm-list.tsx`
- Modify: `client/pages/crm-detail.tsx`
- Test: `tests/components/crm-renewal-kanban.test.tsx`

**Interfaces:**
- Consumes: Task 1-6 components and services.
- Produces:
  - Kanban view switcher: "Phễu Tuyển sinh" vs "Phễu Tái tục & Quản lý Học phí".
  - Hiển thị badge số buổi còn tồn và cảnh báo đỏ (`Quá buổi`) trên thẻ cơ hội.
  - Các nút tác vụ nhanh: [Gửi Zalo], [Xuất Phiếu Báo], [Xác Nhận Nộp Phí Thủ Công].

- [ ] **Step 1: Write failing Kanban integration test**

```typescript
// tests/components/crm-renewal-kanban.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// test fixture for crm list with renewal pipeline filter
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/crm-renewal-kanban.test.tsx`
Expected: FAIL

- [ ] **Step 3: Integrate pipeline switcher and action buttons into `crm-list.tsx` and `crm-detail.tsx`**

Add pipeline selector, render renewal stages (`pending_notice`, `notice_sent`, `awaiting_payment`, `won`, `lost`), bind Zalo Quick Share and manual payment confirmation dialog.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/crm-renewal-kanban.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/pages/crm-list.tsx client/pages/crm-detail.tsx tests/components/crm-renewal-kanban.test.tsx
git commit -m "feat(ui): integrate trial and renewal pipelines with quick action buttons"
```

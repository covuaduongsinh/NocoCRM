// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildTuitionNoticeEmailHtml } from '../../server/providers/crm/tuition-mail.js';

describe('Tuition Notice Email Generator', () => {
  it('generates rich HTML email containing student info, branch, attendance dates and VietQR', () => {
    const html = buildTuitionNoticeEmailHtml({
      studentName: 'Lê Phương Huyền Anh',
      branch: 'cs1',
      sessionsRemaining: -27,
      totalAttended: 27,
      attendanceDates: ['2026-07-07', '2026-07-11'],
      paymentCode: 'DSC-HP-123456',
      amount: 3200000,
    });

    expect(html).toContain('Lê Phương Huyền Anh');
    expect(html).toContain('Cơ sở 1 - Kim Liên');
    expect(html).toContain('Quá buổi (-27)');
    expect(html).toContain('2026-07-07');
    expect(html).toContain('DSC-HP-123456');
    expect(html).toContain('https://img.vietqr.io/image/');
  });
});

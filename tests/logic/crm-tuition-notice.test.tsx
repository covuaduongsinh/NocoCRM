// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { TuitionNoticeCard, generateVietQrUrl } from '../../client/components/crm/TuitionNoticeCard.js';

describe('TuitionNoticeCard Component Logic', () => {
  it('renders student name, branch, remaining sessions and overdue alert badge', () => {
    const html = renderToStaticMarkup(
      <TuitionNoticeCard
        studentName="Lê Phương Huyền Anh"
        branch="cs1"
        sessionsRemaining={-27}
        totalAttended={27}
        attendanceDates={['2026-07-07', '2026-07-11', '2026-07-14']}
        tuitionPackage="course20"
        paymentCode="DSC-HP-123456"
      />
    );

    expect(html).toContain('Lê Phương Huyền Anh');
    expect(html).toContain('Cơ sở 1 - Kim Liên');
    expect(html).toContain('Quá buổi (-27)');
    expect(html).toContain('2026-07-07');
    expect(html).toContain('DSC-HP-123456');
  });

  it('renders positive remaining sessions correctly', () => {
    const html = renderToStaticMarkup(
      <TuitionNoticeCard
        studentName="Nguyễn Minh Khang"
        branch="cs2"
        sessionsRemaining={2}
        totalAttended={18}
        attendanceDates={['2026-10-01', '2026-10-05']}
        tuitionPackage="course20"
        paymentCode="DSC-HP-889900"
      />
    );

    expect(html).toContain('Nguyễn Minh Khang');
    expect(html).toContain('Cơ sở 2 - Vĩnh Phúc');
    expect(html).toContain('Còn 2 buổi');
    expect(html).toContain('Đã học: 18 buổi');
  });

  it('generates correct VietQR URL with account and paymentCode', () => {
    const qrUrl = generateVietQrUrl({
      bankBin: '970422', // MBBank
      accountNumber: '1122334455',
      accountName: 'CONG TY CP CO VUA DUONG SINH',
      amount: 3200000,
      paymentCode: 'DSC-HP-889900',
    });

    expect(qrUrl).toContain('https://img.vietqr.io/image/970422-1122334455-compact2.png');
    expect(qrUrl).toContain('amount=3200000');
    expect(qrUrl).toContain('addInfo=DSC-HP-889900');
    expect(qrUrl).toContain('accountName=CONG%20TY%20CP%20CO%20VUA%20DUONG%20SINH');
  });
});

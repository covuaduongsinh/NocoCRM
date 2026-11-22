// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  formatZaloTuitionMessage,
  buildZaloChatUrl,
} from '../../client/hooks/useZaloQuickShare.js';

describe('Zalo Quick Share Logic', () => {
  it('generates clean zalo.me link by normalizing phone digits', () => {
    expect(buildZaloChatUrl('0912.345.678')).toBe('https://zalo.me/0912345678');
    expect(buildZaloChatUrl('+84 988 123 456')).toBe('https://zalo.me/84988123456');
  });

  it('formats personalized message for normal remaining sessions', () => {
    const msg = formatZaloTuitionMessage({
      studentName: 'Lê Phương Huyền Anh',
      branch: 'cs1',
      sessionsRemaining: 2,
      totalAttended: 18,
      paymentCode: 'DSC-HP-123456',
    });

    expect(msg).toContain('Lê Phương Huyền Anh');
    expect(msg).toContain('Cơ sở 1 - Kim Liên');
    expect(msg).toContain('Còn 2 buổi');
    expect(msg).toContain('DSC-HP-123456');
  });

  it('formats personalized message for overdue critical sessions', () => {
    const msg = formatZaloTuitionMessage({
      studentName: 'Lê Phương Huyền Anh',
      branch: 'cs1',
      sessionsRemaining: -27,
      totalAttended: 27,
      paymentCode: 'DSC-HP-998877',
    });

    expect(msg).toContain('Quá buổi (-27)');
    expect(msg).toContain('đã học lố');
  });
});

// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { crmViVN } from '../../client/locales/crm/vi-VN.js';
import { crmEn } from '../../client/locales/crm/index.js';

describe('Renewal Pipeline Locales & Configuration', () => {
  it('defines renewal in both default and Vietnamese locales', () => {
    expect((crmViVN.options as any).renewal).toBe('Chăm sóc Tái tục / Gia hạn');
    expect((crmEn.options as any).renewal).toBe('Renewal');
  });
});

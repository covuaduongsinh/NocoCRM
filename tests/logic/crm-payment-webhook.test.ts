// @vitest-environment node

import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { handlePaymentWebhook } from '../../server/routes/payments/webhook.js';

describe('Bank Payment Webhook Handler', () => {
  function setupCrmDb() {
    const crmDb = new Database(':memory:');
    crmDb.exec(`
      CREATE TABLE crm_opportunities (
        id TEXT PRIMARY KEY,
        name TEXT,
        pipeline_type TEXT,
        stage TEXT,
        payment_code TEXT,
        payment_status TEXT,
        amount REAL,
        updated_at TEXT
      );
    `);
    return crmDb;
  }

  it('rejects unauthorized requests with invalid secret', async () => {
    const crmDb = setupCrmDb();
    const result = await handlePaymentWebhook({
      payload: { amount: 1700000, content: 'DSC-HP-123456' },
      secretHeader: 'wrong-secret',
      expectedSecret: 'correct-secret',
      crmDb,
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Unauthorized/i);
  });

  it('matches paymentCode in transaction content and marks opportunity won and paid', async () => {
    const crmDb = setupCrmDb();
    crmDb.prepare(`
      INSERT INTO crm_opportunities (id, name, pipeline_type, stage, payment_code, payment_status, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('opp-1', 'Tái tục - Huyền Anh', 'renewal', 'pending_notice', 'DSC-HP-889900', 'pending', 3200000);

    const result = await handlePaymentWebhook({
      payload: {
        gateway: 'MBBank',
        transactionDate: '2026-11-22 09:30:00',
        accountNumber: '0912345678',
        amount: 3200000,
        content: 'ME HUYEN ANH CHUYEN KHOAN HOC PHI DSC-HP-889900 CS1',
        referenceCode: 'FT261122999',
      },
      secretHeader: 'correct-secret',
      expectedSecret: 'correct-secret',
      crmDb,
    });

    expect(result.success).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.opportunityId).toBe('opp-1');

    const updated = crmDb.prepare('SELECT * FROM crm_opportunities WHERE id = ?').get('opp-1') as any;
    expect(updated.stage).toBe('won');
    expect(updated.payment_status).toBe('paid');
  });

  it('handles payment content with lowercase or spacing variants cleanly', async () => {
    const crmDb = setupCrmDb();
    crmDb.prepare(`
      INSERT INTO crm_opportunities (id, name, pipeline_type, stage, payment_code, payment_status, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('opp-2', 'Tuyển sinh - Minh Khang', 'tuition', 'proposal', 'DSC-HP-554433', 'pending', 1700000);

    const result = await handlePaymentWebhook({
      payload: {
        amount: 1700000,
        content: 'Nop hoc phi cho con dsc-hp-554433',
      },
      secretHeader: 'valid',
      expectedSecret: 'valid',
      crmDb,
    });

    expect(result.success).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.opportunityId).toBe('opp-2');
  });
});

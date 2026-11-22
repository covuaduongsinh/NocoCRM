export interface PaymentWebhookPayload {
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  amount: number;
  content: string;
  referenceCode?: string;
}

export interface PaymentWebhookOptions {
  payload: PaymentWebhookPayload;
  secretHeader?: string | null;
  expectedSecret?: string | null;
  crmDb: any;
}

export interface PaymentWebhookResult {
  success: boolean;
  matched: boolean;
  opportunityId?: string;
  message?: string;
}

/**
 * Extract DSC-HP payment code from transaction content string.
 * Supports patterns like "DSC-HP-123456", "dsc-hp-889900", "DSC HP 123456".
 */
export function extractPaymentCode(content?: string | null): string | null {
  if (!content) return null;
  const match = content.match(/DSC[-_\s]?HP[-_\s]?(\d{5,8})/i);
  if (match) {
    return `DSC-HP-${match[1]}`;
  }
  return null;
}

export async function handlePaymentWebhook({
  payload,
  secretHeader,
  expectedSecret,
  crmDb,
}: PaymentWebhookOptions): Promise<PaymentWebhookResult> {
  // 1. Verify Secret
  if (expectedSecret && secretHeader !== expectedSecret) {
    return {
      success: false,
      matched: false,
      message: 'Unauthorized: Invalid webhook secret',
    };
  }

  // 2. Extract payment code
  const paymentCode = extractPaymentCode(payload.content);
  if (!paymentCode) {
    return {
      success: true,
      matched: false,
      message: 'No matching payment code in transaction content',
    };
  }

  // 3. Find matching opportunity
  let opp: any;
  if (typeof crmDb?.prepare === 'function') {
    opp = crmDb.prepare(`
      SELECT id, name, stage, payment_status, amount
      FROM crm_opportunities
      WHERE UPPER(payment_code) = UPPER(?)
      LIMIT 1
    `).get(paymentCode);
  } else if (typeof crmDb?.query === 'function') {
    opp = await crmDb.query()
      .selectFrom('crm_opportunities')
      .select(['id', 'name', 'stage', 'payment_status', 'amount'])
      .where((eb: any) => eb('payment_code', 'like', paymentCode))
      .executeTakeFirst();
  }

  if (!opp) {
    return {
      success: true,
      matched: false,
      message: `Opportunity with code ${paymentCode} not found`,
    };
  }

  // 4. Update Opportunity to WON and PAID
  const nowStr = new Date().toISOString();
  if (typeof crmDb?.prepare === 'function') {
    crmDb.prepare(`
      UPDATE crm_opportunities
      SET stage = 'won',
          payment_status = 'paid',
          updated_at = ?
      WHERE id = ?
    `).run(nowStr, opp.id);
  } else if (typeof crmDb?.query === 'function') {
    await crmDb.query()
      .updateTable('crm_opportunities')
      .set({
        stage: 'won',
        payment_status: 'paid',
        updated_at: nowStr,
      })
      .where('id', '=', opp.id)
      .execute();
  }

  return {
    success: true,
    matched: true,
    opportunityId: opp.id,
    message: `Payment matched and opportunity ${opp.id} marked as won`,
  };
}

import type { Application } from '@nocobase/app-server/application';
import {
  defineApiRoutes,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import { Hono } from 'hono';

export const paymentWebhookRoutes: AppApiRouteContribution<Application> =
  defineApiRoutes((app) => {
    const router = new Hono();
    router.post('/payments/webhook', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const secretHeader =
        c.req.header('x-webhook-secret') ||
        c.req.header('authorization') ||
        c.req.header('x-api-key');
      const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      const db = app.container.resolve(databaseManagerToken);

      const items = Array.isArray(body?.data) ? body.data : [body];
      const results: PaymentWebhookResult[] = [];

      for (const item of items) {
        const payload: PaymentWebhookPayload = {
          gateway: item.gateway,
          transactionDate: item.transactionDate || item.when,
          accountNumber: item.accountNumber || item.subAccId,
          amount: Number(item.amount ?? item.transferAmount ?? 0),
          content: String(item.content ?? item.description ?? ''),
          referenceCode: item.referenceCode ?? item.tid,
        };

        const res = await handlePaymentWebhook({
          payload,
          secretHeader,
          expectedSecret,
          crmDb: db,
        });
        results.push(res);
      }

      const anySuccess = results.some((r) => r.success);
      return c.json(
        { data: results.length === 1 ? results[0] : results },
        anySuccess ? 200 : 400,
      );
    });
    return router;
  });


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
  const opp = crmDb.prepare(`
    SELECT id, name, stage, payment_status, amount
    FROM crm_opportunities
    WHERE UPPER(payment_code) = UPPER(?)
    LIMIT 1
  `).get(paymentCode);

  if (!opp) {
    return {
      success: true,
      matched: false,
      message: `Opportunity with code ${paymentCode} not found`,
    };
  }

  // 4. Update Opportunity to WON and PAID
  const nowStr = new Date().toISOString();
  crmDb.prepare(`
    UPDATE crm_opportunities
    SET stage = 'won',
        payment_status = 'paid',
        updated_at = ?
    WHERE id = ?
  `).run(nowStr, opp.id);

  return {
    success: true,
    matched: true,
    opportunityId: opp.id,
    message: `Payment matched and opportunity ${opp.id} marked as won`,
  };
}

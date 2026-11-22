// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202611220001_crm_chess_renewals.js';

it('adds renewal tracking and payment fields to crmOpportunities and crmStudents', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    await builder.createCollection('crmOpportunities', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
      c.string('pipelineType').nullable();
    });
    await builder.createCollection('crmStudents', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
    });

    const context = {
      database: isolated,
      builder,
      query: isolated.query(),
    } as any;

    await migration.up(context);

    const oppCols = await isolated.query().selectFrom('crmOpportunities').selectAll().execute();
    expect(oppCols).toBeDefined();

    // Verify fields can be inserted
    await isolated.query().insertInto('crmOpportunities').values({
      id: 'opp-1',
      name: 'Renewal test',
      pipelineType: 'renewal',
      sessionsRemaining: 2,
      totalAttended: 18,
      paymentCode: 'DSC-12345',
      paymentStatus: 'pending',
      secureToken: 'token-abc',
    }).execute();

    const insertedOpp = await isolated.query().selectFrom('crmOpportunities').selectAll().where('id', '=', 'opp-1').executeTakeFirst();
    expect((insertedOpp as any).sessionsRemaining).toBe(2);
    expect((insertedOpp as any).paymentCode).toBe('DSC-12345');

    // Down reverse
    await migration.down?.(context);
  } finally {
    await test.destroy();
  }
});

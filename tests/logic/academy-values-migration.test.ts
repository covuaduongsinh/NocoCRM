// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202611190001_crm_academy_values.js';

// The Lark Base import's own values written over with the CRM's
// (database/main/migrations/202611190001_crm_academy_values.ts): a won
// stage, a lead being worked, a branch's code and what a tuition deal sold;
// down puts the import's back on the records the import created.
it("writes the CRM's values over the import's, and puts them back", async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    // The tables as they stood before, with the columns this reads.
    await builder.createCollection('crmOpportunities', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
      c.string('stage');
      c.string('pipelineType').nullable();
      c.string('businessType').nullable();
      c.string('preferredBranch').nullable();
    });
    for (const table of ['crmLeads', 'crmContacts'])
      await builder.createCollection(table, (c) => {
        c.string('id', { length: 36 });
        c.primary('id');
        c.string('name');
        c.string('status').nullable();
        c.string('preferredBranch').nullable();
      });
    const query = isolated.query();
    const deal = (
      id: string,
      name: string,
      values: Record<string, unknown> = {},
    ) => ({
      id,
      name,
      stage: 'closed_won',
      pipelineType: 'tuition',
      businessType: null,
      preferredBranch: 'Kim Liên',
      ...values,
    });
    await query
      .insertInto('crmOpportunities')
      .values([
        deal('opp-rec10', 'Học phí khóa 10 buổi (aaa)'),
        deal('opp-rec20', 'Học phí khóa 20 buổi (bbb)'),
        deal('opp-rec40', 'Học phí khóa 40 buổi (ccc)', {
          preferredBranch: 'Vĩnh Phúc',
        }),
        deal('opp-rec24', 'Học phí khóa 24 buổi (ddd)'),
        // Made in the CRM: its own values, and a type someone chose.
        deal('made-here', 'Học phí cờ vua - An', {
          stage: 'won',
          businessType: 'course1on1',
          preferredBranch: 'cs2',
        }),
        // A deal of another business keeps having no type.
        deal('opp-recschool', 'Học phí khóa 10 buổi (eee)', {
          pipelineType: 'b2b_school',
        }),
      ])
      .execute();
    await query
      .insertInto('crmLeads')
      .values([
        {
          id: 'lead-rec1',
          name: 'chị Hiền',
          status: 'Đang chăm sóc',
          preferredBranch: 'Vĩnh Phúc',
        },
        { id: 'made-lead', name: 'anh Nam', status: 'working' },
      ])
      .execute();
    await query
      .insertInto('crmContacts')
      .values({
        id: 'contact-rec1',
        name: 'Phạm Thúy Quỳnh',
        preferredBranch: 'Kim Liên',
      })
      .execute();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    const deals = async (): Promise<Record<string, unknown>> =>
      Object.fromEntries(
        (
          await query
            .selectFrom('crmOpportunities')
            .select(['id', 'stage', 'businessType', 'preferredBranch'])
            .execute()
        ).map(({ id, ...rest }) => [id, rest]),
      );
    const leads = async (): Promise<Record<string, unknown>> =>
      Object.fromEntries(
        (
          await query
            .selectFrom('crmLeads')
            .select(['id', 'status', 'preferredBranch'])
            .execute()
        ).map(({ id, ...rest }) => [id, rest]),
      );
    const contactBranch = async (): Promise<unknown> =>
      (
        await query
          .selectFrom('crmContacts')
          .select('preferredBranch')
          .where('id', '=', 'contact-rec1')
          .executeTakeFirstOrThrow()
      ).preferredBranch;
    const before = { deals: await deals(), leads: await leads() };

    await migration.up(context);
    expect(await deals()).toEqual({
      'opp-rec10': {
        stage: 'won',
        businessType: 'course10',
        preferredBranch: 'cs1',
      },
      'opp-rec20': {
        stage: 'won',
        businessType: 'course20',
        preferredBranch: 'cs1',
      },
      'opp-rec40': {
        stage: 'won',
        businessType: 'course40',
        preferredBranch: 'cs2',
      },
      // Any other number of sessions is a course of another length.
      'opp-rec24': {
        stage: 'won',
        businessType: 'chessCourse',
        preferredBranch: 'cs1',
      },
      'made-here': {
        stage: 'won',
        businessType: 'course1on1',
        preferredBranch: 'cs2',
      },
      'opp-recschool': {
        stage: 'won',
        businessType: null,
        preferredBranch: 'cs1',
      },
    });
    expect(await leads()).toEqual({
      'lead-rec1': { status: 'working', preferredBranch: 'cs2' },
      'made-lead': { status: 'working', preferredBranch: null },
    });
    expect(await contactBranch()).toBe('cs1');

    // Once written, a second run changes nothing.
    const after = { deals: await deals(), leads: await leads() };
    await migration.up(context);
    expect({ deals: await deals(), leads: await leads() }).toEqual(after);

    // Down: the import's records as the import wrote them, the CRM's own
    // left as they are.
    await migration.down?.(context);
    expect(await deals()).toEqual(before.deals);
    expect(await leads()).toEqual(before.leads);
    expect(await contactBranch()).toBe('Kim Liên');
  } finally {
    await test.destroy();
  }
});

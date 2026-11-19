import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The records the Lark Base import wrote (seed
// 202611050002_import_lark_crm_data) hold values of their own where the CRM
// has fixed ones, so its boards, filters and reports miss them: a won deal's
// stage as `closed_won`, a lead being worked as its Vietnamese words, and a
// branch by its name rather than its code. This writes the CRM's values over
// them, on any record that holds one, and names what each imported tuition
// deal sold: the fee notice's packages of 10, 20 and 40 sessions, and
// `chessCourse` for any other number.
//
// The values are spelled out here as they stood when this ran, so a later
// change to the options does not change what this did. `updatedAt` is left
// alone: nothing about the customer changed, and the student synchronizer
// (scripts/nococrm-sync-students.js) reads it to find what to send again.
//
// Down puts the import's values back on the records the import created,
// which their ids name (`opp-rec…`, `lead-rec…`, `contact-rec…`): a record
// made in the CRM never held them.

const BRANCHES: readonly [string, string][] = [
  ['Kim Liên', 'cs1'],
  ['Vĩnh Phúc', 'cs2'],
];
const BRANCH_TABLES: readonly [string, string][] = [
  ['crmLeads', 'lead-rec%'],
  ['crmContacts', 'contact-rec%'],
  ['crmOpportunities', 'opp-rec%'],
];
// The import named a tuition deal "Học phí khóa <n> buổi (<id>)".
const PACKAGES: readonly [string, string][] = [
  ['Học phí khóa 10 buổi%', 'course10'],
  ['Học phí khóa 20 buổi%', 'course20'],
  ['Học phí khóa 40 buổi%', 'course40'],
];
const OTHER_LENGTH = 'chessCourse';

const migration: MigrationDefinition = defineMigration({
  name: '202611190001_crm_academy_values',
  async up({ query }: MigrationContext): Promise<void> {
    await query
      .updateTable('crmOpportunities')
      .set({ stage: 'won' })
      .where('stage', '=', 'closed_won')
      .execute();
    await query
      .updateTable('crmLeads')
      .set({ status: 'working' })
      .where('status', '=', 'Đang chăm sóc')
      .execute();
    for (const [table] of BRANCH_TABLES)
      for (const [name, code] of BRANCHES)
        await query
          .updateTable(table)
          .set({ preferredBranch: code })
          .where('preferredBranch', '=', name)
          .execute();
    for (const [name, businessType] of PACKAGES)
      await query
        .updateTable('crmOpportunities')
        .set({ businessType })
        .where('businessType', 'is', null)
        .where('pipelineType', '=', 'tuition')
        .where('name', 'like', name)
        .execute();
    await query
      .updateTable('crmOpportunities')
      .set({ businessType: OTHER_LENGTH })
      .where('businessType', 'is', null)
      .where('pipelineType', '=', 'tuition')
      .where('name', 'like', 'Học phí khóa % buổi%')
      .execute();
  },

  async down({ query }: MigrationContext): Promise<void> {
    await query
      .updateTable('crmOpportunities')
      .set({ businessType: null })
      .where('id', 'like', 'opp-rec%')
      .where('businessType', 'in', [
        ...PACKAGES.map(([, businessType]) => businessType),
        OTHER_LENGTH,
      ])
      .execute();
    for (const [table, imported] of BRANCH_TABLES)
      for (const [name, code] of BRANCHES)
        await query
          .updateTable(table)
          .set({ preferredBranch: name })
          .where('id', 'like', imported)
          .where('preferredBranch', '=', code)
          .execute();
    await query
      .updateTable('crmLeads')
      .set({ status: 'Đang chăm sóc' })
      .where('id', 'like', 'lead-rec%')
      .where('status', '=', 'working')
      .execute();
    await query
      .updateTable('crmOpportunities')
      .set({ stage: 'closed_won' })
      .where('id', 'like', 'opp-rec%')
      .where('stage', '=', 'won')
      .execute();
  },
});

export default migration;

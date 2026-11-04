import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

/**
 * B2C Chess Academy Fields Extension for Duong Sinh Chess Academy.
 * - Extends crmLeads with preferredBranch, trialDate, trialNotes.
 * - Extends crmContacts with studentName, studentBirthYear, chessLevel, preferredBranch, trialNotes.
 * - Extends crmOpportunities with preferredBranch.
 */
const migration: MigrationDefinition = defineMigration({
  name: '202611040001_crm_chess_b2c_fields',
  async up({ builder }: MigrationContext): Promise<void> {
    // 1. Extend crmLeads for B2C chess academy enrollment
    await builder.alterCollection('crmLeads', (c) => {
      c.string('preferredBranch', { length: 32 }).nullable();
      c.datetimeTz('trialDate').nullable();
      c.text('trialNotes').nullable();
    });

    // 2. Extend crmContacts for parent & child chess profiles
    await builder.alterCollection('crmContacts', (c) => {
      c.string('studentName').nullable();
      c.string('studentBirthYear', { length: 10 }).nullable();
      c.string('chessLevel', { length: 64 }).nullable();
      c.string('preferredBranch', { length: 32 }).nullable();
      c.text('trialNotes').nullable();
    });

    // 3. Extend crmOpportunities for preferred branch
    await builder.alterCollection('crmOpportunities', (c) => {
      c.string('preferredBranch', { length: 32 }).nullable();
    });
  },

  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmOpportunities', (c) => {
      c.dropField('preferredBranch');
    });

    await builder.alterCollection('crmContacts', (c) => {
      c.dropField('trialNotes');
      c.dropField('preferredBranch');
      c.dropField('chessLevel');
      c.dropField('studentBirthYear');
      c.dropField('studentName');
    });

    await builder.alterCollection('crmLeads', (c) => {
      c.dropField('trialNotes');
      c.dropField('trialDate');
      c.dropField('preferredBranch');
    });
  },
});

export default migration;

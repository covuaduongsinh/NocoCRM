import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

/**
 * Renewal Pipeline & Automated Payment Reconciliation Extension.
 * - Extends crmOpportunities with sessionsRemaining, totalAttended, lastAttendedAt, attendanceDates, paymentCode, paymentStatus, secureToken.
 * - Extends crmStudents with sessionsRemaining, totalAttended, lastAttendedAt, attendanceDates.
 */
const migration: MigrationDefinition = defineMigration({
  name: '202611220001_crm_chess_renewals',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmOpportunities', (c) => {
      c.integer('sessionsRemaining').nullable();
      c.integer('totalAttended', { defaultValue: 0 });
      c.datetimeTz('lastAttendedAt').nullable();
      c.json('attendanceDates').nullable();
      c.string('paymentCode', { length: 64 }).nullable();
      c.index('paymentCode');
      c.string('paymentStatus', { length: 32, defaultValue: 'pending' });
      c.string('secureToken', { length: 64 }).nullable();
      c.index('secureToken');
    });

    await builder.alterCollection('crmStudents', (c) => {
      c.integer('sessionsRemaining', { defaultValue: 0 });
      c.integer('totalAttended', { defaultValue: 0 });
      c.datetimeTz('lastAttendedAt').nullable();
      c.json('attendanceDates').nullable();
    });
  },

  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmStudents', (c) => {
      c.dropField('attendanceDates');
      c.dropField('lastAttendedAt');
      c.dropField('totalAttended');
      c.dropField('sessionsRemaining');
    });

    await builder.alterCollection('crmOpportunities', (c) => {
      c.dropField('secureToken');
      c.dropField('paymentStatus');
      c.dropField('paymentCode');
      c.dropField('attendanceDates');
      c.dropField('lastAttendedAt');
      c.dropField('totalAttended');
      c.dropField('sessionsRemaining');
    });
  },
});

export default migration;

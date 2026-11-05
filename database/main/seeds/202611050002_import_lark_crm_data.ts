import { defineSeed, type SeedDefinition } from '@nocobase/db';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function batchInsert(query: any, table: string, items: any[], chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await query.insertInto(table).values(chunk).execute();
  }
}

const seed: SeedDefinition = defineSeed({
  name: '202611050002_import_lark_crm_data',
  transaction: true,
  async run({ query }) {
    const dataPath = join(__dirname, 'data', 'lark_crm_full.json');
    if (!existsSync(dataPath)) {
      console.warn(`[Seed NocoCRM] Data file not found at ${dataPath}. Skipping.`);
      return;
    }

    const rawData = JSON.parse(readFileSync(dataPath, 'utf8'));
    const now = new Date();

    console.log(`[Seed NocoCRM] Starting full data import from LarkBase to NocoCRM...`);

    // 1. Company (Default B2C Individual Company)
    const existingAcc = await (query as any).selectFrom('crmCompanies').where('id', '=', rawData.account.id).select('id').executeTakeFirst();
    if (!existingAcc) {
      console.log(`[Seed NocoCRM] Inserting default B2C company...`);
      await (query as any).insertInto('crmCompanies').values({
        ...rawData.account,
        status: 'customer',
        createdAt: now,
        updatedAt: now,
      }).execute();
    }

    // 2. Contacts (Parents)
    const existingContact = await (query as any).selectFrom('crmContacts').where('id', '=', rawData.contacts[0]?.id).select('id').executeTakeFirst();
    if (!existingContact) {
      console.log(`[Seed NocoCRM] Inserting ${rawData.contacts.length} parent contacts...`);
      const contacts = rawData.contacts.map((c: any) => ({
        id: c.id,
        name: c.name,
        companyId: c.accountId,
        ownerId: c.ownerId,
        createdById: c.createdById,
        phone: c.phone,
        email: c.email,
        customerType: c.customerType || 'individual',
        preferredBranch: c.preferredBranch,
        studentName: c.studentName,
        trialNotes: c.notes,
        employed: true,
        primary: false,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      await batchInsert(query, 'crmContacts', contacts, 50);
    } else {
      console.log(`[Seed NocoCRM] Contacts already imported, skipping.`);
    }

    // 3. Students
    const existingStudent = await (query as any).selectFrom('crmStudents').where('id', '=', rawData.students[0]?.id).select('id').executeTakeFirst();
    if (!existingStudent) {
      console.log(`[Seed NocoCRM] Inserting ${rawData.students.length} students profile...`);
      const students = rawData.students.map((st: any) => ({
        id: st.id,
        name: st.name,
        contactId: st.contactId,
        ownerId: st.ownerId,
        createdById: st.createdById,
        gender: st.gender,
        birthDate: st.birthDate ? new Date(st.birthDate) : null,
        chessLevel: st.chessLevel,
        active: true,
        notes: st.notes,
        createdAt: now,
        updatedAt: now,
      }));
      await batchInsert(query, 'crmStudents', students, 100);
    } else {
      console.log(`[Seed NocoCRM] Students already imported, skipping.`);
    }

    // 4. Leads (Trial lesson & Prospective)
    const existingLead = await (query as any).selectFrom('crmLeads').where('id', '=', rawData.leads[0]?.id).select('id').executeTakeFirst();
    if (!existingLead) {
      console.log(`[Seed NocoCRM] Inserting ${rawData.leads.length} leads...`);
      const leads = rawData.leads.map((ld: any) => ({
        id: ld.id,
        name: ld.name,
        ownerId: ld.ownerId,
        createdById: ld.createdById,
        status: ld.status || 'Đang chăm sóc',
        source: ld.source || 'LarkBase',
        phone: ld.phone,
        customerType: ld.customerType || 'individual',
        studentName: ld.studentName,
        preferredBranch: ld.preferredBranch,
        trialDate: ld.trialDate ? new Date(ld.trialDate) : null,
        trialNotes: ld.trialNotes,
        description: ld.description,
        createdAt: now,
        updatedAt: now,
      }));
      await batchInsert(query, 'crmLeads', leads, 50);
    } else {
      console.log(`[Seed NocoCRM] Leads already imported, skipping.`);
    }

    // 5. Products (37 Sách & Bộ cờ Dương Sinh)
    const existingProduct = await (query as any).selectFrom('crmProducts').where('id', '=', rawData.products[0]?.id).select('id').executeTakeFirst();
    if (!existingProduct) {
      console.log(`[Seed NocoCRM] Inserting ${rawData.products.length} products (books & equipment)...`);
      const products = rawData.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category,
        price: p.price,
        currency: p.currency,
        stock: p.stock,
        description: p.description,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      await batchInsert(query, 'crmProducts', products, 50);
    } else {
      console.log(`[Seed NocoCRM] Products already imported, skipping.`);
    }

    // 6. Opportunities (Tuition Fees)
    const existingOpp = await (query as any).selectFrom('crmOpportunities').where('id', '=', rawData.opportunities[0]?.id).select('id').executeTakeFirst();
    if (!existingOpp) {
      console.log(`[Seed NocoCRM] Inserting ${rawData.opportunities.length} opportunities (tuition fee deals)...`);
      const opportunities = rawData.opportunities.map((op: any) => ({
        id: op.id,
        name: op.name,
        companyId: op.accountId,
        ownerId: op.ownerId,
        createdById: op.createdById,
        stage: op.stage,
        amount: op.amount,
        currency: op.currency,
        source: op.source,
        pipelineType: op.pipelineType,
        preferredBranch: op.preferredBranch,
        contacts: op.contacts,
        closedAt: new Date(op.closedAt),
        createdAt: new Date(op.createdAt),
        updatedAt: now,
      }));
      await batchInsert(query, 'crmOpportunities', opportunities, 100);
    } else {
      console.log(`[Seed NocoCRM] Opportunities already imported, skipping.`);
    }

    console.log(`[Seed NocoCRM] Complete! Successfully imported full LarkBase data to NocoCRM.`);
  },
});

export default seed;

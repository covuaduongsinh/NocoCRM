// @vitest-environment node

import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { scanAndGenerateRenewals } from '../../server/providers/crm/renewal-scanner.js';

describe('Renewal Scanner & Deduplication Worker', () => {
  function setupDatabases() {
    const crmDb = new Database(':memory:');
    const eduDb = new Database(':memory:');

    crmDb.exec(`
      CREATE TABLE crm_students (
        id TEXT PRIMARY KEY,
        name TEXT,
        contact_id TEXT,
        nocobase_student_id TEXT,
        sessions_remaining INTEGER DEFAULT 0,
        total_attended INTEGER DEFAULT 0,
        last_attended_at TEXT,
        attendance_dates TEXT,
        owner_id TEXT DEFAULT 'admin',
        active INTEGER DEFAULT 1
      );
      CREATE TABLE crm_opportunities (
        id TEXT PRIMARY KEY,
        name TEXT,
        pipeline_type TEXT,
        stage TEXT,
        contacts TEXT,
        sessions_remaining INTEGER,
        total_attended INTEGER,
        last_attended_at TEXT,
        attendance_dates TEXT,
        payment_code TEXT,
        payment_status TEXT,
        secure_token TEXT,
        owner_id TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    eduDb.exec(`
      CREATE TABLE dsc_hoc_vien (
        id TEXT PRIMARY KEY,
        ma_hoc_vien TEXT,
        ho_ten TEXT
      );
      CREATE TABLE dsc_goi_hoc (
        id TEXT PRIMARY KEY,
        dscHocVienId TEXT,
        so_buoi INTEGER
      );
      CREATE TABLE dsc_diem_danh (
        id TEXT PRIMARY KEY,
        dscHocVienId TEXT,
        ngay_hoc TEXT,
        trang_thai TEXT
      );
    `);

    return { crmDb, eduDb };
  }

  it('creates a renewal opportunity when student has <= 2 sessions remaining', async () => {
    const { crmDb, eduDb } = setupDatabases();

    crmDb.prepare(`
      INSERT INTO crm_students (id, name, contact_id, nocobase_student_id, active)
      VALUES (?, ?, ?, ?, 1)
    `).run('s1', 'Học viên A', 'c1', 'edu-1');

    eduDb.prepare('INSERT INTO dsc_hoc_vien VALUES (?, ?, ?)').run('edu-1', 'HV00001', 'Học viên A');
    eduDb.prepare('INSERT INTO dsc_goi_hoc VALUES (?, ?, ?)').run('g1', 'edu-1', 10);
    // 9 sessions attended -> 1 remaining
    for (let i = 1; i <= 9; i++) {
      eduDb.prepare('INSERT INTO dsc_diem_danh VALUES (?, ?, ?, ?)').run(`dd-${i}`, 'edu-1', `2026-10-0${i}`, 'co_mat');
    }

    const result = await scanAndGenerateRenewals({ crmDb, eduDb });
    expect(result.createdCount).toBe(1);
    expect(result.criticalCount).toBe(0);

    const opp = crmDb.prepare("SELECT * FROM crm_opportunities WHERE pipeline_type = 'renewal'").get() as any;
    expect(opp).toBeDefined();
    expect(opp.name).toContain('Tái tục');
    expect(opp.name).toContain('Học viên A');
    expect(opp.sessions_remaining).toBe(1);
    expect(opp.payment_code).toMatch(/^DSC-HP-/);
    expect(opp.secure_token).toBeDefined();
  });

  it('flags critical alert when student has < 0 sessions (quá buổi)', async () => {
    const { crmDb, eduDb } = setupDatabases();

    crmDb.prepare(`
      INSERT INTO crm_students (id, name, contact_id, nocobase_student_id, active)
      VALUES (?, ?, ?, ?, 1)
    `).run('s2', 'Lê Phương Huyền Anh', 'c2', 'edu-2');

    eduDb.prepare('INSERT INTO dsc_hoc_vien VALUES (?, ?, ?)').run('edu-2', 'HV00002', 'Lê Phương Huyền Anh');
    eduDb.prepare('INSERT INTO dsc_goi_hoc VALUES (?, ?, ?)').run('g2', 'edu-2', 10);
    // 12 sessions attended -> -2 remaining
    for (let i = 1; i <= 12; i++) {
      eduDb.prepare('INSERT INTO dsc_diem_danh VALUES (?, ?, ?, ?)').run(`dd-${i}`, 'edu-2', `2026-10-${i < 10 ? '0' + i : i}`, 'co_mat');
    }

    const result = await scanAndGenerateRenewals({ crmDb, eduDb });
    expect(result.createdCount).toBe(1);
    expect(result.criticalCount).toBe(1);

    const opp = crmDb.prepare("SELECT * FROM crm_opportunities WHERE pipeline_type = 'renewal'").get() as any;
    expect(opp.sessions_remaining).toBe(-2);
  });

  it('updates existing open renewal opportunity instead of duplicating', async () => {
    const { crmDb, eduDb } = setupDatabases();

    crmDb.prepare(`
      INSERT INTO crm_students (id, name, contact_id, nocobase_student_id, active)
      VALUES (?, ?, ?, ?, 1)
    `).run('s1', 'Học viên A', 'c1', 'edu-1');

    eduDb.prepare('INSERT INTO dsc_hoc_vien VALUES (?, ?, ?)').run('edu-1', 'HV00001', 'Học viên A');
    eduDb.prepare('INSERT INTO dsc_goi_hoc VALUES (?, ?, ?)').run('g1', 'edu-1', 10);
    // 8 sessions attended -> 2 remaining
    for (let i = 1; i <= 8; i++) {
      eduDb.prepare('INSERT INTO dsc_diem_danh VALUES (?, ?, ?, ?)').run(`dd-${i}`, 'edu-1', `2026-10-0${i}`, 'co_mat');
    }

    const run1 = await scanAndGenerateRenewals({ crmDb, eduDb });
    expect(run1.createdCount).toBe(1);

    // Another session attended -> 1 remaining
    eduDb.prepare('INSERT INTO dsc_diem_danh VALUES (?, ?, ?, ?)').run('dd-9', 'edu-1', '2026-10-09', 'co_mat');

    const run2 = await scanAndGenerateRenewals({ crmDb, eduDb });
    expect(run2.createdCount).toBe(0);
    expect(run2.updatedCount).toBe(1);

    const allOpps = crmDb.prepare("SELECT * FROM crm_opportunities WHERE pipeline_type = 'renewal'").all();
    expect(allOpps.length).toBe(1);
    expect((allOpps[0] as any).sessions_remaining).toBe(1);
  });
});

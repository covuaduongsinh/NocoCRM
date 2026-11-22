// @vitest-environment node

import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import {
  syncStudentToEdu,
  fetchStudentAttendanceFromEdu,
  getNextStudentCode,
} from '../../server/providers/crm/sync-edu.js';

describe('NocoCRM to NocoEdu Synchronization Service', () => {
  it('generates sequential student code HVxxxxx', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE dsc_hoc_vien (
        id TEXT PRIMARY KEY,
        ma_hoc_vien TEXT
      );
    `);

    expect(getNextStudentCode(db)).toBe('HV00001');

    db.prepare('INSERT INTO dsc_hoc_vien (id, ma_hoc_vien) VALUES (?, ?)').run('1', 'HV00015');
    expect(getNextStudentCode(db)).toBe('HV00016');
  });

  it('syncs student and parent into NocoEdu tables without duplicating', async () => {
    const eduDb = new Database(':memory:');
    eduDb.exec(`
      CREATE TABLE dsc_phu_huynh (
        id TEXT PRIMARY KEY,
        ho_ten TEXT,
        dien_thoai TEXT,
        email TEXT,
        ghi_chu TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE dsc_hoc_vien (
        id TEXT PRIMARY KEY,
        ma_hoc_vien TEXT,
        ho_ten TEXT,
        ngay_sinh TEXT,
        gioi_tinh TEXT,
        truong TEXT,
        lop_o_truong TEXT,
        trang_thai TEXT,
        ngay_nhap_hoc TEXT,
        elo INTEGER,
        ghi_chu TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE dsc_hoc_vien_phu_huynh (
        dscHocVienId TEXT,
        dscPhuHuynhId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

    const res = await syncStudentToEdu({
      eduDb,
      student: {
        id: 'crm-s1',
        name: 'Lê Phương Huyền Anh',
        gender: 'nu',
        birthDate: '2018-05-10',
        school: 'Tiểu học Kim Liên',
        grade: '2A',
        ratingElo: 1100,
      },
      parent: {
        name: 'Mẹ Huyền Anh',
        phone: '0912345678',
        email: 'me.huyenanh@gmail.com',
      },
    });

    expect(res.maHocVien).toBe('HV00001');
    expect(res.eduStudentId).toBeDefined();

    // Verify parent created
    const parent = eduDb.prepare('SELECT * FROM dsc_phu_huynh WHERE dien_thoai = ?').get('0912345678') as any;
    expect(parent).toBeDefined();
    expect(parent.ho_ten).toBe('Mẹ Huyền Anh');

    // Verify student created
    const student = eduDb.prepare('SELECT * FROM dsc_hoc_vien WHERE id = ?').get(res.eduStudentId) as any;
    expect(student.ho_ten).toBe('Lê Phương Huyền Anh');
    expect(student.elo).toBe(1100);

    // Verify link created
    const link = eduDb.prepare('SELECT * FROM dsc_hoc_vien_phu_huynh WHERE dscHocVienId = ? AND dscPhuHuynhId = ?').get(res.eduStudentId, parent.id);
    expect(link).toBeDefined();
  });

  it('fetches student attendance and remaining balance calculation correctly', async () => {
    const eduDb = new Database(':memory:');
    eduDb.exec(`
      CREATE TABLE dsc_hoc_vien (
        id TEXT PRIMARY KEY,
        ma_hoc_vien TEXT,
        ho_ten TEXT
      );
      CREATE TABLE dsc_diem_danh (
        id TEXT PRIMARY KEY,
        dscHocVienId TEXT,
        ngay_hoc TEXT,
        trang_thai TEXT
      );
      CREATE TABLE dsc_goi_hoc (
        id TEXT PRIMARY KEY,
        dscHocVienId TEXT,
        so_buoi INTEGER
      );
    `);

    eduDb.prepare('INSERT INTO dsc_hoc_vien VALUES (?, ?, ?)').run('hv1', 'HV00001', 'Lê Phương Huyền Anh');
    eduDb.prepare('INSERT INTO dsc_goi_hoc VALUES (?, ?, ?)').run('g1', 'hv1', 20);

    const dates = [
      '2026-06-02', '2026-06-16', '2026-06-18', '2026-06-20',
      '2026-06-23', '2026-06-25', '2026-06-27', '2026-06-30', '2026-07-02'
    ];
    for (let i = 0; i < dates.length; i++) {
      eduDb.prepare('INSERT INTO dsc_diem_danh VALUES (?, ?, ?, ?)').run(`dd-${i}`, 'hv1', dates[i], 'co_mat');
    }

    const attendance = await fetchStudentAttendanceFromEdu({
      eduDb,
      eduStudentId: 'hv1',
    });

    expect(attendance.totalAttended).toBe(9);
    expect(attendance.sessionsRemaining).toBe(11); // 20 - 9 = 11
    expect(attendance.lastAttendedAt).toBe('2026-07-02');
    expect(attendance.attendanceDates).toEqual(dates);
  });
});

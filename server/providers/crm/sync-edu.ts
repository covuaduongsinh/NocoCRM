import crypto from 'node:crypto';

export interface StudentInput {
  id?: string;
  name: string;
  gender?: string | null;
  birthDate?: string | null;
  school?: string | null;
  grade?: string | null;
  chessLevel?: string | null;
  ratingElo?: number | null;
  notes?: string | null;
}

export interface ParentInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface SyncOptions {
  eduDb: any;
  student: StudentInput;
  parent?: ParentInput | null;
}

export interface AttendanceResult {
  sessionsRemaining: number;
  totalAttended: number;
  lastAttendedAt: string | null;
  attendanceDates: string[];
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, '');
}

export function normalizeGender(gender?: string | null): string | null {
  if (!gender) return null;
  const g = gender.toString().toLowerCase();
  if (g === 'male' || g === 'nam' || g === 'boy') return 'nam';
  if (g === 'female' || g === 'nu' || g === 'nữ' || g === 'girl') return 'nu';
  return null;
}

export function getNextStudentCode(eduDb: any): string {
  const row = eduDb.prepare(
    "SELECT ma_hoc_vien FROM dsc_hoc_vien WHERE ma_hoc_vien LIKE 'HV%' ORDER BY length(ma_hoc_vien) DESC, ma_hoc_vien DESC LIMIT 1"
  ).get();

  let nextNum = 1;
  if (row && row.ma_hoc_vien) {
    const m = row.ma_hoc_vien.match(/HV(\d+)/);
    if (m) {
      nextNum = parseInt(m[1], 10) + 1;
    }
  }
  return `HV${String(nextNum).padStart(5, '0')}`;
}

export async function syncStudentToEdu({
  eduDb,
  student,
  parent,
}: SyncOptions): Promise<{ eduStudentId: string; maHocVien: string }> {
  const nowStr = new Date().toISOString();
  const todayStr = nowStr.substring(0, 10);

  let parentId: string | null = null;

  // 1. Check or create Parent
  if (parent && (parent.name || parent.phone)) {
    const cleanPhone = normalizePhone(parent.phone);
    let existingParent: any = null;

    if (cleanPhone) {
      existingParent = eduDb.prepare('SELECT id FROM dsc_phu_huynh WHERE dien_thoai = ?').get(cleanPhone);
    }
    if (!existingParent && parent.name) {
      existingParent = eduDb.prepare('SELECT id FROM dsc_phu_huynh WHERE ho_ten = ?').get(parent.name.trim());
    }

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      parentId = crypto.randomUUID();
      eduDb.prepare(`
        INSERT INTO dsc_phu_huynh (id, ho_ten, dien_thoai, email, ghi_chu, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'Đồng bộ từ NocoCRM', ?, ?)
      `).run(
        parentId,
        parent.name ? parent.name.trim() : 'Phụ huynh ' + student.name,
        cleanPhone,
        parent.email || null,
        nowStr,
        nowStr
      );
    }
  }

  // 2. Check or create Student
  let existingStudent: any = eduDb.prepare('SELECT id, ma_hoc_vien FROM dsc_hoc_vien WHERE ho_ten = ?').get(student.name.trim());

  let eduStudentId: string;
  let maHocVien: string;

  const gender = normalizeGender(student.gender);
  const birthDate = student.birthDate ? student.birthDate.substring(0, 10) : null;
  const elo = student.ratingElo ? parseInt(String(student.ratingElo), 10) : 0;

  if (existingStudent) {
    eduStudentId = existingStudent.id;
    maHocVien = existingStudent.ma_hoc_vien;
    eduDb.prepare(`
      UPDATE dsc_hoc_vien
      SET truong = COALESCE(?, truong),
          lop_o_truong = COALESCE(?, lop_o_truong),
          elo = CASE WHEN ? > 0 THEN ? ELSE elo END,
          updatedAt = ?
      WHERE id = ?
    `).run(student.school || null, student.grade || null, elo, elo, nowStr, eduStudentId);
  } else {
    eduStudentId = crypto.randomUUID();
    maHocVien = getNextStudentCode(eduDb);

    eduDb.prepare(`
      INSERT INTO dsc_hoc_vien (
        id, ma_hoc_vien, ho_ten, ngay_sinh, gioi_tinh, truong, lop_o_truong,
        trang_thai, ngay_nhap_hoc, elo, ghi_chu, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'dang_hoc', ?, ?, 'Đồng bộ từ NocoCRM', ?, ?)
    `).run(
      eduStudentId,
      maHocVien,
      student.name.trim(),
      birthDate,
      gender,
      student.school || null,
      student.grade || null,
      todayStr,
      elo,
      nowStr,
      nowStr
    );
  }

  // 3. Link Student and Parent
  if (parentId && eduStudentId) {
    const existingLink = eduDb.prepare(
      'SELECT 1 FROM dsc_hoc_vien_phu_huynh WHERE dscHocVienId = ? AND dscPhuHuynhId = ?'
    ).get(eduStudentId, parentId);

    if (!existingLink) {
      eduDb.prepare(`
        INSERT INTO dsc_hoc_vien_phu_huynh (dscHocVienId, dscPhuHuynhId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?)
      `).run(eduStudentId, parentId, nowStr, nowStr);
    }
  }

  return { eduStudentId, maHocVien };
}

export async function fetchStudentAttendanceFromEdu({
  eduDb,
  eduStudentId,
}: {
  eduDb: any;
  eduStudentId: string;
}): Promise<AttendanceResult> {
  // Query total package sessions
  let totalSessions = 0;
  try {
    const packageRows = eduDb.prepare(
      'SELECT so_buoi FROM dsc_goi_hoc WHERE dscHocVienId = ?'
    ).all(eduStudentId);
    for (const row of packageRows) {
      if (row.so_buoi) {
        totalSessions += parseInt(row.so_buoi, 10);
      }
    }
  } catch (_) {
    // If table doesn't exist, default to 0
  }

  // Query attendance records
  let attendanceDates: string[] = [];
  try {
    const attendanceRows = eduDb.prepare(
      "SELECT ngay_hoc FROM dsc_diem_danh WHERE dscHocVienId = ? AND trang_thai IN ('co_mat', 'muon', 'present') ORDER BY ngay_hoc ASC"
    ).all(eduStudentId);
    attendanceDates = attendanceRows.map((r: any) => r.ngay_hoc);
  } catch (_) {
    // If table doesn't exist, default to empty
  }

  const totalAttended = attendanceDates.length;
  const sessionsRemaining = totalSessions - totalAttended;
  const lastAttendedAt = attendanceDates.length > 0 ? attendanceDates[attendanceDates.length - 1] : null;

  return {
    sessionsRemaining,
    totalAttended,
    lastAttendedAt,
    attendanceDates,
  };
}

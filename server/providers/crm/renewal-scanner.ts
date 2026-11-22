import crypto from 'node:crypto';
import { fetchStudentAttendanceFromEdu } from './sync-edu.js';

export interface ScanOptions {
  crmDb: any;
  eduDb: any;
}

export interface ScanResult {
  createdCount: number;
  updatedCount: number;
  criticalCount: number;
}

export async function scanAndGenerateRenewals({
  crmDb,
  eduDb,
}: ScanOptions): Promise<ScanResult> {
  const students = crmDb.prepare(`
    SELECT id, name, contact_id, nocobase_student_id, owner_id
    FROM crm_students
    WHERE active = 1 AND nocobase_student_id IS NOT NULL
  `).all();

  let createdCount = 0;
  let updatedCount = 0;
  let criticalCount = 0;
  const nowStr = new Date().toISOString();

  for (const student of students) {
    try {
      const attendance = await fetchStudentAttendanceFromEdu({
        eduDb,
        eduStudentId: student.nocobase_student_id,
      });

      const datesJson = JSON.stringify(attendance.attendanceDates || []);

      // 1. Update crm_students summary
      crmDb.prepare(`
        UPDATE crm_students
        SET sessions_remaining = ?,
            total_attended = ?,
            last_attended_at = ?,
            attendance_dates = ?
        WHERE id = ?
      `).run(
        attendance.sessionsRemaining,
        attendance.totalAttended,
        attendance.lastAttendedAt,
        datesJson,
        student.id
      );

      // 2. Check if renewal trigger is hit (<= 2 sessions remaining or negative)
      if (attendance.sessionsRemaining <= 2) {
        if (attendance.sessionsRemaining < 0) {
          criticalCount++;
        }

        // Check for existing open renewal opportunity
        const studentContactPattern = `%"${student.contact_id}"%`;
        const studentContactPlain = student.contact_id ? `%${student.contact_id}%` : '';

        const existingOpp = crmDb.prepare(`
          SELECT id, stage FROM crm_opportunities
          WHERE pipeline_type = 'renewal'
            AND stage NOT IN ('won', 'lost', 'closed_won', 'closed_lost')
            AND (name LIKE ? OR (contacts IS NOT NULL AND contacts LIKE ?))
          LIMIT 1
        `).get(`%${student.name.trim()}%`, studentContactPlain);

        if (existingOpp) {
          crmDb.prepare(`
            UPDATE crm_opportunities
            SET sessions_remaining = ?,
                total_attended = ?,
                last_attended_at = ?,
                attendance_dates = ?,
                updated_at = ?
            WHERE id = ?
          `).run(
            attendance.sessionsRemaining,
            attendance.totalAttended,
            attendance.lastAttendedAt,
            datesJson,
            nowStr,
            existingOpp.id
          );
          updatedCount++;
        } else {
          const oppId = crypto.randomUUID();
          const randomDigits = Math.floor(100000 + Math.random() * 900000);
          const paymentCode = `DSC-HP-${randomDigits}`;
          const secureToken = crypto.randomBytes(16).toString('hex');
          const contactsJson = student.contact_id ? JSON.stringify([student.contact_id]) : null;
          const stage = attendance.sessionsRemaining < 0 ? 'critical_overdue' : 'pending_notice';
          const ownerId = student.owner_id || 'admin';

          crmDb.prepare(`
            INSERT INTO crm_opportunities (
              id, name, pipeline_type, stage, contacts,
              sessions_remaining, total_attended, last_attended_at, attendance_dates,
              payment_code, payment_status, secure_token, owner_id, created_at, updated_at
            )
            VALUES (?, ?, 'renewal', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
          `).run(
            oppId,
            `Tái tục học phí - ${student.name.trim()}`,
            stage,
            contactsJson,
            attendance.sessionsRemaining,
            attendance.totalAttended,
            attendance.lastAttendedAt,
            datesJson,
            paymentCode,
            secureToken,
            ownerId,
            nowStr,
            nowStr
          );
          createdCount++;
        }
      }
    } catch (err: any) {
      console.error(`Error scanning student ${student.name}:`, err.message);
    }
  }

  return { createdCount, updatedCount, criticalCount };
}

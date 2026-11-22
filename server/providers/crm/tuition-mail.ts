import { generateVietQrUrl } from '../../../client/components/crm/TuitionNoticeCard.js';

export interface TuitionEmailOptions {
  studentName: string;
  branch?: string | null;
  sessionsRemaining: number;
  totalAttended?: number;
  attendanceDates?: string[] | null;
  tuitionPackage?: string | null;
  paymentCode?: string | null;
  amount?: number | null;
}

export function buildTuitionNoticeEmailHtml({
  studentName,
  branch = 'cs1',
  sessionsRemaining,
  totalAttended = 0,
  attendanceDates = [],
  tuitionPackage = 'course20',
  paymentCode = 'DSC-HP-000000',
  amount = 3200000,
}: TuitionEmailOptions): string {
  const branchName = branch === 'cs2' ? 'Cơ sở 2 - Vĩnh Phúc' : 'Cơ sở 1 - Kim Liên';
  const branchAddress = branch === 'cs2' ? '16 phố Vĩnh Phúc, Ba Đình' : '22 ngõ 11 Lương Định Của, Đống Đa';
  const isOverdue = sessionsRemaining < 0;

  const statusBadge = isOverdue
    ? `<span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 13px;">⚠️ Quá buổi (${sessionsRemaining})</span>`
    : `<span style="background-color: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 13px;">✅ Còn ${sessionsRemaining} buổi</span>`;

  const datesList = (attendanceDates && attendanceDates.length > 0)
    ? attendanceDates.map(d => `<span style="display: inline-block; background: #ffffff; border: 1px solid #e5e7eb; padding: 4px 8px; margin: 3px; border-radius: 4px; font-size: 12px;">${d}</span>`).join('')
    : '<em>Chưa có dữ liệu ngày học</em>';

  const qrUrl = generateVietQrUrl({
    amount: amount || 3200000,
    paymentCode: paymentCode || 'DSC-HP-000000',
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1d4ed8, #3730a3); color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">CÔNG TY CỔ PHẦN CỜ VUA DƯƠNG SINH</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Phiếu Báo Học Phí & Lịch Sử Học Tập</p>
      </div>

      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Học viên</div>
              <div style="font-size: 18px; font-weight: bold; color: #111827; margin: 2px 0;">${studentName}</div>
              <div style="font-size: 13px; color: #4b5563;">${branchName} (${branchAddress})</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Tình trạng</div>
              ${statusBadge}
              <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Đã học: <strong>${totalAttended}</strong> buổi</div>
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: bold; color: #374151; margin-bottom: 8px;">Lịch sử ngày học đã tham gia:</div>
          <div style="background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6;">
            ${datesList}
          </div>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="font-size: 12px; font-weight: bold; color: #1d4ed8; text-transform: uppercase;">Gia hạn gói tiếp theo</div>
                <div style="font-size: 15px; font-weight: bold; color: #111827; margin: 4px 0;">Học phí: ${(amount || 3200000).toLocaleString('vi-VN')} đ</div>
                <div style="font-size: 13px; color: #4b5563;">Chủ TK: <strong>CÔNG TY CP CỜ VUA DƯƠNG SINH</strong></div>
                <div style="font-size: 13px; color: #4b5563;">Cú pháp CK: <strong style="color: #1d4ed8; font-family: monospace;">${paymentCode}</strong></div>
              </td>
              <td style="text-align: center; width: 130px; vertical-align: middle;">
                <img src="${qrUrl}" alt="VietQR" style="width: 110px; height: 110px; border-radius: 6px; border: 1px solid #d1d5db; background: #ffffff;" />
                <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Quét mã chuyển khoản</div>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
          Phụ huynh vui lòng quét mã VietQR trên hoặc chuyển khoản đúng cú pháp <strong>${paymentCode}</strong> để hệ thống tự động ghi nhận học phí và tiếp tục duy trì lịch học cho con.
        </p>
      </div>

      <div style="background: #f9fafb; border-top: 1px solid #f3f4f6; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
        Học viện Cờ vua Dương Sinh • Hotline: 0866.888.666 • www.covuaduongsinh.com
      </div>
    </div>
  `;
}

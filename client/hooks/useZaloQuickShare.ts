export interface ZaloMessageOptions {
  studentName: string;
  branch?: string | null;
  sessionsRemaining: number;
  totalAttended?: number;
  paymentCode?: string | null;
  packageDesc?: string;
  hotline?: string;
}

export function buildZaloChatUrl(phone?: string | null): string {
  if (!phone) return 'https://zalo.me';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://zalo.me/${cleanPhone}`;
}

export function formatZaloTuitionMessage({
  studentName,
  branch = 'cs1',
  sessionsRemaining,
  totalAttended = 0,
  paymentCode = 'DSC-HP-000000',
  packageDesc = 'Gói học 20 buổi (3.200.000đ - Tặng 1 bộ cờ)',
  hotline = '0866.888.666',
}: ZaloMessageOptions): string {
  const branchName = branch === 'cs2' ? 'Cơ sở 2 - Vĩnh Phúc' : 'Cơ sở 1 - Kim Liên';
  const isOverdue = sessionsRemaining < 0;

  const statusText = isOverdue
    ? `⚠️ Quá buổi (${sessionsRemaining}): Con đã học lố ${Math.abs(sessionsRemaining)} buổi so với số buổi đã đóng.`
    : `✅ Còn ${sessionsRemaining} buổi học trong gói hiện tại.`;

  return `Dạ em chào anh/chị phụ huynh bạn ${studentName}! ♟️

Học viện Cờ vua Dương Sinh xin phép gửi anh/chị bảng đối soát tình hình học tập và học phí của con:
📍 Cơ sở: ${branchName}
📊 Tổng số buổi đã tham gia: ${totalAttended} buổi
⏳ Tình trạng số buổi: ${statusText}

🎯 Đề xuất gói học kỳ tiếp theo: ${packageDesc}
💳 Chủ TK: CÔNG TY CP CỜ VUA DƯƠNG SINH
🔢 Cú pháp chuyển khoản: ${paymentCode}

Em gửi kèm hình ảnh phiếu đối soát chi tiết các ngày con có mặt tại lớp để anh/chị tiện theo dõi. 
Anh/chị cần hỗ trợ thêm thông tin vui lòng phản hồi hoặc liên hệ hotline ${hotline} ạ. Em cảm ơn anh/chị!`;
}

/**
 * Hook or helper to copy message and image to clipboard then open Zalo chat
 */
export async function copyNoticeAndOpenZalo({
  phone,
  message,
}: {
  phone?: string | null;
  message: string;
}) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(message);
    } catch (_) {
      // Fallback
    }
  }

  const url = buildZaloChatUrl(phone);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

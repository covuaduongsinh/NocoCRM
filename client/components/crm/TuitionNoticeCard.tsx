import React from 'react';
import { generateVietQrUrl, type VietQrOptions } from '../../../server/providers/crm/tuition.js';

export { generateVietQrUrl, type VietQrOptions };

export interface TuitionNoticeProps {
  studentName: string;
  branch?: string | null;
  sessionsRemaining: number;
  totalAttended?: number;
  attendanceDates?: string[] | null;
  tuitionPackage?: string | null;
  paymentCode?: string | null;
  amount?: number | null;
}

export function TuitionNoticeCard({
  studentName,
  branch = 'cs1',
  sessionsRemaining,
  totalAttended = 0,
  attendanceDates = [],
  tuitionPackage = 'course20',
  paymentCode = 'DSC-HP-000000',
  amount,
}: TuitionNoticeProps) {
  const branchName = branch === 'cs2' ? 'Cơ sở 2 - Vĩnh Phúc' : 'Cơ sở 1 - Kim Liên';
  const branchAddress = branch === 'cs2' ? '16 phố Vĩnh Phúc, Ba Đình' : '22 ngõ 11 Lương Định Của, Đống Đa';

  let packageFee = amount;
  let packageDesc = 'Gói học 20 buổi (3.200.000đ - Tặng 1 bộ cờ)';
  if (!packageFee) {
    if (tuitionPackage === 'course10') {
      packageFee = 1700000;
      packageDesc = 'Gói học 10 buổi (1.700.000đ)';
    } else if (tuitionPackage === 'course40') {
      packageFee = 5500000;
      packageDesc = 'Gói học 40 buổi (5.500.000đ - Miễn phí sách, tặng bộ domino cờ vua)';
    } else {
      packageFee = 3200000;
    }
  }

  const isOverdue = sessionsRemaining < 0;
  const qrUrl = generateVietQrUrl({
    amount: packageFee,
    paymentCode: paymentCode || 'DSC-HP-000000',
  });

  return (
    <div
      id="tuition-notice-card"
      className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden font-sans text-gray-800"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wide">Công ty Cổ phần Cờ vua Dương Sinh</h2>
        <p className="text-sm opacity-90 mt-1">Phiếu Báo Học Phí & Lịch Sử Học Tập</p>
      </div>

      {/* Student & Branch Info */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase">Học viên</span>
            <h3 className="text-xl font-bold text-gray-900">{studentName}</h3>
            <p className="text-sm text-gray-500">{branchName} ({branchAddress})</p>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400 font-semibold uppercase">Tình trạng số buổi</span>
            <div className="mt-1">
              {isOverdue ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  Quá buổi ({sessionsRemaining})
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  Còn {sessionsRemaining} buổi
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Đã học: {totalAttended} buổi</p>
          </div>
        </div>

        {/* Attendance Dates History */}
        {attendanceDates && attendanceDates.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Lịch sử các ngày học đã tham gia ({attendanceDates.length} buổi):
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center text-xs text-gray-700">
              {attendanceDates.map((date, idx) => (
                <div key={idx} className="bg-white py-1 px-1.5 rounded border border-gray-200 shadow-sm">
                  {date}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Renewal Package & QR */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <span className="text-xs font-semibold text-blue-700 uppercase">Gia hạn đợt tiếp theo</span>
            <p className="text-sm font-bold text-gray-900">{packageDesc}</p>
            <p className="text-xs text-gray-600">
              Chủ TK: <span className="font-semibold text-gray-800">CÔNG TY CP CỜ VUA DƯƠNG SINH</span>
            </p>
            <p className="text-xs text-gray-600">
              Nội dung CK: <span className="font-mono font-bold text-blue-700">{paymentCode}</span>
            </p>
          </div>

          <div className="text-center shrink-0">
            <img
              src={qrUrl}
              alt="Mã VietQR Chuyển Khoản"
              className="w-28 h-28 mx-auto rounded-lg border border-gray-300 bg-white p-1"
            />
            <span className="text-[10px] text-gray-500 block mt-1">Quét mã chuyển tiền nhanh</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-100 p-3 text-center text-xs text-gray-400">
        Hotline hỗ trợ: 0866.888.666 • www.covuaduongsinh.com
      </div>
    </div>
  );
}
export default TuitionNoticeCard;

import React, { useEffect, useState } from 'react';
import TuitionNoticeCard from '../components/crm/TuitionNoticeCard.js';

export default function TuitionNoticeView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, reads secureToken from URL params and fetches notice details
    const pathParts = window.location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];

    if (token) {
      fetch(`/api/public/tuitionNotice/${token}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData?.data) {
            setData(resData.data);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800">Không tìm thấy thông tin phiếu báo</h2>
          <p className="text-sm text-gray-500 mt-2">
            Liên kết có thể đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ hotline Cờ vua Dương Sinh để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <TuitionNoticeCard
        studentName={data.studentName}
        branch={data.branch}
        sessionsRemaining={data.sessionsRemaining}
        totalAttended={data.totalAttended}
        attendanceDates={data.attendanceDates}
        tuitionPackage={data.tuitionPackage}
        paymentCode={data.paymentCode}
        amount={data.amount}
      />
    </div>
  );
}

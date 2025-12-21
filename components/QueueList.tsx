'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Queue } from '@/lib/supabase';
import { getLiffProfile } from '@/lib/liff';
import * as XLSX from 'xlsx';

export default function QueueList() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');
  const [lineUserId, setLineUserId] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const profile = await getLiffProfile();
      if (profile) {
        setLineUserId(profile.userId);
      }
      fetchQueues();
    };

    init();
  }, [filter]);

  // Helper function to get current shift period (18:00 - 18:00 next day)
  const getShiftPeriod = () => {
    const now = new Date();
    const bangkokOffset = 7 * 60; // UTC+7
    const localOffset = now.getTimezoneOffset();
    const bangkokTime = new Date(now.getTime() + (bangkokOffset + localOffset) * 60 * 1000);
    
    const currentHour = bangkokTime.getHours();
    
    // If before 18:00, shift started yesterday at 18:00
    // If after 18:00, shift started today at 18:00
    const shiftStart = new Date(bangkokTime);
    if (currentHour < 18) {
      shiftStart.setDate(shiftStart.getDate() - 1);
    }
    shiftStart.setHours(18, 0, 0, 0);
    
    const shiftEnd = new Date(shiftStart);
    shiftEnd.setDate(shiftEnd.getDate() + 1);
    shiftEnd.setHours(17, 59, 59, 999);
    
    // Convert back to UTC for query
    const shiftStartUTC = new Date(shiftStart.getTime() - (bangkokOffset + localOffset) * 60 * 1000);
    const shiftEndUTC = new Date(shiftEnd.getTime() - (bangkokOffset + localOffset) * 60 * 1000);
    
    return { shiftStartUTC, shiftEndUTC };
  };

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      // Get current shift period (18:00 - 18:00 next day)
      const { shiftStartUTC, shiftEndUTC } = getShiftPeriod();

      let query = supabase
        .from('queues')
        .select('*')
        .gte('created_at', shiftStartUTC.toISOString())
        .lte('created_at', shiftEndUTC.toISOString())
        .order('created_at', { ascending: false });

      if (filter === 'mine') {
        const profile = await getLiffProfile();
        if (profile) {
          query = query.eq('line_user_id', profile.userId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setQueues(data || []);
    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'รอยืนยัน';
      case 'confirmed':
        return 'ยืนยันแล้ว';
      case 'in_progress':
        return 'กำลังดำเนินการ';
      case 'completed':
        return 'เสร็จสิ้น';
      case 'cancelled':
        return 'ยกเลิก';
      default:
        return status;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      // Get shift start time (18:00 yesterday or today)
      const now = new Date();
      const bangkokOffset = 7 * 60;
      const localOffset = now.getTimezoneOffset();
      const bangkokTime = new Date(now.getTime() + (bangkokOffset + localOffset) * 60 * 1000);
      
      const currentHour = bangkokTime.getHours();
      
      const shiftStart = new Date(bangkokTime);
      if (currentHour < 18) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      }
      shiftStart.setHours(18, 0, 0, 0);
      const shiftStartUTC = new Date(shiftStart.getTime() - (bangkokOffset + localOffset) * 60 * 1000);
      
      // End time is NOW
      const nowUTC = new Date();

      // Fetch data from shift start to now
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .gte('created_at', shiftStartUTC.toISOString())
        .lte('created_at', nowUTC.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('ไม่มีข้อมูลให้ export');
        return;
      }

      // Format data for Excel
      const excelData = data.map((queue, index) => ({
        'ลำดับ': index + 1,
        'หมายเลขคิว': queue.queue_number,
        'ชื่อ-นามสกุล': queue.driver_name,
        'ทะเบียนรถ': queue.vehicle_plate,
        'แหล่งพาหนะ': queue.carrier,
        'ช่วงเวลา': queue.time_slot === 'morning' ? 'เช้า' : queue.time_slot === 'afternoon' ? 'บ่าย' : '-',
        'ประเภทรถ': queue.truck_type === 'heavy' ? 'รถหนัก' : 'รถเบา',
        'ประเภทงาน': queue.job_type,
        'เที่ยวรับงาน': queue.trip_number || '-',
        'สถานะ': getStatusText(queue.status),
        'เวลาลงทะเบียน': formatDateTime(queue.created_at),
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // ลำดับ
        { wch: 18 },  // หมายเลขคิว
        { wch: 25 },  // ชื่อ-นามสกุล
        { wch: 20 },  // ทะเบียนรถ
        { wch: 25 },  // แหล่งพาหนะ
        { wch: 12 },  // ช่วงเวลา
        { wch: 12 },  // ประเภทรถ
        { wch: 20 },  // ประเภทงาน
        { wch: 15 },  // เที่ยวรับงาน
        { wch: 15 },  // สถานะ
        { wch: 25 },  // เวลาลงทะเบียน
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'คิวรถ');

      // Generate filename with timestamp
      const timestamp = bangkokTime.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/[/:]/g, '-').replace(/, /g, '_');
      
      const filename = `queue_export_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('เกิดข้อผิดพลาดในการ export');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('mine')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            filter === 'mine'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          คิวของฉัน
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          คิวทั้งหมด
        </button>
      </div>
      
      {/* Export Button - Full Width Below */}
      <button
        onClick={exportToExcel}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Excel
      </button>

      <div className="border-t pt-4"></div>

      {queues.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-4 text-gray-600">ไม่มีรายการคิว</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queues.map((queue) => (
            <div
              key={queue.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-indigo-600">{queue.queue_number}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(queue.created_at)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    queue.status
                  )}`}
                >
                  {getStatusText(queue.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">ชื่อ-นามสกุล:</span>
                  <p className="font-medium">{queue.driver_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">ทะเบียนรถ:</span>
                  <p className="font-medium">{queue.vehicle_plate}</p>
                </div>
                <div>
                  <span className="text-gray-600">แหละพาหะนะ:</span>
                  <p className="font-medium">{queue.carrier}</p>
                </div>
                <div>
                  <span className="text-gray-600">ช่วงเวลา:</span>
                  <p className="font-medium">
                    {queue.time_slot === 'morning' ? '🌅 เช้า' : queue.time_slot === 'afternoon' ? '🌇 บ่าย' : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">ประเภท:</span>
                  <p className="font-medium">
                    {queue.truck_type === 'heavy' ? '🚛 รถหนัก' : '🚗 รถเบา'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">งาน:</span>
                  <p className="font-medium">
                    {queue.job_type}
                    {queue.trip_number && ` (${queue.trip_number})`}
                  </p>
                </div>
              </div>

              {queue.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-sm">หมายเหตุ:</span>
                  <p className="text-sm mt-1">{queue.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

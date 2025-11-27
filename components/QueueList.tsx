'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Queue } from '@/lib/supabase';
import { getLiffProfile } from '@/lib/liff';

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

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('queues')
        .select('*')
        .order('scheduled_time', { ascending: true });

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
      <div className="flex gap-2 border-b pb-4">
        <button
          onClick={() => setFilter('mine')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'mine'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          คิวของฉัน
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          คิวทั้งหมด
        </button>
      </div>

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
                    {formatDateTime(queue.scheduled_time)}
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
                  <span className="text-gray-600">คนขับรถ:</span>
                  <p className="font-medium">{queue.driver_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">เบอร์โทร:</span>
                  <p className="font-medium">{queue.phone_number}</p>
                </div>
                <div>
                  <span className="text-gray-600">ทะเบียนรถ:</span>
                  <p className="font-medium">{queue.vehicle_plate}</p>
                </div>
                <div>
                  <span className="text-gray-600">บริษัท:</span>
                  <p className="font-medium">{queue.company}</p>
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

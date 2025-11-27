'use client';

import { useEffect, useState } from 'react';
import { initializeLiff, getLiffProfile } from '@/lib/liff';
import QueueRegistrationForm from '@/components/QueueRegistrationForm';
import QueueList from '@/components/QueueList';

export default function Home() {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');

  useEffect(() => {
    const initLiff = async () => {
      const success = await initializeLiff();
      if (success) {
        setIsLiffReady(true);
        const profile = await getLiffProfile();
        if (profile) {
          setUserName(profile.displayName);
        }
      }
    };

    initLiff();
  }, []);

  if (!isLiffReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังเชื่อมต่อ LINE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">ระบบลงทะเบียนคิวรับของ</h1>
            <p className="text-indigo-100">ยินดีต้อนรับ {userName || 'ผู้ใช้งาน'}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'register'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              ลงทะเบียนคิว
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'list'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              รายการคิว
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'register' ? <QueueRegistrationForm /> : <QueueList />}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>ระบบจัดการคิวโกดัง &copy; 2025</p>
        </div>
      </div>
    </div>
  );
}

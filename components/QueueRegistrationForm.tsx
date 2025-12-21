'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLiffProfile } from '@/lib/liff';
import { isWithinWarehouseArea } from '@/lib/geolocation';
import { BUILD_VERSION } from '@/lib/version';

export default function QueueRegistrationForm() {
  const [formData, setFormData] = useState({
    driverName: '',
    vehiclePlate: '',
    carrier: '',
    heavyTruckJob: '',
    heavyTruckTrip: '',
    lightTruckJob: '',
    timeSlot: '' as '' | 'morning' | 'afternoon',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<{ morning: boolean; afternoon: boolean }>({ morning: true, afternoon: true });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // ถ้าเลือกรถหนัก ให้เคลียร์รถเบา และในทางกลับกัน
    if (name === 'heavyTruckJob' && value) {
      setFormData({
        ...formData,
        [name]: value,
        lightTruckJob: '',
      });
    } else if (name === 'lightTruckJob' && value) {
      setFormData({
        ...formData,
        [name]: value,
        heavyTruckJob: '',
        heavyTruckTrip: '',
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time slot selection
    if (!formData.timeSlot) {
      setMessage({
        type: 'error',
        text: 'กรุณาเลือกช่วงเวลา (เช้า หรือ บ่าย)',
      });
      return;
    }

    // Validate job type selection
    if (!formData.heavyTruckJob && !formData.lightTruckJob) {
      setMessage({
        type: 'error',
        text: 'กรุณาเลือกประเภทงาน (รถหนัก หรือ รถเบา)',
      });
      return;
    }

    // Validate trip number if งาน FG is selected
    if (formData.heavyTruckJob === 'งาน FG' && !formData.heavyTruckTrip) {
      setMessage({
        type: 'error',
        text: 'กรุณาระบุเที่ยวรับงาน',
      });
      return;
    }

    setIsSubmitting(true);
    setIsCheckingLocation(true);
    setMessage(null);

    try {
      // Check location first
      const locationCheck = await isWithinWarehouseArea();

      // Get and display current location for debugging
      const { getCurrentLocation } = await import('@/lib/geolocation');
      const location = await getCurrentLocation();
      setCurrentLocation({
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      setIsCheckingLocation(false);

      if (!locationCheck.isWithin) {
        setMessage({
          type: 'error',
          text: locationCheck.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Show success message for location check
      setMessage({
        type: 'warning',
        text: locationCheck.message,
      });

      const profile = await getLiffProfile();

      // Check if user is logged in via LINE
      if (!profile?.userId) {
        setMessage({
          type: 'error',
          text: 'กรุณาเข้าสู่ระบบผ่าน LINE ก่อนลงทะเบียน',
        });
        setIsSubmitting(false);
        return;
      }

      // Check if user already registered in current shift (18:00 - 18:00 next day)
      const now = new Date();
      const bangkokOffset = 7 * 60;
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
      const shiftStartUTC = new Date(shiftStart.getTime() - (bangkokOffset + localOffset) * 60 * 1000);

      const { data: existingQueue, error: checkError } = await supabase
        .from('queues')
        .select('id, queue_number, time_slot')
        .eq('line_user_id', profile.userId)
        .eq('time_slot', formData.timeSlot)
        .gte('created_at', shiftStartUTC.toISOString())
        .limit(1);

      if (checkError) throw checkError;

      if (existingQueue && existingQueue.length > 0) {
        const slotText = formData.timeSlot === 'morning' ? 'เช้า' : 'บ่าย';
        setMessage({
          type: 'error',
          text: `คุณได้ลงทะเบียนคิวช่วง${slotText}วันนี้แล้ว (${existingQueue[0].queue_number}) ไม่สามารถลงทะเบียนซ้ำได้`,
        });
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('queues')
        .insert([
          {
            driver_name: formData.driverName,
            vehicle_plate: formData.vehiclePlate,
            carrier: formData.carrier,
            job_type: formData.heavyTruckJob || formData.lightTruckJob,
            truck_type: formData.heavyTruckJob ? 'heavy' : 'light',
            trip_number: formData.heavyTruckTrip || null,
            time_slot: formData.timeSlot,
            line_user_id: profile?.userId || '',
            queue_number: '', // Will be auto-generated by trigger
            check_in_latitude: location.latitude,
            check_in_longitude: location.longitude,
          },
        ])
        .select();

      if (error) throw error;

      const slotTextSuccess = formData.timeSlot === 'morning' ? 'เช้า' : 'บ่าย';
      setMessage({
        type: 'success',
        text: `ลงทะเบียนสำเร็จ! หมายเลขคิวของคุณคือ ${data[0].queue_number} (ช่วง${slotTextSuccess})`,
      });

      // Reset form
      setFormData({
        driverName: '',
        vehiclePlate: '',
        carrier: '',
        heavyTruckJob: '',
        heavyTruckTrip: '',
        lightTruckJob: '',
        timeSlot: '',
      });
    } catch (error) {
      console.error('Error:', error);

      // Get detailed error message
      let errorMessage = 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Supabase error object
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = `Database Error: ${supabaseError.message}`;
        }
        if (supabaseError.details) {
          errorMessage += `\nDetails: ${supabaseError.details}`;
        }
        if (supabaseError.hint) {
          errorMessage += `\nHint: ${supabaseError.hint}`;
        }
        if (supabaseError.code) {
          errorMessage += `\nCode: ${supabaseError.code}`;
        }
      }

      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
      setIsCheckingLocation(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative">
      {currentLocation && (
        <div className="p-4 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
          <div className="font-semibold mb-2">📍 พิกัด GPS ที่จับได้จากอุปกรณ์ของคุณ:</div>
          <div className="font-mono text-sm space-y-1">
            <div>Latitude: {currentLocation.lat.toFixed(7)}</div>
            <div>Longitude: {currentLocation.lng.toFixed(7)}</div>
            <div className={currentLocation.accuracy <= 20 ? 'text-green-700' : currentLocation.accuracy <= 50 ? 'text-yellow-700' : 'text-red-700'}>
              ความแม่นยำ: ±{Math.round(currentLocation.accuracy)} เมตร {
                currentLocation.accuracy <= 20 ? '✓ ดีมาก' :
                currentLocation.accuracy <= 50 ? '⚠ พอใช้' :
                '✗ แย่'
              }
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            * นี่คือพิกัดที่ GPS ของอุปกรณ์คุณจับได้ ใช้สำหรับปรับแต่งขอบเขตพื้นที่
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'warning'
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {isCheckingLocation && (
        <div className="p-4 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>กำลังตรวจสอบตำแหน่งของคุณ...</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ช่วงเวลา <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, timeSlot: 'morning' })}
            className={`py-3 px-4 rounded-lg font-medium border-2 transition-all ${
              formData.timeSlot === 'morning'
                ? 'bg-amber-100 border-amber-500 text-amber-800'
                : 'bg-white border-gray-300 text-gray-700 hover:border-amber-300'
            }`}
          >
            🌅 เช้า
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, timeSlot: 'afternoon' })}
            className={`py-3 px-4 rounded-lg font-medium border-2 transition-all ${
              formData.timeSlot === 'afternoon'
                ? 'bg-orange-100 border-orange-500 text-orange-800'
                : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
            }`}
          >
            🌇 บ่าย
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">* สามารถจองได้ 1 คิวต่อช่วงเวลา</p>
      </div>

      <div>
        <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-2">
          ชื่อ-นามสกุล <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="driverName"
          name="driverName"
          value={formData.driverName}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="กรอกชื่อ-นามสกุล"
        />
      </div>

      <div>
        <label htmlFor="vehiclePlate" className="block text-sm font-medium text-gray-700 mb-2">
          ทะเบียนรถ (ทะเบียนหัว/หาง) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="vehiclePlate"
          name="vehiclePlate"
          value={formData.vehiclePlate}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="เช่น กข-1234 / 5678"
        />
      </div>

      <div>
        <label htmlFor="carrier" className="block text-sm font-medium text-gray-700 mb-2">
          แหล่งพาหนะ <span className="text-red-500">*</span>
        </label>
        <select
          id="carrier"
          name="carrier"
          value={formData.carrier}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
        >
          <option value="">-- เลือกแหล่งพาหนะ --</option>
          <option value="TBL-ขนส่งกำแพงเพชร">TBL-ขนส่งกำแพงเพชร</option>
          <option value="TBL-ขนส่งธนภักดี">TBL-ขนส่งธนภักดี</option>
          <option value="TBL-ขนส่งมงคลสมัย">TBL-ขนส่งมงคลสมัย</option>
          <option value="TBL-โคราช">TBL-โคราช</option>
          <option value="TBL-ขนส่งบางบาล">TBL-ขนส่งบางบาล</option>
          <option value="TBL-ขนส่งวังน้อย">TBL-ขนส่งวังน้อย</option>
          <option value="TBL-ขนส่งกาญจนสิงขร">TBL-ขนส่งกาญจนสิงขร</option>
          <option value="TBL-ขนส่งเพื่องฟู">TBL-ขนส่งเพื่องฟู</option>
          <option value="TBL-ขนส่งสุราบางยี่ขัน">TBL-ขนส่งสุราบางยี่ขัน</option>
          <option value="TBL-ขนส่งสุรากระทิงแดง">TBL-ขนส่งสุรากระทิงแดง</option>
          <option value="TBL-ขนส่งแสงโสม">TBL-ขนส่งแสงโสม</option>
          <option value="TBL-ขนส่ง Modern Trade">TBL-ขนส่ง Modern Trade</option>
          <option value="SOW-คลังกำแพงเพชร">SOW-คลังกำแพงเพชร</option>
        </select>
      </div>

      <div>
        <label htmlFor="lightTruckJob" className="block text-sm font-medium text-gray-700 mb-2">
          รถเบา
        </label>
        <select
          id="lightTruckJob"
          name="lightTruckJob"
          value={formData.lightTruckJob}
          onChange={handleChange}
          disabled={!!formData.heavyTruckJob}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white ${formData.heavyTruckJob ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">-- เลือกประเภทงาน --</option>
          <option value="พร้อมรับงาน">พร้อมรับงาน</option>
          <option value="ซ่อมรถ">ซ่อมรถ</option>
        </select>
      </div>

      <div>
        <label htmlFor="heavyTruckJob" className="block text-sm font-medium text-gray-700 mb-2">
          รถหนัก
        </label>
        <select
          id="heavyTruckJob"
          name="heavyTruckJob"
          value={formData.heavyTruckJob}
          onChange={handleChange}
          disabled={!!formData.lightTruckJob}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white ${formData.lightTruckJob ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">-- เลือกประเภทงาน --</option>
          <option value="งาน FG">งาน FG (ระบุเที่ยวรับงาน)</option>
          <option value="งาน Return">งาน Return (พาเลท/ขวดกล่อง/ภาชนะบรรจุ)</option>
        </select>
      </div>

      {formData.heavyTruckJob === 'งาน FG' && (
        <div>
          <label htmlFor="heavyTruckTrip" className="block text-sm font-medium text-gray-700 mb-2">
            ระบุเที่ยวรับงาน <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="heavyTruckTrip"
            name="heavyTruckTrip"
            value={formData.heavyTruckTrip}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="เช่น เที่ยว 1, เที่ยว 2"
          />
        </div>
      )}

      {!formData.heavyTruckJob && !formData.lightTruckJob && (
        <div className="p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm">
          ⚠️ กรุณาเลือกประเภทงาน (รถเบา หรือ รถหนัก)
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-all ${
          isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            กำลังลงทะเบียน...
          </span>
        ) : (
          'ลงทะเบียนคิว'
        )}
      </button>

      {/* Version display */}
      <div className="text-xs text-gray-400 mt-4">
        v{BUILD_VERSION}
      </div>
    </form>
  );
}

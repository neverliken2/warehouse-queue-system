// Warehouse location coordinates (Test: Your desk location)
const WAREHOUSE_LAT = 18.7613426;
const WAREHOUSE_LNG = 99.0604806;
const MAX_DISTANCE_METERS = 5; // 5 meters radius

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get current user location
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Check if current location is within warehouse area
 */
export async function isWithinWarehouseArea(): Promise<{
  isWithin: boolean;
  distance: number;
  message: string;
}> {
  try {
    const location = await getCurrentLocation();
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      WAREHOUSE_LAT,
      WAREHOUSE_LNG
    );

    const isWithin = distance <= MAX_DISTANCE_METERS;

    return {
      isWithin,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      message: isWithin
        ? `คุณอยู่ในพื้นที่โกดัง (ระยะห่าง ${Math.round(distance * 10) / 10} เมตร)`
        : `คุณอยู่นอกพื้นที่โกดัง (ระยะห่าง ${Math.round(distance * 10) / 10} เมตร) กรุณาเข้ามาในพื้นที่โกดังก่อนลงทะเบียน`,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'ไม่สามารถตรวจสอบตำแหน่งได้ กรุณาเปิดใช้งาน GPS และอนุญาตการเข้าถึงตำแหน่ง'
    );
  }
}

export const WAREHOUSE_COORDINATES = {
  latitude: WAREHOUSE_LAT,
  longitude: WAREHOUSE_LNG,
  maxDistanceMeters: MAX_DISTANCE_METERS,
};

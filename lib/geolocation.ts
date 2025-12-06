// Warehouse center coordinates
const WAREHOUSE_CENTER = {
  lat: 18.7614235,
  lng: 99.0605055,
};

// Expanded boundary (approximately 100 meters radius to account for GPS accuracy)
// ~100m = 0.0009 degrees latitude, 0.0011 degrees longitude at this location
const WAREHOUSE_BOUNDARY = {
  northEast: { lat: 18.7623235, lng: 99.0616055 }, // +100m north, +100m east
  northWest: { lat: 18.7623235, lng: 99.0594055 }, // +100m north, -100m west
  southWest: { lat: 18.7605235, lng: 99.0594055 }, // -100m south, -100m west
  southEast: { lat: 18.7605235, lng: 99.0616055 }, // -100m south, +100m east
};

// For backward compatibility
const WAREHOUSE_LAT = (WAREHOUSE_BOUNDARY.northEast.lat + WAREHOUSE_BOUNDARY.southWest.lat) / 2;
const WAREHOUSE_LNG = (WAREHOUSE_BOUNDARY.northEast.lng + WAREHOUSE_BOUNDARY.southWest.lng) / 2;

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
 * Get current user location with accuracy info
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
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
          accuracy: position.coords.accuracy, // Accuracy in meters
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
 * Check if a point is within a rectangular boundary
 */
function isPointInBoundary(
  lat: number,
  lng: number,
  boundary: typeof WAREHOUSE_BOUNDARY
): boolean {
  const { northEast, southWest } = boundary;

  // Check if latitude is within north-south bounds
  const isLatInBounds = lat >= southWest.lat && lat <= northEast.lat;

  // Check if longitude is within east-west bounds
  const isLngInBounds = lng >= southWest.lng && lng <= northEast.lng;

  return isLatInBounds && isLngInBounds;
}

/**
 * Check if current location is within warehouse area
 */
export async function isWithinWarehouseArea(): Promise<{
  isWithin: boolean;
  distance: number;
  accuracy: number;
  message: string;
}> {
  try {
    const location = await getCurrentLocation();

    // Check GPS accuracy - warn if accuracy is poor (> 50 meters)
    const MAX_ACCEPTABLE_ACCURACY = 50; // meters
    if (location.accuracy > MAX_ACCEPTABLE_ACCURACY) {
      return {
        isWithin: false,
        distance: 0,
        accuracy: Math.round(location.accuracy),
        message: `สัญญาณ GPS ไม่แม่นยำพอ (ความคลาดเคลื่อน ±${Math.round(location.accuracy)} เมตร) กรุณาลองใหม่อีกครั้งในพื้นที่โล่ง หรือรอสักครู่`,
      };
    }

    // Check if within rectangular boundary
    const isWithin = isPointInBoundary(
      location.latitude,
      location.longitude,
      WAREHOUSE_BOUNDARY
    );

    // Calculate distance from center for informational purposes
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      WAREHOUSE_LAT,
      WAREHOUSE_LNG
    );

    return {
      isWithin,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      accuracy: Math.round(location.accuracy),
      message: isWithin
        ? `คุณอยู่ในพื้นที่โกดัง (ห่างจากจุดกลาง ${Math.round(distance * 10) / 10} เมตร, ความแม่นยำ ±${Math.round(location.accuracy)} เมตร)`
        : `คุณอยู่นอกพื้นที่โกดัง (ห่างจากจุดกลาง ${Math.round(distance * 10) / 10} เมตร) กรุณาเข้ามาในพื้นที่โกดังก่อนลงทะเบียน`,
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
  boundary: WAREHOUSE_BOUNDARY,
};

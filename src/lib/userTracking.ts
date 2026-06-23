import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracy: 'gps';
  timestamp: string;
}

export interface UserLocation {
  city: string;
  region: string;
  country: string;
  ip: string;
  lat: number;
  lon: number;
}

export interface UserDoc {
  email: string;
  displayName: string;
  photoURL: string;
  loginCount: number;
  lastLogin: string;
  lastSeen: string;
  createdAt: string;
  suspended: boolean;
  location?: UserLocation | GpsLocation;
  gpsLocation?: GpsLocation;
  loginHistory?: Array<{
    at: string;
    city: string;
    region: string;
    country: string;
    ip: string;
    lat: number;
    lon: number;
  }>;
}

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
export const LOCATION_GRANTED_KEY = 'locationGranted';
export const LOCATION_SKIPPED_KEY = 'locationSkipped';
export const LOCATION_SESSION_KEY = 'locationModalShownSession';
export const PENDING_GPS_KEY = 'pendingGpsLocation';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isUserActive(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < ACTIVE_WINDOW_MS;
}

export async function fetchUserLocation(): Promise<UserLocation | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
      ip?: string;
      latitude?: number;
      longitude?: number;
    };
    if (!data.city && !data.region) return null;
    return {
      city: data.city ?? 'Unknown',
      region: data.region ?? 'Unknown',
      country: data.country_name ?? 'Unknown',
      ip: data.ip ?? 'Unknown',
      lat: data.latitude ?? 0,
      lon: data.longitude ?? 0,
    };
  } catch {
    return null;
  }
}

function formatLocation(loc: UserLocation | GpsLocation | null | undefined): string {
  if (!loc) return 'Unknown';
  if ('accuracy' in loc && loc.accuracy === 'gps') {
    return `GPS (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
  }
  const ipLoc = loc as UserLocation;
  const parts = [ipLoc.city, ipLoc.region, ipLoc.country].filter((p) => p && p !== 'Unknown');
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
}

export { formatLocation };

export type StoredLocation = UserLocation | GpsLocation;

export function getLocationCoords(
  loc: StoredLocation | null | undefined,
): { lat: number; lng: number } | null {
  if (!loc || typeof loc.lat !== 'number') return null;
  if ('accuracy' in loc && loc.accuracy === 'gps') {
    return { lat: loc.lat, lng: loc.lng };
  }
  const ipLoc = loc as UserLocation;
  if (typeof ipLoc.lon !== 'number') return null;
  return { lat: ipLoc.lat, lng: ipLoc.lon };
}

export function getLocationIp(loc: StoredLocation | null | undefined): string | null {
  if (!loc || 'accuracy' in loc) return null;
  const ip = (loc as UserLocation).ip;
  return ip && ip !== 'Unknown' ? ip : null;
}

export function buildGpsLocation(lat: number, lng: number): GpsLocation {
  return {
    lat,
    lng,
    accuracy: 'gps',
    timestamp: new Date().toISOString(),
  };
}

export async function saveGpsLocation(user: User, gps: GpsLocation): Promise<void> {
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    const payload = {
      location: gps,
      gpsLocation: gps,
      lastSeen: new Date().toISOString(),
    };

    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        email: user.email ?? 'Unknown',
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        loginCount: 0,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        suspended: false,
        ...payload,
      });
    }
  } catch (err) {
    console.warn('GPS location save skipped:', err);
  }
}

export async function flushPendingGpsLocation(user: User): Promise<void> {
  try {
    const raw = localStorage.getItem(PENDING_GPS_KEY);
    if (!raw) return;
    const gps = JSON.parse(raw) as GpsLocation;
    await saveGpsLocation(user, gps);
  } catch {
    // ignore malformed cache
  }
}

export async function trackUserLogin(user: User): Promise<{ suspended: boolean }> {
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    const location = await fetchUserLocation();
    const now = new Date().toISOString();

    if (existing.exists()) {
      const data = existing.data();
      if (data.suspended === true) {
        return { suspended: true };
      }

      const loginEntry = location
        ? {
            at: now,
            city: location.city,
            region: location.region,
            country: location.country,
            ip: location.ip,
            lat: location.lat,
            lon: location.lon,
          }
        : null;

      const history = Array.isArray(data.loginHistory) ? [...data.loginHistory] : [];
      if (loginEntry) {
        history.unshift(loginEntry);
        if (history.length > 20) history.length = 20;
      }

      await updateDoc(ref, {
        email: user.email ?? data.email ?? 'Unknown',
        displayName: user.displayName ?? data.displayName ?? '',
        photoURL: user.photoURL ?? data.photoURL ?? '',
        lastLogin: now,
        lastSeen: now,
        loginCount: (data.loginCount ?? 0) + 1,
        ...(location && !data.gpsLocation ? { ipLocation: location } : {}),
        ...(loginEntry ? { loginHistory: history } : {}),
      });

      await flushPendingGpsLocation(user);
      return { suspended: false };
    }

    await setDoc(ref, {
      email: user.email ?? 'Unknown',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      loginCount: 1,
      lastLogin: now,
      lastSeen: now,
      createdAt: now,
      suspended: false,
      ...(location ? { ipLocation: location } : {}),
      ...(location
        ? {
            loginHistory: [
              {
                at: now,
                city: location.city,
                region: location.region,
                country: location.country,
                ip: location.ip,
                lat: location.lat,
                lon: location.lon,
              },
            ],
          }
        : {}),
    });

    await flushPendingGpsLocation(user);
    return { suspended: false };
  } catch (err) {
    console.warn('User tracking skipped:', err);
    return { suspended: false };
  }
}

export async function updateUserPresence(user: User): Promise<void> {
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    if (!existing.exists() || existing.data().suspended === true) return;

    await updateDoc(ref, {
      lastSeen: new Date().toISOString(),
      email: user.email ?? existing.data().email ?? 'Unknown',
    });
  } catch {
    // Non-blocking — rules may not be deployed yet
  }
}

export async function checkUserSuspended(user: User): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() && snap.data().suspended === true;
  } catch {
    return false;
  }
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '@/lib/firebase';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import {
  buildGpsLocation,
  saveGpsLocation,
  LOCATION_GRANTED_KEY,
  LOCATION_SKIPPED_KEY,
  LOCATION_SESSION_KEY,
  PENDING_GPS_KEY,
  SEVEN_DAYS_MS,
} from '@/lib/userTracking';

type ContinueAction = () => void | Promise<void>;

interface LocationPermissionContextValue {
  showLocationModal: (onContinue?: ContinueAction) => void;
}

const LocationPermissionContext = createContext<LocationPermissionContextValue | null>(null);

function shouldShowLocationModal(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(LOCATION_SESSION_KEY) === 'true') return false;
  if (localStorage.getItem(LOCATION_GRANTED_KEY) === 'true') return false;

  const skipped = localStorage.getItem(LOCATION_SKIPPED_KEY);
  if (skipped) {
    const skippedAt = Number(skipped);
    if (!Number.isNaN(skippedAt) && Date.now() - skippedAt < SEVEN_DAYS_MS) {
      return false;
    }
  }

  return true;
}

function requestBrowserLocation(): Promise<void> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const gps = buildGpsLocation(position.coords.latitude, position.coords.longitude);
        localStorage.setItem(LOCATION_GRANTED_KEY, 'true');
        localStorage.setItem(PENDING_GPS_KEY, JSON.stringify(gps));

        const user = auth.currentUser;
        if (user) {
          await saveGpsLocation(user, gps);
        }

        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function LocationPermissionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<ContinueAction | null>(null);

  const runPendingAction = useCallback(async () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) await action();
  }, []);

  const showLocationModal = useCallback((onContinue?: ContinueAction) => {
    if (!shouldShowLocationModal()) {
      void onContinue?.();
      return;
    }

    sessionStorage.setItem(LOCATION_SESSION_KEY, 'true');
    pendingActionRef.current = onContinue ?? null;
    setOpen(true);
  }, []);

  const handleAllow = useCallback(async () => {
    setOpen(false);
    await requestBrowserLocation();
    await runPendingAction();
  }, [runPendingAction]);

  const handleSkip = useCallback(async () => {
    localStorage.setItem(LOCATION_SKIPPED_KEY, String(Date.now()));
    setOpen(false);
    await runPendingAction();
  }, [runPendingAction]);

  const value = useMemo(() => ({ showLocationModal }), [showLocationModal]);

  return (
    <LocationPermissionContext.Provider value={value}>
      {children}
      <LocationPermissionModal open={open} onAllow={handleAllow} onSkip={handleSkip} />
    </LocationPermissionContext.Provider>
  );
}

export function useLocationPermission() {
  const ctx = useContext(LocationPermissionContext);
  if (!ctx) {
    throw new Error('useLocationPermission must be used within LocationPermissionProvider');
  }
  return ctx;
}

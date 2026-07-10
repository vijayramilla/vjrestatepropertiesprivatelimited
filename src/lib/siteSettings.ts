import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const LS_KEY = 'vjr_mapOnly';

export interface SiteSettings {
  mapOnly: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  mapOnly: false,
};

function readLocal(): SiteSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw !== null) return { mapOnly: raw === 'true' };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function writeLocal(s: Partial<SiteSettings>): void {
  try {
    if (s.mapOnly !== undefined) localStorage.setItem(LS_KEY, String(s.mapOnly));
  } catch { /* ignore */ }
}

async function tryWrite(path: string, value: boolean): Promise<boolean> {
  try {
    const ref = doc(db, path);
    await setDoc(ref, { mapOnly: value }, { merge: true });
    return true;
  } catch {
    return false;
  }
}

const FIREBASE_PATHS = ['settings/general', 'properties/_config_'];

export function subscribeToSettings(onChange: (settings: SiteSettings) => void): () => void {
  onChange(readLocal());

  let unsubscribed = false;
  const unsubs: (() => void)[] = [];

  for (const path of FIREBASE_PATHS) {
    const ref = doc(db, path);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (unsubscribed) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<SiteSettings>;
          const merged = { ...DEFAULT_SETTINGS, ...data };
          writeLocal(merged);
          onChange(merged);
        }
      },
      () => {
        /* path not accessible — skip */
      },
    );
    unsubs.push(unsub);
  }

  return () => {
    unsubscribed = true;
    for (const u of unsubs) u();
  };
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  writeLocal(settings);

  const value = settings.mapOnly ?? false;
  const errors: string[] = [];

  for (const path of FIREBASE_PATHS) {
    const ok = await tryWrite(path, value);
    if (ok) return;
    errors.push(path);
  }

  const msg = `Firebase write blocked. The setting is saved locally but won't sync to other users.\nPaths tried: ${errors.join(', ')}.\nAdd a Firestore rule to allow writes to fix this.`;
  throw new Error(msg);
}

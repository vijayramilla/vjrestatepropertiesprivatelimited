import { startTransition } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useSupabaseData, subscribeSupabaseSettings, callDataProxy } from './supabaseData';

const LS_KEY_NEXA = 'vjr_nexaEnabled';

export interface SiteSettings {
  nexaEnabled: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  nexaEnabled: true,
};

function readLocal(): SiteSettings {
  const settings: SiteSettings = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(LS_KEY_NEXA);
    if (raw !== null) settings.nexaEnabled = raw === 'true';
  } catch { /* ignore */ }
  return settings;
}

function writeLocal(s: Partial<SiteSettings>): void {
  try {
    if (s.nexaEnabled !== undefined) localStorage.setItem(LS_KEY_NEXA, String(s.nexaEnabled));
  } catch { /* ignore */ }
}

async function tryWrite(path: string, settings: Partial<SiteSettings>): Promise<boolean> {
  try {
    const ref = doc(db, path);
    await setDoc(ref, settings, { merge: true });
    return true;
  } catch {
    return false;
  }
}

const FIREBASE_PATHS = ['settings/general', 'properties/_config_'];

export function subscribeToSettings(onChange: (settings: SiteSettings) => void): () => void {
  // Local read is synchronous inside the effect — safe, keeps loading=false instant.
  onChange(readLocal());

  // Defer Firestore dispatches outside the commit phase: Firestore can deliver
  // cached snapshots synchronously, and React 18.3.1 crashes with
  // "Should have a queue" when setState runs during that window.
  const notify = (settings: SiteSettings) => startTransition(() => onChange(settings));

  if (useSupabaseData()) {
    return subscribeSupabaseSettings((settings) => {
      writeLocal(settings);
      notify(settings);
    });
  }

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
          const merged: SiteSettings = { nexaEnabled: data.nexaEnabled ?? DEFAULT_SETTINGS.nexaEnabled };
          writeLocal(merged);
          notify(merged);
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

  if (useSupabaseData()) {
    await callDataProxy('settings.update', settings);
    return;
  }

  const errors: string[] = [];

  for (const path of FIREBASE_PATHS) {
    const ok = await tryWrite(path, settings);
    if (ok) return;
    errors.push(path);
  }

  const msg = `Firebase write blocked. The setting is saved locally but won't sync to other users.\nPaths tried: ${errors.join(', ')}.\nAdd a Firestore rule to allow writes to fix this.`;
  throw new Error(msg);
}

import { startTransition } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

/**
 * Public visibility of the /team page.
 *
 * Stored in the Firestore `settings/team_page` doc: the deployed rules allow
 * everyone to read `settings/*` and only admins to write, so the public team
 * page can react to the toggle live without any proxy round-trip.
 */

export const TEAM_PAGE_DEFAULT_VISIBLE = true;

/** Live subscription — fires immediately with the current value. */
export function subscribeToTeamPageVisible(
  onChange: (visible: boolean) => void,
): () => void {
  const ref = doc(db, 'settings', 'team_page');
  const notify = (visible: boolean) => startTransition(() => onChange(visible));

  // Optimistic local default so the page renders instantly.
  notify(TEAM_PAGE_DEFAULT_VISIBLE);

  return onSnapshot(
    ref,
    (snap) => {
      // Absent doc = visible (the default). Admin toggle creates it on first hide.
      notify(snap.exists() ? snap.data().visible !== false : true);
    },
    () => {
      /* unreadable — keep default */
    },
  );
}

/** Admin write. Fails loudly when the signed-in user isn't an admin. */
export async function setTeamPageVisible(visible: boolean): Promise<void> {
  await setDoc(doc(db, 'settings', 'team_page'), { visible }, { merge: true });
}

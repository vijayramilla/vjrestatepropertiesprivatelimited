import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  callDataProxy,
  supabaseDeleteImage,
} from '@/lib/supabaseData';
import { compressImageFile } from '@/utils/supabaseUploader';
// ── Types ────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  /** Role shown under the name, e.g. "Founder & CEO" or "Sales Manager". */
  title: string;
  photoUrl: string;
  isActive: boolean;
  /** Lower numbers show first on the team page. */
  sortOrder: number;
  createdAt?: Date;
}

export type TeamMemberInput = Omit<TeamMember, 'id' | 'createdAt'>;

// ── Helpers ──────────────────────────────────────────────────────────────

function toDate(v: unknown): Date | undefined {
  return v && typeof (v as Timestamp).toDate === 'function'
    ? (v as Timestamp).toDate()
    : undefined;
}

// ── Subscription ─────────────────────────────────────────────────────────

export function sortMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

/**
 * Team data always lives in Firestore (public read, admin-only writes —
 * rules are deployed). Photos are stored in the Supabase `team-photos`
 * bucket via the data proxy, which works regardless of whether the
 * Supabase data mode is on.
 */
export function subscribeToTeamMembers(cb: (members: TeamMember[]) => void): () => void {
  const q = collection(db, 'team_members');
  return onSnapshot(
    q,
    (snap) => {
      cb(
        sortMembers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: (data.name as string) ?? '',
              title: (data.title as string) ?? '',
              photoUrl: (data.photoUrl as string) ?? '',
              isActive: (data.isActive as boolean) ?? true,
              sortOrder: (data.sortOrder as number) ?? 0,
              createdAt: toDate(data.createdAt),
            } as TeamMember;
          }),
        ),
      );
    },
    (err) => console.error('Subscribe team members error:', err),
  );
}

// ── Admin: CRUD ──────────────────────────────────────────────────────────

/** Creates a member and returns its id (needed to attach a photo after). */
export async function createTeamMember(input: TeamMemberInput): Promise<string> {
  const ref = await addDoc(collection(db, 'team_members'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeamMember(id: string, patch: Partial<TeamMemberInput>): Promise<void> {
  await updateDoc(doc(db, 'team_members', id), patch);
}

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<void> {
  await updateTeamMember(id, { isActive });
}

export async function deleteTeamMember(member: TeamMember): Promise<void> {
  await deleteDoc(doc(db, 'team_members', member.id));
  // Best-effort cleanup of the photo object (no-op for external URLs).
  if (member.photoUrl) await supabaseDeleteImage(member.photoUrl);
}

// ── Photo upload ─────────────────────────────────────────────────────────

/**
 * Compress + upload a member photo through the data proxy into the
 * `team-photos` bucket. The admin must be signed in (proxy enforces it).
 */
export async function uploadTeamPhoto(file: File, memberId: string): Promise<string> {
  const optimized = file.type.startsWith('image/')
    ? (await compressImageFile(file, { maxWidthPx: 800, quality: 0.85 })).file
    : file;
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(optimized);
  });
  if (!dataBase64) throw new Error('Could not read file');
  const res = await callDataProxy('image.upload', {
    bucket: 'team-photos',
    entityId: memberId,
    name: optimized.name,
    contentType: optimized.type || 'image/webp',
    dataBase64,
  });
  return res.url as string;
}

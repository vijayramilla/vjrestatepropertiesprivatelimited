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
  isSupabaseDataEnabled,
  subscribeSupabaseTable,
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

// ── Row mapping (Supabase) ───────────────────────────────────────────────

interface TeamMemberRow {
  id: string;
  name?: string | null;
  title?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
}

function mapTeamRow(r: TeamMemberRow): TeamMember {
  return {
    id: r.id,
    name: r.name ?? '',
    title: r.title ?? '',
    photoUrl: r.photo_url ?? '',
    isActive: r.is_active ?? true,
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at ? new Date(r.created_at) : undefined,
  };
}

function memberToRow(m: TeamMemberInput): Record<string, unknown> {
  return {
    name: m.name,
    title: m.title,
    photo_url: m.photoUrl,
    is_active: m.isActive,
    sort_order: m.sortOrder,
  };
}

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

export function subscribeToTeamMembers(cb: (members: TeamMember[]) => void): () => void {
  if (isSupabaseDataEnabled()) {
    return subscribeSupabaseTable<TeamMemberRow>('team_members', (rows) => {
      cb(sortMembers(rows.map(mapTeamRow)));
    });
  }
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
  if (isSupabaseDataEnabled()) {
    const res = await callDataProxy('team.create', memberToRow(input));
    return res.id as string;
  }
  const ref = await addDoc(collection(db, 'team_members'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeamMember(id: string, patch: Partial<TeamMemberInput>): Promise<void> {
  if (isSupabaseDataEnabled()) {
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = patch.name;
    if (patch.title !== undefined) fields.title = patch.title;
    if (patch.photoUrl !== undefined) fields.photo_url = patch.photoUrl;
    if (patch.isActive !== undefined) fields.is_active = patch.isActive;
    if (patch.sortOrder !== undefined) fields.sort_order = patch.sortOrder;
    await callDataProxy('team.update', { id, ...fields });
    return;
  }
  await updateDoc(doc(db, 'team_members', id), patch);
}

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<void> {
  await updateTeamMember(id, { isActive });
}

export async function deleteTeamMember(member: TeamMember): Promise<void> {
  if (isSupabaseDataEnabled()) {
    await callDataProxy('team.delete', { id: member.id });
  } else {
    await deleteDoc(doc(db, 'team_members', member.id));
  }
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

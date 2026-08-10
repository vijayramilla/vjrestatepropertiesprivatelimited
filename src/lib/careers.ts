import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  serverTimestamp,
  arrayUnion,
  type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// ── Types ────────────────────────────────────────────────────────────────

export type JobType = 'Full Time' | 'Part Time' | 'Internship';
export type JobLocation = 'Bangalore' | 'Remote' | 'Hybrid';
export type Department =
  | 'Sales'
  | 'Technology'
  | 'Marketing'
  | 'Customer Relations'
  | 'HR'
  | 'Operations';
export type ApplicationStatus =
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Selected'
  | 'Rejected'
  | 'On Hold';

export interface JobOpening {
  id: string;
  title: string;
  department: Department;
  type: JobType;
  location: JobLocation;
  experience: string;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  isActive: boolean;
  isFeatured: boolean;
  totalApplications: number;
  postedAt?: Date;
  closingDate?: Date;
  department_color: string;
}

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  note?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  currentCompany: string;
  currentRole: string;
  totalExperience: string;
  expectedSalary: string;
  noticePeriod: string;
  linkedinUrl: string;
  resumeUrl: string;
  resumeFileName: string;
  coverLetter: string;
  whyVJR: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  adminNotes: string;
  rating: number;
  tags: string[];
  appliedAt?: Date;
  updatedAt?: Date;
  isShortlisted: boolean;
  viewedByAdmin: boolean;
  referenceId?: string;

  // Verified candidate identity + exact location (captured at apply time)
  applicantUid?: string;
  applicantEmail?: string;
  pinCode: string;
  applicantLat?: number;
  applicantLng?: number;
  applicantArea?: string;
}

export type ApplicationFormInput = Omit<
  JobApplication,
  | 'id'
  | 'status'
  | 'statusHistory'
  | 'adminNotes'
  | 'rating'
  | 'tags'
  | 'appliedAt'
  | 'updatedAt'
  | 'isShortlisted'
  | 'viewedByAdmin'
  | 'referenceId'
  | 'applicantUid'
  | 'applicantEmail'
  | 'applicantLat'
  | 'applicantLng'
  | 'applicantArea'
>;

/**
 * Convert an annual "₹8-15 LPA + Incentives" string into a monthly figure
 * ("₹66K-1.25L per month + Incentives") at display time. Handles both
 * legacy LPA strings stored in Firestore and already-monthly strings.
 */
export function formatSalary(salary: string): string {
  const m = salary.match(/₹?\s*([\d.]+)\s*-\s*([\d.]+)\s*LPA/i);
  if (!m) return salary;
  const toMonthly = (lpa: number): string => {
    const monthly = (lpa * 100000) / 12;
    if (monthly >= 100000) {
      const lakhs = monthly / 100000;
      return `₹${lakhs.toFixed(2).replace(/\.?0+$/, '')}L`;
    }
    return `₹${Math.round(monthly / 1000)}K`;
  };
  const start = m.index ?? 0;
  const prefix = salary.slice(0, start).trim();
  const suffix = salary.slice(start + m[0].length).trim();
  const base = `${toMonthly(parseFloat(m[1]))}-${toMonthly(parseFloat(m[2]))} per month`;
  const rest = [prefix, base, suffix].filter(Boolean).join(' ');
  return rest;
}

// ── Seed data (runs once when job_openings is empty) ─────────────────────

interface SeedJob {
  title: string;
  department: Department;
  type: JobType;
  location: JobLocation;
  experience: string;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  isFeatured: boolean;
  department_color: string;
}

export const INITIAL_JOBS: SeedJob[] = [
  {
    title: 'Senior Sales Manager',
    department: 'Sales',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '3-6 Years',
    salary: '₹66K-1.25L per month + Incentives',
    description:
      "Lead our premium property sales team and drive revenue growth across Bangalore's real estate market.",
    responsibilities: [
      'Drive property sales and achieve monthly targets',
      'Build and maintain relationships with HNI clients',
      'Conduct property site visits and presentations',
      'Negotiate and close high-value deals',
      'Mentor and guide junior sales executives',
    ],
    requirements: [
      '3+ years in real estate sales',
      'Proven track record of closing ₹1Cr+ deals',
      'Strong network in Bangalore real estate',
      'Excellent communication in English and Kannada',
      'Own vehicle and valid driving license',
    ],
    isFeatured: true,
    department_color: '#EF4444',
  },
  {
    title: 'Telecaller / Inside Sales Agent',
    department: 'Sales',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '0-2 Years',
    salary: '₹20K-37K per month + Incentives',
    description:
      'Connect with potential property buyers, qualify leads, and schedule site visits for our sales team.',
    responsibilities: [
      'Make outbound calls to potential property buyers',
      'Qualify leads and understand buyer requirements',
      'Schedule site visits for the sales team',
      'Follow up with existing leads in CRM',
      'Maintain daily call logs and reports',
      'Achieve daily/weekly call and conversion targets',
    ],
    requirements: [
      'Good communication skills in Kannada, Hindi and English',
      'Basic computer knowledge',
      'Positive attitude and target-oriented mindset',
      'Freshers welcome — real estate experience preferred',
      'Ability to handle rejection and stay motivated',
    ],
    niceToHave: [
      'Previous telecalling or BPO experience',
      'Knowledge of Bangalore localities',
      'Experience with CRM tools',
    ],
    isFeatured: true,
    department_color: '#EF4444',
  },
  {
    title: 'Real Estate Agent',
    department: 'Sales',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '1-3 Years',
    salary: '₹25K-50K per month + High Incentives',
    description:
      'Help clients buy and sell properties across Bangalore with expert guidance and local market knowledge.',
    responsibilities: [
      'Source and list new properties on VJR platform',
      'Guide buyers through property selection process',
      'Conduct property inspections and valuations',
      'Handle documentation and legal verification',
      'Build strong referral network',
    ],
    requirements: [
      'Real estate license or willingness to obtain',
      'Knowledge of Bangalore property market',
      'Strong interpersonal and negotiation skills',
      'Self-motivated and target-driven',
    ],
    isFeatured: false,
    department_color: '#EF4444',
  },
  {
    title: 'Full Stack Developer',
    department: 'Technology',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '2-4 Years',
    salary: '₹66K-1.5L per month',
    description:
      "Build and scale VJR Estate's technology platform — from property listings to AI-powered features.",
    responsibilities: [
      'Develop and maintain React + TypeScript frontend',
      'Build Firebase/Node.js backend services',
      'Implement AI/ML features for property intelligence',
      'Optimize performance and SEO',
      'Work on Google Maps integrations and geospatial features',
    ],
    requirements: [
      'Proficiency in React, TypeScript, Node.js',
      'Experience with Firebase or similar BaaS',
      'Strong JavaScript/TypeScript fundamentals',
      'Experience with REST APIs and real-time systems',
      'Git and modern development workflows',
    ],
    niceToHave: [
      'Experience with Gemini/OpenAI APIs',
      'Real estate tech or PropTech background',
      'Knowledge of geospatial technologies',
    ],
    isFeatured: true,
    department_color: '#3B82F6',
  },
  {
    title: 'Digital Marketing Executive',
    department: 'Marketing',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '1-3 Years',
    salary: '₹33K-58K per month',
    description:
      "Drive VJR Estate's digital presence and generate quality leads through strategic marketing campaigns.",
    responsibilities: [
      'Manage Google Ads and Meta Ads campaigns',
      'Create property listing content and social media posts',
      'SEO optimization for vjrestate.com',
      'Email marketing and lead nurturing campaigns',
      'Analyse campaign performance and ROI',
    ],
    requirements: [
      'Experience with Google Ads and Meta Ads',
      'Content creation and copywriting skills',
      'Google Analytics and SEO knowledge',
      'Creative mindset with eye for design',
    ],
    isFeatured: false,
    department_color: '#8B5CF6',
  },
  {
    title: 'Customer Relations Executive',
    department: 'Customer Relations',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '1-2 Years',
    salary: '₹25K-42K per month',
    description:
      "Be the voice of VJR Estate — ensure every client has an exceptional experience throughout their property journey.",
    responsibilities: [
      'Handle inbound calls and WhatsApp inquiries',
      'Coordinate between buyers, sellers and agents',
      'Manage post-sale documentation support',
      'Resolve client complaints and feedback',
      'Maintain client satisfaction scores',
    ],
    requirements: [
      'Excellent communication in English, Hindi, Kannada',
      'Patient, empathetic and solution-oriented',
      'Basic CRM and MS Office knowledge',
      'Customer service experience preferred',
    ],
    isFeatured: false,
    department_color: '#10B981',
  },
];

/** Seed the job_openings collection once on first load if it is empty. */
export async function seedJobOpeningsIfEmpty(): Promise<void> {
  try {
    const existing = await getDocs(query(collection(db, 'job_openings'), limit(1)));
    if (!existing.empty) return;
    for (const job of INITIAL_JOBS) {
      await addDoc(collection(db, 'job_openings'), {
        ...job,
        isActive: true,
        totalApplications: 0,
        postedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('Seed job openings error:', err);
  }
}

// ── Subscriptions ────────────────────────────────────────────────────────

function toDate(v: unknown): Date | undefined {
  return v && typeof (v as Timestamp).toDate === 'function'
    ? (v as Timestamp).toDate()
    : undefined;
}

export function subscribeToJobs(cb: (jobs: JobOpening[]) => void): () => void {
  const q = query(collection(db, 'job_openings'));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            postedAt: toDate(data.postedAt),
            closingDate: toDate(data.closingDate),
          } as JobOpening;
        }),
      );
    },
    (err) => console.error('Subscribe jobs error:', err),
  );
}

export function subscribeToApplications(
  cb: (apps: JobApplication[]) => void,
): () => void {
  const q = query(collection(db, 'job_applications'));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            appliedAt: toDate(data.appliedAt),
            updatedAt: toDate(data.updatedAt),
            statusHistory: (data.statusHistory ?? []).map((h: Record<string, unknown>) => ({
              status: h.status as ApplicationStatus,
              note: h.note as string | undefined,
              updatedBy: h.updatedBy as string | undefined,
              updatedAt: toDate(h.updatedAt),
            })),
          } as JobApplication;
        }),
      );
    },
    (err) => console.error('Subscribe applications error:', err),
  );
}

// ── Public: submit an application ────────────────────────────────────────

export async function uploadResume(
  jobId: string,
  file: File,
): Promise<{ url: string; fileName: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `resumes/${jobId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(storageRef);
  return { url, fileName: file.name };
}

export function makeReferenceId(): string {
  return `VJR-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Capture the candidate's exact location at submit time. Tries the browser's
 * high-accuracy GPS first and reverse-geocodes it to a readable area label;
 * falls back to an IP-based location so the admin never sees "Unknown".
 * Best-effort: a short timeout guarantees it never blocks submission.
 */
export async function captureApplicantLocation(): Promise<{
  lat?: number;
  lng?: number;
  area?: string;
}> {
  // Reuse any GPS pin the user already shared this session.
  try {
    const raw = localStorage.getItem('pendingGpsLocation');
    if (raw) {
      const gps = JSON.parse(raw) as { lat?: number; lng?: number };
      if (typeof gps.lat === 'number' && typeof gps.lng === 'number') {
        return { lat: gps.lat, lng: gps.lng };
      }
    }
  } catch {
    // malformed cache — fall through to a fresh request
  }

  const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
    );
  });

  if (!gps) {
    // IP fallback — coarse but better than nothing.
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as { latitude?: number; longitude?: number };
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
      }
    } catch {
      // ignore — location is optional
    }
    return {};
  }

  let area: string | undefined;
  try {
    const { getLocalityFromCoords } = await import('./mapGeocoding');
    area = await getLocalityFromCoords(gps.lat, gps.lng);
  } catch {
    // area is optional
  }
  return { lat: gps.lat, lng: gps.lng, area };
}

export async function submitJobApplication(
  input: ApplicationFormInput,
  resume: File,
  identity: { uid: string; email: string },
): Promise<string> {
  const { url: resumeUrl, fileName: resumeFileName } = await uploadResume(input.jobId, resume);
  const referenceId = makeReferenceId();
  const location = await captureApplicantLocation();
  await addDoc(collection(db, 'job_applications'), {
    ...input,
    resumeUrl,
    resumeFileName,
    referenceId,
    applicantUid: identity.uid,
    applicantEmail: identity.email,
    applicantLat: location.lat,
    applicantLng: location.lng,
    applicantArea: location.area,
    status: 'Applied',
    statusHistory: [
      { status: 'Applied', note: 'Application submitted', updatedBy: 'candidate', updatedAt: new Date() },
    ],
    adminNotes: '',
    rating: 0,
    tags: [],
    isShortlisted: false,
    viewedByAdmin: false,
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return referenceId;
}

// ── Admin: applications ──────────────────────────────────────────────────

export async function appendStatusHistory(
  id: string,
  entry: StatusHistoryEntry,
): Promise<void> {
  // ponytail: serverTimestamp() is not allowed inside arrays, so use a client
  // Date — it is stored as a comparable Firestore timestamp. The top-level
  // updatedAt still uses serverTimestamp() for server-accurate time.
  await updateDoc(doc(db, 'job_applications', id), {
    status: entry.status,
    statusHistory: arrayUnion({
      ...entry,
      note: entry.note || '',
      updatedAt: entry.updatedAt ?? new Date(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function updateApplicationRating(id: string, rating: number): Promise<void> {
  await updateDoc(doc(db, 'job_applications', id), { rating });
}

export async function updateApplicationNotes(id: string, adminNotes: string): Promise<void> {
  await updateDoc(doc(db, 'job_applications', id), { adminNotes });
}

export async function toggleApplicationViewed(id: string): Promise<void> {
  await updateDoc(doc(db, 'job_applications', id), { viewedByAdmin: true });
}

// ── Admin: job openings ──────────────────────────────────────────────────

export async function createJobOpening(input: Omit<JobOpening, 'id'>): Promise<void> {
  await addDoc(collection(db, 'job_openings'), {
    ...input,
    postedAt: serverTimestamp(),
  });
}

export async function updateJobOpening(id: string, patch: Partial<JobOpening>): Promise<void> {
  await updateDoc(doc(db, 'job_openings', id), patch);
}

export async function toggleJobActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, 'job_openings', id), { isActive });
}

export async function deleteJobOpening(id: string): Promise<void> {
  await deleteDoc(doc(db, 'job_openings', id));
}

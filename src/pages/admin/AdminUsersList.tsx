import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { Check, MapPin, Circle } from '@phosphor-icons/react';
import { isUserActive, formatLocation, getLocationCoords, getLocationIp, type StoredLocation } from '@/lib/userTracking';

interface LoginHistoryEntry {
  at: string;
  city: string;
  region: string;
  country: string;
  ip: string;
  lat: number;
  lon: number;
}

interface User {
  id: string;
  email: string;
  displayName?: string;
  lastLogin?: string;
  lastSeen?: string;
  createdAt?: string;
  suspended: boolean;
  loginCount: number;
  location?: StoredLocation;
  gpsLocation?: StoredLocation;
  loginHistory?: LoginHistoryEntry[];
}

function formatDateTime(value?: string): string {
  if (!value || value === 'Never' || value === 'Unknown') return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(value?: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function permissionHint(code: string): string {
  if (code === 'permission-denied') {
    return 'Firestore rules for the users collection are not deployed yet. Run: npm run deploy:rules';
  }
  return code;
}

export default function AdminUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'online' | 'suspended'>('all');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined;

    const subscribeUsers = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !isAuthorizedAdmin(currentUser)) {
        setLoading(false);
        return;
      }

      try {
        await currentUser.getIdToken(true);
      } catch {
        // Continue — token may still be valid
      }

      setLoading(true);
      firestoreUnsub = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const usersList: User[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            usersList.push({
              id: d.id,
              email: data.email || 'Unknown',
              displayName: data.displayName || '',
              lastLogin: data.lastLogin || 'Never',
              lastSeen: data.lastSeen || data.lastLogin || 'Never',
              createdAt: data.createdAt || 'Unknown',
              suspended: data.suspended || false,
              loginCount: data.loginCount || 0,
              location: data.location ?? data.gpsLocation,
            gpsLocation: data.gpsLocation,
              loginHistory: data.loginHistory,
            });
          });
          usersList.sort((a, b) => {
            const dateA = new Date(a.lastSeen || a.lastLogin || 0).getTime();
            const dateB = new Date(b.lastSeen || b.lastLogin || 0).getTime();
            return dateB - dateA;
          });
          setUsers(usersList);
          setError(null);
          setLoading(false);
        },
        (err) => {
          console.error('Firestore users error:', err);
          const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
          setError(`${err.message}${code ? ` (${permissionHint(code)})` : ''}`);
          setLoading(false);
        },
      );
    };

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (firestoreUnsub) {
        firestoreUnsub();
        firestoreUnsub = undefined;
      }

      if (user && isAuthorizedAdmin(user)) {
        void subscribeUsers();
      } else {
        setLoading(false);
        setUsers([]);
      }
    });

    return () => {
      authUnsub();
      firestoreUnsub?.();
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const q = search.toLowerCase();
    const matchesSearch =
      user.email.toLowerCase().includes(q) ||
      (user.displayName?.toLowerCase().includes(q) ?? false) ||
      formatLocation(user.location).toLowerCase().includes(q);
    const online = isUserActive(user.lastSeen);
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && !user.suspended) ||
      (filterStatus === 'online' && online && !user.suspended) ||
      (filterStatus === 'suspended' && user.suspended);
    return matchesSearch && matchesFilter;
  });

  const handleSuspend = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { suspended: true });
    } catch (err) {
      console.error('Error suspending user:', err);
      alert('Failed to suspend user. Deploy Firestore rules with: npm run deploy:rules');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { suspended: false });
    } catch (err) {
      console.error('Error unsuspending user:', err);
      alert('Failed to unsuspend user. Deploy Firestore rules with: npm run deploy:rules');
    }
  };

  const activeCount = users.filter((u) => !u.suspended).length;
  const suspendedCount = users.filter((u) => u.suspended).length;
  const onlineNow = users.filter((u) => !u.suspended && isUserActive(u.lastSeen)).length;
  const loggedInToday = users.filter((u) => !u.suspended && isToday(u.lastLogin)).length;
  const totalLogins = users.reduce((sum, u) => sum + u.loginCount, 0);

  if (error) {
    return (
      <AdminLayout title="Users">
        <div className="flex items-center justify-center p-6 sm:p-8">
          <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 sm:p-6">
            <h2 className="mb-2 font-semibold text-red-800">Error Loading Users</h2>
            <p className="text-sm text-red-700">{error}</p>
            <div className="mt-4 rounded-md border border-red-100 bg-white p-3 text-xs text-gray-700">
              <p className="font-semibold text-black">Fix (one-time setup):</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Install Firebase CLI: <code className="text-[11px]">npm install -g firebase-tools</code></li>
                <li>Login: <code className="text-[11px]">firebase login</code></li>
                <li>Set project: <code className="text-[11px]">firebase use YOUR_PROJECT_ID</code></li>
                <li>Deploy rules: <code className="text-[11px]">npm run deploy:rules</code></li>
              </ol>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users">
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        <div className="mb-5">
          <h1 className="font-serif text-2xl text-black sm:text-3xl">Users Dashboard</h1>
          <p className="mt-1 font-sans text-sm text-gray-600">
            Live monitoring · login activity · location · suspend controls
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-6 lg:gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-black' },
            { label: 'Active Accounts', value: activeCount, color: 'text-green-600' },
            { label: 'Online Now', value: onlineNow, color: 'text-emerald-600' },
            { label: 'Logged In Today', value: loggedInToday, color: 'text-blue-600' },
            { label: 'Suspended', value: suspendedCount, color: 'text-red-600' },
            { label: 'Total Logins', value: totalLogins, color: 'text-gray-800' },
          ].map((stat) => (
            <div key={stat.label} className="border border-gray-200 bg-white p-4 sm:p-5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                {stat.label}
              </p>
              <p className={`mt-2 font-serif text-2xl font-bold sm:text-3xl ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
          <input
            type="search"
            placeholder="Search by email, name, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] w-full border-0 border-b border-gray-300 bg-transparent pb-2 font-sans text-base outline-none focus:border-black sm:flex-1 sm:text-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="min-h-[44px] w-full border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black sm:w-auto"
          >
            <option value="all">All Users</option>
            <option value="online">Online Now</option>
            <option value="active">Active Accounts</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse border border-gray-200 bg-white" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="border border-gray-200 bg-white p-8 text-center text-gray-500 sm:p-12">
            {users.length === 0
              ? 'No users yet. Users appear here when they sign in with Google on the website.'
              : 'No matching users found.'}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredUsers.map((user) => {
                const online = isUserActive(user.lastSeen);
                const coords = getLocationCoords(user.location ?? user.gpsLocation);
                return (
                  <article key={user.id} className="border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-all font-sans text-sm font-medium text-black">{user.email}</p>
                      {online && !user.suspended && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Circle size={8} weight="fill" />
                          Online
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-gray-600">
                      <span>Logins: {user.loginCount}</span>
                      <span>Last seen: {formatDateTime(user.lastSeen)}</span>
                    </div>
                    <p className="mt-2 flex items-start gap-1 text-xs text-gray-600">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      {formatLocation(user.location ?? user.gpsLocation)}
                      {coords ? (
                        <span className="text-gray-400">
                          {' '}
                          ({coords.lat.toFixed(2)}, {coords.lng.toFixed(2)})
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.suspended ? 'Suspended' : 'Active'}
                      </span>
                      {user.suspended ? (
                        <button
                          type="button"
                          onClick={() => handleUnsuspend(user.id)}
                          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-xs font-medium text-green-700"
                        >
                          <Check size={16} />
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSuspend(user.id)}
                          className="min-h-[44px] rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {[
                        'User',
                        'Location',
                        'Logins',
                        'Last Login',
                        'Last Seen',
                        'Status',
                        'Actions',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 lg:px-6"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => {
                      const online = isUserActive(user.lastSeen);
                      const loc = user.location ?? user.gpsLocation;
                      const coords = getLocationCoords(loc);
                      const ip = getLocationIp(loc);
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-4 lg:px-6">
                            <p className="text-sm font-medium text-black">{user.email}</p>
                            {user.displayName && (
                              <p className="text-xs text-gray-500">{user.displayName}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                            <div className="flex items-start gap-1.5">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                              <div>
                                <p>{formatLocation(loc)}</p>
                                {ip && (
                                  <p className="text-[11px] text-gray-400">IP: {ip}</p>
                                )}
                                {coords ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-gray-500 underline hover:text-black"
                                  >
                                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · Map
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">{user.loginCount}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                            {formatDateTime(user.lastLogin)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                            <div className="flex items-center gap-2">
                              {online && !user.suspended && (
                                <Circle size={8} weight="fill" className="text-emerald-500" />
                              )}
                              {formatDateTime(user.lastSeen)}
                            </div>
                          </td>
                          <td className="px-4 py-4 lg:px-6">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                user.suspended
                                  ? 'bg-red-100 text-red-800'
                                  : online
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {user.suspended ? 'Suspended' : online ? 'Online' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-4 lg:px-6">
                            {user.suspended ? (
                              <button
                                type="button"
                                onClick={() => handleUnsuspend(user.id)}
                                className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700"
                              >
                                <Check size={16} />
                                Unsuspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSuspend(user.id)}
                                className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

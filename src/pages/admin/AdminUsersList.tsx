import { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { Check } from '@phosphor-icons/react';

interface User {
  id: string;
  email: string;
  lastLogin?: string;
  createdAt?: string;
  suspended: boolean;
  loginCount: number;
}

export default function AdminUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          usersList.push({
            id: d.id,
            email: data.email || 'Unknown',
            lastLogin: data.lastLogin || 'Never',
            createdAt: data.createdAt || 'Unknown',
            suspended: data.suspended || false,
            loginCount: data.loginCount || 0,
          });
        });
        usersList.sort((a, b) => {
          const dateA = new Date(a.lastLogin || 0).getTime();
          const dateB = new Date(b.lastLogin || 0).getTime();
          return dateB - dateA;
        });
        setUsers(usersList);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && !user.suspended) ||
      (filterStatus === 'suspended' && user.suspended);
    return matchesSearch && matchesFilter;
  });

  const handleSuspend = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { suspended: true });
    } catch (err) {
      console.error('Error suspending user:', err);
      alert('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { suspended: false });
    } catch (err) {
      console.error('Error unsuspending user:', err);
      alert('Failed to unsuspend user');
    }
  };

  const activeCount = users.filter((u) => !u.suspended).length;
  const suspendedCount = users.filter((u) => u.suspended).length;
  const totalLogins = users.reduce((sum, u) => sum + u.loginCount, 0);

  if (error) {
    return (
      <AdminLayout title="Users">
        <div className="flex items-center justify-center p-6 sm:p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-5 sm:p-6">
            <h2 className="mb-2 font-semibold text-red-800">Error Loading Users</h2>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users">
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        <div className="mb-5">
          <h1 className="font-serif text-2xl text-black sm:text-3xl">Users Management</h1>
          <p className="mt-1 font-sans text-sm text-gray-600">Track and manage user accounts</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {[
            { label: 'Total Users', value: users.length, color: 'text-black' },
            { label: 'Active', value: activeCount, color: 'text-green-600' },
            { label: 'Suspended', value: suspendedCount, color: 'text-red-600' },
            { label: 'Total Logins', value: totalLogins, color: 'text-blue-600' },
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
            placeholder="Search users by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] w-full border-0 border-b border-gray-300 bg-transparent pb-2 font-sans text-base outline-none focus:border-black sm:flex-1 sm:text-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'suspended')}
            className="min-h-[44px] w-full border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black sm:w-auto"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
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
            {users.length === 0 ? 'No users found in the database yet.' : 'No matching users found.'}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredUsers.map((user) => (
                <article key={user.id} className="border border-gray-200 bg-white p-4">
                  <p className="break-all font-sans text-sm font-medium text-black">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-gray-600">
                    <span>Logins: {user.loginCount}</span>
                    <span>
                      Last:{' '}
                      {typeof user.lastLogin === 'string' && user.lastLogin !== 'Never'
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : user.lastLogin}
                    </span>
                  </div>
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
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {['Email', 'Logins', 'Last Login', 'Joined', 'Status', 'Actions'].map((h) => (
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
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-black lg:px-6">{user.email}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">{user.loginCount}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                          {typeof user.lastLogin === 'string' && user.lastLogin !== 'Never'
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : user.lastLogin}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                          {typeof user.createdAt === 'string'
                            ? new Date(user.createdAt).toLocaleDateString()
                            : user.createdAt}
                        </td>
                        <td className="px-4 py-4 lg:px-6">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.suspended ? 'Suspended' : 'Active'}
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
                    ))}
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

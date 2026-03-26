'use client';

/**
 * Admin Panel
 *
 * Features:
 * - System statistics dashboard
 * - Credit management (grant credits to users)
 * - User management table
 * - Transaction audit log (per user, expandable)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  Coins,
  TrendingUp,
  Gift,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
  totalCreditsGranted: number;
  totalCreditsConsumed: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  adminUser?: { email: string; name: string | null } | null;
}

interface Stats {
  users: {
    total: number;
    admins: number;
    active: number;
    withCredits: number;
  };
  credits: {
    totalAvailable: number;
    totalGranted: number;
    totalConsumed: number;
  };
  jobs: {
    byStatus: Record<string, number>;
    total: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grant credits form state
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  // User search
  const [searchEmail, setSearchEmail] = useState('');

  // Expanded user rows (for transaction history)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userTransactions, setUserTransactions] = useState<
    Map<string, Transaction[]>
  >(new Map());

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    // Load initial data
    loadData();
  }, [status, session, router]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users?limit=50${searchEmail ? `&email=${searchEmail}` : ''}`),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load admin data');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      setStats(statsData.stats);
      setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantLoading(true);
    setGrantError(null);
    setGrantSuccess(null);

    try {
      const amount = parseInt(grantAmount, 10);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantEmail,
          amount,
          reason: grantReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to grant credits');
      }

      setGrantSuccess(
        `Successfully granted ${amount} credits to ${grantEmail}`
      );
      setGrantEmail('');
      setGrantAmount('');
      setGrantReason('');

      // Reload data
      loadData();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGrantLoading(false);
    }
  };

  const toggleUserExpand = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);

    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
    } else {
      newExpanded.add(userId);
      setExpandedUsers(newExpanded);

      // Load transactions if not already loaded
      if (!userTransactions.has(userId)) {
        try {
          const res = await fetch(
            `/api/admin/credits/transactions?userId=${userId}&limit=20`
          );
          if (res.ok) {
            const data = await res.json();
            setUserTransactions(
              new Map(userTransactions.set(userId, data.transactions))
            );
          }
        } catch (err) {
          console.error('Failed to load transactions:', err);
        }
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Error</h2>
          </div>
          <p className="text-red-300">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold">{stats.users.total}</h3>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.users.active} active • {stats.users.admins} admins
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <Coins className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold">
                {stats.credits.totalAvailable.toLocaleString()}
              </h3>
              <p className="text-gray-400 text-sm">Credits Available</p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.users.withCredits} users with credits
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <Gift className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold">
                {stats.credits.totalGranted.toLocaleString()}
              </h3>
              <p className="text-gray-400 text-sm">Credits Granted</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold">
                {stats.credits.totalConsumed.toLocaleString()}
              </h3>
              <p className="text-gray-400 text-sm">Credits Consumed</p>
            </div>
          </div>
        )}

        {/* Grant Credits Form */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6 text-purple-400" />
            Grant Credits
          </h2>

          <form onSubmit={handleGrantCredits} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  User Email
                </label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  required
                  min="1"
                  max="10000"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Monthly subscription"
                />
              </div>
            </div>

            {grantSuccess && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-300 text-sm">
                {grantSuccess}
              </div>
            )}

            {grantError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                {grantError}
              </div>
            )}

            <button
              type="submit"
              disabled={grantLoading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {grantLoading ? 'Granting...' : 'Grant Credits'}
            </button>
          </form>
        </div>

        {/* User Management Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              User Management
            </h2>

            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              placeholder="Search by email..."
              className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Role
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Credits
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Granted
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Consumed
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Created
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <>
                    <tr
                      key={user.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          {user.name && (
                            <div className="text-xs text-gray-500">
                              {user.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {user.credits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-green-400">
                        +{user.totalCreditsGranted}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-orange-400">
                        -{user.totalCreditsConsumed}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleUserExpand(user.id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          {expandedUsers.has(user.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Transaction History */}
                    {expandedUsers.has(user.id) && (
                      <tr>
                        <td colSpan={7} className="bg-gray-900/50 p-4">
                          <h4 className="text-sm font-medium mb-2 text-gray-400">
                            Transaction History
                          </h4>
                          {userTransactions.get(user.id)?.length ? (
                            <div className="space-y-2">
                              {userTransactions.get(user.id)!.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between text-sm bg-gray-800/50 rounded p-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        tx.transactionType === 'grant'
                                          ? 'bg-green-500/20 text-green-300'
                                          : tx.transactionType === 'deduct'
                                          ? 'bg-red-500/20 text-red-300'
                                          : 'bg-blue-500/20 text-blue-300'
                                      }`}
                                    >
                                      {tx.transactionType}
                                    </span>
                                    <span className="text-gray-300">
                                      {tx.reason}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span
                                      className={`font-mono ${
                                        tx.amount >= 0
                                          ? 'text-green-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {tx.amount >= 0 ? '+' : ''}
                                      {tx.amount}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                      {formatDate(tx.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              No transactions yet
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

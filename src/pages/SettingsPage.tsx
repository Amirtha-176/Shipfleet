import React, { useState } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Database,
  Radio,
  RefreshCw,
  CheckCircle2,
  Lock,
  User,
  BellRing
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { authService, systemService } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';

interface SettingsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { onlineCount } = useSocket();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalAisBeacons, setCriticalAisBeacons] = useState(true);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast('success', 'Password Updated', 'Your security password has been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all operational data to the clean baseline database state?')) {
      return;
    }

    setIsResettingData(true);
    try {
      await systemService.resetDemoData();
      showToast('success', 'Database Reset', 'Restored clean maritime operational baseline.');
      refreshUser();
    } catch (err) {
      showToast('error', 'Reset Failed', 'Failed to reset operational database.');
    } finally {
      setIsResettingData(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto text-xs">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
          <Settings className="w-7 h-7 text-cyan-400" />
          <span>System Settings &amp; Security</span>
        </h1>
        <p className="text-slate-400 mt-1">
          Profile credentials, access tier verification, telemetry sync parameters &amp; database health.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile & Security Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Operator Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Full Name</span>
                <div className="font-bold text-white text-sm mt-0.5">{user?.name}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Official Email</span>
                <div className="font-bold text-white text-sm mt-0.5">{user?.email}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Access Tier</span>
                <div className="font-bold text-cyan-400 uppercase text-sm mt-0.5">{user?.role}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Department</span>
                <div className="font-bold text-white text-sm mt-0.5">{user?.department || 'Operations'}</div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-rose-400" />
              <span>Change Security Password</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">New Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* System & Telemetry Right */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Platform Health &amp; Architecture</span>
            </h2>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Database Engine</span>
                <span className="font-semibold text-emerald-400">MongoDB File-Store Active</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Caching Layer</span>
                <span className="font-semibold text-cyan-400">Redis-Compatible In-Memory</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Socket.io Connections</span>
                <span className="font-semibold text-white">{onlineCount} Active Sessions</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Telemetry Frequency</span>
                <span className="font-mono text-slate-300 font-semibold">6.0s AIS Cycle</span>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={handleResetData}
                  disabled={isResettingData}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResettingData ? 'animate-spin' : ''}`} />
                  <span>Restore Operational Baseline Data</span>
                </button>
              </div>
            )}
          </div>

          {/* Operational Notifications */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center space-x-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>Dispatch Alerts</span>
            </h2>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Critical Fuel Warnings</div>
                  <div className="text-[10px] text-slate-400">Alerts when bunkers drop below 1,000 MT</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Weather &amp; Delay Advisories</div>
                  <div className="text-[10px] text-slate-400">Real-time tropical storm routing alerts</div>
                </div>
                <input
                  type="checkbox"
                  checked={criticalAisBeacons}
                  onChange={(e) => setCriticalAisBeacons(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

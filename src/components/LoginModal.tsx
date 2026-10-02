import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Ship, X, Check, KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'admin' | 'user';
  onSuccess: (role: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'admin',
  onSuccess
}) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultRole === 'user') {
      setEmail('user@shipfleet.com');
      setPassword('User@123');
    } else {
      setEmail('admin@shipfleet.com');
      setPassword('Admin@123');
    }
    setErrorMessage(null);
  }, [defaultRole, isOpen]);

  if (!isOpen) return null;

  const handlePreFill = (role: 'admin' | 'user') => {
    setErrorMessage(null);
    if (role === 'admin') {
      setEmail('admin@shipfleet.com');
      setPassword('Admin@123');
    } else {
      setEmail('user@shipfleet.com');
      setPassword('User@123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Authentication Successful', `Welcome aboard, ${email}`);
      onClose();
      onSuccess(result.role || 'viewer');
    } else {
      setErrorMessage(result.message || 'Invalid email or password.');
      showToast('error', 'Login Failed', result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Ship className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">ShipFleet Operations</h2>
          <p className="text-xs text-slate-400">
            Sign in to access fleet control, voyage monitoring &amp; telemetry
          </p>
        </div>

        {/* Quick Demo Pre-fill Tabs (Only 2 Logins: Admin and User) */}
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Select Demo Account:
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePreFill('admin')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                email.includes('admin')
                  ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm ring-1 ring-rose-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreFill('user')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                !email.includes('admin')
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm ring-1 ring-blue-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>User Login</span>
            </button>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Authorized Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@shipfleet.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
              />
              <span>Remember this session</span>
            </label>
            <span className="text-slate-500 text-[11px]">JWT Bearer Auth</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Authenticate &amp; Enter Dashboard</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

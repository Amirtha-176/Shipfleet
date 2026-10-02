import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole } from '../types/client.ts';
import { authService } from '../services/api.ts';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isOperator: boolean;
  isViewer: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; role?: UserRole }>;
  logout: () => Promise<void>;
  switchUserRoleDemo: (role: 'admin' | 'user') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fleetops_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('fleetops_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setToken(storedToken);
    } catch (err) {
      console.warn('Failed to validate session token:', err);
      localStorage.removeItem('fleetops_token');
      localStorage.removeItem('fleetops_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data) {
        localStorage.setItem('fleetops_token', res.data.token);
        localStorage.setItem('fleetops_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        setToken(res.data.token);
        return { success: true, message: 'Logged in successfully', role: res.data.user.role };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout().catch(() => {});
      }
    } finally {
      localStorage.removeItem('fleetops_token');
      localStorage.removeItem('fleetops_user');
      setUser(null);
      setToken(null);
    }
  };

  // Quick switcher for demo evaluation (2 primary logins: Admin and User)
  const switchUserRoleDemo = async (role: 'admin' | 'user') => {
    let email = 'user@shipfleet.com';
    let password = 'User@123';
    if (role === 'admin') {
      email = 'admin@shipfleet.com';
      password = 'Admin@123';
    }
    await login(email, password);
  };

  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user' || user?.role === 'operator' || user?.role === 'viewer';
  const isOperator = isUser; // User has full operator operational capabilities
  const isViewer = isUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isUser,
        isOperator,
        isViewer,
        login,
        logout,
        switchUserRoleDemo,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

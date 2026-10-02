import axios from 'axios';
import {
  IUser,
  IVessel,
  IVoyage,
  ICargo,
  IFuelRecord,
  IMaintenance,
  IPort,
  ICrew,
  IAlert,
  IDashboardStats,
  ITrackingItem,
  IAuditLog
} from '../types/client.ts';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fleetops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected routes, can trigger auth reset
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
        localStorage.removeItem('fleetops_token');
        localStorage.removeItem('fleetops_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { user: IUser; token: string }; message: string }>('/auth/login', {
      email,
      password
    });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get<{ success: boolean; data: IUser }>('/auth/me');
    return res.data.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  }
};

export const dashboardService = {
  getStats: async () => {
    const res = await api.get<{ success: boolean; data: IDashboardStats }>('/dashboard/stats');
    return res.data.data;
  },
  getAnalytics: async () => {
    const res = await api.get<{ success: boolean; data: any }>('/dashboard/analytics');
    return res.data.data;
  }
};

export const vesselService = {
  getAll: async (params?: { status?: string; type?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IVessel[] }>('/vessels', { params });
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: IVessel }>('/vessels/' + id);
    return res.data.data;
  },
  create: async (data: Partial<IVessel>) => {
    const res = await api.post<{ success: boolean; data: IVessel; message: string }>('/vessels', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<IVessel>) => {
    const res = await api.put<{ success: boolean; data: IVessel; message: string }>('/vessels/' + id, data);
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/vessels/' + id);
    return res.data;
  }
};

export const voyageService = {
  getAll: async (params?: { status?: string; vesselId?: string; origin?: string; destination?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IVoyage[] }>('/voyages', { params });
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: IVoyage }>('/voyages/' + id);
    return res.data.data;
  },
  create: async (data: Partial<IVoyage>) => {
    const res = await api.post<{ success: boolean; data: IVoyage; message: string }>('/voyages', data);
    return res.data.data;
  },
  updateStatus: async (id: string, status: string, delayReason?: string) => {
    const res = await api.patch<{ success: boolean; data: IVoyage }>('/voyages/' + id + '/status', { status, delayReason });
    return res.data.data;
  },
  assignCargo: async (voyageId: string, cargoId: string) => {
    const res = await api.post<{ success: boolean; data: IVoyage }>('/voyages/' + voyageId + '/assign-cargo', { cargoId });
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/voyages/' + id);
    return res.data;
  }
};

export const trackingService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: ITrackingItem[] }>('/tracking');
    return res.data.data;
  },
  updateLocation: async (vesselId: string, location: { lat: number; lng: number; speedKnots?: number; heading?: number }) => {
    const res = await api.put('/tracking/' + vesselId, location);
    return res.data;
  }
};

export const cargoService = {
  getAll: async (params?: { status?: string; type?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: ICargo[] }>('/cargo', { params });
    return res.data.data;
  },
  create: async (data: Partial<ICargo>) => {
    const res = await api.post<{ success: boolean; data: ICargo; message: string }>('/cargo', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<ICargo>) => {
    const res = await api.put<{ success: boolean; data: ICargo }>('/cargo/' + id, data);
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/cargo/' + id);
    return res.data;
  }
};

export const fuelService = {
  getAll: async (params?: { vesselId?: string; fuelType?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IFuelRecord[] }>('/fuel', { params });
    return res.data.data;
  },
  create: async (data: Partial<IFuelRecord>) => {
    const res = await api.post<{ success: boolean; data: IFuelRecord; message: string }>('/fuel', data);
    return res.data.data;
  },
  getAnalytics: async () => {
    const res = await api.get<{ success: boolean; data: any }>('/fuel/analytics');
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/fuel/' + id);
    return res.data;
  }
};

export const maintenanceService = {
  getAll: async (params?: { status?: string; priority?: string; vesselId?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IMaintenance[] }>('/maintenance', { params });
    return res.data.data;
  },
  create: async (data: Partial<IMaintenance>) => {
    const res = await api.post<{ success: boolean; data: IMaintenance; message: string }>('/maintenance', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<IMaintenance>) => {
    const res = await api.put<{ success: boolean; data: IMaintenance }>('/maintenance/' + id, data);
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/maintenance/' + id);
    return res.data;
  }
};

export const portService = {
  getAll: async (params?: { search?: string; country?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IPort[] }>('/ports', { params });
    return res.data.data;
  },
  create: async (data: Partial<IPort>) => {
    const res = await api.post<{ success: boolean; data: IPort }>('/ports', data);
    return res.data.data;
  }
};

export const crewService = {
  getAll: async (params?: { vesselId?: string; role?: string; status?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: ICrew[] }>('/crew', { params });
    return res.data.data;
  },
  create: async (data: Partial<ICrew>) => {
    const res = await api.post<{ success: boolean; data: ICrew }>('/crew', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<ICrew>) => {
    const res = await api.put<{ success: boolean; data: ICrew }>('/crew/' + id, data);
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/crew/' + id);
    return res.data;
  }
};

export const alertService = {
  getAll: async (params?: { resolved?: string | boolean; severity?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: IAlert[] }>('/alerts', { params });
    return res.data.data;
  },
  resolve: async (id: string) => {
    const res = await api.patch<{ success: boolean; data: IAlert; message: string }>('/alerts/' + id + '/resolve');
    return res.data.data;
  }
};

export const userService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: IUser[] }>('/users');
    return res.data.data;
  },
  create: async (data: any) => {
    const res = await api.post<{ success: boolean; data: IUser }>('/users', data);
    return res.data.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; data: IUser }>('/users/' + id, data);
    return res.data.data;
  },
  toggleStatus: async (id: string) => {
    const res = await api.patch<{ success: boolean; data: IUser }>('/users/' + id + '/status');
    return res.data.data;
  },
  delete: async (id: string) => {
    const res = await api.delete('/users/' + id);
    return res.data;
  }
};

export const auditService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: IAuditLog[] }>('/audit-logs');
    return res.data.data;
  }
};

export const reportService = {
  exportCsvUrl: (type: 'fleet' | 'voyages' | 'fuel' | 'maintenance') => {
    return '/api/reports/export/' + type;
  }
};

export const systemService = {
  resetDemoData: async () => {
    const res = await api.post('/admin/reset-demo');
    return res.data;
  }
};

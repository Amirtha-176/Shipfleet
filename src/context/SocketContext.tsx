import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.tsx';

interface ActivityItem {
  id: string;
  type: string;
  message?: string;
  user?: { id?: string; name?: string; role?: string; email?: string };
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  onlineCount: number;
  onlineUsers: Array<{ email?: string; name?: string; role?: string }>;
  activities: ActivityItem[];
  telemetryUpdates: Record<string, { lat: number; lng: number; speedKnots: number; updatedAt: string }>;
  recentAlertCount: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ email?: string; name?: string; role?: string }>>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'init_1',
      type: 'SYSTEM',
      message: 'FleetOps AIS satellite stream connected and synchronized',
      timestamp: new Date().toISOString()
    }
  ]);
  const [telemetryUpdates, setTelemetryUpdates] = useState<Record<string, { lat: number; lng: number; speedKnots: number; updatedAt: string }>>({});
  const [recentAlertCount, setRecentAlertCount] = useState<number>(4);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      if (user) {
        s.emit('user:identify', {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email
        });
      }
    });

    s.on('presence:update', (data: { onlineCount: number; users: Array<any> }) => {
      setOnlineCount(data.onlineCount || 1);
      setOnlineUsers(data.users || []);
    });

    s.on('user:activity', (activity: any) => {
      const item: ActivityItem = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        type: activity.type || 'ACTIVITY',
        message: activity.message || `${activity.user?.name || 'User'} performed an action`,
        user: activity.user,
        timestamp: activity.timestamp || new Date().toISOString()
      };
      setActivities((prev) => [item, ...prev.slice(0, 24)]);
    });

    s.on('vessel:telemetry', (data: { vesselId: string; location: any }) => {
      if (data && data.vesselId) {
        setTelemetryUpdates((prev) => ({
          ...prev,
          [data.vesselId]: {
            lat: data.location.lat,
            lng: data.location.lng,
            speedKnots: data.location.speedKnots,
            updatedAt: data.location.updatedAt
          }
        }));
      }
    });

    s.on('alert:resolved', () => {
      setRecentAlertCount((prev) => Math.max(0, prev - 1));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineCount,
        onlineUsers,
        activities,
        telemetryUpdates,
        recentAlertCount
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

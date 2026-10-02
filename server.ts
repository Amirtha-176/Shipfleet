import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import apiRouter, { setBroadcastFunction } from './src/server/routes.ts';
import { db } from './src/server/storage.ts';
import { IVessel } from './src/server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io on the same HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Configure broadcast function for API routes
setBroadcastFunction((event: string, payload: unknown) => {
  io.emit(event, payload);
});

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io Connection & Presence Handling
interface ConnectedUser {
  socketId: string;
  userId?: string;
  name?: string;
  role?: string;
  email?: string;
  connectedAt: string;
}

const activeSockets = new Map<string, ConnectedUser>();

io.on('connection', (socket) => {
  const userEntry: ConnectedUser = {
    socketId: socket.id,
    connectedAt: new Date().toISOString()
  };
  activeSockets.set(socket.id, userEntry);

  // Send current active user count
  io.emit('presence:update', {
    onlineCount: activeSockets.size,
    users: Array.from(activeSockets.values()).filter((u) => !!u.email)
  });

  socket.on('user:identify', (userData: { id: string; name: string; role: string; email: string }) => {
    if (userData && userData.email) {
      activeSockets.set(socket.id, {
        socketId: socket.id,
        userId: userData.id,
        name: userData.name,
        role: userData.role,
        email: userData.email,
        connectedAt: new Date().toISOString()
      });

      io.emit('presence:update', {
        onlineCount: activeSockets.size,
        users: Array.from(activeSockets.values()).filter((u) => !!u.email)
      });
    }
  });

  socket.on('disconnect', () => {
    activeSockets.delete(socket.id);
    io.emit('presence:update', {
      onlineCount: activeSockets.size,
      users: Array.from(activeSockets.values()).filter((u) => !!u.email)
    });
  });
});

// Live Vessel Telemetry Simulation (nudges in-transit vessels every 6 seconds)
setInterval(() => {
  try {
    const inTransitVessels = db.find('vessels', (v) => v.status === 'In Transit');
    if (inTransitVessels.length === 0) return;

    for (const vsl of inTransitVessels) {
      // Gentle delta along current heading
      const headingRad = (vsl.currentLocation.heading * Math.PI) / 180;
      const speedOffset = (vsl.currentLocation.speedKnots / 3600) * 0.05; // tiny geographical delta
      const latDelta = Math.cos(headingRad) * speedOffset;
      const lngDelta = Math.sin(headingRad) * speedOffset;

      const newLat = Number((vsl.currentLocation.lat + latDelta).toFixed(4));
      const newLng = Number((vsl.currentLocation.lng + lngDelta).toFixed(4));

      // Speed jitter +/- 0.2 knots
      const speedJitter = Number((vsl.currentLocation.speedKnots + (Math.random() * 0.4 - 0.2)).toFixed(1));
      const clampedSpeed = Math.max(10, Math.min(24, speedJitter));

      const updatedLocation = {
        ...vsl.currentLocation,
        lat: newLat,
        lng: newLng,
        speedKnots: clampedSpeed,
        updatedAt: new Date().toISOString()
      };

      db.findByIdAndUpdate('vessels', vsl._id, { currentLocation: updatedLocation });

      io.emit('vessel:telemetry', {
        vesselId: vsl._id,
        vesselName: vsl.name,
        location: updatedLocation
      });
    }
  } catch (err) {
    console.error('Telemetry simulation error:', err);
  }
}, 6000);

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'FleetOps Maritime ShipFleet Platform',
    timestamp: new Date().toISOString()
  });
});

// Vite dev server integration or static file serving
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[FleetOps Maritime] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FleetOps server:', err);
  process.exit(1);
});

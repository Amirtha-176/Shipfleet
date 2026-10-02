import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './storage.ts';
import { cache } from './services/cache.ts';
import { authenticate, requireRole, logAudit, generateToken, AuthRequest } from './middleware/auth.ts';
import {
  IUser,
  IVessel,
  IVoyage,
  ICargo,
  IFuelRecord,
  IMaintenance,
  IPort,
  ICrew,
  IAlert
} from './types.ts';

const router = express.Router();

// Helper for broadcasting socket events (attached via app locals or function)
export let broadcastSocketEvent: (event: string, payload: unknown) => void = () => {};
export function setBroadcastFunction(fn: (event: string, payload: unknown) => void) {
  broadcastSocketEvent = fn;
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

router.post('/auth/register', (req: Request, res: Response): void => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    return;
  }

  const existing = db.findOne('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ success: false, message: 'An account with this email address already exists. Please sign in.' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = db.create('users', {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: 'user',
    status: 'active',
    department: department?.trim() || 'Fleet Operations & Voyage Control',
    lastLogin: new Date().toISOString()
  });

  const token = generateToken(newUser);
  logAudit(req as AuthRequest, 'USER_REGISTER', 'User', newUser._id, `New user ${newUser.email} registered an account`);

  broadcastSocketEvent('user:activity', {
    type: 'REGISTER',
    user: { id: newUser._id, name: newUser.name, role: newUser.role, email: newUser.email },
    timestamp: new Date().toISOString()
  });

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

router.post('/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  const user = db.findOne('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
    return;
  }

  if (user.status === 'disabled') {
    res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
    return;
  }

  // Update lastLogin
  db.findByIdAndUpdate('users', user._id, { lastLogin: new Date().toISOString() });

  const token = generateToken(user);
  logAudit(req as AuthRequest, 'USER_LOGIN', 'User', user._id, `User ${user.email} logged in successfully`);

  broadcastSocketEvent('user:activity', {
    type: 'LOGIN',
    user: { id: user._id, name: user.name, role: user.role, email: user.email },
    timestamp: new Date().toISOString()
  });

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

router.get('/auth/me', authenticate, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({
    success: true,
    data: userWithoutPassword
  });
});

router.post('/auth/logout', authenticate, (req: AuthRequest, res: Response): void => {
  if (req.user) {
    logAudit(req, 'USER_LOGOUT', 'User', req.user._id, `User ${req.user.email} logged out`);
    broadcastSocketEvent('user:activity', {
      type: 'LOGOUT',
      user: { id: req.user._id, name: req.user.name, role: req.user.role },
      timestamp: new Date().toISOString()
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

router.put('/auth/change-password', authenticate, (req: AuthRequest, res: Response): void => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Current and new password are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    return;
  }

  const user = req.user!;
  const isMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!isMatch) {
    res.status(400).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.findByIdAndUpdate('users', user._id, { password: hashedPassword });
  logAudit(req, 'CHANGE_PASSWORD', 'User', user._id, 'Changed personal password');

  res.json({ success: true, message: 'Password updated successfully' });
});

// ----------------------------------------------------
// DASHBOARD & ANALYTICS APIs (Redis cached)
// ----------------------------------------------------

router.get('/dashboard/stats', authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user!;
  const isAdmin = user.role === 'admin';
  const cacheKey = `dashboard:stats:${isAdmin ? 'admin' : user._id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json({ success: true, cached: true, data: cached });
    return;
  }

  const vessels = db.find('vessels');
  const allVoyages = db.find('voyages');
  const allMaintenance = db.find('maintenance');
  const allFuelRecords = db.find('fuelRecords');
  const allCargo = db.find('cargo');
  const alerts = db.find('alerts', (a) => !a.resolved);

  // Scoped to current user if not admin
  const voyages = isAdmin ? allVoyages : allVoyages.filter((v) => v.createdBy === user._id);
  const maintenance = isAdmin ? allMaintenance : allMaintenance.filter((m) => m.createdBy === user._id);
  const fuelRecords = isAdmin ? allFuelRecords : allFuelRecords.filter((f) => f.createdBy === user._id);
  const cargo = isAdmin ? allCargo : allCargo.filter((c) => c.createdBy === user._id);

  const totalVessels = vessels.length;
  const activeVessels = vessels.filter((v) => v.status === 'Active' || v.status === 'In Transit').length;
  const vesselsInMaintenance = vessels.filter((v) => v.status === 'Maintenance').length;
  const dockedVessels = vessels.filter((v) => v.status === 'Docked').length;
  const idleVessels = vessels.filter((v) => v.status === 'Idle').length;

  const activeVoyages = voyages.filter((v) => v.status === 'In Transit' || v.status === 'Scheduled').length;
  const completedVoyages = voyages.filter((v) => v.status === 'Completed').length;
  const delayedVoyages = voyages.filter((v) => v.status === 'Delayed').length;

  const pendingMaintenance = maintenance.filter((m) => m.status === 'Scheduled' || m.status === 'In Progress').length;
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.costUSD || 0), 0);

  const fuelConsumedMT = fuelRecords.reduce((sum, f) => sum + (f.quantityMT || 0), 0);
  const totalFuelCostUSD = fuelRecords.reduce((sum, f) => sum + (f.totalCostUSD || 0), 0);

  const cargoInTransitTons = cargo
    .filter((c) => c.status === 'In Transit' || c.status === 'Loaded')
    .reduce((sum, c) => sum + (c.weightTons || 0), 0);

  const stats = {
    totalVessels,
    activeVessels,
    vesselsInMaintenance,
    dockedVessels,
    idleVessels,
    activeVoyages,
    completedVoyages,
    delayedVoyages,
    pendingMaintenance,
    totalMaintenanceCost,
    fuelConsumed: Math.round(fuelConsumedMT),
    totalFuelCostUSD,
    cargoInTransit: Math.round(cargoInTransitTons),
    activeAlerts: alerts.length,
    userScoped: !isAdmin
  };

  cache.set(cacheKey, stats, 10);
  res.json({ success: true, data: stats });
});

router.get('/dashboard/analytics', authenticate, (req: Request, res: Response): void => {
  const cached = cache.get('dashboard:analytics');
  if (cached) {
    res.json({ success: true, cached: true, data: cached });
    return;
  }

  const vessels = db.find('vessels');
  const voyages = db.find('voyages');
  const fuelRecords = db.find('fuelRecords');
  const maintenance = db.find('maintenance');

  // Vessel types breakdown
  const typeMap: Record<string, number> = {};
  vessels.forEach((v) => {
    typeMap[v.vesselType] = (typeMap[v.vesselType] || 0) + 1;
  });
  const vesselTypes = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Status breakdown
  const statusMap: Record<string, number> = {};
  vessels.forEach((v) => {
    statusMap[v.status] = (statusMap[v.status] || 0) + 1;
  });
  const vesselStatuses = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Monthly fuel consumption trend (simulated 6-month historical curve)
  const monthlyFuel = [
    { month: 'May', consumption: 3420, cost: 2210000 },
    { month: 'Jun', consumption: 3890, cost: 2540000 },
    { month: 'Jul', consumption: 4120, cost: 2690000 },
    { month: 'Aug', consumption: 4450, cost: 2920000 },
    { month: 'Sep', consumption: 4620, cost: 3045000 },
    { month: 'Oct', consumption: 4310, cost: 2810000 }
  ];

  // Voyage status distribution
  const voyageStats = [
    { name: 'Planned', count: voyages.filter((v) => v.status === 'Planned').length },
    { name: 'In Transit', count: voyages.filter((v) => v.status === 'In Transit').length },
    { name: 'Completed', count: voyages.filter((v) => v.status === 'Completed').length },
    { name: 'Delayed', count: voyages.filter((v) => v.status === 'Delayed').length }
  ];

  // Vessel performance efficiency
  const vesselPerformance = vessels.slice(0, 6).map((v) => {
    const vesselFuel = fuelRecords.filter((f) => f.vesselId === v._id);
    const avgEfficiency = vesselFuel.length > 0
      ? vesselFuel.reduce((acc, f) => acc + f.fuelEfficiencyNMPerMT, 0) / vesselFuel.length
      : 3.8;
    return {
      vesselName: v.name,
      type: v.vesselType,
      efficiency: Number(avgEfficiency.toFixed(2)),
      currentFuel: v.currentFuel,
      capacityPct: Math.round((v.currentFuel / v.fuelCapacity) * 100)
    };
  });

  const payload = {
    vesselTypes,
    vesselStatuses,
    monthlyFuel,
    voyageStats,
    vesselPerformance,
    totalRecords: {
      vessels: vessels.length,
      voyages: voyages.length,
      maintenance: maintenance.length
    }
  };

  cache.set('dashboard:analytics', payload, 60);
  res.json({ success: true, data: payload });
});

// ----------------------------------------------------
// VESSEL MANAGEMENT APIs (CRUD)
// ----------------------------------------------------

router.get('/vessels', authenticate, (req: Request, res: Response): void => {
  const { status, type, search } = req.query;
  let vessels = db.find('vessels');

  if (status && status !== 'All') {
    vessels = vessels.filter((v) => v.status.toLowerCase() === String(status).toLowerCase());
  }

  if (type && type !== 'All') {
    vessels = vessels.filter((v) => v.vesselType.toLowerCase() === String(type).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    vessels = vessels.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.imoNumber.toLowerCase().includes(q) ||
        v.flag.toLowerCase().includes(q) ||
        v.captain.toLowerCase().includes(q) ||
        v.vesselId.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: vessels.length, data: vessels });
});

router.get('/vessels/:id', authenticate, (req: Request, res: Response): void => {
  const vessel = db.findById('vessels', req.params.id) as IVessel | null;
  if (!vessel) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  // Associated details
  const voyages = db.find('voyages', (v) => v.vesselId === vessel._id);
  const maintenance = db.find('maintenance', (m) => m.vesselId === vessel._id);
  const fuelRecords = db.find('fuelRecords', (f) => f.vesselId === vessel._id);
  const crew = db.find('crew', (c) => c.vesselId === vessel._id);
  const cargo = db.find('cargo', (c) => c.vesselId === vessel._id);
  const activeVoyage = voyages.find((v) => v.status === 'In Transit' || v.status === 'Scheduled');

  res.json({
    success: true,
    data: {
      ...vessel,
      activeVoyage: activeVoyage || null,
      voyages,
      maintenance,
      fuelRecords,
      crew,
      cargo
    }
  });
});

// Admin only: Add Vessel
router.post('/vessels', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const {
    name,
    imoNumber,
    vesselType,
    flag,
    owner,
    captain,
    capacity,
    deadweightTonnage,
    grossTonnage,
    length,
    width,
    draft,
    engineType,
    enginePower,
    fuelType,
    fuelCapacity,
    currentFuel,
    status,
    yearBuilt,
    lastInspection,
    nextInspection,
    insuranceExpiry,
    lat,
    lng,
    portOrArea
  } = req.body;

  if (!name || !imoNumber || !vesselType) {
    res.status(400).json({ success: false, message: 'Name, IMO Number, and Vessel Type are required' });
    return;
  }

  // Check duplicate IMO
  const existing = db.findOne('vessels', (v) => v.imoNumber.toUpperCase() === String(imoNumber).trim().toUpperCase());
  if (existing) {
    res.status(409).json({ success: false, message: `Vessel with IMO ${imoNumber} already exists (${existing.name})` });
    return;
  }

  const count = db.count('vessels');
  const vesselId = `VSL-${100 + count + 1}`;

  const newVessel = db.create('vessels', {
    vesselId,
    imoNumber: String(imoNumber).trim().toUpperCase(),
    name: String(name).trim(),
    vesselType: vesselType || 'Container Ship',
    flag: flag || 'Panama',
    owner: owner || 'FleetOps Maritime Global',
    captain: captain || 'Unassigned',
    capacity: Number(capacity) || 10000,
    deadweightTonnage: Number(deadweightTonnage) || Number(capacity) || 50000,
    grossTonnage: Number(grossTonnage) || 45000,
    length: Number(length) || 280,
    width: Number(width) || 40,
    draft: Number(draft) || 12,
    engineType: engineType || 'MAN B&W 6S60ME',
    enginePower: Number(enginePower) || 25000,
    fuelType: fuelType || 'VLSFO',
    fuelCapacity: Number(fuelCapacity) || 5000,
    currentFuel: Number(currentFuel) || Number(fuelCapacity) * 0.7 || 3500,
    status: status || 'Active',
    yearBuilt: Number(yearBuilt) || 2022,
    lastInspection: lastInspection || new Date().toISOString().split('T')[0],
    nextInspection: nextInspection || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
    insuranceExpiry: insuranceExpiry || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
    currentLocation: {
      lat: Number(lat) || 1.28,
      lng: Number(lng) || 103.85,
      portOrArea: portOrArea || 'Singapore Anchorage',
      speedKnots: status === 'In Transit' ? 14.5 : 0.0,
      heading: 90,
      updatedAt: new Date().toISOString()
    }
  });

  logAudit(req, 'CREATE_VESSEL', 'Vessel', newVessel._id, `Created vessel ${newVessel.name} (${newVessel.imoNumber})`);

  broadcastSocketEvent('vessel:created', newVessel);
  broadcastSocketEvent('user:activity', {
    type: 'VESSEL_ADD',
    message: `${req.user?.name} added new vessel ${newVessel.name}`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, message: 'Vessel registered successfully', data: newVessel });
});

// Admin only: Edit Vessel
router.put('/vessels/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const existing = db.findById('vessels', req.params.id) as IVessel | null;
  if (!existing) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  const updates = { ...req.body };
  delete updates._id;
  delete updates.createdAt;

  if (updates.imoNumber && updates.imoNumber !== existing.imoNumber) {
    const duplicate = db.findOne('vessels', (v) => v._id !== existing._id && v.imoNumber === updates.imoNumber);
    if (duplicate) {
      res.status(409).json({ success: false, message: 'Another vessel already has this IMO number' });
      return;
    }
  }

  const updated = db.findByIdAndUpdate('vessels', existing._id, updates);
  logAudit(req, 'UPDATE_VESSEL', 'Vessel', existing._id, `Updated details for vessel ${existing.name}`);

  broadcastSocketEvent('vessel:updated', updated);
  res.json({ success: true, message: 'Vessel updated successfully', data: updated });
});

// Admin only: Delete Vessel
router.delete('/vessels/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const existing = db.findById('vessels', req.params.id) as IVessel | null;
  if (!existing) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  const deleted = db.findByIdAndDelete('vessels', existing._id);
  logAudit(req, 'DELETE_VESSEL', 'Vessel', existing._id, `Deleted vessel ${existing.name} (${existing.imoNumber})`);

  broadcastSocketEvent('vessel:deleted', { id: existing._id, name: existing.name });
  res.json({ success: true, message: `Vessel ${existing.name} deleted successfully`, data: deleted });
});

// ----------------------------------------------------
// VOYAGE MANAGEMENT APIs
// ----------------------------------------------------

router.get('/voyages', authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user!;
  const { status, vesselId, origin, destination, userId } = req.query;
  let voyages = db.find('voyages');

  // User isolation: non-admin users only view voyages they created
  if (user.role !== 'admin') {
    voyages = voyages.filter((v) => v.createdBy === user._id);
  } else if (userId && userId !== 'All') {
    voyages = voyages.filter((v) => v.createdBy === String(userId));
  }

  if (status && status !== 'All') {
    voyages = voyages.filter((v) => v.status.toLowerCase() === String(status).toLowerCase());
  }

  if (vesselId) {
    voyages = voyages.filter((v) => v.vesselId === String(vesselId));
  }

  if (origin) {
    voyages = voyages.filter((v) => v.originPort.toLowerCase().includes(String(origin).toLowerCase()));
  }

  if (destination) {
    voyages = voyages.filter((v) => v.destinationPort.toLowerCase().includes(String(destination).toLowerCase()));
  }

  res.json({ success: true, count: voyages.length, data: voyages });
});

router.get('/voyages/:id', authenticate, (req: Request, res: Response): void => {
  const voyage = db.findById('voyages', req.params.id) as IVoyage | null;
  if (!voyage) {
    res.status(404).json({ success: false, message: 'Voyage not found' });
    return;
  }

  // Populate assigned cargo
  const assignedCargo = db.find('cargo', (c) => c.voyageId === voyage._id || voyage.assignedCargoIds?.includes(c._id));

  res.json({
    success: true,
    data: {
      ...voyage,
      assignedCargo
    }
  });
});

// Operator and Admin: Create Voyage
router.post('/voyages', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const {
    vesselId,
    originPort,
    destinationPort,
    departureDate,
    estimatedArrival,
    distanceNauticalMiles,
    cargoDescription,
    captain
  } = req.body;

  if (!vesselId || !originPort || !destinationPort) {
    res.status(400).json({ success: false, message: 'Vessel, origin port, and destination port are required' });
    return;
  }

  const vessel = db.findById('vessels', vesselId) as IVessel | null;
  if (!vessel) {
    res.status(404).json({ success: false, message: 'Assigned vessel not found' });
    return;
  }

  const originPortObj = db.findOne('ports', (p) => p.name === originPort || p.portCode === originPort);
  const destPortObj = db.findOne('ports', (p) => p.name === destinationPort || p.portCode === destinationPort);

  const originCoords: [number, number] = originPortObj ? [originPortObj.lat, originPortObj.lng] : [1.28, 103.85];
  const destCoords: [number, number] = destPortObj ? [destPortObj.lat, destPortObj.lng] : [51.95, 4.13];

  const count = db.count('voyages');
  const voyageId = `VYG-${1000 + count + 1}`;

  const dist = Number(distanceNauticalMiles) || 4500;
  const estimatedFuel = Math.round(dist * 0.32);

  const newVoyage = db.create('voyages', {
    voyageId,
    vesselId: vessel._id,
    vesselName: vessel.name,
    originPort: originPortObj ? originPortObj.name : originPort,
    originPortCode: originPortObj ? originPortObj.portCode : 'ORIG',
    originCoords,
    destinationPort: destPortObj ? destPortObj.name : destinationPort,
    destinationPortCode: destPortObj ? destPortObj.portCode : 'DEST',
    destinationCoords: destCoords,
    departureDate: departureDate || new Date().toISOString(),
    estimatedArrival: estimatedArrival || new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    distanceNauticalMiles: dist,
    distanceCovered: 0,
    routeWaypoints: [originCoords, [(originCoords[0] + destCoords[0]) / 2, (originCoords[1] + destCoords[1]) / 2], destCoords],
    status: 'Scheduled',
    captain: captain || vessel.captain,
    crewCount: 22,
    cargoDescription: cargoDescription || 'Commercial Manifest',
    fuelEstimatedMT: estimatedFuel,
    fuelConsumedMT: 0,
    fuelCostUSD: 0,
    assignedCargoIds: [],
    createdBy: req.user?._id,
    createdByName: req.user?.name,
    createdByEmail: req.user?.email
  });

  // Update vessel status
  db.findByIdAndUpdate('vessels', vessel._id, { status: 'In Transit' });

  logAudit(req, 'CREATE_VOYAGE', 'Voyage', newVoyage._id, `Created voyage ${newVoyage.voyageId} for ${vessel.name}`);

  broadcastSocketEvent('voyage:created', newVoyage);
  broadcastSocketEvent('user:activity', {
    type: 'VOYAGE_CREATE',
    message: `${req.user?.name} scheduled voyage ${newVoyage.voyageId} (${vessel.name})`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, message: 'Voyage created successfully', data: newVoyage });
});

// Operator and Admin: Update Voyage Status
router.patch('/voyages/:id/status', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const { status, delayReason } = req.body;
  const voyage = db.findById('voyages', req.params.id) as IVoyage | null;
  if (!voyage) {
    res.status(404).json({ success: false, message: 'Voyage not found' });
    return;
  }

  const updates: Partial<IVoyage> = { status };
  if (delayReason) updates.delayReason = delayReason;
  if (status === 'Completed' || status === 'Arrived') {
    updates.actualArrival = new Date().toISOString();
    updates.distanceCovered = voyage.distanceNauticalMiles;
  }

  const updated = db.findByIdAndUpdate('voyages', voyage._id, updates);

  // If delayed, raise an alert automatically
  if (status === 'Delayed') {
    db.create('alerts', {
      alertType: 'Voyage Delayed',
      severity: 'Warning',
      message: `Voyage ${voyage.voyageId} on ${voyage.vesselName} is delayed: ${delayReason || 'Unforeseen delays reported'}`,
      vesselId: voyage.vesselId,
      vesselName: voyage.vesselName,
      voyageId: voyage._id,
      resolved: false
    });
  }

  logAudit(req, 'UPDATE_VOYAGE_STATUS', 'Voyage', voyage._id, `Changed status of ${voyage.voyageId} to ${status}`);

  broadcastSocketEvent('voyage:updated', updated);
  res.json({ success: true, message: 'Voyage status updated', data: updated });
});

// Operator and Admin: Assign Cargo to Voyage
router.post('/voyages/:id/assign-cargo', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const { cargoId } = req.body;
  const voyage = db.findById('voyages', req.params.id) as IVoyage | null;
  if (!voyage) {
    res.status(404).json({ success: false, message: 'Voyage not found' });
    return;
  }

  const cargo = db.findById('cargo', cargoId) as ICargo | null;
  if (!cargo) {
    res.status(404).json({ success: false, message: 'Cargo record not found' });
    return;
  }

  // Update cargo with voyage reference
  db.findByIdAndUpdate('cargo', cargo._id, {
    voyageId: voyage._id,
    voyageCode: voyage.voyageId,
    vesselId: voyage.vesselId,
    vesselName: voyage.vesselName,
    status: 'In Transit'
  });

  // Update voyage assigned Cargo IDs
  const assignedList = Array.from(new Set([...(voyage.assignedCargoIds || []), cargo._id]));
  const updatedVoyage = db.findByIdAndUpdate('voyages', voyage._id, { assignedCargoIds: assignedList });

  logAudit(req, 'ASSIGN_CARGO', 'Voyage', voyage._id, `Assigned cargo ${cargo.cargoId} to voyage ${voyage.voyageId}`);

  broadcastSocketEvent('voyage:updated', updatedVoyage);
  res.json({ success: true, message: 'Cargo assigned to voyage successfully', data: updatedVoyage });
});

// Admin only: Delete Voyage
router.delete('/voyages/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const voyage = db.findById('voyages', req.params.id) as IVoyage | null;
  if (!voyage) {
    res.status(404).json({ success: false, message: 'Voyage not found' });
    return;
  }

  db.findByIdAndDelete('voyages', voyage._id);
  logAudit(req, 'DELETE_VOYAGE', 'Voyage', voyage._id, `Deleted voyage ${voyage.voyageId}`);
  res.json({ success: true, message: 'Voyage deleted' });
});

// ----------------------------------------------------
// ROUTE TRACKING & LIVE SIMULATION
// ----------------------------------------------------

router.get('/tracking', authenticate, (req: Request, res: Response): void => {
  const vessels = db.find('vessels');
  const voyages = db.find('voyages', (v) => v.status === 'In Transit');

  const trackingData = vessels.map((vsl) => {
    const activeVoyage = voyages.find((vyg) => vyg.vesselId === vsl._id);
    return {
      vesselId: vsl._id,
      name: vsl.name,
      imoNumber: vsl.imoNumber,
      type: vsl.vesselType,
      status: vsl.status,
      lat: vsl.currentLocation.lat,
      lng: vsl.currentLocation.lng,
      speedKnots: vsl.currentLocation.speedKnots,
      heading: vsl.currentLocation.heading,
      portOrArea: vsl.currentLocation.portOrArea,
      updatedAt: vsl.currentLocation.updatedAt,
      voyage: activeVoyage
        ? {
            voyageId: activeVoyage.voyageId,
            origin: activeVoyage.originPort,
            destination: activeVoyage.destinationPort,
            originCoords: activeVoyage.originCoords,
            destinationCoords: activeVoyage.destinationCoords,
            waypoints: activeVoyage.routeWaypoints,
            eta: activeVoyage.estimatedArrival,
            distanceCovered: activeVoyage.distanceCovered,
            totalDistance: activeVoyage.distanceNauticalMiles
          }
        : null
    };
  });

  res.json({ success: true, count: trackingData.length, data: trackingData });
});

// Update vessel location / telemetry
router.put('/tracking/:vesselId', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const { lat, lng, speedKnots, heading, portOrArea } = req.body;
  const vessel = db.findById('vessels', req.params.vesselId) as IVessel | null;
  if (!vessel) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  const updatedLocation = {
    lat: Number(lat) ?? vessel.currentLocation.lat,
    lng: Number(lng) ?? vessel.currentLocation.lng,
    speedKnots: Number(speedKnots) ?? vessel.currentLocation.speedKnots,
    heading: Number(heading) ?? vessel.currentLocation.heading,
    portOrArea: portOrArea || vessel.currentLocation.portOrArea,
    updatedAt: new Date().toISOString()
  };

  const updated = db.findByIdAndUpdate('vessels', vessel._id, { currentLocation: updatedLocation });
  broadcastSocketEvent('vessel:telemetry', { vesselId: vessel._id, location: updatedLocation });

  res.json({ success: true, message: 'Location updated', data: updated });
});

// ----------------------------------------------------
// CARGO MANAGEMENT APIs
// ----------------------------------------------------

router.get('/cargo', authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user!;
  const { status, type, search, userId } = req.query;
  let cargoList = db.find('cargo');

  // User isolation: non-admin users only view cargo manifests they created
  if (user.role !== 'admin') {
    cargoList = cargoList.filter((c) => c.createdBy === user._id);
  } else if (userId && userId !== 'All') {
    cargoList = cargoList.filter((c) => c.createdBy === String(userId));
  }

  if (status && status !== 'All') {
    cargoList = cargoList.filter((c) => c.status.toLowerCase() === String(status).toLowerCase());
  }

  if (type && type !== 'All') {
    cargoList = cargoList.filter((c) => c.cargoType.toLowerCase() === String(type).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    cargoList = cargoList.filter(
      (c) =>
        c.description.toLowerCase().includes(q) ||
        c.cargoId.toLowerCase().includes(q) ||
        c.shipper.toLowerCase().includes(q) ||
        c.consignee.toLowerCase().includes(q) ||
        (c.vesselName && c.vesselName.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: cargoList.length, data: cargoList });
});

// User and Admin: Add Cargo
router.post('/cargo', authenticate, requireRole(['admin', 'user']), (req: AuthRequest, res: Response): void => {
  const {
    cargoType,
    description,
    weightTons,
    containerCount,
    volumeCBM,
    shipper,
    consignee,
    loadingPort,
    dischargePort,
    loadingDate,
    expectedDelivery,
    voyageId
  } = req.body;

  if (!description || !weightTons || !shipper || !consignee) {
    res.status(400).json({ success: false, message: 'Description, weight, shipper, and consignee are required' });
    return;
  }

  const count = db.count('cargo');
  const cargoId = `CRG-${900 + count + 1}`;

  let voyage: IVoyage | null = null;
  if (voyageId) {
    voyage = db.findById('voyages', voyageId);
  }

  const newCargo = db.create('cargo', {
    cargoId,
    cargoType: cargoType || 'Containerized',
    description: String(description).trim(),
    weightTons: Number(weightTons),
    containerCount: containerCount ? Number(containerCount) : undefined,
    volumeCBM: volumeCBM ? Number(volumeCBM) : undefined,
    shipper: String(shipper).trim(),
    consignee: String(consignee).trim(),
    loadingPort: loadingPort || 'Port of Rotterdam',
    dischargePort: dischargePort || 'Port of Singapore',
    loadingDate: loadingDate || new Date().toISOString().split('T')[0],
    expectedDelivery: expectedDelivery || new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
    status: voyage ? 'Loaded' : 'Booked',
    voyageId: voyage ? voyage._id : undefined,
    voyageCode: voyage ? voyage.voyageId : undefined,
    vesselId: voyage ? voyage.vesselId : undefined,
    vesselName: voyage ? voyage.vesselName : undefined,
    createdBy: req.user?._id,
    createdByName: req.user?.name,
    createdByEmail: req.user?.email
  });

  if (voyage) {
    const list = Array.from(new Set([...(voyage.assignedCargoIds || []), newCargo._id]));
    db.findByIdAndUpdate('voyages', voyage._id, { assignedCargoIds: list });
  }

  logAudit(req, 'CREATE_CARGO', 'Cargo', newCargo._id, `Created cargo manifest ${newCargo.cargoId}`);
  broadcastSocketEvent('cargo:created', newCargo);

  res.status(201).json({ success: true, message: 'Cargo created successfully', data: newCargo });
});

// Operator and Admin: Update Cargo
router.put('/cargo/:id', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const cargo = db.findById('cargo', req.params.id) as ICargo | null;
  if (!cargo) {
    res.status(404).json({ success: false, message: 'Cargo not found' });
    return;
  }

  const updates = { ...req.body };
  delete updates._id;
  const updated = db.findByIdAndUpdate('cargo', cargo._id, updates);

  logAudit(req, 'UPDATE_CARGO', 'Cargo', cargo._id, `Updated cargo ${cargo.cargoId}`);
  res.json({ success: true, message: 'Cargo updated successfully', data: updated });
});

// Admin only: Delete Cargo
router.delete('/cargo/:id', authenticate, (req: AuthRequest, res: Response): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Deletion Restricted: Once operational cargo data is submitted, only an Administrator can delete it.'
    });
    return;
  }

  const cargo = db.findById('cargo', req.params.id) as ICargo | null;
  if (!cargo) {
    res.status(404).json({ success: false, message: 'Cargo not found' });
    return;
  }

  db.findByIdAndDelete('cargo', cargo._id);
  logAudit(req, 'DELETE_CARGO', 'Cargo', cargo._id, `Deleted cargo ${cargo.cargoId}`);
  broadcastSocketEvent('cargo:deleted', { id: cargo._id, cargoId: cargo.cargoId });
  res.json({ success: true, message: 'Cargo deleted successfully' });
});

// ----------------------------------------------------
// FUEL OPERATIONS APIs
// ----------------------------------------------------

router.get('/fuel', authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user!;
  const { vesselId, fuelType, userId } = req.query;
  let records = db.find('fuelRecords');

  // User isolation: non-admin users only view fuel records they logged
  if (user.role !== 'admin') {
    records = records.filter((r) => r.createdBy === user._id);
  } else if (userId && userId !== 'All') {
    records = records.filter((r) => r.createdBy === String(userId));
  }

  if (vesselId && vesselId !== 'All') {
    records = records.filter((r) => r.vesselId === String(vesselId));
  }

  if (fuelType && fuelType !== 'All') {
    records = records.filter((r) => r.fuelType === String(fuelType));
  }

  // Sort descending by date
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, count: records.length, data: records });
});

// User and Admin: Log Fuel Record
router.post('/fuel', authenticate, requireRole(['admin', 'user']), (req: AuthRequest, res: Response): void => {
  const {
    vesselId,
    voyageId,
    date,
    fuelType,
    quantityMT,
    unitPriceUSD,
    supplier,
    port,
    engineHours,
    distanceTravelledNM
  } = req.body;

  if (!vesselId || !quantityMT || !unitPriceUSD) {
    res.status(400).json({ success: false, message: 'Vessel, Quantity, and Unit Price are required' });
    return;
  }

  const vessel = db.findById('vessels', vesselId) as IVessel | null;
  if (!vessel) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  const qty = Number(quantityMT);
  const price = Number(unitPriceUSD);
  const totalCost = qty * price;
  const dist = Number(distanceTravelledNM) || 1200;
  const efficiency = qty > 0 ? Number((dist / qty).toFixed(2)) : 0;

  let voyage: IVoyage | null = null;
  if (voyageId) {
    voyage = db.findById('voyages', voyageId);
  }

  const newFuelRecord = db.create('fuelRecords', {
    vesselId: vessel._id,
    vesselName: vessel.name,
    voyageId: voyage ? voyage._id : undefined,
    voyageCode: voyage ? voyage.voyageId : undefined,
    date: date || new Date().toISOString().split('T')[0],
    fuelType: fuelType || vessel.fuelType,
    quantityMT: qty,
    unitPriceUSD: price,
    totalCostUSD: totalCost,
    supplier: supplier || 'Global Bunker Alliance',
    port: port || 'Rotterdam Bunkering Anchorage',
    engineHours: Number(engineHours) || 72,
    distanceTravelledNM: dist,
    fuelEfficiencyNMPerMT: efficiency,
    recordedBy: req.user?.name || req.user?.email || 'Authorized User',
    createdBy: req.user?._id,
    createdByName: req.user?.name,
    createdByEmail: req.user?.email
  });

  // Update vessel current fuel (simulate bunkering or consumption)
  const updatedFuel = Math.min(vessel.fuelCapacity, vessel.currentFuel + qty);
  db.findByIdAndUpdate('vessels', vessel._id, { currentFuel: updatedFuel });

  logAudit(req, 'LOG_FUEL', 'FuelRecord', newFuelRecord._id, `Logged ${qty} MT ${fuelType} for ${vessel.name} ($${totalCost.toLocaleString()})`);

  broadcastSocketEvent('fuel:logged', newFuelRecord);
  broadcastSocketEvent('user:activity', {
    type: 'FUEL_LOG',
    message: `${req.user?.name} logged fuel for ${vessel.name} (${qty} MT)`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, message: 'Fuel record logged successfully', data: newFuelRecord });
});

router.get('/fuel/analytics', authenticate, (req: Request, res: Response): void => {
  const records = db.find('fuelRecords');
  const vessels = db.find('vessels');

  const totalFuelMT = records.reduce((acc, r) => acc + r.quantityMT, 0);
  const totalFuelCostUSD = records.reduce((acc, r) => acc + r.totalCostUSD, 0);
  const averagePricePerMT = totalFuelMT > 0 ? Math.round(totalFuelCostUSD / totalFuelMT) : 660;

  // Breakdown by fuel type
  const typeMap: Record<string, { quantity: number; cost: number }> = {};
  records.forEach((r) => {
    if (!typeMap[r.fuelType]) typeMap[r.fuelType] = { quantity: 0, cost: 0 };
    typeMap[r.fuelType].quantity += r.quantityMT;
    typeMap[r.fuelType].cost += r.totalCostUSD;
  });

  // Vessel comparison
  const vesselEff = vessels.map((v) => {
    const vRecords = records.filter((r) => r.vesselId === v._id);
    const vQty = vRecords.reduce((acc, r) => acc + r.quantityMT, 0);
    const vCost = vRecords.reduce((acc, r) => acc + r.totalCostUSD, 0);
    const avgEff = vRecords.length > 0
      ? vRecords.reduce((acc, r) => acc + r.fuelEfficiencyNMPerMT, 0) / vRecords.length
      : 3.5;
    return {
      vesselName: v.name,
      fuelType: v.fuelType,
      totalMT: vQty,
      totalCostUSD: vCost,
      efficiency: Number(avgEff.toFixed(2))
    };
  });

  res.json({
    success: true,
    data: {
      totalFuelMT,
      totalFuelCostUSD,
      averagePricePerMT,
      byType: Object.entries(typeMap).map(([type, d]) => ({ type, ...d })),
      vesselEfficiency: vesselEff
    }
  });
});

// Admin only: Delete Fuel Record
router.delete('/fuel/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const rec = db.findById('fuelRecords', req.params.id);
  if (!rec) {
    res.status(404).json({ success: false, message: 'Fuel record not found' });
    return;
  }
  db.findByIdAndDelete('fuelRecords', req.params.id);
  res.json({ success: true, message: 'Fuel record deleted' });
});

// ----------------------------------------------------
// MAINTENANCE MANAGEMENT APIs
// ----------------------------------------------------

router.get('/maintenance', authenticate, (req: Request, res: Response): void => {
  const { status, priority, vesselId } = req.query;
  let records = db.find('maintenance');

  if (status && status !== 'All') {
    records = records.filter((m) => m.status.toLowerCase() === String(status).toLowerCase());
  }

  if (priority && priority !== 'All') {
    records = records.filter((m) => m.priority.toLowerCase() === String(priority).toLowerCase());
  }

  if (vesselId && vesselId !== 'All') {
    records = records.filter((m) => m.vesselId === String(vesselId));
  }

  res.json({ success: true, count: records.length, data: records });
});

// Admin only: Schedule Maintenance
router.post('/maintenance', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const {
    vesselId,
    maintenanceType,
    description,
    priority,
    startDate,
    expectedCompletion,
    technician,
    costUSD,
    partsUsed,
    notes
  } = req.body;

  if (!vesselId || !maintenanceType || !description) {
    res.status(400).json({ success: false, message: 'Vessel, maintenance type, and description are required' });
    return;
  }

  const vessel = db.findById('vessels', vesselId) as IVessel | null;
  if (!vessel) {
    res.status(404).json({ success: false, message: 'Vessel not found' });
    return;
  }

  const count = db.count('maintenance');
  const maintenanceId = `MNT-${400 + count + 1}`;

  const newMaintenance = db.create('maintenance', {
    maintenanceId,
    vesselId: vessel._id,
    vesselName: vessel.name,
    maintenanceType: maintenanceType || 'Preventive',
    description: String(description).trim(),
    priority: priority || 'Medium',
    startDate: startDate || new Date().toISOString().split('T')[0],
    expectedCompletion: expectedCompletion || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
    technician: technician || 'ClassNK Certified Technicians',
    costUSD: Number(costUSD) || 12000,
    partsUsed: Array.isArray(partsUsed) ? partsUsed : partsUsed ? [partsUsed] : ['Filter Cartridges', 'O-Rings'],
    status: 'Scheduled',
    notes: notes || ''
  });

  // If critical, trigger an alert
  if (priority === 'Critical' || priority === 'High') {
    db.create('alerts', {
      alertType: 'Maintenance Overdue',
      severity: priority === 'Critical' ? 'Critical' : 'Warning',
      message: `${priority} maintenance scheduled for ${vessel.name}: ${description}`,
      vesselId: vessel._id,
      vesselName: vessel.name,
      resolved: false
    });
  }

  logAudit(req, 'SCHEDULE_MAINTENANCE', 'Maintenance', newMaintenance._id, `Scheduled ${maintenanceType} maintenance for ${vessel.name}`);

  broadcastSocketEvent('maintenance:scheduled', newMaintenance);
  res.status(201).json({ success: true, message: 'Maintenance scheduled successfully', data: newMaintenance });
});

// Admin only: Update Maintenance
router.put('/maintenance/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const m = db.findById('maintenance', req.params.id) as IMaintenance | null;
  if (!m) {
    res.status(404).json({ success: false, message: 'Maintenance record not found' });
    return;
  }

  const updates = { ...req.body };
  delete updates._id;
  if (updates.status === 'Completed' && !updates.actualCompletion) {
    updates.actualCompletion = new Date().toISOString().split('T')[0];
  }

  const updated = db.findByIdAndUpdate('maintenance', m._id, updates);
  logAudit(req, 'UPDATE_MAINTENANCE', 'Maintenance', m._id, `Updated maintenance ${m.maintenanceId}`);

  broadcastSocketEvent('maintenance:updated', updated);
  res.json({ success: true, message: 'Maintenance updated successfully', data: updated });
});

// Admin only: Delete Maintenance
router.delete('/maintenance/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const m = db.findById('maintenance', req.params.id);
  if (!m) {
    res.status(404).json({ success: false, message: 'Maintenance record not found' });
    return;
  }
  db.findByIdAndDelete('maintenance', req.params.id);
  res.json({ success: true, message: 'Maintenance record deleted' });
});

// ----------------------------------------------------
// PORT DIRECTORY APIs
// ----------------------------------------------------

router.get('/ports', authenticate, (req: Request, res: Response): void => {
  const { search, country } = req.query;
  let ports = db.find('ports');

  if (country && country !== 'All') {
    ports = ports.filter((p) => p.country.toLowerCase() === String(country).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    ports = ports.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.portCode.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: ports.length, data: ports });
});

// Admin only: Add Port
router.post('/ports', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, country, city, portCode, lat, lng, capacityTEU, contact, operatingHours, status } = req.body;
  if (!name || !portCode || !country) {
    res.status(400).json({ success: false, message: 'Name, port code, and country are required' });
    return;
  }

  const count = db.count('ports');
  const newPort = db.create('ports', {
    portId: `PRT-${String(portCode).toUpperCase()}`,
    name: String(name).trim(),
    country: String(country).trim(),
    city: String(city || '').trim(),
    portCode: String(portCode).trim().toUpperCase(),
    lat: Number(lat) || 0,
    lng: Number(lng) || 0,
    capacityTEU: Number(capacityTEU) || 5000000,
    contact: contact || 'operations@port.org',
    operatingHours: operatingHours || '24/7 Operations',
    status: status || 'Open'
  });

  logAudit(req, 'CREATE_PORT', 'Port', newPort._id, `Added port ${newPort.name} (${newPort.portCode})`);
  res.status(201).json({ success: true, message: 'Port added successfully', data: newPort });
});

// ----------------------------------------------------
// CREW MANAGEMENT APIs
// ----------------------------------------------------

router.get('/crew', authenticate, (req: Request, res: Response): void => {
  const { vesselId, role, status } = req.query;
  let crewList = db.find('crew');

  if (vesselId && vesselId !== 'All') {
    crewList = crewList.filter((c) => c.vesselId === String(vesselId));
  }

  if (role && role !== 'All') {
    crewList = crewList.filter((c) => c.role.toLowerCase() === String(role).toLowerCase());
  }

  if (status && status !== 'All') {
    crewList = crewList.filter((c) => c.status.toLowerCase() === String(status).toLowerCase());
  }

  res.json({ success: true, count: crewList.length, data: crewList });
});

// Admin only: Add Crew
router.post('/crew', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, role, vesselId, nationality, certification, joiningDate, contractExpiry, contact, status } = req.body;
  if (!name || !role) {
    res.status(400).json({ success: false, message: 'Name and role are required' });
    return;
  }

  let vessel: IVessel | null = null;
  if (vesselId) {
    vessel = db.findById('vessels', vesselId);
  }

  const count = db.count('crew');
  const crewId = `CRW-${200 + count + 1}`;

  const newCrew = db.create('crew', {
    crewId,
    name: String(name).trim(),
    role: role || 'Deck Officer',
    vesselId: vessel ? vessel._id : undefined,
    vesselName: vessel ? vessel.name : undefined,
    nationality: nationality || 'International',
    certification: certification || 'STCW Certified',
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    contractExpiry: contractExpiry || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
    contact: contact || '+1 555 0199',
    status: status || 'On Duty'
  });

  logAudit(req, 'CREATE_CREW', 'Crew', newCrew._id, `Registered crew member ${newCrew.name} (${newCrew.role})`);
  res.status(201).json({ success: true, message: 'Crew member registered successfully', data: newCrew });
});

// Admin only: Edit Crew
router.put('/crew/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const crew = db.findById('crew', req.params.id) as ICrew | null;
  if (!crew) {
    res.status(404).json({ success: false, message: 'Crew member not found' });
    return;
  }

  const updates = { ...req.body };
  delete updates._id;

  if (updates.vesselId) {
    const vessel = db.findById('vessels', updates.vesselId) as IVessel | null;
    if (vessel) updates.vesselName = vessel.name;
  }

  const updated = db.findByIdAndUpdate('crew', crew._id, updates);
  logAudit(req, 'UPDATE_CREW', 'Crew', crew._id, `Updated crew member ${crew.name}`);
  res.json({ success: true, message: 'Crew updated successfully', data: updated });
});

// Admin only: Delete Crew
router.delete('/crew/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const crew = db.findById('crew', req.params.id);
  if (!crew) {
    res.status(404).json({ success: false, message: 'Crew member not found' });
    return;
  }
  db.findByIdAndDelete('crew', req.params.id);
  res.json({ success: true, message: 'Crew member removed' });
});

// ----------------------------------------------------
// OPERATIONAL ALERTS APIs
// ----------------------------------------------------

router.get('/alerts', authenticate, (req: Request, res: Response): void => {
  const { resolved, severity } = req.query;
  let alerts = db.find('alerts');

  if (resolved !== undefined && resolved !== 'All') {
    const isResolved = String(resolved).toLowerCase() === 'true';
    alerts = alerts.filter((a) => a.resolved === isResolved);
  }

  if (severity && severity !== 'All') {
    alerts = alerts.filter((a) => a.severity.toLowerCase() === String(severity).toLowerCase());
  }

  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, count: alerts.length, data: alerts });
});

// Operator and Admin: Resolve Alert
router.patch('/alerts/:id/resolve', authenticate, requireRole(['admin', 'operator']), (req: AuthRequest, res: Response): void => {
  const alert = db.findById('alerts', req.params.id) as IAlert | null;
  if (!alert) {
    res.status(404).json({ success: false, message: 'Alert not found' });
    return;
  }

  const updated = db.findByIdAndUpdate('alerts', alert._id, {
    resolved: true,
    resolvedBy: req.user?._id,
    resolvedByName: req.user?.name,
    resolvedAt: new Date().toISOString()
  });

  logAudit(req, 'RESOLVE_ALERT', 'Alert', alert._id, `Resolved alert: ${alert.message}`);

  broadcastSocketEvent('alert:resolved', updated);
  broadcastSocketEvent('user:activity', {
    type: 'ALERT_RESOLVE',
    message: `${req.user?.name} resolved alert on ${alert.vesselName || 'Fleet'}`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: 'Alert resolved successfully', data: updated });
});

// ----------------------------------------------------
// USER ADMINISTRATION (Admin Only)
// ----------------------------------------------------

router.get('/users', authenticate, requireRole(['admin']), (req: Request, res: Response): void => {
  const users = db.find('users');
  const sanitized = users.map(({ password: _, ...rest }) => rest);
  res.json({ success: true, count: sanitized.length, data: sanitized });
});

router.post('/users', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    return;
  }

  const existing = db.findOne('users', (u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (existing) {
    res.status(409).json({ success: false, message: 'User with this email already exists' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = db.create('users', {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    password: hashedPassword,
    role: role || 'viewer',
    status: 'active',
    department: department || 'General Operations',
    createdAt: new Date().toISOString()
  });

  logAudit(req, 'CREATE_USER', 'User', newUser._id, `Created user ${newUser.email} with role ${newUser.role}`);

  const { password: _, ...userSafe } = newUser;
  res.status(201).json({ success: true, message: 'User created successfully', data: userSafe });
});

router.put('/users/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const user = db.findById('users', req.params.id) as IUser | null;
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const { name, role, department, status, password } = req.body;
  const updates: Partial<IUser> = {};
  if (name) updates.name = name;
  if (role) updates.role = role;
  if (department) updates.department = department;
  if (status) updates.status = status;
  if (password) updates.password = bcrypt.hashSync(password, 10);

  const updated = db.findByIdAndUpdate('users', user._id, updates);
  logAudit(req, 'UPDATE_USER', 'User', user._id, `Updated user ${user.email}`);

  const { password: _, ...userSafe } = updated!;
  res.json({ success: true, message: 'User updated successfully', data: userSafe });
});

router.patch('/users/:id/status', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const user = db.findById('users', req.params.id) as IUser | null;
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Prevent disabling self
  if (user._id === req.user?._id) {
    res.status(400).json({ success: false, message: 'You cannot disable your own administrator account' });
    return;
  }

  const newStatus = user.status === 'active' ? 'disabled' : 'active';
  const updated = db.findByIdAndUpdate('users', user._id, { status: newStatus });
  logAudit(req, 'TOGGLE_USER_STATUS', 'User', user._id, `Changed user ${user.email} status to ${newStatus}`);

  const { password: _, ...userSafe } = updated!;
  res.json({ success: true, message: `User status changed to ${newStatus}`, data: userSafe });
});

router.delete('/users/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const user = db.findById('users', req.params.id) as IUser | null;
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (user._id === req.user?._id) {
    res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    return;
  }

  db.findByIdAndDelete('users', user._id);
  logAudit(req, 'DELETE_USER', 'User', user._id, `Deleted user ${user.email}`);
  res.json({ success: true, message: 'User deleted successfully' });
});

// ----------------------------------------------------
// AUDIT LOGS (Admin Only)
// ----------------------------------------------------

router.get('/audit-logs', authenticate, requireRole(['admin']), (req: Request, res: Response): void => {
  const logs = db.find('auditLogs');
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ success: true, count: logs.length, data: logs.slice(0, 100) });
});

// ----------------------------------------------------
// REPORTS & CSV EXPORT
// ----------------------------------------------------

router.get('/reports/export/:type', authenticate, (req: Request, res: Response): void => {
  const { type } = req.params;
  let csv = '';
  let filename = `fleetops_${type}_report_${Date.now()}.csv`;

  if (type === 'fleet') {
    const vessels = db.find('vessels');
    csv = 'Vessel ID,Name,IMO,Type,Flag,Captain,Capacity,Current Fuel,Fuel Capacity,Status,Year Built\n';
    vessels.forEach((v) => {
      csv += `"${v.vesselId}","${v.name}","${v.imoNumber}","${v.vesselType}","${v.flag}","${v.captain}",${v.capacity},${v.currentFuel},${v.fuelCapacity},"${v.status}",${v.yearBuilt}\n`;
    });
  } else if (type === 'voyages') {
    const voyages = db.find('voyages');
    csv = 'Voyage ID,Vessel,Origin,Destination,Departure,ETA,Distance NM,Status,Captain,Fuel Used MT\n';
    voyages.forEach((v) => {
      csv += `"${v.voyageId}","${v.vesselName}","${v.originPort}","${v.destinationPort}","${v.departureDate}","${v.estimatedArrival}",${v.distanceNauticalMiles},"${v.status}","${v.captain}",${v.fuelConsumedMT}\n`;
    });
  } else if (type === 'fuel') {
    const fuel = db.find('fuelRecords');
    csv = 'Date,Vessel,Fuel Type,Quantity MT,Unit Price USD,Total Cost USD,Port,Supplier,Distance NM,Efficiency NM/MT\n';
    fuel.forEach((f) => {
      csv += `"${f.date}","${f.vesselName}","${f.fuelType}",${f.quantityMT},${f.unitPriceUSD},${f.totalCostUSD},"${f.port}","${f.supplier}",${f.distanceTravelledNM},${f.fuelEfficiencyNMPerMT}\n`;
    });
  } else if (type === 'maintenance') {
    const maintenance = db.find('maintenance');
    csv = 'ID,Vessel,Type,Priority,Start Date,Expected Completion,Status,Cost USD,Technician\n';
    maintenance.forEach((m) => {
      csv += `"${m.maintenanceId}","${m.vesselName}","${m.maintenanceType}","${m.priority}","${m.startDate}","${m.expectedCompletion}","${m.status}",${m.costUSD},"${m.technician}"\n`;
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid export type. Supported: fleet, voyages, fuel, maintenance' });
    return;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// Admin Demo Reset Endpoint
router.post('/admin/reset-demo', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  db.resetToSeeds();
  cache.flushAll();
  logAudit(req, 'RESET_SYSTEM_DATA', 'Database', undefined, 'Admin reset entire system data to initial realistic seed baseline');
  broadcastSocketEvent('system:reset', { message: 'Database reset to demo seed state' });
  res.json({ success: true, message: 'System database reset to standard maritime demo seeds' });
});

export default router;

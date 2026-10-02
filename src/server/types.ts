export type UserRole = 'admin' | 'user' | 'operator' | 'viewer';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string; // bcrypt hashed
  role: UserRole;
  status: 'active' | 'disabled';
  avatar?: string;
  department?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type VesselStatus = 'Active' | 'In Transit' | 'Docked' | 'Maintenance' | 'Idle' | 'Decommissioned';

export interface IVessel {
  _id: string;
  vesselId: string;
  imoNumber: string;
  name: string;
  vesselType: 'Container Ship' | 'Bulk Carrier' | 'Oil Tanker' | 'LNG Carrier' | 'General Cargo' | 'Ro-Ro';
  flag: string;
  owner: string;
  captain: string;
  capacity: number; // TEU or DWT
  deadweightTonnage: number; // DWT
  grossTonnage: number; // GT
  length: number; // meters
  width: number; // meters
  draft: number; // meters
  engineType: string;
  enginePower: number; // kW or HP
  fuelType: 'VLSFO' | 'MGO' | 'LNG' | 'HFO';
  fuelCapacity: number; // metric tons
  currentFuel: number; // metric tons
  currentLocation: {
    lat: number;
    lng: number;
    portOrArea: string;
    speedKnots: number;
    heading: number;
    updatedAt: string;
  };
  status: VesselStatus;
  yearBuilt: number;
  lastInspection: string;
  nextInspection: string;
  insuranceExpiry: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type VoyageStatus = 'Planned' | 'Scheduled' | 'In Transit' | 'Arrived' | 'Completed' | 'Delayed' | 'Cancelled';

export interface IVoyage {
  _id: string;
  voyageId: string;
  vesselId: string;
  vesselName: string;
  originPort: string;
  originPortCode: string;
  originCoords: [number, number];
  destinationPort: string;
  destinationPortCode: string;
  destinationCoords: [number, number];
  departureDate: string;
  estimatedArrival: string;
  actualArrival?: string;
  distanceNauticalMiles: number;
  distanceCovered: number;
  routeWaypoints: [number, number][];
  status: VoyageStatus;
  captain: string;
  crewCount: number;
  cargoDescription?: string;
  fuelEstimatedMT: number;
  fuelConsumedMT: number;
  fuelCostUSD: number;
  weatherConditions?: string;
  delayReason?: string;
  assignedCargoIds: string[];
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type CargoStatus = 'Booked' | 'Loaded' | 'In Transit' | 'Unloaded' | 'Delivered' | 'Delayed';

export interface ICargo {
  _id: string;
  cargoId: string;
  voyageId?: string;
  voyageCode?: string;
  vesselId?: string;
  vesselName?: string;
  cargoType: 'Containerized' | 'Bulk Grain' | 'Crude Oil' | 'Refined Petroleum' | 'Liquefied Gas' | 'Heavy Machinery' | 'Refrigerated';
  description: string;
  weightTons: number;
  volumeCBM?: number;
  containerCount?: number;
  shipper: string;
  consignee: string;
  loadingPort: string;
  dischargePort: string;
  loadingDate: string;
  expectedDelivery: string;
  status: CargoStatus;
  hazardClass?: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IFuelRecord {
  _id: string;
  vesselId: string;
  vesselName: string;
  voyageId?: string;
  voyageCode?: string;
  date: string;
  fuelType: 'VLSFO' | 'MGO' | 'LNG' | 'HFO';
  quantityMT: number;
  unitPriceUSD: number;
  totalCostUSD: number; // quantity * unitPrice
  supplier: string;
  port: string;
  engineHours: number;
  distanceTravelledNM: number;
  fuelEfficiencyNMPerMT: number; // distance / quantity
  recordedBy: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceType = 'Preventive' | 'Corrective' | 'Emergency' | 'Inspection';
export type MaintenanceStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed';
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IMaintenance {
  _id: string;
  maintenanceId: string;
  vesselId: string;
  vesselName: string;
  maintenanceType: MaintenanceType;
  description: string;
  priority: MaintenancePriority;
  startDate: string;
  expectedCompletion: string;
  actualCompletion?: string;
  technician: string;
  costUSD: number;
  partsUsed: string[];
  status: MaintenanceStatus;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPort {
  _id: string;
  portId: string;
  name: string;
  country: string;
  city: string;
  portCode: string;
  lat: number;
  lng: number;
  capacityTEU: number;
  contact: string;
  operatingHours: string;
  status: 'Open' | 'Congested' | 'Maintenance' | 'Restricted';
  createdAt: string;
  updatedAt: string;
}

export interface ICrew {
  _id: string;
  crewId: string;
  name: string;
  role: 'Captain' | 'Chief Engineer' | 'Second Engineer' | 'Deck Officer' | 'Deck Crew' | 'Electrical Officer' | 'Cook' | 'Safety Officer';
  vesselId?: string;
  vesselName?: string;
  nationality: string;
  certification: string;
  joiningDate: string;
  contractExpiry: string;
  contact: string;
  status: 'On Duty' | 'On Leave' | 'Standby';
  createdAt: string;
  updatedAt: string;
}

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';
export type AlertType = 'Maintenance Overdue' | 'Fuel Low' | 'Voyage Delayed' | 'Insurance Expiring' | 'Inspection Due' | 'Cargo Delayed' | 'Weather Hazard';

export interface IAlert {
  _id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  vesselId?: string;
  vesselName?: string;
  voyageId?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  timestamp: string;
}

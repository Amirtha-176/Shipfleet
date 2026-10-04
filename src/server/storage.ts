import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  IAuditLog
} from './types.ts';
import {
  seedUsers,
  seedVessels,
  seedVoyages,
  seedCargo,
  seedFuelRecords,
  seedMaintenance,
  seedPorts,
  seedCrew,
  seedAlerts,
  seedAuditLogs
} from './seedData.ts';
import { mongoManager } from './mongo.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface IDatabaseSchema {
  users: IUser[];
  vessels: IVessel[];
  voyages: IVoyage[];
  cargo: ICargo[];
  fuelRecords: IFuelRecord[];
  maintenance: IMaintenance[];
  ports: IPort[];
  crew: ICrew[];
  alerts: IAlert[];
  auditLogs: IAuditLog[];
}

export function generateObjectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

class StorageEngine {
  private data: IDatabaseSchema;
  private changeListeners: Array<(collection: keyof IDatabaseSchema, action: string, doc: unknown) => void> = [];

  constructor() {
    this.data = this.loadData();
    this.onMutation((collection, action, doc) => {
      mongoManager.syncDoc(collection, action, doc).catch(() => {});
    });
    // Attempt full sync if MongoDB is already connected
    if (mongoManager.getConnected()) {
      mongoManager.syncAllData(this.data).catch(() => {});
    }
  }

  private loadData(): IDatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as IDatabaseSchema;
        // Verify minimum collections
        if (parsed.users && parsed.vessels && parsed.voyages) {
          // Normalize user roles: consolidate viewer and operator as 'user'
          let mutated = false;
          for (const u of parsed.users) {
            if ((u.role as string) === 'operator' || (u.role as string) === 'viewer') {
              u.role = 'user';
              mutated = true;
            }
          }
          // Ensure default seed users exist
          for (const su of seedUsers) {
            if (!parsed.users.some((u) => u.email.toLowerCase() === su.email.toLowerCase())) {
              parsed.users.push({ ...su });
              mutated = true;
            }
          }
          // Wipe previous seed operational records to start clean slate for user and admin
          if (parsed.voyages?.some((v) => v._id === 'vyg_001') || parsed.cargo?.some((c) => c._id === 'crg_001') || parsed.fuelRecords?.some((f) => f._id === 'fuel_001')) {
            parsed.voyages = [];
            parsed.cargo = [];
            parsed.fuelRecords = [];
            parsed.maintenance = [];
            parsed.alerts = [];
            parsed.auditLogs = [];
            mutated = true;
          }

          if (mutated) {
            this.saveData(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load existing database file, re-initializing seeds:', err);
    }

    // Clean Slate Operational Data
    const initialData: IDatabaseSchema = {
      users: [...seedUsers],
      vessels: [...seedVessels],
      voyages: [],
      cargo: [],
      fuelRecords: [],
      maintenance: [],
      ports: [...seedPorts],
      crew: [...seedCrew],
      alerts: [],
      auditLogs: []
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(dataToSave = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }

  public onMutation(listener: (collection: keyof IDatabaseSchema, action: string, doc: unknown) => void) {
    this.changeListeners.push(listener);
  }

  private notify(collection: keyof IDatabaseSchema, action: string, doc: unknown) {
    for (const listener of this.changeListeners) {
      try {
        listener(collection, action, doc);
      } catch (err) {
        console.error('Listener error on db mutation:', err);
      }
    }
  }

  // Generic collection operations
  public getCollection<K extends keyof IDatabaseSchema>(collectionName: K): IDatabaseSchema[K] {
    return this.data[collectionName];
  }

  public find<K extends keyof IDatabaseSchema>(
    collectionName: K,
    predicate?: (item: IDatabaseSchema[K][number]) => boolean
  ): IDatabaseSchema[K] {
    const list = this.data[collectionName];
    if (!predicate) {
      return [...list] as IDatabaseSchema[K];
    }
    return (list as Array<IDatabaseSchema[K][number]>).filter(predicate) as IDatabaseSchema[K];
  }

  public findOne<K extends keyof IDatabaseSchema, T = IDatabaseSchema[K][number]>(
    collectionName: K,
    predicate: (item: T) => boolean
  ): T | null {
    const list = this.data[collectionName] as unknown as T[];
    const found = list.find(predicate);
    return found || null;
  }

  public findById<K extends keyof IDatabaseSchema, T = IDatabaseSchema[K][number]>(
    collectionName: K,
    id: string
  ): T | null {
    const list = this.data[collectionName] as unknown as Array<{ _id: string }>;
    const found = list.find((item) => item._id === id);
    return (found as unknown as T) || null;
  }

  public create<K extends keyof IDatabaseSchema>(
    collectionName: K,
    docData: Record<string, unknown>
  ): IDatabaseSchema[K][number] {
    const now = new Date().toISOString();
    const newDoc = {
      _id: (docData._id as string) || generateObjectId(),
      ...docData,
      createdAt: now,
      updatedAt: now
    } as unknown as IDatabaseSchema[K][number];

    (this.data[collectionName] as unknown as Array<IDatabaseSchema[K][number]>).push(newDoc);
    this.saveData();
    this.notify(collectionName, 'create', newDoc);
    return newDoc;
  }

  public findByIdAndUpdate<K extends keyof IDatabaseSchema>(
    collectionName: K,
    id: string,
    updates: Record<string, unknown>
  ): IDatabaseSchema[K][number] | null {
    const list = this.data[collectionName] as unknown as Array<IDatabaseSchema[K][number] & { _id: string; updatedAt: string }>;
    const idx = list.findIndex((item) => item._id === id);
    if (idx === -1) return null;

    const existing = list[idx];
    const updated = {
      ...existing,
      ...updates,
      _id: existing._id,
      updatedAt: new Date().toISOString()
    };

    list[idx] = updated;
    this.saveData();
    this.notify(collectionName, 'update', updated);
    return updated as IDatabaseSchema[K][number];
  }

  public findByIdAndDelete<K extends keyof IDatabaseSchema>(
    collectionName: K,
    id: string
  ): IDatabaseSchema[K][number] | null {
    const list = this.data[collectionName] as unknown as Array<IDatabaseSchema[K][number] & { _id: string }>;
    const idx = list.findIndex((item) => item._id === id);
    if (idx === -1) return null;

    const [deleted] = list.splice(idx, 1);
    this.saveData();
    this.notify(collectionName, 'delete', deleted);
    return deleted as IDatabaseSchema[K][number];
  }

  public count<K extends keyof IDatabaseSchema>(
    collectionName: K,
    predicate?: (item: IDatabaseSchema[K][number]) => boolean
  ): number {
    return this.find(collectionName, predicate).length;
  }

  public getCounts(): Record<string, number> {
    return {
      users: this.data.users?.length || 0,
      vessels: this.data.vessels?.length || 0,
      voyages: this.data.voyages?.length || 0,
      cargo: this.data.cargo?.length || 0,
      fuelRecords: this.data.fuelRecords?.length || 0,
      maintenance: this.data.maintenance?.length || 0,
      ports: this.data.ports?.length || 0,
      crew: this.data.crew?.length || 0,
      alerts: this.data.alerts?.length || 0,
      auditLogs: this.data.auditLogs?.length || 0
    };
  }

  public getAllData(): IDatabaseSchema {
    return this.data;
  }

  public resetToSeeds(): void {
    this.data = {
      users: [...seedUsers],
      vessels: [...seedVessels],
      voyages: [],
      cargo: [],
      fuelRecords: [],
      maintenance: [],
      ports: [...seedPorts],
      crew: [...seedCrew],
      alerts: [],
      auditLogs: []
    };
    this.saveData();
    this.notify('users', 'reset', null);
  }

  public clearOperationalData(): void {
    this.data.voyages = [];
    this.data.cargo = [];
    this.data.fuelRecords = [];
    this.data.maintenance = [];
    this.data.alerts = [];
    this.data.auditLogs = [];
    this.saveData();
    this.notify('voyages', 'reset', null);
  }
}

export const db = new StorageEngine();

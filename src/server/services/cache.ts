import { db } from '../storage.ts';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0
  };

  constructor() {
    // Automatically invalidate related caches when database mutations occur
    db.onMutation((collection) => {
      this.handleCollectionMutation(collection);
    });
  }

  private handleCollectionMutation(collection: string) {
    // Invalidate dashboard caches
    this.del('dashboard:stats');
    this.del('dashboard:analytics');

    if (collection === 'vessels') {
      this.del('vessels:all');
      this.del('tracking:all');
    } else if (collection === 'voyages') {
      this.del('voyages:all');
      this.del('tracking:all');
    } else if (collection === 'cargo') {
      this.del('cargo:all');
    } else if (collection === 'fuelRecords') {
      this.del('fuel:all');
      this.del('fuel:analytics');
    } else if (collection === 'maintenance') {
      this.del('maintenance:all');
    } else if (collection === 'ports') {
      this.del('ports:all');
    } else if (collection === 'crew') {
      this.del('crew:all');
    } else if (collection === 'alerts') {
      this.del('alerts:active');
    }
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttlSeconds = 60): void {
    this.stats.sets++;
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public del(key: string): void {
    this.store.delete(key);
  }

  public flushAll(): void {
    this.store.clear();
  }

  public getStats() {
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

export const cache = new CacheService();

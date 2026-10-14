import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache abstraction over Redis with an in-memory fallback. The fallback keeps
 * the application usable on workstations without Redis; production deployments
 * MUST run Redis so that cache state is shared across horizontally scaled
 * instances. `isDistributed` exposes which mode is active.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private distributed = false;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
      this.distributed = true;
      this.logger.log('CacheService using Redis');
    } catch {
      this.distributed = false;
      this.logger.warn(
        'Redis unavailable - falling back to in-memory cache (single instance only)',
      );
      // Stop ioredis from retrying in the background; the fallback is active.
      this.redis.disconnect();
    }
  }

  onModuleDestroy(): void {
    try {
      this.redis.disconnect();
    } catch {
      /* ignore */
    }
  }

  get isDistributed(): boolean {
    return this.distributed;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.distributed) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.distributed) {
      try {
        await this.redis.set(key, raw, 'EX', ttlSeconds);
        return;
      } catch {
        // fall through to memory
      }
    }
    this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(...keys: string[]): Promise<void> {
    if (this.distributed) {
      try {
        if (keys.length) await this.redis.del(...keys);
        return;
      } catch {
        // fall through
      }
    }
    keys.forEach((k) => this.memory.delete(k));
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.distributed) {
      try {
        let cursor = '0';
        do {
          const [next, batch] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
          cursor = next;
          if (batch.length) await this.redis.del(...batch);
        } while (cursor !== '0');
        return;
      } catch {
        // fall through
      }
    }
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
  }
}

import { Global, Logger, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis => {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
    });
    client.on('error', (err) => {
      // Errors are expected when Redis is not running locally; the cache
      // service degrades to in-memory storage in that case.
      Logger.warn(`Redis error: ${err.message}`, 'RedisModule');
    });
    return client;
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}
  async onModuleDestroy(): Promise<void> {
    // Connections are closed lazily by ioredis on process exit.
  }
}

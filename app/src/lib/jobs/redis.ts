import type { ConnectionOptions } from "bullmq";

// Lazily evaluated — only throws at runtime when BullMQ actually connects,
// not at Next.js build/module evaluation time.
export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is required");
  }
  return {
    url,
    // Enable TLS for production Redis (e.g. Railway, Upstash)
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  };
}

// Convenience export for use in queues and worker
export const redisConnection: ConnectionOptions = new Proxy(
  {} as ConnectionOptions,
  {
    get(_target, prop) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getRedisConnection() as any)[prop];
    },
  }
);

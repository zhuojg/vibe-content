import Redis from "ioredis";

// a client for general commands
let client: Redis | null = null;

// a dedicated client for subscribing
// We must duplicate the client for subscribing
let subscriber: Redis | null = null;

export async function getRedisClient(): Promise<{
  client: Redis;
  subscriber: Redis;
}> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  if (!client) {
    client = new Redis(redisUrl);
    client.on("error", (err) => console.error("Redis client error:", err));
  }

  if (!subscriber) {
    subscriber = new Redis(redisUrl);
    subscriber.on("error", (err) =>
      console.error("Redis subscriber error:", err),
    );
  }

  return {
    client,
    subscriber,
  };
}

export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}

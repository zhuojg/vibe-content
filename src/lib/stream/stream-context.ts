import { createResumableStreamContext } from "resumable-stream/ioredis";
import { getRedisClient } from "@/lib/redis";

const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX ?? "tripoli:streams:";

export async function getStreamContext() {
  const { client, subscriber } = await getRedisClient();

  return createResumableStreamContext({
    // In a server environment (Nitro), we don't need waitUntil
    // as the server stays alive for background tasks
    waitUntil: null,
    keyPrefix: REDIS_KEY_PREFIX,
    publisher: client,
    subscriber,
  });
}

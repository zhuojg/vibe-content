import { getRedisClient } from "@/lib/redis";

const ABORT_MESSAGE = "ABORT";

function getAbortChannel(chatId: string): string {
  const prefix = process.env.REDIS_KEY_PREFIX ?? "tripoli:";
  return `${prefix}abort:${chatId}`;
}

export async function subscribeAbortSignal(
  chatId: string,
  onAbort: () => void,
): Promise<() => Promise<void>> {
  const { subscriber } = await getRedisClient();
  const channel = getAbortChannel(chatId);

  const handler = (chan: string, message: string) => {
    if (chan === channel && message === ABORT_MESSAGE) {
      onAbort();
    }
  };

  await subscriber.subscribe(channel);
  subscriber.on("message", handler);

  // Return cleanup function
  return async () => {
    subscriber.off("message", handler);
    await subscriber.unsubscribe(channel);
  };
}

export async function publishAbortSignal(chatId: string): Promise<void> {
  const { client } = await getRedisClient();
  const channel = getAbortChannel(chatId);
  await client.publish(channel, ABORT_MESSAGE);
}

import {
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ToolLoopAgent,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chat } from "@/db/schema";
import { generateUUID } from "../utils";
import { subscribeAbortSignal } from "./abort-handler";
import { getStreamContext } from "./stream-context";

type ToUIStreamOptions = {
  chatId: string;
  agent: ToolLoopAgent;
  messages: UIMessage[];
  responseMessageId: string;
  onFinish?: (responseMessage: UIMessage) => Promise<void>;
};

export async function toUIStream({
  chatId,
  agent,
  messages,
  responseMessageId,
  onFinish,
}: ToUIStreamOptions): Promise<Response> {
  // Setup abort handling
  const abortController = new AbortController();
  const cleanup = await subscribeAbortSignal(chatId, () => {
    abortController.abort();
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: messages,
        abortSignal: abortController.signal,
      });
      writer.merge(agentStream);
    },
    originalMessages: messages,
    generateId: () => responseMessageId,
    onFinish: async ({ responseMessage }) => {
      // Clean up abort subscription
      await cleanup();

      // Clear activeStreamId when stream completes
      await db
        .update(chat)
        .set({ activeStreamId: null })
        .where(eq(chat.id, chatId));

      if (onFinish) {
        await onFinish(responseMessage);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    consumeSseStream: async ({ stream: sseStream }) => {
      const streamId = generateUUID();
      const streamContext = await getStreamContext();

      // Create resumable stream
      await streamContext.createNewResumableStream(streamId, () => sseStream);

      // Store activeStreamId in database
      await db
        .update(chat)
        .set({ activeStreamId: streamId })
        .where(eq(chat.id, chatId));
    },
  });
}

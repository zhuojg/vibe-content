import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chat } from "@/db/schema";
import { getStreamContext } from "./stream-context";

export async function resumeStream(chatId: string): Promise<Response> {
  const existedChat = await db.query.chat.findFirst({
    where: eq(chat.id, chatId),
  });

  if (!existedChat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (!existedChat.activeStreamId) {
    // No active stream - return 204 No Content
    return new Response(null, { status: 204 });
  }

  const streamContext = await getStreamContext();
  const resumedStream = await streamContext.resumeExistingStream(
    existedChat.activeStreamId,
  );

  if (!resumedStream) {
    // Stream expired or not found - clear the stale reference
    await db
      .update(chat)
      .set({ activeStreamId: null })
      .where(eq(chat.id, chatId));
    return new Response(null, { status: 204 });
  }

  return new Response(resumedStream, {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}

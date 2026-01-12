import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chat } from "@/db/schema";
import { publishAbortSignal, resumeStream } from "@/lib/stream";

export const Route = createFileRoute("/api/agent/$chatId/stream")({
  server: {
    handlers: {
      // GET /api/agent/{chatId}/stream - Resume stream by chatId
      GET: async ({ params }) => {
        return resumeStream(params.chatId);
      },

      // DELETE /api/agent/{chatId}/stream - Abort stream by chatId
      DELETE: async ({ params }) => {
        const chatId = params.chatId;

        // Verify chat exists
        const existedChat = await db.query.chat.findFirst({
          where: eq(chat.id, chatId),
        });

        if (!existedChat) {
          return new Response("Chat not found", { status: 404 });
        }

        if (!existedChat.activeStreamId) {
          return new Response(null, { status: 204 });
        }

        // Publish abort signal
        await publishAbortSignal(chatId);

        // Clear activeStreamId
        await db
          .update(chat)
          .set({ activeStreamId: null })
          .where(eq(chat.id, chatId));

        return new Response(null, { status: 200 });
      },
    },
  },
});

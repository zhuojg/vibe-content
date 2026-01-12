import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chat } from "@/db/schema";
import {
  createProjectChatSession as createProjectChatSessionHelper,
  getChatMessagesFromDb,
  getProjectChats,
} from "@/lib/chat-helpers";
import { publicProcedure } from "@/orpc";

// Get messages for a project chat (optionally by chatId, otherwise latest)
export const getProjectMessages = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      chatId: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const chatRecord = await (async () => {
      if (input.chatId) {
        return await db.query.chat.findFirst({
          where: and(
            eq(chat.id, input.chatId),
            eq(chat.projectId, input.projectId),
          ),
        });
      }
      return await db.query.chat.findFirst({
        where: and(eq(chat.projectId, input.projectId), isNull(chat.taskId)),
        orderBy: desc(chat.createdAt),
      });
    })();

    if (!chatRecord) return [];
    return getChatMessagesFromDb(chatRecord.id);
  });

// Get messages for a task chat
export const getTaskMessages = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input }) => {
    const chatRecord = await db.query.chat.findFirst({
      where: eq(chat.taskId, input.taskId),
    });
    if (!chatRecord) return [];
    return getChatMessagesFromDb(chatRecord.id);
  });

// List all project-level chat sessions (for leading agent)
export const listProjectChats = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input }) => {
    return getProjectChats(input.projectId);
  });

// Create a new project chat session
export const createProjectChatSession = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input }) => {
    return createProjectChatSessionHelper(input.projectId);
  });

// Get messages by chatId directly
export const getChatMessagesById = publicProcedure
  .input(z.object({ chatId: z.string() }))
  .handler(async ({ input, errors }) => {
    const chatRecord = await db.query.chat.findFirst({
      where: eq(chat.id, input.chatId),
    });
    if (!chatRecord) {
      throw errors.NOT_FOUND({ data: { resource: "chat" } });
    }
    return getChatMessagesFromDb(chatRecord.id);
  });

// Get task chat info (including activeStreamId for streaming)
export const getTaskChat = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input }) => {
    const chatRecord = await db.query.chat.findFirst({
      where: eq(chat.taskId, input.taskId),
    });
    return chatRecord ?? null;
  });

import { createFileRoute } from "@tanstack/react-router";
import { ToolLoopAgent, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { message, task } from "@/db/schema";
import {
  generateMockAgentResponse,
  getOrCreateProjectChat,
  getOrCreateTaskChat,
} from "@/lib/chat-helpers";
import { createMockLLM } from "@/lib/llm/mock";
import { toUIStream } from "@/lib/stream";
import { generateUUID } from "@/lib/utils";

// Input validation schemas
const projectMessageSchema = z.object({
  type: z.literal("project"),
  projectId: z.string(),
  chatId: z.string().optional(),
  messages: z.array(z.custom<UIMessage>()),
});

const taskMessageSchema = z.object({
  type: z.literal("task"),
  taskId: z.string(),
  messages: z.array(z.custom<UIMessage>()),
});

const startTaskSchema = z.object({
  type: z.literal("startTask"),
  taskId: z.string(),
  agentType: z.string(),
  description: z.string().optional(),
});

const inputSchema = z.discriminatedUnion("type", [
  projectMessageSchema,
  taskMessageSchema,
  startTaskSchema,
]);

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const input = inputSchema.parse(body);

          if (input.type === "project") {
            return handleProjectMessage(input);
          }
          if (input.type === "task") {
            return handleTaskMessage(input);
          }
          if (input.type === "startTask") {
            return handleStartTask(input);
          }

          return new Response("Invalid request type", { status: 400 });
        } catch (error) {
          console.error("[Agent Route Error]", error);
          if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({ error: error.issues }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});

async function handleProjectMessage(
  input: z.infer<typeof projectMessageSchema>,
): Promise<Response> {
  const chatRecord = await getOrCreateProjectChat(
    input.projectId,
    input.chatId,
  );

  // Save user message (last message in array)
  const userMessage = input.messages.at(-1);
  if (userMessage && userMessage.role === "user") {
    await db.insert(message).values({
      id: userMessage.id,
      chatId: chatRecord.id,
      role: userMessage.role,
      parts: userMessage.parts,
    });
  }

  const agent = new ToolLoopAgent({
    model: createMockLLM([
      {
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hello World" }],
        },
        inputTokens: {
          total: 1000,
          noCache: 1000,
          cacheRead: void 0,
          cacheWrite: void 0,
        },
        outputTokens: {
          total: 2000,
          text: 2000,
          reasoning: void 0,
        },
      },
    ]),
    tools: {},
  });

  const responseMessageId = generateUUID();

  return toUIStream({
    chatId: chatRecord.id,
    agent,
    messages: input.messages,
    responseMessageId,
    onFinish: async (responseMessage) => {
      await db.insert(message).values({
        id: responseMessage.id,
        chatId: chatRecord.id,
        role: responseMessage.role,
        parts: responseMessage.parts,
      });
    },
  });
}

async function handleTaskMessage(
  input: z.infer<typeof taskMessageSchema>,
): Promise<Response> {
  // Get task info
  const taskInfo = await db.query.task.findFirst({
    where: eq(task.id, input.taskId),
  });

  if (!taskInfo) {
    return new Response("Task not found", { status: 404 });
  }

  const chatRecord = await getOrCreateTaskChat(input.taskId, taskInfo.title);

  // Save user message
  const userMessage = input.messages.at(-1);
  if (userMessage && userMessage.role === "user") {
    await db.insert(message).values({
      id: userMessage.id,
      chatId: chatRecord.id,
      role: userMessage.role,
      parts: userMessage.parts,
    });
  }

  const agent = new ToolLoopAgent({
    model: createMockLLM([
      {
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hello World" }],
        },
        inputTokens: {
          total: 1000,
          noCache: 1000,
          cacheRead: void 0,
          cacheWrite: void 0,
        },
        outputTokens: {
          total: 2000,
          text: 2000,
          reasoning: void 0,
        },
      },
    ]),
    tools: {},
  });

  const responseMessageId = generateUUID();

  return toUIStream({
    chatId: chatRecord.id,
    agent,
    messages: input.messages,
    responseMessageId,
    onFinish: async (responseMessage) => {
      await db.insert(message).values({
        id: responseMessage.id,
        chatId: chatRecord.id,
        role: responseMessage.role,
        parts: responseMessage.parts,
      });
    },
  });
}

async function handleStartTask(
  input: z.infer<typeof startTaskSchema>,
): Promise<Response> {
  // Get and update the task
  const taskInfo = await db.query.task.findFirst({
    where: eq(task.id, input.taskId),
  });

  if (!taskInfo) {
    return new Response("Task not found", { status: 404 });
  }

  // Update task to processing status with agent assignment
  const updates: {
    assignedAgent: string;
    status: "processing";
    description?: string;
  } = {
    assignedAgent: input.agentType,
    status: "processing",
  };
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  await db.update(task).set(updates).where(eq(task.id, input.taskId));

  // Create or get task chat
  const chatRecord = await getOrCreateTaskChat(input.taskId, taskInfo.title);

  // Generate contextual mock response
  const mockResponse = generateMockAgentResponse(
    input.agentType,
    taskInfo.title,
    input.description ?? taskInfo.description,
  );

  // Create agent with mock LLM
  const agent = new ToolLoopAgent({
    model: createMockLLM([
      {
        message: {
          role: "assistant",
          content: [{ type: "text", text: mockResponse }],
        },
        inputTokens: {
          total: 1000,
          noCache: 1000,
          cacheRead: void 0,
          cacheWrite: void 0,
        },
        outputTokens: {
          total: 2000,
          text: 2000,
          reasoning: void 0,
        },
      },
    ]),
    tools: {},
  });

  const responseMessageId = generateUUID();

  // Create initial user message representing the task start
  const userMessage: UIMessage = {
    id: generateUUID(),
    role: "user",
    parts: [
      {
        type: "text",
        text: `Please work on this task: ${taskInfo.title}${input.description ? `\n\nDescription: ${input.description}` : taskInfo.description ? `\n\nDescription: ${taskInfo.description}` : ""}`,
      },
    ],
  };

  // Save user message
  await db.insert(message).values({
    id: userMessage.id,
    chatId: chatRecord.id,
    role: userMessage.role,
    parts: userMessage.parts,
  });

  return toUIStream({
    chatId: chatRecord.id,
    agent,
    messages: [userMessage],
    responseMessageId,
    onFinish: async (responseMessage) => {
      // Save assistant response to database
      await db.insert(message).values({
        id: responseMessage.id,
        chatId: chatRecord.id,
        role: responseMessage.role,
        parts: responseMessage.parts,
      });

      // Update task status to in_review after agent completes
      await db
        .update(task)
        .set({
          status: "in_review",
          output: mockResponse,
        })
        .where(eq(task.id, input.taskId));
    },
  });
}

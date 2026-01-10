import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessage, task } from "@/db/schema";
import { publicProcedure } from "@/orpc";

// Mock response generators for the leading agent (project-level)
function generateLeadingAgentResponse(
  userMessage: string,
  messageCount: number,
): string {
  if (messageCount === 1) {
    return `Thanks for sharing! I'd love to help you with "${userMessage}".

To make sure I understand your goals correctly, could you tell me:
1. What's the main outcome you're hoping to achieve?
2. Do you have any specific timeline or constraints?`;
  }

  if (messageCount === 2) {
    return `Great, that helps clarify things! Based on what you've shared, I think we can break this down into manageable tasks.

Would you like me to create a project plan with specific tasks? Just say "yes" or "let's go" when you're ready to proceed to the kanban board.`;
  }

  if (
    userMessage.toLowerCase().includes("yes") ||
    userMessage.toLowerCase().includes("go") ||
    userMessage.toLowerCase().includes("ready")
  ) {
    return `Perfect! I've set up your project and created some initial tasks to get started. Click the button below to view your kanban board and start working on the tasks.

I'll continue to monitor progress and suggest new tasks as needed.`;
  }

  return `I understand. Is there anything else you'd like to clarify before we proceed? When you're ready, just let me know and I'll set up the kanban board with tasks.`;
}

// Mock response generators for the execution agent (task-level)
function generateExecutionAgentResponse(
  taskTitle: string,
  _userMessage: string,
  messageCount: number,
): string {
  if (messageCount === 1) {
    return `I'm working on "${taskTitle}". I've analyzed the requirements and I'm making progress.

Current status: Started working on this task. I'll update you as I make progress.`;
  }

  if (messageCount === 2) {
    return `Good progress on "${taskTitle}"! I've completed the initial analysis and am now implementing the solution.

Let me know if you have any specific requirements or changes.`;
  }

  return `Thanks for the update! I'm continuing to work on "${taskTitle}". The task is progressing well. Feel free to ask if you need any clarification or want to adjust the approach.`;
}

// Helper to create a UIMessage object
function createUIMessage(
  role: "user" | "assistant",
  content: string,
): UIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: "text", text: content }],
  };
}

export const sendProjectMessage = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      content: z.string().min(1),
    }),
  )
  .handler(async ({ input }) => {
    // Get existing message count for context
    const existingMessages = await db.query.chatMessage.findMany({
      where: eq(chatMessage.projectId, input.projectId),
    });
    const messageCount = Math.floor(existingMessages.length / 2) + 1;

    // Save user message
    const userMessage = createUIMessage("user", input.content);
    await db.insert(chatMessage).values({
      id: userMessage.id,
      projectId: input.projectId,
      message: userMessage,
    });

    // Generate and save agent response
    const responseText = generateLeadingAgentResponse(
      input.content,
      messageCount,
    );
    const agentMessage = createUIMessage("assistant", responseText);
    await db.insert(chatMessage).values({
      id: agentMessage.id,
      projectId: input.projectId,
      message: agentMessage,
    });

    return { userMessage, agentMessage };
  });

export const sendTaskMessage = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      content: z.string().min(1),
    }),
  )
  .handler(async ({ input, errors }) => {
    // Get task info for context
    const taskInfo = await db.query.task.findFirst({
      where: eq(task.id, input.taskId),
    });
    if (!taskInfo) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }

    // Get existing message count
    const existingMessages = await db.query.chatMessage.findMany({
      where: eq(chatMessage.taskId, input.taskId),
    });
    const messageCount = Math.floor(existingMessages.length / 2) + 1;

    // Save user message
    const userMessage = createUIMessage("user", input.content);
    await db.insert(chatMessage).values({
      id: userMessage.id,
      taskId: input.taskId,
      message: userMessage,
    });

    // Generate and save agent response
    const responseText = generateExecutionAgentResponse(
      taskInfo.title,
      input.content,
      messageCount,
    );
    const agentMessage = createUIMessage("assistant", responseText);
    await db.insert(chatMessage).values({
      id: agentMessage.id,
      taskId: input.taskId,
      message: agentMessage,
    });

    return { userMessage, agentMessage };
  });

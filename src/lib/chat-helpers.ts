import type { UIMessage } from "ai";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { chat, message } from "@/db/schema";
import { generateUUID } from "./utils";

// Get or create chat for a project (uses latest session or creates first one)
export async function getOrCreateProjectChat(
  projectId: string,
  chatId?: string,
): Promise<typeof chat.$inferSelect> {
  // If chatId is provided, try to find that specific chat
  if (chatId) {
    const existingChat = await db.query.chat.findFirst({
      where: and(eq(chat.id, chatId), eq(chat.projectId, projectId)),
    });
    if (existingChat) {
      return existingChat;
    }
  }

  // Otherwise, get the latest project chat or create first one
  const latestChat = await db.query.chat.findFirst({
    where: and(eq(chat.projectId, projectId), isNull(chat.taskId)),
    orderBy: desc(chat.createdAt),
  });

  if (latestChat) {
    return latestChat;
  }

  // Create first session
  const id = generateUUID();
  const [newChat] = await db
    .insert(chat)
    .values({
      id,
      title: "Session 1",
      projectId,
    })
    .returning();
  return newChat;
}

// Get all project-level chats (leading agent sessions)
export async function getProjectChats(projectId: string) {
  return db.query.chat.findMany({
    where: and(eq(chat.projectId, projectId), isNull(chat.taskId)),
    orderBy: desc(chat.createdAt),
  });
}

// Create a new project chat session
export async function createProjectChatSession(projectId: string) {
  const existingChats = await getProjectChats(projectId);
  const sessionNumber = existingChats.length + 1;

  const id = generateUUID();
  const [newChat] = await db
    .insert(chat)
    .values({
      id,
      title: `Session ${sessionNumber}`,
      projectId,
    })
    .returning();
  return newChat;
}

// Get or create chat for a task
export async function getOrCreateTaskChat(taskId: string, taskTitle: string) {
  let chatRecord = await db.query.chat.findFirst({
    where: eq(chat.taskId, taskId),
  });

  if (!chatRecord) {
    const id = generateUUID();
    const [newChat] = await db
      .insert(chat)
      .values({
        id,
        title: taskTitle,
        taskId,
      })
      .returning();
    chatRecord = newChat;
  }

  return chatRecord;
}

// Get messages for a chat as UIMessage array
export async function getChatMessagesFromDb(
  chatId: string,
): Promise<UIMessage[]> {
  const messages = await db.query.message.findMany({
    where: eq(message.chatId, chatId),
    orderBy: message.createdAt,
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    parts: m.parts as UIMessage["parts"],
  }));
}

// Generate mock agent response based on agent type and task info
export function generateMockAgentResponse(
  agentType: string,
  taskTitle: string,
  taskDescription?: string | null,
): string {
  const context = taskDescription
    ? `Task: ${taskTitle}\nDescription: ${taskDescription}`
    : `Task: ${taskTitle}`;

  const responses: Record<string, string> = {
    developer: `## Implementation Complete

I've analyzed and completed the implementation for this task.

${context}

### What I Did:
1. Analyzed the requirements
2. Implemented the necessary changes
3. Added appropriate error handling
4. Tested the implementation

### Files Modified:
- Created/updated relevant source files
- Added unit tests
- Updated documentation as needed

### Summary:
The implementation is complete and ready for review. All tests pass and the code follows best practices.`,

    designer: `## Design Work Complete

I've completed the design work for this task.

${context}

### Deliverables:
1. Created wireframes and mockups
2. Defined visual specifications
3. Documented component behavior

### Design Decisions:
- Followed existing design patterns for consistency
- Optimized for usability and accessibility
- Considered responsive design requirements

### Next Steps:
The designs are ready for review and implementation handoff.`,

    researcher: `## Research Complete

I've completed the research for this task.

${context}

### Key Findings:
1. Gathered relevant data and insights
2. Analyzed competitive landscape
3. Identified best practices and recommendations

### Summary:
The research provides a solid foundation for decision-making. Key recommendations are included in the detailed report.`,

    writer: `## Content Complete

I've finished the content work for this task.

${context}

### Deliverables:
1. Main content completed
2. Copy reviewed for clarity and tone
3. SEO considerations applied

### Notes:
The content aligns with brand guidelines and target audience expectations. Ready for editorial review.`,

    analyst: `## Analysis Complete

I've completed the analysis for this task.

${context}

### Findings:
1. Data processed and analyzed
2. Key metrics identified
3. Insights and recommendations prepared

### Summary:
The analysis reveals actionable insights. Detailed findings are included in the report.`,
  };

  return responses[agentType] ?? responses.developer;
}

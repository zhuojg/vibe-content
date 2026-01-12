import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inboxMessage, task } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { publicProcedure } from "@/orpc";

const inboxMessageTypeSchema = z.enum(["task_suggestion", "completion_review"]);
const inboxMessageStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "dismissed",
]);

const suggestedTaskDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  assignedAgent: z.string().optional(),
});

const reviewDataSchema = z.object({
  output: z.string(),
  agentType: z.string(),
});

// Get all inbox messages for a project
export const getInboxMessages = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      status: inboxMessageStatusSchema.optional(),
    }),
  )
  .handler(async ({ input }) => {
    const whereConditions = [eq(inboxMessage.projectId, input.projectId)];
    if (input.status) {
      whereConditions.push(eq(inboxMessage.status, input.status));
    }

    return db.query.inboxMessage.findMany({
      where: and(...whereConditions),
      orderBy: desc(inboxMessage.createdAt),
      with: {
        task: true,
      },
    });
  });

// Get a single inbox message by ID
export const getInboxMessage = publicProcedure
  .input(z.object({ messageId: z.string() }))
  .handler(async ({ input, errors }) => {
    const message = await db.query.inboxMessage.findFirst({
      where: eq(inboxMessage.id, input.messageId),
      with: {
        task: true,
      },
    });

    if (!message) {
      throw errors.NOT_FOUND({ data: { resource: "inbox message" } });
    }

    return message;
  });

// Create a new inbox message (called by agent tool)
export const createInboxMessage = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      type: inboxMessageTypeSchema,
      title: z.string().min(1),
      description: z.string().optional(),
      taskId: z.string().optional(),
      suggestedTaskData: suggestedTaskDataSchema.optional(),
      reviewData: reviewDataSchema.optional(),
    }),
  )
  .handler(async ({ input }) => {
    const id = generateUUID();
    const [newMessage] = await db
      .insert(inboxMessage)
      .values({
        id,
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        description: input.description,
        taskId: input.taskId,
        suggestedTaskData: input.suggestedTaskData,
        reviewData: input.reviewData,
      })
      .returning();

    return newMessage;
  });

// Accept an inbox message
// For task_suggestion: Creates the task from suggestedTaskData
// For completion_review: Updates the referenced task status to "done"
export const acceptInboxMessage = publicProcedure
  .input(
    z.object({
      messageId: z.string(),
      // Allow overriding suggested task data when accepting
      taskOverrides: suggestedTaskDataSchema.partial().optional(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const message = await db.query.inboxMessage.findFirst({
      where: eq(inboxMessage.id, input.messageId),
    });

    if (!message) {
      throw errors.NOT_FOUND({ data: { resource: "inbox message" } });
    }

    if (message.status !== "pending") {
      throw errors.VALIDATION_ERROR({
        data: {
          field: "status",
          message: "Message has already been processed",
        },
      });
    }

    let createdTaskId: string | null = null;

    // Handle based on message type
    if (message.type === "task_suggestion" && message.suggestedTaskData) {
      // Create the task from suggested data
      const taskData = {
        ...message.suggestedTaskData,
        ...input.taskOverrides,
      };

      const taskId = generateUUID();
      const order = Date.now().toString();

      await db.insert(task).values({
        id: taskId,
        projectId: message.projectId,
        title: taskData.title,
        description: taskData.description,
        assignedAgent: taskData.assignedAgent,
        order,
        status: "todo",
      });

      createdTaskId = taskId;
    } else if (message.type === "completion_review" && message.taskId) {
      // Update the task status to done
      await db
        .update(task)
        .set({ status: "done" })
        .where(eq(task.id, message.taskId));
    }

    // Update the message status
    const [updatedMessage] = await db
      .update(inboxMessage)
      .set({
        status: "accepted",
        resolvedAt: new Date(),
        taskId: createdTaskId ?? message.taskId,
      })
      .where(eq(inboxMessage.id, input.messageId))
      .returning();

    return updatedMessage;
  });

// Reject an inbox message
// For completion_review: Updates the task status back to "processing" with review comment
export const rejectInboxMessage = publicProcedure
  .input(
    z.object({
      messageId: z.string(),
      comment: z.string().optional(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const message = await db.query.inboxMessage.findFirst({
      where: eq(inboxMessage.id, input.messageId),
    });

    if (!message) {
      throw errors.NOT_FOUND({ data: { resource: "inbox message" } });
    }

    if (message.status !== "pending") {
      throw errors.VALIDATION_ERROR({
        data: {
          field: "status",
          message: "Message has already been processed",
        },
      });
    }

    // Handle rejection based on message type
    if (message.type === "completion_review" && message.taskId) {
      // Update the task status back to processing with review comment
      await db
        .update(task)
        .set({
          status: "processing",
          reviewComment: input.comment,
        })
        .where(eq(task.id, message.taskId));
    }

    // Update the message status
    const [updatedMessage] = await db
      .update(inboxMessage)
      .set({
        status: "rejected",
        resolvedAt: new Date(),
      })
      .where(eq(inboxMessage.id, input.messageId))
      .returning();

    return updatedMessage;
  });

// Dismiss an inbox message without taking action
export const dismissInboxMessage = publicProcedure
  .input(z.object({ messageId: z.string() }))
  .handler(async ({ input, errors }) => {
    const message = await db.query.inboxMessage.findFirst({
      where: eq(inboxMessage.id, input.messageId),
    });

    if (!message) {
      throw errors.NOT_FOUND({ data: { resource: "inbox message" } });
    }

    if (message.status !== "pending") {
      throw errors.VALIDATION_ERROR({
        data: {
          field: "status",
          message: "Message has already been processed",
        },
      });
    }

    const [updatedMessage] = await db
      .update(inboxMessage)
      .set({
        status: "dismissed",
        resolvedAt: new Date(),
      })
      .where(eq(inboxMessage.id, input.messageId))
      .returning();

    return updatedMessage;
  });

// Get pending message count for a project
export const getPendingCount = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input }) => {
    const messages = await db.query.inboxMessage.findMany({
      where: and(
        eq(inboxMessage.projectId, input.projectId),
        eq(inboxMessage.status, "pending"),
      ),
    });

    return { count: messages.length };
  });

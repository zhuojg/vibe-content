import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { task } from "@/db/schema";
import { publicProcedure } from "@/orpc";
import { generateUUID } from "@/lib/utils";

const taskStatusSchema = z.enum([
  "todo",
  "processing",
  "in_review",
  "done",
  "cancel",
]);

export const createTask = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const id = generateUUID();
    const order = Date.now().toString();
    const [newTask] = await db
      .insert(task)
      .values({
        id,
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        order,
        status: "todo",
      })
      .returning();
    return newTask;
  });

export const getTasksByProject = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input }) => {
    return db.query.task.findMany({
      where: eq(task.projectId, input.projectId),
      orderBy: asc(task.order),
    });
  });

export const updateTaskStatus = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      status: taskStatusSchema,
    }),
  )
  .handler(async ({ input, errors }) => {
    const [updated] = await db
      .update(task)
      .set({ status: input.status })
      .where(eq(task.id, input.taskId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return updated;
  });

export const updateTask = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const updates: Partial<{ title: string; description: string }> = {};
    if (input.title) updates.title = input.title;
    if (input.description !== undefined)
      updates.description = input.description;

    const [updated] = await db
      .update(task)
      .set(updates)
      .where(eq(task.id, input.taskId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return updated;
  });

export const deleteTask = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input, errors }) => {
    const [deleted] = await db
      .delete(task)
      .where(eq(task.id, input.taskId))
      .returning();
    if (!deleted) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return { success: true };
  });

// Assign agent and start task (todo -> processing)
export const assignAgentAndStart = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      agentType: z.string(),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const updates: {
      assignedAgent: typeof input.agentType;
      status: "processing";
      description?: string;
    } = {
      assignedAgent: input.agentType,
      status: "processing",
    };
    if (input.description !== undefined) {
      updates.description = input.description;
    }

    const [updated] = await db
      .update(task)
      .set(updates)
      .where(eq(task.id, input.taskId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return updated;
  });

// Approve task (in_review -> done)
export const approveTask = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input, errors }) => {
    const [updated] = await db
      .update(task)
      .set({ status: "done" })
      .where(eq(task.id, input.taskId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return updated;
  });

// Reject task with comment (in_review -> processing)
export const rejectTask = publicProcedure
  .input(
    z.object({
      taskId: z.string(),
      comment: z.string().min(1),
    }),
  )
  .handler(async ({ input, errors }) => {
    const [updated] = await db
      .update(task)
      .set({
        status: "processing",
        reviewComment: input.comment,
      })
      .where(eq(task.id, input.taskId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }
    return updated;
  });

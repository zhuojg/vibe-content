import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessage, task } from "@/db/schema";
import { publicProcedure } from "@/orpc";

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
    const id = crypto.randomUUID();
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

export const getTaskMessages = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input }) => {
    return db.query.chatMessage.findMany({
      where: eq(chatMessage.taskId, input.taskId),
      orderBy: chatMessage.createdAt,
    });
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

// Complete processing and generate mock output (processing -> in_review)
export const completeProcessing = publicProcedure
  .input(z.object({ taskId: z.string() }))
  .handler(async ({ input, errors }) => {
    // Get the task to generate contextual mock output
    const existingTask = await db.query.task.findFirst({
      where: eq(task.id, input.taskId),
    });
    if (!existingTask) {
      throw errors.NOT_FOUND({ data: { resource: "task" } });
    }

    // Generate mock output based on agent type
    const mockOutputs: Record<string, string> = {
      developer: `## Implementation Complete

I've completed the implementation for "${existingTask.title}".

### Changes Made:
- Created new component with proper TypeScript types
- Added unit tests with 95% coverage
- Updated documentation

### Files Modified:
- src/components/Feature.tsx (new)
- src/tests/Feature.test.ts (new)
- README.md (updated)

Ready for review.`,
      designer: `## Design Complete

I've finished the design work for "${existingTask.title}".

### Deliverables:
- High-fidelity mockups (3 screens)
- Design tokens exported
- Component specifications documented

### Design Decisions:
- Used existing color palette for consistency
- Added subtle animations for better UX
- Mobile-first responsive approach

Assets are ready for handoff.`,
      researcher: `## Research Complete

I've completed the research for "${existingTask.title}".

### Key Findings:
1. Market analysis shows 3 main competitors
2. User interviews revealed pain points
3. Technical feasibility confirmed

### Recommendations:
- Proceed with MVP approach
- Focus on core feature set
- Plan for iterative improvements

Full report attached.`,
      writer: `## Content Complete

I've finished writing for "${existingTask.title}".

### Deliverables:
- Main content (1,500 words)
- SEO-optimized meta descriptions
- Social media snippets

### Notes:
- Tone matches brand guidelines
- Includes 3 CTAs
- Ready for editorial review`,
      analyst: `## Analysis Complete

I've completed the analysis for "${existingTask.title}".

### Summary:
- Processed 10,000 data points
- Identified 5 key trends
- Created visualization dashboard

### Insights:
1. 23% increase in user engagement
2. Mobile traffic up 45%
3. Conversion rate optimization opportunities

Report and dashboard ready for review.`,
    };

    const agentType = existingTask.assignedAgent ?? "developer";
    const output = mockOutputs[agentType] ?? mockOutputs.developer;

    const [updated] = await db
      .update(task)
      .set({
        status: "in_review",
        output,
      })
      .where(eq(task.id, input.taskId))
      .returning();

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

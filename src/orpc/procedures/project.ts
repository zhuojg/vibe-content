import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatMessage, project } from "@/db/schema";
import { publicProcedure } from "@/orpc";

const projectStatusSchema = z.enum([
  "clarifying",
  "active",
  "completed",
  "archived",
]);

export const createProject = publicProcedure
  .input(z.object({ name: z.string().min(1) }))
  .handler(async ({ input }) => {
    const id = crypto.randomUUID();
    const [newProject] = await db
      .insert(project)
      .values({
        id,
        name: input.name,
        status: "clarifying",
      })
      .returning();
    return newProject;
  });

export const getProject = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input, errors }) => {
    const result = await db.query.project.findFirst({
      where: eq(project.id, input.projectId),
    });
    if (!result) {
      throw errors.NOT_FOUND({ data: { resource: "project" } });
    }
    return result;
  });

export const listProjects = publicProcedure.handler(async () => {
  return db.query.project.findMany({
    orderBy: desc(project.createdAt),
  });
});

export const updateProjectStatus = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      status: projectStatusSchema,
    }),
  )
  .handler(async ({ input, errors }) => {
    const [updated] = await db
      .update(project)
      .set({ status: input.status })
      .where(eq(project.id, input.projectId))
      .returning();
    if (!updated) {
      throw errors.NOT_FOUND({ data: { resource: "project" } });
    }
    return updated;
  });

export const getProjectMessages = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input }) => {
    return db.query.chatMessage.findMany({
      where: eq(chatMessage.projectId, input.projectId),
      orderBy: chatMessage.createdAt,
    });
  });

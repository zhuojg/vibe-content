import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { project, task } from "@/db/schema";
import { publicProcedure } from "..";

// Mock task templates based on project type
const taskTemplates = [
  {
    title: "Research and gather requirements",
    description:
      "Analyze the project scope and gather all necessary requirements",
  },
  {
    title: "Create initial design",
    description: "Draft the initial design and structure for the project",
  },
  {
    title: "Set up development environment",
    description: "Configure tools and environment needed for the project",
  },
  {
    title: "Implement core functionality",
    description: "Build the main features and functionality",
  },
  {
    title: "Review and iterate",
    description: "Review progress and make necessary adjustments",
  },
];

export const generateInitialTasks = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .handler(async ({ input, errors }) => {
    const projectInfo = await db.query.project.findFirst({
      where: eq(project.id, input.projectId),
    });
    if (!projectInfo) {
      throw errors.NOT_FOUND({ data: { resource: "project" } });
    }

    // Update project status to active
    await db
      .update(project)
      .set({ status: "active" })
      .where(eq(project.id, input.projectId));

    // Create initial tasks
    const createdTasks = [];
    for (let i = 0; i < taskTemplates.length; i++) {
      const template = taskTemplates[i];
      const id = crypto.randomUUID();
      const order = (Date.now() + i).toString();

      const [newTask] = await db
        .insert(task)
        .values({
          id,
          title: template.title,
          description: template.description,
          projectId: input.projectId,
          order,
          status: "todo",
        })
        .returning();
      createdTasks.push(newTask);
    }

    return { project: projectInfo, tasks: createdTasks };
  });

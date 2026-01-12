import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { inboxMessage } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import type { CommonToolCallPayload } from "../types";

const inboxInputSchema = z.object({
  type: z
    .enum(["task_suggestion", "completion_review"])
    .describe("The type of inbox message"),
  title: z.string().describe("A clear, concise title for the message"),
  description: z
    .string()
    .optional()
    .describe("Additional context or details about the message"),
  taskId: z
    .string()
    .optional()
    .describe("The task ID (required for completion_review)"),
  suggestedTaskData: z
    .object({
      title: z.string().describe("Title for the suggested task"),
      description: z
        .string()
        .optional()
        .describe("Description for the suggested task"),
      assignedAgent: z
        .string()
        .optional()
        .describe("Agent type to assign to the task"),
    })
    .optional()
    .describe("Task details (required for task_suggestion)"),
  reviewData: z
    .object({
      output: z.string().describe("Summary of the completed work"),
      agentType: z.string().describe("The agent type that did the work"),
    })
    .optional()
    .describe("Review details (required for completion_review)"),
});

export function inbox(payload: CommonToolCallPayload) {
  return tool({
    description: `Create an inbox message for user review.

Use this tool when:
- Suggesting a new task to create for the project
- A task is completed and needs user approval before being marked as done

Message types:
- task_suggestion: Propose a new task to be created. Include suggestedTaskData with the task details.
- completion_review: Request user approval for completed work. Include taskId and reviewData.

The user will see the message in their inbox and can accept, reject, or dismiss it.`,
    inputSchema: inboxInputSchema,
    execute: async (input) => {
      // Validate input based on type
      if (input.type === "task_suggestion" && !input.suggestedTaskData) {
        return "Error: suggestedTaskData is required for task_suggestion messages";
      }

      if (input.type === "completion_review") {
        if (!input.taskId) {
          return "Error: taskId is required for completion_review messages";
        }
        if (!input.reviewData) {
          return "Error: reviewData is required for completion_review messages";
        }
      }

      const id = generateUUID();

      try {
        await db
          .insert(inboxMessage)
          .values({
            id,
            projectId: payload.projectId,
            type: input.type,
            title: input.title,
            description: input.description,
            taskId: input.taskId,
            suggestedTaskData: input.suggestedTaskData,
            reviewData: input.reviewData,
          })
          .returning();

        if (input.type === "task_suggestion") {
          return `Created task suggestion inbox message: "${input.title}". The user will see this in their inbox and can accept to create the task.`;
        }

        return `Created completion review inbox message: "${input.title}". The user will review and approve or reject the completed work.`;
      } catch (error) {
        console.error("Failed to create inbox message:", error);
        return `Error creating inbox message: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
}

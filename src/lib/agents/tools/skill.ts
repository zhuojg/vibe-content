import { tool } from "ai";
import { z } from "zod";
import {
  getSkill,
  getSkills,
  loadSkillContent,
  type SkillContext,
} from "../skills";
import type { CommonToolCallPayload } from "../types";

export function skill(
  payload: CommonToolCallPayload,
  disabledSkills?: Record<string, boolean>,
) {
  const context: SkillContext = {
    projectId: payload.projectId,
    disabledSkills,
  };

  const availableSkills = getSkills(context);

  const skillsList =
    availableSkills.length === 0
      ? "No skills available."
      : availableSkills
          .map((s) => {
            const isReadOnly = disabledSkills?.[s.name] === false;
            const readOnlyTag = isReadOnly ? " (read-only)" : "";
            return `  <skill>\n    <name>${s.name}${readOnlyTag}</name>\n    <description>${s.description}</description>\n  </skill>`;
          })
          .join("\n");

  return tool({
    description: `Load a skill to get detailed instructions for a specific task.
Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.

<available_skills>
${skillsList}
</available_skills>`,
    inputSchema: z.object({
      name: z.string().describe("The skill name from available_skills"),
    }),
    execute: async ({ name }) => {
      const foundSkill = getSkill(name, context);

      if (!foundSkill) {
        const names = availableSkills.map((s) => s.name).join(", ");
        return `Skill "${name}" not found. Available skills: ${names || "none"}`;
      }

      const content = loadSkillContent(foundSkill.name, context);

      return `## Skill: ${foundSkill.name}\n\n${content}`;
    },
  });
}

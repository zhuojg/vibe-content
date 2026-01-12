import { tool } from "ai";
import { z } from "zod";
import { getSkill, type SkillContext } from "../skills";
import { executeSkill, isExecutableSkill } from "../skills/executors";
import type { CommonToolCallPayload } from "../types";

export function skillRunner(
  payload: CommonToolCallPayload,
  disabledSkills?: Record<string, boolean>,
) {
  const context: SkillContext = {
    projectId: payload.projectId,
    disabledSkills,
  };

  return tool({
    description: `Execute a loaded skill with parameters.
First load the skill using the "skill" tool to understand required parameters.

Input:
- skillName: The name of the skill to execute
- params: Object containing skill-specific parameters`,
    inputSchema: z.object({
      skillName: z.string(),
      params: z.record(z.string(), z.unknown()),
    }),
    execute: async ({ skillName, params }, { toolCallId }) => {
      // Check if skill execution is disabled for this agent
      if (disabledSkills?.[skillName] === false) {
        return `Skill "${skillName}" is restricted and cannot be executed by this agent. This skill is read-only.`;
      }

      const foundSkill = getSkill(skillName, context);

      if (!foundSkill) {
        return `Skill "${skillName}" not found.`;
      }

      if (!isExecutableSkill(skillName)) {
        return `Skill "${skillName}" provides information only and cannot be executed.`;
      }

      return executeSkill(skillName, params, {
        ...payload,
        toolCallId,
      });
    },
  });
}

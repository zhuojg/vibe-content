import type { CommonToolCallPayload } from "../types";

/**
 * Skill metadata exposed to agents
 */
export type SkillInfo = {
  name: string;
  description: string;
};

/**
 * Context for filtering available skills
 */
export type SkillContext = {
  projectId: string;
  disabledSkills?: Record<string, boolean>;
};

/**
 * Context for skill execution
 */
export type SkillExecutionContext = CommonToolCallPayload & {
  toolCallId: string;
};

/**
 * Skill executor function type
 */
export type SkillExecutor = (
  params: Record<string, unknown>,
  context: SkillExecutionContext,
) => Promise<string>;

import type { SkillExecutionContext, SkillExecutor } from "../types";
import { executeImageGeneration } from "./image-generation";
import { executeProductResearch } from "./product-research";

/**
 * Registry of skill executors
 */
const executors = new Map<string, SkillExecutor>();

// Register built-in executors
executors.set("product-research", executeProductResearch);
executors.set("image-generation", executeImageGeneration);

/**
 * Execute a skill with the given parameters
 */
export async function executeSkill(
  skillName: string,
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<string> {
  const executor = executors.get(skillName);

  if (!executor) {
    return `Skill "${skillName}" is not executable. It provides information only.`;
  }

  return executor(params, context);
}

/**
 * Check if a skill has an executor (is executable)
 */
export function isExecutableSkill(skillName: string): boolean {
  return executors.has(skillName);
}

/**
 * Register a skill executor
 */
export function registerSkillExecutor(
  skillName: string,
  executor: SkillExecutor,
): void {
  executors.set(skillName, executor);
}

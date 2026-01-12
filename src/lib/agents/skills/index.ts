import matter from "gray-matter";
import imageGenerationMd from "./built-in/image-generation/SKILL.md?raw";

// Import skill markdown files as raw text
import productResearchMd from "./built-in/product-research/SKILL.md?raw";
import type { SkillContext, SkillInfo } from "./types";

type SkillDefinition = {
  name: string;
  description: string;
  content: string;
};

/**
 * Parse a skill markdown file with frontmatter
 */
function parseSkillMarkdown(content: string): SkillDefinition {
  const { data, content: skillContent } = matter(content);
  return {
    name: data.name,
    description: data.description,
    content: skillContent.trim(),
  };
}

// Parse all skill definitions
const skillDefinitions = new Map<string, SkillDefinition>([
  ["product-research", parseSkillMarkdown(productResearchMd)],
  ["image-generation", parseSkillMarkdown(imageGenerationMd)],
]);

/**
 * Get all available skills filtered by context
 */
export function getSkills(_context: SkillContext): SkillInfo[] {
  const skills: SkillInfo[] = [];

  for (const [_name, skillDef] of skillDefinitions) {
    skills.push({
      name: skillDef.name,
      description: skillDef.description,
    });
  }

  return skills;
}

/**
 * Get single skill by name
 */
export function getSkill(
  name: string,
  _context: SkillContext,
): SkillInfo | null {
  const skillDef = skillDefinitions.get(name);

  if (!skillDef) {
    return null;
  }

  return {
    name: skillDef.name,
    description: skillDef.description,
  };
}

/**
 * Load full skill content by skill name
 */
export function loadSkillContent(
  skillName: string,
  _context?: SkillContext,
): string {
  const skillDef = skillDefinitions.get(skillName);

  if (!skillDef) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  return skillDef.content;
}

// Re-export types
export type {
  SkillContext,
  SkillExecutionContext,
  SkillExecutor,
  SkillInfo,
} from "./types";

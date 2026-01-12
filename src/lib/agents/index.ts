import matter from "gray-matter";
import executionMd from "./built-in/execution.md?raw";

// Import markdown files as raw text
import leadingMd from "./built-in/leading.md?raw";
import researchMd from "./built-in/research.md?raw";
import type { AgentContext, AgentDefinition, AgentInfo } from "./types";

/**
 * Parse a markdown file with frontmatter into an AgentDefinition
 */
function parseAgentMarkdown(content: string): AgentDefinition {
  const { data, content: systemPrompt } = matter(content);
  return {
    name: data.name,
    description: data.description,
    systemPrompt: systemPrompt.trim(),
    mode: data.mode,
    model: data.model,
    maxSteps: data.maxSteps,
    tools: data.tools,
    skills: data.skills,
  };
}

// Parse all agent definitions
const agentDefinitions = new Map<string, AgentDefinition>([
  ["leading", parseAgentMarkdown(leadingMd)],
  ["execution", parseAgentMarkdown(executionMd)],
  ["research", parseAgentMarkdown(researchMd)],
]);

/**
 * Get all available subagents (mode: "subagent")
 */
export function getAgents(_context: AgentContext): AgentInfo[] {
  const agents: AgentInfo[] = [];

  for (const [_name, definition] of agentDefinitions) {
    if (definition.mode === "subagent") {
      agents.push({
        name: definition.name,
        description: definition.description,
      });
    }
  }

  return agents;
}

/**
 * Get single subagent by name (only if mode="subagent")
 */
export function getAgent(
  name: string,
  _context: AgentContext,
): AgentInfo | null {
  const definition = agentDefinitions.get(name);

  if (!definition || definition.mode !== "subagent") {
    return null;
  }

  return {
    name: definition.name,
    description: definition.description,
  };
}

/**
 * Load full agent definition by name (for subagents)
 */
export function loadAgentDefinition(name: string): AgentDefinition | null {
  const definition = agentDefinitions.get(name);

  if (!definition || definition.mode !== "subagent") {
    return null;
  }

  return definition;
}

/**
 * Get primary agent by name (e.g., "leading" or "execution")
 */
export function getPrimaryAgent(name: string): AgentDefinition | null {
  const definition = agentDefinitions.get(name);

  if (!definition || definition.mode !== "primary") {
    return null;
  }

  return definition;
}

// Re-export types
export type {
  AgentContext,
  AgentDefinition,
  AgentInfo,
  CommonToolCallPayload,
} from "./types";

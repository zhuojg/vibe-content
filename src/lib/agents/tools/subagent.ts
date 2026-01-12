import { tool } from "ai";
import { z } from "zod";
import {
  type AgentContext,
  getAgent,
  getAgents,
  loadAgentDefinition,
} from "..";
import type { CommonToolCallPayload } from "../types";

export function subagent(payload: CommonToolCallPayload) {
  const context: AgentContext = {
    projectId: payload.projectId,
  };

  const availableAgents = getAgents(context);

  const agentsList =
    availableAgents.length === 0
      ? "No subagents available."
      : availableAgents
          .map(
            (s) =>
              `  <subagent>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </subagent>`,
          )
          .join("\n");

  return tool({
    description: `Delegate a task to a specialized subagent.
Subagents have specialized knowledge and can autonomously execute complex tasks.

Use this when:
- a task matches an available subagent's description
- you do not care about the execution details

Make sure to double check critical details and decisions after getting results from the subagents.

<available_subagents>
${agentsList}
</available_subagents>`,
    inputSchema: z.object({
      agent: z.string().describe("The subagent name from available_subagents"),
      requirement: z
        .string()
        .describe("The task or problem for the subagent to solve"),
      context: z.string().optional().describe("Additional context information"),
    }),
    execute: async ({ agent, requirement, context: additionalContext }) => {
      const foundAgent = getAgent(agent, context);

      if (!foundAgent) {
        const names = availableAgents.map((s) => s.name).join(", ");
        return `Subagent "${agent}" not found. Available subagents: ${names || "none"}`;
      }

      const definition = loadAgentDefinition(agent);

      if (!definition || definition.mode !== "subagent") {
        return `Failed to load definition for subagent "${agent}"`;
      }

      // For now, return a mock response since we're using mock mode
      // In production, this would:
      // 1. Combine requirement + context into prompt
      // 2. Create subagent tools filtered by definition.tools and definition.skills
      // 3. Use streamText with the actual LLM
      const mockResponse = generateMockSubagentResponse(
        agent,
        requirement,
        additionalContext,
        definition.systemPrompt,
      );

      return mockResponse;
    },
  });
}

/**
 * Generate a mock response for the subagent
 */
function generateMockSubagentResponse(
  agentName: string,
  requirement: string,
  context: string | undefined,
  _systemPrompt: string,
): string {
  // Generate a contextual mock response based on the agent type
  if (agentName === "research") {
    return `## Research Analysis

### Problem Statement
${requirement}

${context ? `### Context Provided\n${context}\n` : ""}

### Key Findings
- Initial research indicates relevant market trends
- Competitor analysis shows standard pricing patterns
- Consumer preferences align with expected demographics

### Analysis
The research task has been analyzed according to the requirements. Key insights have been gathered and organized for review.

### Recommendations
1. Consider the primary findings for decision-making
2. Validate assumptions with additional data if needed
3. Proceed with the recommended approach

### Next Steps
- Review the findings with stakeholders
- Implement recommendations as appropriate

*Note: This is a mock subagent response for demonstration purposes.*`;
  }

  // Generic mock response for other agents
  return `## Subagent Response

**Agent:** ${agentName}
**Task:** ${requirement}

The subagent has processed the request and is ready to provide assistance.

${context ? `**Context:** ${context}\n` : ""}

*Note: This is a mock subagent response. In production, this would use an actual LLM to generate responses.*`;
}

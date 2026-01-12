import type { UIMessageStreamWriter } from "ai";

/**
 * Common payload passed to all tools
 */
export type CommonToolCallPayload = {
  writer: UIMessageStreamWriter;
  chatId: string;
  projectId: string;
  abortController?: AbortController;
};

/**
 * Agent metadata exposed to other agents
 */
export type AgentInfo = {
  name: string;
  description: string;
};

/**
 * Full agent definition including system prompt
 */
export type AgentDefinition = {
  name: string;
  description: string;
  systemPrompt: string;
  mode: "subagent" | "primary";
  model?: string;
  maxSteps?: number;
  tools?: Record<string, boolean>;
  skills?: Record<string, boolean>;
};

/**
 * Context for filtering available agents
 */
export type AgentContext = {
  projectId: string;
};

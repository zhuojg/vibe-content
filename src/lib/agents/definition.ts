import { ToolLoopAgent } from "ai";

export const leadingAgent = new ToolLoopAgent({
  model: "",
  instructions: [{ role: "system", content: "" }],
  tools: {},
});

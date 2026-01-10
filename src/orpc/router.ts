import * as agentProcedures from "./procedures/agent";
import * as chatProcedures from "./procedures/chat";
import * as projectProcedures from "./procedures/project";
import * as taskProcedures from "./procedures/task";

export const router = {
  project: projectProcedures,
  task: taskProcedures,
  chat: chatProcedures,
  agent: agentProcedures,
};

export type Router = typeof router;

import * as agentProcedures from "./procedures/agent";
import * as chatProcedures from "./procedures/chat";
import * as inboxProcedures from "./procedures/inbox";
import * as projectProcedures from "./procedures/project";
import * as taskProcedures from "./procedures/task";

export const router = {
  project: projectProcedures,
  task: taskProcedures,
  chat: chatProcedures,
  agent: agentProcedures,
  inbox: inboxProcedures,
};

export type Router = typeof router;

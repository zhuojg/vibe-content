import { relations } from "drizzle-orm";
import {
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const projectStatusEnum = pgEnum("project_status", [
  "clarifying",
  "active",
  "completed",
  "archived",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "processing",
  "in_review",
  "done",
  "cancel",
]);

export const finishReasonEnum = pgEnum("finish_reason", [
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown",
  "abort",
]);

// Language model usage type
type LanguageModelUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

// Project table
export const project = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("clarifying").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Task table
export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    order: text("order").notNull(),
    assignedAgent: text("assigned_agent"),
    output: text("output"),
    reviewComment: text("review_comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("task_projectId_idx").on(table.projectId)],
);

// Chat table - represents a chat session
export const chat = pgTable(
  "chat",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),

    // Can be linked to project OR task (polymorphic)
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    taskId: text("task_id").references(() => task.id, { onDelete: "cascade" }),

    // For resumable streams
    activeStreamId: text("active_stream_id"),

    // Token usage tracking
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    finishReason: finishReasonEnum("finish_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_projectId_idx").on(table.projectId),
    index("chat_taskId_idx").on(table.taskId),
  ],
);

// Message table - individual messages in a chat
export const message = pgTable(
  "message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["user", "assistant", "system"] }).notNull(),
    parts: json("parts").notNull(), // UIMessage parts array
    attachments: json("attachments"), // Optional attachments

    // Usage and finishReason only for assistant messages
    usage: json("usage").$type<LanguageModelUsage>(),
    finishReason: finishReasonEnum("message_finish_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("message_chatId_idx").on(table.chatId)],
);

// Relations
export const projectRelations = relations(project, ({ many }) => ({
  tasks: many(task),
  chats: many(chat),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  chats: many(chat),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  project: one(project, {
    fields: [chat.projectId],
    references: [project.id],
  }),
  task: one(task, {
    fields: [chat.taskId],
    references: [task.id],
  }),
  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

// Inbox Message enums
export const inboxMessageTypeEnum = pgEnum("inbox_message_type", [
  "task_suggestion",
  "completion_review",
]);

export const inboxMessageStatusEnum = pgEnum("inbox_message_status", [
  "pending",
  "accepted",
  "rejected",
  "dismissed",
]);

// Suggested task data type
type SuggestedTaskData = {
  title: string;
  description?: string;
  assignedAgent?: string;
};

// Review data type
type ReviewData = {
  output: string;
  agentType: string;
};

// Inbox Message table
export const inboxMessage = pgTable(
  "inbox_message",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    type: inboxMessageTypeEnum("type").notNull(),
    status: inboxMessageStatusEnum("status").default("pending").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    taskId: text("task_id").references(() => task.id, { onDelete: "set null" }),
    suggestedTaskData: json("suggested_task_data").$type<SuggestedTaskData>(),
    reviewData: json("review_data").$type<ReviewData>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("inbox_message_projectId_idx").on(table.projectId),
    index("inbox_message_status_idx").on(table.status),
  ],
);

// Inbox Message relations
export const inboxMessageRelations = relations(inboxMessage, ({ one }) => ({
  project: one(project, {
    fields: [inboxMessage.projectId],
    references: [project.id],
  }),
  task: one(task, {
    fields: [inboxMessage.taskId],
    references: [task.id],
  }),
}));

// Update project relations to include inbox messages
export const projectInboxRelation = relations(project, ({ many }) => ({
  inboxMessages: many(inboxMessage),
}));

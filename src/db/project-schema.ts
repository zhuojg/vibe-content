import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

// Chat message table - stores UIMessage as JSONB
export const chatMessage = pgTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    taskId: text("task_id").references(() => task.id, { onDelete: "cascade" }),
    message: jsonb("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_message_projectId_idx").on(table.projectId),
    index("chat_message_taskId_idx").on(table.taskId),
  ],
);

// Relations
export const projectRelations = relations(project, ({ many }) => ({
  tasks: many(task),
  messages: many(chatMessage),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  project: one(project, {
    fields: [chatMessage.projectId],
    references: [project.id],
  }),
  task: one(task, {
    fields: [chatMessage.taskId],
    references: [task.id],
  }),
}));

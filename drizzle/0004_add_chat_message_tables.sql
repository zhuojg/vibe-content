-- Migration: Add chat and message tables, remove chat_message table
-- Creates new normalized schema for chat storage

-- Create finish_reason enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."finish_reason" AS ENUM('stop', 'length', 'content-filter', 'tool-calls', 'error', 'other', 'unknown', 'abort');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create chat table
CREATE TABLE IF NOT EXISTS "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"active_stream_id" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"finish_reason" "finish_reason",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create message table
CREATE TABLE IF NOT EXISTS "message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json,
	"usage" json,
	"message_finish_reason" "finish_reason",
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "chat_projectId_idx" ON "chat" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "chat_taskId_idx" ON "chat" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "message_chatId_idx" ON "message" USING btree ("chat_id");

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "chat" ADD CONSTRAINT "chat_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat" ADD CONSTRAINT "chat_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Drop old chat_message table (after migrating data if needed)
DROP TABLE IF EXISTS "chat_message";

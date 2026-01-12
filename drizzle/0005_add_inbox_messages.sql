-- Migration: Add inbox_message table for agent-to-user communication
-- Creates inbox system for task suggestions and completion reviews

-- Create inbox_message_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."inbox_message_type" AS ENUM('task_suggestion', 'completion_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create inbox_message_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."inbox_message_status" AS ENUM('pending', 'accepted', 'rejected', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create inbox_message table
CREATE TABLE IF NOT EXISTS "inbox_message" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" "inbox_message_type" NOT NULL,
	"status" "inbox_message_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_id" text,
	"suggested_task_data" json,
	"review_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "inbox_message_projectId_idx" ON "inbox_message" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "inbox_message_status_idx" ON "inbox_message" USING btree ("status");

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "inbox_message" ADD CONSTRAINT "inbox_message_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

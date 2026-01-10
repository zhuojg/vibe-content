CREATE TYPE "public"."agent_type" AS ENUM('developer', 'designer', 'researcher', 'writer', 'analyst');--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "assigned_agent" "agent_type";--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "output" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "review_comment" text;
ALTER TABLE "agents" ALTER COLUMN "model_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "instructions_config" jsonb;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "system_prompt" text;
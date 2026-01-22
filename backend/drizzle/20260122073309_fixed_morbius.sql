ALTER TYPE "public"."tool_type" ADD VALUE 'mcp_connector';--> statement-breakpoint
ALTER TABLE "tools" ALTER COLUMN "config" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "input_schema" jsonb;
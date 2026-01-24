ALTER TABLE "ai_usage" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "agent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD COLUMN "builder_message_id" text;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_builder_message_id_builder_messages_id_fk" FOREIGN KEY ("builder_message_id") REFERENCES "public"."builder_messages"("id") ON DELETE cascade ON UPDATE no action;
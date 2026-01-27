ALTER TABLE "builder_usage" DROP CONSTRAINT "builder_usage_builder_message_id_builder_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "builder_usage" ALTER COLUMN "builder_message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "builder_usage" ADD CONSTRAINT "builder_usage_builder_message_id_builder_messages_id_fk" FOREIGN KEY ("builder_message_id") REFERENCES "public"."builder_messages"("id") ON DELETE set null ON UPDATE no action;
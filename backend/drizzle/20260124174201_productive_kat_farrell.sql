CREATE TABLE "builder_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"builder_message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" text,
	"step_number" integer NOT NULL,
	"step_type" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"cost" real NOT NULL,
	"cached_tokens" integer,
	"reasoning_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_builder_message_id_builder_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "message_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "builder_usage" ADD CONSTRAINT "builder_usage_builder_message_id_builder_messages_id_fk" FOREIGN KEY ("builder_message_id") REFERENCES "public"."builder_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_usage" ADD CONSTRAINT "builder_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_usage" ADD CONSTRAINT "builder_usage_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" DROP COLUMN "builder_message_id";
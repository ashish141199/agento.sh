CREATE TYPE "public"."tool_type" AS ENUM('api_connector');--> statement-breakpoint
CREATE TABLE "agent_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "tool_type" DEFAULT 'api_connector' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agents" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "published_config_hash" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "embed_config" jsonb;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_slug_unique" UNIQUE("slug");
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."knowledge_file_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('file', 'website', 'notion', 'google_drive');--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"file_id" text,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"content_length" integer NOT NULL,
	"metadata" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_files" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_key" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"status" "knowledge_file_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "knowledge_source_type" NOT NULL,
	"status" "knowledge_source_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"total_characters" integer DEFAULT 0 NOT NULL,
	"last_trained_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_file_id_knowledge_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."knowledge_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunks_source_id_idx" ON "knowledge_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_file_id_idx" ON "knowledge_chunks" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "knowledge_files_source_id_idx" ON "knowledge_files" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_files_file_key_idx" ON "knowledge_files" USING btree ("file_key");--> statement-breakpoint
CREATE INDEX "knowledge_sources_agent_id_idx" ON "knowledge_sources" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_user_id_idx" ON "knowledge_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_status_idx" ON "knowledge_sources" USING btree ("status");--> statement-breakpoint
-- Create HNSW index for vector similarity search (cosine distance)
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
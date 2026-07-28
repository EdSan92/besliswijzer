CREATE TYPE "public"."pipeline_run_status" AS ENUM('queued', 'running', 'needs_review', 'approved', 'failed', 'published');--> statement-breakpoint
CREATE TYPE "public"."pipeline_step_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."pipeline_artifact_kind" AS ENUM('keyword_data', 'flow_brief', 'compiled_flow', 'content_package', 'quality_report');--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"category_slug" text NOT NULL,
	"language" text DEFAULT 'nl' NOT NULL,
	"pipeline_version" text NOT NULL,
	"input_version" text NOT NULL,
	"status" "pipeline_run_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_runs_idempotency_key_idx" ON "pipeline_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE TABLE "pipeline_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_key" text NOT NULL,
	"status" "pipeline_step_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_steps_run_key_idx" ON "pipeline_steps" USING btree ("run_id","step_key");--> statement-breakpoint
CREATE TABLE "pipeline_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"kind" "pipeline_artifact_kind" NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "pipeline_source_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"label" text NOT NULL,
	"url" text,
	"provider" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"assumption" boolean DEFAULT false NOT NULL
);--> statement-breakpoint
CREATE TABLE "pipeline_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"retryable" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "pipeline_steps" ADD CONSTRAINT "pipeline_steps_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_artifacts" ADD CONSTRAINT "pipeline_artifacts_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_artifacts" ADD CONSTRAINT "pipeline_artifacts_step_id_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."pipeline_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_source_references" ADD CONSTRAINT "pipeline_source_references_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_source_references" ADD CONSTRAINT "pipeline_source_references_step_id_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."pipeline_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_errors" ADD CONSTRAINT "pipeline_errors_step_id_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."pipeline_steps"("id") ON DELETE set null ON UPDATE no action;

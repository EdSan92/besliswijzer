CREATE TABLE "flow_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "flows" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_category_id_flow_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."flow_categories"("id") ON DELETE set null ON UPDATE no action;
CREATE TYPE "public"."page_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"canonical_name" text NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid,
	"primary_flow_id" uuid,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"seo_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"layout" jsonb DEFAULT '{"blockOrder":[]}'::jsonb NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"term" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"opportunity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_flow_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."flow_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_flow_id_flows_id_fk" FOREIGN KEY ("primary_flow_id") REFERENCES "public"."flows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pages" ADD CONSTRAINT "product_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keywords" ADD CONSTRAINT "product_keywords_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_keywords_product_term_idx" ON "product_keywords" USING btree ("product_id","term");

ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'affiliate_click';
--> statement-breakpoint
ALTER TABLE "analytics_events" ALTER COLUMN "flow_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "analytics_events" ALTER COLUMN "flow_version_id" DROP NOT NULL;

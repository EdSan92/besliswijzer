-- Opportunity Engine: route opportunities to product pages (FAQ) instead of separate flows
ALTER TYPE opportunity."OpportunityStatus" ADD VALUE IF NOT EXISTS 'ROUTED_TO_PRODUCT';
ALTER TABLE opportunity.oe_opportunities ADD COLUMN IF NOT EXISTS faq_item JSONB;
ALTER TABLE opportunity.oe_opportunities ADD COLUMN IF NOT EXISTS routed_page_slug TEXT;

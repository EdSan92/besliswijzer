import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const versionStatusEnum = pgEnum('version_status', ['draft', 'published', 'archived'])
export const nodeTypeEnum = pgEnum('node_type', ['question', 'info', 'lead_capture'])
export const ruleTypeEnum = pgEnum('rule_type', ['branch', 'result_map', 'skip'])
export const eventTypeEnum = pgEnum('event_type', [
  'flow_start',
  'step_view',
  'step_complete',
  'flow_complete',
  'cta_click',
  'lead_submit',
])

export const flowCategories = pgTable('flow_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flows = pgTable('flows', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  categoryId: uuid('category_id').references(() => flowCategories.id, { onDelete: 'set null' }),
  seoMeta: jsonb('seo_meta').notNull().default({}),
  currentPublishedVersionId: uuid('current_published_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flowVersions = pgTable('flow_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  flowId: uuid('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(0),
  status: versionStatusEnum('status').notNull().default('draft'),
  config: jsonb('config').notNull().default({}),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flowNodes = pgTable(
  'flow_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flowVersionId: uuid('flow_version_id')
      .notNull()
      .references(() => flowVersions.id, { onDelete: 'cascade' }),
    nodeKey: text('node_key').notNull(),
    type: nodeTypeEnum('type').notNull(),
    title: text('title').notNull(),
    content: jsonb('content').notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    isEntry: boolean('is_entry').notNull().default(false),
  },
  (table) => [uniqueIndex('flow_nodes_version_key_idx').on(table.flowVersionId, table.nodeKey)],
)

export const flowOptions = pgTable('flow_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id')
    .notNull()
    .references(() => flowNodes.id, { onDelete: 'cascade' }),
  optionKey: text('option_key').notNull(),
  label: text('label').notNull(),
  value: jsonb('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const flowRules = pgTable('flow_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  flowVersionId: uuid('flow_version_id')
    .notNull()
    .references(() => flowVersions.id, { onDelete: 'cascade' }),
  fromNodeKey: text('from_node_key').notNull(),
  ruleType: ruleTypeEnum('rule_type').notNull(),
  condition: jsonb('condition').notNull(),
  targetNodeKey: text('target_node_key'),
  targetResultKey: text('target_result_key'),
  priority: integer('priority').notNull().default(0),
})

export const flowResults = pgTable(
  'flow_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flowVersionId: uuid('flow_version_id')
      .notNull()
      .references(() => flowVersions.id, { onDelete: 'cascade' }),
    resultKey: text('result_key').notNull(),
    title: text('title').notNull(),
    body: jsonb('body').notNull().default({}),
    ctas: jsonb('ctas').notNull().default([]),
  },
  (table) => [uniqueIndex('flow_results_version_key_idx').on(table.flowVersionId, table.resultKey)],
)

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  flowId: uuid('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  flowVersionId: uuid('flow_version_id')
    .notNull()
    .references(() => flowVersions.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  eventType: eventTypeEnum('event_type').notNull(),
  nodeKey: text('node_key'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const leadSubmissions = pgTable('lead_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  flowId: uuid('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  flowVersionId: uuid('flow_version_id')
    .notNull()
    .references(() => flowVersions.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  email: text('email').notNull(),
  answersSnapshot: jsonb('answers_snapshot').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const flowsRelations = relations(flows, ({ many, one }) => ({
  versions: many(flowVersions),
  category: one(flowCategories, {
    fields: [flows.categoryId],
    references: [flowCategories.id],
  }),
  currentPublishedVersion: one(flowVersions, {
    fields: [flows.currentPublishedVersionId],
    references: [flowVersions.id],
  }),
  analyticsEvents: many(analyticsEvents),
  leadSubmissions: many(leadSubmissions),
}))

export const flowCategoriesRelations = relations(flowCategories, ({ many }) => ({
  flows: many(flows),
}))

export const flowVersionsRelations = relations(flowVersions, ({ one, many }) => ({
  flow: one(flows, { fields: [flowVersions.flowId], references: [flows.id] }),
  nodes: many(flowNodes),
  rules: many(flowRules),
  results: many(flowResults),
}))

export const flowNodesRelations = relations(flowNodes, ({ one, many }) => ({
  version: one(flowVersions, { fields: [flowNodes.flowVersionId], references: [flowVersions.id] }),
  options: many(flowOptions),
}))

export const flowOptionsRelations = relations(flowOptions, ({ one }) => ({
  node: one(flowNodes, { fields: [flowOptions.nodeId], references: [flowNodes.id] }),
}))

export const flowRulesRelations = relations(flowRules, ({ one }) => ({
  version: one(flowVersions, { fields: [flowRules.flowVersionId], references: [flowVersions.id] }),
}))

export const flowResultsRelations = relations(flowResults, ({ one }) => ({
  version: one(flowVersions, { fields: [flowResults.flowVersionId], references: [flowVersions.id] }),
}))

import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createDb,
  flows,
  flowCategories,
  flowVersions,
  flowNodes,
  flowOptions,
  flowRules,
  flowResults,
} from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

const defaultCategories = [
  {
    slug: 'energie',
    title: 'Energie',
    description: 'Warmtepomp, isolatie en energiebesparing',
    sortOrder: 1,
  },
  {
    slug: 'subsidie',
    title: 'Subsidie',
    description: 'ISDE, SVVE en andere regelingen',
    sortOrder: 2,
  },
  {
    slug: 'verbouwen',
    title: 'Verbouwen',
    description: 'Renovatie, uitbouw en verbouwplannen',
    sortOrder: 3,
  },
]

async function ensureCategories(db: ReturnType<typeof createDb>['db']) {
  const existing = await db.query.flowCategories.findFirst()
  if (existing) return db.query.flowCategories.findMany()

  console.log('Seeding categories...')
  await db.insert(flowCategories).values(defaultCategories)
  return db.query.flowCategories.findMany()
}

async function main() {
  const { db, client } = createDb(connectionString)
  const categories = await ensureCategories(db)
  const energieCategory = categories.find((c) => c.slug === 'energie')

  const existing = await db.query.flows.findFirst({
    where: eq(flows.slug, 'warmtepomp-keuzehulp'),
  })

  if (existing) {
    if (energieCategory && !existing.categoryId) {
      await db
        .update(flows)
        .set({ categoryId: energieCategory.id, updatedAt: new Date() })
        .where(eq(flows.id, existing.id))
      console.log('Assigned warmtepomp flow to Energie category')
    } else {
      console.log('Seed data already exists, skipping flow seed')
    }
    await client.end()
    return
  }

  console.log('Seeding warmtepomp flow...')

  const [flow] = await db
    .insert(flows)
    .values({
      slug: 'warmtepomp-keuzehulp',
      title: 'Warmtepomp keuzehulp',
      categoryId: energieCategory?.id ?? null,
      seoMeta: {
        title: 'Warmtepomp keuzehulp — vind de juiste warmtepomp',
        description:
          'Beantwoord een paar vragen en ontdek welke warmtepomp het beste bij jouw woning past.',
        ogImage: '/og/warmtepomp.jpg',
      },
    })
    .returning()

  const [draftVersion] = await db
    .insert(flowVersions)
    .values({ flowId: flow!.id, versionNumber: 0, status: 'draft' })
    .returning()

  const nodeData = [
    {
      nodeKey: 'woningtype',
      type: 'question' as const,
      title: 'Wat voor woning heb je?',
      content: { inputType: 'single', description: 'Dit bepaalt welk type warmtepomp geschikt is.' },
      sortOrder: 0,
      isEntry: true,
      options: [
        { optionKey: 'apartment', label: 'Appartement', value: 'apartment', sortOrder: 0 },
        { optionKey: 'house', label: 'Rijtjeshuis / vrijstaand', value: 'house', sortOrder: 1 },
      ],
    },
    {
      nodeKey: 'isolatie',
      type: 'question' as const,
      title: 'Hoe goed is je isolatie?',
      content: { inputType: 'single' },
      sortOrder: 1,
      isEntry: false,
      options: [
        { optionKey: 'good', label: 'Goed (dakisolatie + HR++)', value: 'good', sortOrder: 0 },
        { optionKey: 'poor', label: 'Matig tot slecht', value: 'poor', sortOrder: 1 },
      ],
    },
    {
      nodeKey: 'oppervlakte',
      type: 'question' as const,
      title: 'Wat is je woonoppervlakte?',
      content: { inputType: 'slider', min: 40, max: 300, description: 'In vierkante meters' },
      sortOrder: 2,
      isEntry: false,
      options: [],
    },
    {
      nodeKey: 'lead',
      type: 'lead_capture' as const,
      title: 'Wil je je advies per e-mail ontvangen?',
      content: { description: 'Optioneel — we sturen je een samenvatting.' },
      sortOrder: 3,
      isEntry: false,
      options: [],
    },
  ]

  for (const node of nodeData) {
    const [insertedNode] = await db
      .insert(flowNodes)
      .values({
        flowVersionId: draftVersion!.id,
        nodeKey: node.nodeKey,
        type: node.type,
        title: node.title,
        content: node.content,
        sortOrder: node.sortOrder,
        isEntry: node.isEntry,
      })
      .returning()

    if (node.options.length > 0) {
      await db.insert(flowOptions).values(
        node.options.map((opt) => ({
          nodeId: insertedNode!.id,
          optionKey: opt.optionKey,
          label: opt.label,
          value: opt.value,
          sortOrder: opt.sortOrder,
        })),
      )
    }
  }

  await db.insert(flowRules).values([
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: 'woningtype',
      ruleType: 'branch',
      condition: { '==': [{ var: 'answers.woningtype' }, 'apartment'] },
      targetNodeKey: 'isolatie',
      priority: 10,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: 'woningtype',
      ruleType: 'branch',
      condition: { '==': [{ var: 'answers.woningtype' }, 'house'] },
      targetNodeKey: 'oppervlakte',
      priority: 10,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: 'oppervlakte',
      ruleType: 'branch',
      condition: { '>=': [{ var: 'answers.oppervlakte' }, 0] },
      targetNodeKey: 'lead',
      priority: 5,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: 'isolatie',
      ruleType: 'branch',
      condition: { '>=': [{ var: 'answers.isolatie' }, ''] },
      targetNodeKey: 'lead',
      priority: 5,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'apartment'] },
          { '==': [{ var: 'answers.isolatie' }, 'good'] },
        ],
      },
      targetResultKey: 'advies_klein',
      priority: 100,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'apartment'] },
          { '==': [{ var: 'answers.isolatie' }, 'poor'] },
        ],
      },
      targetResultKey: 'advies_isolatie',
      priority: 90,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'house'] },
          { '>=': [{ var: 'answers.oppervlakte' }, 120] },
        ],
      },
      targetResultKey: 'advies_groot',
      priority: 100,
    },
    {
      flowVersionId: draftVersion!.id,
      fromNodeKey: '*',
      ruleType: 'result_map',
      condition: {
        and: [
          { '==': [{ var: 'answers.woningtype' }, 'house'] },
          { '<': [{ var: 'answers.oppervlakte' }, 120] },
        ],
      },
      targetResultKey: 'advies_klein',
      priority: 90,
    },
  ])

  await db.insert(flowResults).values([
    {
      flowVersionId: draftVersion!.id,
      resultKey: 'advies_klein',
      title: 'All-electric warmtepomp geschikt',
      body: {
        summary:
          'Voor jouw situatie is een all-electric warmtepomp een goede keuze. Je kunt profiteren van ISDE-subsidie.',
        checklist: [
          'Vraag offerte aan bij minimaal 3 installateurs',
          'Check ISDE-subsidie voor 2025',
          'Laat je cv-ketel behouden als backup (optioneel)',
        ],
      },
      ctas: [
        {
          id: 'cta-warmtepomp',
          type: 'affiliate',
          url: 'https://example.com/warmtepomp',
          label: 'Bekijk warmtepompen',
          trackingId: 'aff-warmtepomp',
        },
      ],
    },
    {
      flowVersionId: draftVersion!.id,
      resultKey: 'advies_groot',
      title: 'Hybride warmtepomp aanbevolen',
      body: {
        summary: 'Voor grotere woningen raden we een hybride warmtepomp aan.',
        checklist: ['Hybride pomp + bestaande cv-ketel', 'Geschikt voor woningen >120m²'],
      },
      ctas: [
        {
          id: 'cta-hybride',
          type: 'affiliate',
          url: 'https://example.com/hybride',
          label: 'Vergelijk hybride pompen',
          trackingId: 'aff-hybride',
        },
      ],
    },
    {
      flowVersionId: draftVersion!.id,
      resultKey: 'advies_isolatie',
      title: 'Eerst isoleren, daarna warmtepomp',
      body: {
        summary: 'Je isolatie is matig. We raden aan eerst te isoleren.',
        checklist: ['Spouwmuurisolatie', 'Dakisolatie', 'HR++ glas'],
      },
      ctas: [
        {
          id: 'cta-isolatie',
          type: 'external',
          url: 'https://example.com/isolatie',
          label: 'Isolatie-advies',
          trackingId: 'ext-isolatie',
        },
      ],
    },
  ])

  const [publishedVersion] = await db
    .insert(flowVersions)
    .values({
      flowId: flow!.id,
      versionNumber: 1,
      status: 'published',
      publishedAt: new Date(),
    })
    .returning()

  const draftNodes = await db.query.flowNodes.findMany({
    where: eq(flowNodes.flowVersionId, draftVersion!.id),
    with: { options: true },
  })

  for (const node of draftNodes) {
    const [newNode] = await db
      .insert(flowNodes)
      .values({
        flowVersionId: publishedVersion!.id,
        nodeKey: node.nodeKey,
        type: node.type,
        title: node.title,
        content: node.content,
        sortOrder: node.sortOrder,
        isEntry: node.isEntry,
      })
      .returning()

    if (node.options.length > 0) {
      await db.insert(flowOptions).values(
        node.options.map((opt) => ({
          nodeId: newNode!.id,
          optionKey: opt.optionKey,
          label: opt.label,
          value: opt.value,
          sortOrder: opt.sortOrder,
        })),
      )
    }
  }

  const draftRules = await db.query.flowRules.findMany({
    where: eq(flowRules.flowVersionId, draftVersion!.id),
  })
  if (draftRules.length > 0) {
    await db.insert(flowRules).values(
      draftRules.map((rule) => ({
        flowVersionId: publishedVersion!.id,
        fromNodeKey: rule.fromNodeKey,
        ruleType: rule.ruleType,
        condition: rule.condition,
        targetNodeKey: rule.targetNodeKey,
        targetResultKey: rule.targetResultKey,
        priority: rule.priority,
      })),
    )
  }

  const draftResults = await db.query.flowResults.findMany({
    where: eq(flowResults.flowVersionId, draftVersion!.id),
  })
  if (draftResults.length > 0) {
    await db.insert(flowResults).values(
      draftResults.map((result) => ({
        flowVersionId: publishedVersion!.id,
        resultKey: result.resultKey,
        title: result.title,
        body: result.body,
        ctas: result.ctas,
      })),
    )
  }

  await db
    .update(flows)
    .set({ currentPublishedVersionId: publishedVersion!.id, updatedAt: new Date() })
    .where(eq(flows.id, flow!.id))

  console.log('Seed complete: warmtepomp-keuzehulp published as v1')
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

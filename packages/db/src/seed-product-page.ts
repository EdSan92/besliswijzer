import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createDb,
  flows,
  flowCategories,
  products,
  productPages,
} from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

export const ROBOT_PAGE_SLUG = 'robotmaaier-kiezen'
export const ROBOT_PRODUCT_SLUG = 'robotmaaier'
export const ROBOT_FLOW_SLUG = 'robotmaaiers'

type Db = ReturnType<typeof createDb>['db']

export async function seedRobotProductPage(db: Db) {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, ROBOT_PAGE_SLUG),
  })

  if (existingPage) {
    console.log(`Product page "${ROBOT_PAGE_SLUG}" already exists, skipping`)
    return existingPage
  }

  const flow = await db.query.flows.findFirst({
    where: eq(flows.slug, ROBOT_FLOW_SLUG),
    with: { category: true },
  })

  if (!flow) {
    console.warn(`Flow "${ROBOT_FLOW_SLUG}" not found — import the robotmaaier flow first`)
    return null
  }

  let category = flow.category ?? null
  if (!category) {
    category =
      (await db.query.flowCategories.findFirst({
        where: eq(flowCategories.slug, 'tuin-en-buitenleven'),
      })) ?? null
  }

  console.log(`Seeding product page "${ROBOT_PAGE_SLUG}"...`)

  const [product] = await db
    .insert(products)
    .values({
      slug: ROBOT_PRODUCT_SLUG,
      canonicalName: 'robotmaaier',
      title: 'Robotmaaier',
      categoryId: category?.id ?? null,
      primaryFlowId: flow.id,
      status: 'published',
    })
    .returning()

  const blocks = [
    {
      id: 'blk_hero',
      type: 'hero',
      sortOrder: 0,
      visible: true,
      source: 'manual',
      data: {
        headline: 'Welke robotmaaier past bij jouw tuin?',
        subheadline:
          'Beantwoord een paar vragen en ontdek direct welk model het beste bij jouw situatie past.',
        badges: ['Gratis', '2 minuten', 'Onafhankelijk'],
      },
    },
    {
      id: 'blk_intro',
      type: 'intro',
      sortOrder: 1,
      visible: true,
      source: 'manual',
      data: {
        title: 'Robotmaaier kiezen?',
        body: 'Een robotmaaier bespaart tijd en houdt je gazon strak — maar niet elk model past bij elke tuin. Met onze keuzehulp vind je snel de juiste match op basis van oppervlakte, glooiing en budget.',
      },
    },
    {
      id: 'blk_flow',
      type: 'flow',
      sortOrder: 2,
      visible: true,
      source: 'manual',
      data: {
        flowId: flow.id,
        flowSlug: flow.slug,
        anchorId: 'keuzehulp',
        ctaLabel: 'Start de keuzehulp',
        displayMode: 'section',
      },
    },
    {
      id: 'blk_faq',
      type: 'faq',
      sortOrder: 3,
      visible: true,
      source: 'mixed',
      data: {
        title: 'Veelgestelde vragen over robotmaaiers',
        items: [
          {
            id: 'faq_grootte',
            question: 'Hoe groot mag mijn tuin zijn voor een robotmaaier?',
            answer:
              'Dat hangt af van het model. Compacte robotmaaiers zijn geschikt voor tot circa 300 m²; grotere modellen kunnen tot 1000 m² of meer aan.',
            source: 'manual',
          },
          {
            id: 'faq_helling',
            question: 'Werkt een robotmaaier op een hellend gazon?',
            answer:
              'Ja, mits je een model kiest met voldoende klimvermogen. Let op de maximale hellingshoek in de specificaties — vaak tussen 20% en 45%.',
            source: 'manual',
          },
        ],
      },
    },
  ]

  const [page] = await db
    .insert(productPages)
    .values({
      productId: product!.id,
      slug: ROBOT_PAGE_SLUG,
      title: 'Welke robotmaaier past bij jou?',
      status: 'published',
      seoMeta: {
        title: 'Robotmaaier kiezen in 2026 — persoonlijk advies',
        description:
          'Beantwoord een paar vragen en ontdek welke robotmaaier het beste bij jouw tuin past.',
        canonicalUrl: `/${ROBOT_PAGE_SLUG}`,
        twitterCard: 'summary_large_image',
      },
      layout: {
        blockOrder: ['blk_hero', 'blk_intro', 'blk_flow', 'blk_faq'],
      },
      blocks,
    })
    .returning()

  console.log(`Product page ready at /${ROBOT_PAGE_SLUG}`)
  return page
}

async function main() {
  const { db, client } = createDb(connectionString)
  await seedRobotProductPage(db)
  await client.end()
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isDirectRun) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

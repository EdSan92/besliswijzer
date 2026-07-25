import { eq } from 'drizzle-orm'
import {
  flowCategories,
  flows,
  productKeywords,
  productPages,
  products,
  type createDb,
} from './index.js'

export const AIRFRYER_PAGE_SLUG = 'airfryer-kiezen'
export const AIRFRYER_PRODUCT_SLUG = 'airfryer'
export const AIRFRYER_FLOW_SLUG = 'airfryers'

type Db = ReturnType<typeof createDb>['db']

const AIRFRYER_KEYWORDS = [
  'airfryer kiezen',
  'beste airfryer',
  'airfryer kopen',
  'airfryer 2 personen',
  'airfryer met 2 manden',
]

export async function seedAirfryerProductPage(db: Db) {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, AIRFRYER_PAGE_SLUG),
  })

  if (existingPage) {
    console.log(`Product page "${AIRFRYER_PAGE_SLUG}" already exists, skipping`)
    return existingPage
  }

  const flow = await db.query.flows.findFirst({
    where: eq(flows.slug, AIRFRYER_FLOW_SLUG),
    with: { category: true },
  })

  if (!flow) {
    console.warn(`Flow "${AIRFRYER_FLOW_SLUG}" not found — import the airfryer flow first`)
    return null
  }

  let category =
    flow.category ??
    (await db.query.flowCategories.findFirst({
      where: eq(flowCategories.slug, 'keuken-apparaten'),
    })) ??
    null

  console.log(`Seeding product page "${AIRFRYER_PAGE_SLUG}"...`)

  const [product] = await db
    .insert(products)
    .values({
      slug: AIRFRYER_PRODUCT_SLUG,
      canonicalName: 'airfryer',
      title: 'Airfryer',
      categoryId: category?.id ?? null,
      primaryFlowId: flow.id,
      status: 'published',
    })
    .returning()

  await db.insert(productKeywords).values(
    AIRFRYER_KEYWORDS.map((term) => ({
      productId: product!.id,
      term,
      source: 'manual',
    })),
  )

  const blocks = [
    {
      id: 'blk_hero',
      type: 'hero',
      sortOrder: 0,
      visible: true,
      source: 'manual',
      data: {
        headline: 'Vind de ideale airfryer voor jouw keuken',
        subheadline:
          'Beantwoord een paar vragen en ontdek direct welk model het beste bij jouw huishouden en kookgewoonten past.',
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
        title: 'Airfryer kiezen?',
        body: 'Een airfryer maakt friet, groente en snacks snel klaar met minder vet — maar niet elk model past bij elk huishouden. Met onze keuzehulp vind je snel de juiste match op basis van porties, functies en budget.',
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
        title: 'Veelgestelde vragen over airfryers',
        items: [
          {
            id: 'faq_capaciteit',
            question: 'Hoeveel liter airfryer heb ik nodig?',
            answer:
              'Voor 1–2 personen volstaat 3–4 liter. Voor gezinnen is 5–6 liter of een dual-basket model handiger.',
            source: 'manual',
          },
          {
            id: 'faq_manden',
            question: 'Is een airfryer met twee manden de moeite waard?',
            answer:
              'Ja, als je vaak twee gerechten tegelijk bereidt. Je kunt dan bijvoorbeeld friet en kip op verschillende temperaturen bakken.',
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
      slug: AIRFRYER_PAGE_SLUG,
      title: 'Welke airfryer past bij jou?',
      status: 'published',
      seoMeta: {
        title: 'Airfryer kiezen in 2026 — persoonlijk advies',
        description:
          'Beantwoord een paar vragen en ontdek welke airfryer het beste bij jouw keuken en budget past.',
        canonicalUrl: `/${AIRFRYER_PAGE_SLUG}`,
        twitterCard: 'summary_large_image',
      },
      layout: {
        blockOrder: ['blk_hero', 'blk_intro', 'blk_flow', 'blk_faq'],
      },
      blocks,
    })
    .returning()

  console.log(`Product page ready at /${AIRFRYER_PAGE_SLUG}`)
  return page
}

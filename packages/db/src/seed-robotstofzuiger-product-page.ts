import { eq } from 'drizzle-orm'
import {
  flowCategories,
  flows,
  productKeywords,
  productPages,
  products,
  type createDb,
} from './index.js'

export const ROBOTSTOFZUIGER_PAGE_SLUG = 'robotstofzuiger-kiezen'
export const ROBOTSTOFZUIGER_PRODUCT_SLUG = 'robotstofzuiger'
export const ROBOTSTOFZUIGER_FLOW_SLUG = 'robotstofzuigers'

type Db = ReturnType<typeof createDb>['db']

const ROBOTSTOFZUIGER_KEYWORDS = [
  'robotstofzuiger kiezen',
  'beste robotstofzuiger',
  'robotstofzuiger kopen',
  'robotstofzuiger huisdieren',
  'robotstofzuiger dweilen',
]

const REFERENCE_HERO_HEADLINE = 'Vind de ideale robotstofzuiger voor jouw woning'

function isReferenceProductPage(blocks: unknown): boolean {
  if (!Array.isArray(blocks)) return false

  return blocks.some((block) => {
    if (typeof block !== 'object' || block === null) return false
    const candidate = block as { type?: string; data?: { headline?: string } }
    return candidate.type === 'hero' && candidate.data?.headline === REFERENCE_HERO_HEADLINE
  })
}

export async function seedRobotstofzuigerProductPage(db: Db) {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, ROBOTSTOFZUIGER_PAGE_SLUG),
  })

  if (existingPage && isReferenceProductPage(existingPage.blocks)) {
    console.log(`Product page "${ROBOTSTOFZUIGER_PAGE_SLUG}" already exists, skipping`)
    return existingPage
  }

  if (existingPage) {
    await db.delete(productPages).where(eq(productPages.id, existingPage.id))
    console.log(`Replacing placeholder product page "${ROBOTSTOFZUIGER_PAGE_SLUG}"...`)
  }

  const existingProduct = await db.query.products.findFirst({
    where: eq(products.slug, ROBOTSTOFZUIGER_PRODUCT_SLUG),
  })

  const flow = await db.query.flows.findFirst({
    where: eq(flows.slug, ROBOTSTOFZUIGER_FLOW_SLUG),
    with: { category: true },
  })

  if (!flow) {
    console.warn(`Flow "${ROBOTSTOFZUIGER_FLOW_SLUG}" not found — import the robotstofzuiger flow first`)
    return null
  }

  const category =
    flow.category ??
    (await db.query.flowCategories.findFirst({
      where: eq(flowCategories.slug, 'huishouden'),
    })) ??
    null

  console.log(`Seeding product page "${ROBOTSTOFZUIGER_PAGE_SLUG}"...`)

  const [product] = existingProduct
    ? [existingProduct]
    : await db
        .insert(products)
        .values({
          slug: ROBOTSTOFZUIGER_PRODUCT_SLUG,
          canonicalName: 'robotstofzuiger',
          title: 'Robotstofzuiger',
          categoryId: category?.id ?? null,
          primaryFlowId: flow.id,
          status: 'published',
        })
        .returning()

  if (!existingProduct) {
    await db.insert(productKeywords).values(
      ROBOTSTOFZUIGER_KEYWORDS.map((term) => ({
        productId: product!.id,
        term,
        source: 'manual',
      })),
    )
  } else if (existingProduct.primaryFlowId !== flow.id) {
    await db
      .update(products)
      .set({ primaryFlowId: flow.id, categoryId: category?.id ?? null })
      .where(eq(products.id, existingProduct.id))
  }

  const blocks = [
    {
      id: 'blk_hero',
      type: 'hero',
      sortOrder: 0,
      visible: true,
      source: 'manual',
      data: {
        headline: REFERENCE_HERO_HEADLINE,
        subheadline:
          'Beantwoord een paar vragen en ontdek direct welk model het beste bij jouw vloer, huisdieren en budget past.',
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
        title: 'Robotstofzuiger kiezen?',
        body: 'Een robotstofzuiger houdt je vloer schoon zonder dagelijks zelf te stofzuigen — maar niet elk model past bij elke woning. Met onze keuzehulp vind je snel de juiste match op basis van vloertype, huisdieren, dweilfunctie en budget.',
      },
    },
    {
      id: 'blk_koopcriteria',
      type: 'intro',
      sortOrder: 2,
      visible: true,
      source: 'manual',
      data: {
        title: 'Koopcriteria',
        body: 'Let bij het kiezen op zuigkracht (Pa), navigatie (random, gyroscoop of LiDAR), batterijduur voor jouw oppervlak, dweilfunctie, leegstation, geluidsniveau en onderhoudskosten van borstels en filters. Huisdieren vragen anti-klitborstels; meerdere verdiepingen vragen kaartopslag per verdieping.',
      },
    },
    {
      id: 'blk_scenarios',
      type: 'intro',
      sortOrder: 3,
      visible: true,
      source: 'manual',
      data: {
        title: 'Gebruiksscenario\'s',
        body: 'Klein appartement met hard vloer: compact budgetmodel volstaat. Gezin met huisdieren: kies extra zuigkracht en een grote stofbak. Woning met veel tapijt: let op borsteltype en klimvermogen over randen. Wie wil dweilen na het stofzuigen kiest een combo met roterende doeken. Weinig onderhoud gewenst? Een leegstation maakt legen vrijwel overbodig.',
      },
    },
    {
      id: 'blk_flow',
      type: 'flow',
      sortOrder: 4,
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
      sortOrder: 5,
      visible: true,
      source: 'mixed',
      data: {
        title: 'Veelgestelde vragen over robotstofzuigers',
        items: [
          {
            id: 'faq_huisdieren',
            question: 'Welke robotstofzuiger is het beste voor huisdieren?',
            answer:
              'Kies een model met hoge zuigkracht, rubberen anti-klitborstels en eventueel een leegstation voor veel haren.',
            source: 'manual',
          },
          {
            id: 'faq_dweilen',
            question: 'Kan een robotstofzuiger ook dweilen?',
            answer:
              'Ja, combo-modellen hebben een watertank en dweilmodule. Ze zijn geschikt voor hard vloer; tapijt dweil je meestal niet.',
            source: 'manual',
          },
          {
            id: 'faq_leegstation',
            question: 'Is een leegstation de moeite waard?',
            answer:
              'Handig als je weinig wilt legen of allergieën hebt. Het station zuigt de stofbak leeg in een zak die wekenlang meegaat.',
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
      slug: ROBOTSTOFZUIGER_PAGE_SLUG,
      title: 'Welke robotstofzuiger past bij jou?',
      status: 'published',
      seoMeta: {
        title: 'Robotstofzuiger kiezen in 2026 — persoonlijk advies',
        description:
          'Beantwoord een paar vragen en ontdek welke robotstofzuiger het beste bij jouw woning en budget past.',
        canonicalUrl: `/${ROBOTSTOFZUIGER_PAGE_SLUG}`,
        twitterCard: 'summary_large_image',
      },
      layout: {
        blockOrder: [
          'blk_hero',
          'blk_intro',
          'blk_koopcriteria',
          'blk_scenarios',
          'blk_flow',
          'blk_faq',
        ],
      },
      blocks,
    })
    .returning()

  console.log(`Product page ready at /${ROBOTSTOFZUIGER_PAGE_SLUG}`)
  return page
}

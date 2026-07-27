import { eq } from 'drizzle-orm'
import {
  flowCategories,
  flows,
  productKeywords,
  productPages,
  products,
  type createDb,
} from './index.js'

export const THUISBATTERIJ_PAGE_SLUG = 'thuisbatterij-kiezen'
export const THUISBATTERIJ_PRODUCT_SLUG = 'thuisbatterij'
export const THUISBATTERIJ_FLOW_SLUG = 'thuisbatterijen'

type Db = ReturnType<typeof createDb>['db']

const THUISBATTERIJ_KEYWORDS = [
  'thuisbatterij kiezen',
  'thuisbatterij kopen',
  'thuisaccu zonnepanelen',
  'thuisbatterij kosten',
  'thuisbatterij capaciteit',
]

const REFERENCE_HERO_HEADLINE = 'Vind de ideale thuisbatterij voor jouw situatie'

function isReferenceProductPage(blocks: unknown): boolean {
  if (!Array.isArray(blocks)) return false

  return blocks.some((block) => {
    if (typeof block !== 'object' || block === null) return false
    const candidate = block as { type?: string; data?: { headline?: string } }
    return candidate.type === 'hero' && candidate.data?.headline === REFERENCE_HERO_HEADLINE
  })
}

export async function seedThuisbatterijProductPage(db: Db) {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, THUISBATTERIJ_PAGE_SLUG),
  })

  if (existingPage && isReferenceProductPage(existingPage.blocks)) {
    console.log(`Product page "${THUISBATTERIJ_PAGE_SLUG}" already exists, skipping`)
    return existingPage
  }

  if (existingPage) {
    await db.delete(productPages).where(eq(productPages.id, existingPage.id))
    console.log(`Replacing placeholder product page "${THUISBATTERIJ_PAGE_SLUG}"...`)
  }

  const existingProduct = await db.query.products.findFirst({
    where: eq(products.slug, THUISBATTERIJ_PRODUCT_SLUG),
  })

  const flow = await db.query.flows.findFirst({
    where: eq(flows.slug, THUISBATTERIJ_FLOW_SLUG),
    with: { category: true },
  })

  if (!flow) {
    console.warn(`Flow "${THUISBATTERIJ_FLOW_SLUG}" not found — import the thuisbatterij flow first`)
    return null
  }

  const category =
    flow.category ??
    (await db.query.flowCategories.findFirst({
      where: eq(flowCategories.slug, 'energie'),
    })) ??
    null

  console.log(`Seeding product page "${THUISBATTERIJ_PAGE_SLUG}"...`)

  const [product] = existingProduct
    ? [existingProduct]
    : await db
        .insert(products)
        .values({
          slug: THUISBATTERIJ_PRODUCT_SLUG,
          canonicalName: 'thuisbatterij',
          title: 'Thuisbatterij',
          categoryId: category?.id ?? null,
          primaryFlowId: flow.id,
          status: 'published',
        })
        .returning()

  if (!existingProduct) {
    await db.insert(productKeywords).values(
      THUISBATTERIJ_KEYWORDS.map((term) => ({
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
          'Beantwoord een paar vragen over je verbruik, zonnepanelen en budget — en ontdek welk thuisaccu-systeem het beste past.',
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
        title: 'Thuisbatterij kiezen?',
        body: 'Een thuisbatterij slaat stroom op voor later gebruik — handig met zonnepanelen, een dynamisch contract of als noodstroom. Met onze keuzehulp vind je snel een passend systeem op basis van capaciteit, omvormercompatibiliteit en budget.',
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
        body: 'Let op kWh-capaciteit (hoeveel uur stroom je kunt opslaan), kW vermogen (hoeveel tegelijk kan leveren), compatibiliteit met je omvormer, binnen/buiten plaatsing, modulair vs all-in-one, backup-functie en ondersteuning voor dynamische energiecontracten. Vraag altijd na of het systeem past bij je meterkast en fase-aansluiting.',
      },
    },
    {
      id: 'blk_kwh',
      type: 'intro',
      sortOrder: 3,
      visible: true,
      source: 'manual',
      data: {
        title: 'kWh-capaciteit en omvormercompatibiliteit',
        body: 'De capaciteit in kWh bepaalt hoeveel stroom je opslaat; het vermogen in kW bepaalt hoe snel je kunt laden of leveren. Niet elke batterij werkt met elke omvormer — hybride omvormers combineren zonnepanelen en accu, AC-gekoppelde systemen sluiten achteraf aan. Controleer merklijsten van de fabrikant voordat je koopt.',
      },
    },
    {
      id: 'blk_scenarios',
      type: 'intro',
      sortOrder: 4,
      visible: true,
      source: 'manual',
      data: {
        title: 'Gebruiksscenario\'s',
        body: 'Met zonnepanelen: kies capaciteit passend bij je opwek zodat je \'s avonds eigen stroom gebruikt. Dynamisch contract: laad goedkoop in daluren en ontlaad bij hoge prijzen. Noodstroom: let op backup-modus en vermogen voor koelkast en router. Kleine woning: compact 5 kWh volstaat vaak. Groei gepland: kies modulair systeem.',
      },
    },
    {
      id: 'blk_flow',
      type: 'flow',
      sortOrder: 5,
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
      sortOrder: 6,
      visible: true,
      source: 'mixed',
      data: {
        title: 'Veelgestelde vragen over thuisbatterijen',
        items: [
          {
            id: 'faq_zonder_zonnepanelen',
            question: 'Kan een thuisbatterij zonder zonnepanelen?',
            answer:
              'Ja, je kunt laden vanaf het net — vooral interessant met een dynamisch contract wanneer stroom goedkoop is.',
            source: 'manual',
          },
          {
            id: 'faq_terugverdientijd',
            question: 'Wat is een realistische terugverdientijd?',
            answer:
              'Dat hangt af van je verbruik, opwek, contract en subsidies. Reken vaak op meerdere jaren; gebruik onze keuzehulp voor een passende capaciteit.',
            source: 'manual',
          },
          {
            id: 'faq_kwh',
            question: 'Hoeveel kWh heb ik nodig?',
            answer:
              'Als richtlijn: 1 kWh ≈ 3–4 uur basisverbruik. Met zonnepanelen stem je capaciteit af op je avondverbruik en opwek.',
            source: 'manual',
          },
          {
            id: 'faq_salderen',
            question: 'Hoe zit het met salderen?',
            answer:
              'Regels rond salderen kunnen wijzigen. Een thuisbatterij helpt meer eigen stroom te benutten; check actuele regelgeving voor je situatie.',
            source: 'manual',
          },
          {
            id: 'faq_installatie',
            question: 'Kan ik een thuisbatterij zelf installeren?',
            answer:
              'Nee, installatie gebeurt door een erkende installateur vanwege veiligheid, meterkast en garantie.',
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
      slug: THUISBATTERIJ_PAGE_SLUG,
      title: 'Welke thuisbatterij past bij jou?',
      status: 'published',
      seoMeta: {
        title: 'Thuisbatterij kiezen in 2026 — persoonlijk advies',
        description:
          'Beantwoord een paar vragen en ontdek welke thuisbatterij het beste bij jouw energieverbruik en budget past.',
        canonicalUrl: `/${THUISBATTERIJ_PAGE_SLUG}`,
        twitterCard: 'summary_large_image',
      },
      layout: {
        blockOrder: [
          'blk_hero',
          'blk_intro',
          'blk_koopcriteria',
          'blk_kwh',
          'blk_scenarios',
          'blk_flow',
          'blk_faq',
        ],
      },
      blocks,
    })
    .returning()

  console.log(`Product page ready at /${THUISBATTERIJ_PAGE_SLUG}`)
  return page
}

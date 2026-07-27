import { eq } from 'drizzle-orm'
import {
  flowCategories,
  flows,
  productKeywords,
  productPages,
  products,
  type createDb,
} from './index.js'

export const MESH_WIFI_PAGE_SLUG = 'mesh-wifi-kiezen'
export const MESH_WIFI_PRODUCT_SLUG = 'mesh-wifi'
export const MESH_WIFI_FLOW_SLUG = 'mesh-wifi'

type Db = ReturnType<typeof createDb>['db']

const MESH_WIFI_KEYWORDS = [
  'mesh wifi kiezen',
  'mesh wifi systeem',
  'mesh wifi kopen',
  'mesh wifi groot huis',
  'wifi 6 mesh',
]

const REFERENCE_HERO_HEADLINE = 'Vind het ideale mesh wifi systeem voor jouw woning'

function isReferenceProductPage(blocks: unknown): boolean {
  if (!Array.isArray(blocks)) return false

  return blocks.some((block) => {
    if (typeof block !== 'object' || block === null) return false
    const candidate = block as { type?: string; data?: { headline?: string } }
    return candidate.type === 'hero' && candidate.data?.headline === REFERENCE_HERO_HEADLINE
  })
}

export async function seedMeshWifiProductPage(db: Db) {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, MESH_WIFI_PAGE_SLUG),
  })

  if (existingPage && isReferenceProductPage(existingPage.blocks)) {
    console.log(`Product page "${MESH_WIFI_PAGE_SLUG}" already exists, skipping`)
    return existingPage
  }

  if (existingPage) {
    await db.delete(productPages).where(eq(productPages.id, existingPage.id))
    console.log(`Replacing placeholder product page "${MESH_WIFI_PAGE_SLUG}"...`)
  }

  const existingProduct = await db.query.products.findFirst({
    where: eq(products.slug, MESH_WIFI_PRODUCT_SLUG),
  })

  const flow = await db.query.flows.findFirst({
    where: eq(flows.slug, MESH_WIFI_FLOW_SLUG),
    with: { category: true },
  })

  if (!flow) {
    console.warn(`Flow "${MESH_WIFI_FLOW_SLUG}" not found — import the mesh wifi flow first`)
    return null
  }

  const category =
    flow.category ??
    (await db.query.flowCategories.findFirst({
      where: eq(flowCategories.slug, 'tech-netwerk'),
    })) ??
    null

  console.log(`Seeding product page "${MESH_WIFI_PAGE_SLUG}"...`)

  const [product] = existingProduct
    ? [existingProduct]
    : await db
        .insert(products)
        .values({
          slug: MESH_WIFI_PRODUCT_SLUG,
          canonicalName: 'mesh wifi',
          title: 'Mesh wifi',
          categoryId: category?.id ?? null,
          primaryFlowId: flow.id,
          status: 'published',
        })
        .returning()

  if (!existingProduct) {
    await db.insert(productKeywords).values(
      MESH_WIFI_KEYWORDS.map((term) => ({
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
          'Beantwoord een paar vragen over je woning, internetgebruik en budget — en ontdek welk mesh systeem het beste past.',
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
        title: 'Mesh wifi kiezen?',
        body: 'Eén router volstaat vaak niet in grotere woningen of bij dikke muren. Een mesh systeem dekt je hele huis met meerdere nodes die samen één wifi-netwerk vormen. Met onze keuzehulp vind je snel de juiste set op basis van oppervlak, verdiepingen, backhaul en budget.',
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
        body: 'Let op dekking (m²), aantal nodes, wifi-generatie (Wi-Fi 5/6/6E/7), tri-band backhaul, Ethernet-poorten voor bekabelde backhaul, compatibiliteit met je provider-modem en app-functies zoals ouderlijk toezicht. Hoe zwaarder je muren (beton, staal), hoe belangrijker extra nodes of bekabelde backhaul worden.',
      },
    },
    {
      id: 'blk_backhaul',
      type: 'intro',
      sortOrder: 3,
      visible: true,
      source: 'manual',
      data: {
        title: 'Nodes en backhaul uitgelegd',
        body: 'Elke mesh node versterkt het signaal. De verbinding tussen nodes heet backhaul: draadloos (eenvoudiger) of via Ethernet (sneller en stabieler). Bij gaming, thuiswerken of glasvezel boven 500 Mbps loont bekabelde backhaul vaak. Zet de hoofdnode zo dicht mogelijk bij je modem en verspreid satellite nodes gelijkmatig over verdiepingen.',
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
        body: 'Appartement tot 80 m²: compact duo-pack volstaat meestal. Rijtjeshuis met twee verdiepingen: drie nodes of tri-band voor stabiele backhaul. Vrijstaande woning met betonnen muren: bekabelde backhaul of premium tri-band. Gamers en thuiswerkers: kies QoS en Wi-Fi 6 of hoger. Gezin met veel slimme apparaten: tri-band en ouderlijk toezicht via de app.',
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
        title: 'Veelgestelde vragen over mesh wifi',
        items: [
          {
            id: 'faq_modem',
            question: 'Kan ik mesh wifi gebruiken met mijn Ziggo/KPN-modem?',
            answer:
              'Ja, meestal zet je het mesh systeem in router- of accesspoint-modus achter je provider-modem. Sommige modems kun je bridgen zodat mesh de routing overneemt.',
            source: 'manual',
          },
          {
            id: 'faq_repeater',
            question: 'Wat is het verschil tussen mesh wifi en een repeater?',
            answer:
              'Mesh nodes werken samen als één netwerk met naadloze roaming. Repeaters maken vaak een apart netwerk en halveren de bandbreedte per hop.',
            source: 'manual',
          },
          {
            id: 'faq_nodes',
            question: 'Hoeveel mesh nodes heb ik nodig?',
            answer:
              'Reken op één node per 50–80 m², afhankelijk van muren en verdiepingen. Grote of complexe woningen vragen drie nodes of meer.',
            source: 'manual',
          },
          {
            id: 'faq_wifi6',
            question: 'Is Wi-Fi 6 nodig?',
            answer:
              'Wi-Fi 6 helpt bij veel gelijktijdige apparaten en hogere snelheden. Wi-Fi 6E/7 is vooral zinvol bij premium abonnementen en toekomstbestendigheid.',
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
      slug: MESH_WIFI_PAGE_SLUG,
      title: 'Welk mesh wifi systeem past bij jou?',
      status: 'published',
      seoMeta: {
        title: 'Mesh wifi kiezen in 2026 — persoonlijk advies',
        description:
          'Beantwoord een paar vragen en ontdek welk mesh wifi systeem het beste bij jouw woning en internetgebruik past.',
        canonicalUrl: `/${MESH_WIFI_PAGE_SLUG}`,
        twitterCard: 'summary_large_image',
      },
      layout: {
        blockOrder: [
          'blk_hero',
          'blk_intro',
          'blk_koopcriteria',
          'blk_backhaul',
          'blk_scenarios',
          'blk_flow',
          'blk_faq',
        ],
      },
      blocks,
    })
    .returning()

  console.log(`Product page ready at /${MESH_WIFI_PAGE_SLUG}`)
  return page
}

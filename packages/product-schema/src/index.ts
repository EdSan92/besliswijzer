export {
  productStatusSchema,
  pageStatusSchema,
  contentBlockSourceSchema,
  productSchema,
  productKeywordSchema,
  type Product,
  type ProductKeyword,
} from './product.js'

export {
  contentBlockTypeSchema,
  contentBlockBaseSchema,
  heroBlockDataSchema,
  flowBlockDataSchema,
  faqItemSchema,
  faqBlockDataSchema,
  introBlockDataSchema,
  contentBlockSchema,
  sortContentBlocks,
  type ContentBlockType,
  type ContentBlock,
  type HeroBlock,
  type FlowBlock,
  type FAQBlock,
  type IntroBlock,
  type FAQItem,
} from './content-block.js'

export {
  pageSeoSchema,
  pageLayoutSchema,
  productPageSchema,
  publicProductPageResponseSchema,
  validateProductPageBlocks,
  parseProductPageBlocks,
  type PageSEO,
  type PageLayout,
  type ProductPage,
  type PublicProductPageResponse,
} from './product-page.js'

export {
  normalizeKeywordTerm,
  pickBestProductMatch,
  scoreProductMatch,
  type ProductMatchCandidate,
} from './product-matcher.js'

export {
  buildProductFlowGroups,
  buildVisibleFlowSlugSet,
  deriveProductSlugFromKeyword,
  flowBelongsToProduct,
  pickCanonicalFlowSlugForGroup,
  resolveProductFlowSlug,
  toProductSlug,
  type FlowCatalogItem,
  type ProductFlowGroup,
  type ProductFlowGroupInput,
} from './product-flow-group.js'

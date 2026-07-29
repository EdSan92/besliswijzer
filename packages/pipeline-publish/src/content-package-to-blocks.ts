import type { ContentPackage } from '@besliswijzer/pipeline-quality'
import type { ContentBlock } from '@besliswijzer/product-schema'

export function mapContentPackageToBlocks(content: ContentPackage): ContentBlock[] {
  const blocks: ContentBlock[] = [
    {
      id: 'intro',
      type: 'intro',
      sortOrder: 0,
      visible: true,
      source: 'ai',
      data: {
        title: content.metadata.title,
        body: [content.intro, content.buyingGuide].filter(Boolean).join('\n\n'),
      },
    },
  ]

  if (content.faq.length > 0) {
    blocks.push({
      id: 'faq',
      type: 'faq',
      sortOrder: 1,
      visible: true,
      source: 'ai',
      data: {
        title: 'Veelgestelde vragen',
        items: content.faq.map((item, index) => ({
          id: `faq-${index + 1}`,
          question: item.question,
          answer: item.answer,
          source: 'ai' as const,
        })),
      },
    })
  }

  return blocks
}

import type { Component } from 'vue'
import type { ContentBlockType } from '@besliswijzer/product-schema'

import HeroBlock from './HeroBlock.vue'
import IntroBlock from './IntroBlock.vue'
import FlowBlock from './FlowBlock.vue'
import FAQBlock from './FAQBlock.vue'
import UnsupportedBlock from './UnsupportedBlock.vue'

/** Registry: nieuwe blokken = 1 import + 1 regel. */
export const blockRegistry: Partial<Record<ContentBlockType, Component>> = {
  hero: HeroBlock,
  intro: IntroBlock,
  flow: FlowBlock,
  faq: FAQBlock,
}

export function resolveBlockComponent(type: ContentBlockType): Component {
  return blockRegistry[type] ?? UnsupportedBlock
}

import type { ContentBlock, ContentBlockType } from '@besliswijzer/product-schema'
import { sortContentBlocks } from '@besliswijzer/product-schema'
import { resolveBlockComponent } from '~/components/content-blocks/registry'

export function useBlockRegistry() {
  function getComponent(type: ContentBlockType) {
    return resolveBlockComponent(type)
  }

  function sortVisibleBlocks(blocks: ContentBlock[], blockOrder: string[]): ContentBlock[] {
    return sortContentBlocks(blocks, blockOrder)
  }

  return { getComponent, sortVisibleBlocks }
}

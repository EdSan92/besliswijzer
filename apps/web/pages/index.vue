<script setup lang="ts">
import type { PopularFlowItem } from '@besliswijzer/flow-schema'
import { resolvePopularFlows } from '~/utils/landing-flows'

definePageMeta({ layout: 'landing' })

const apiBase = useApiBase()

type FlowItem = { id: string; slug: string; title: string }
type CategoryItem = {
  id: string
  slug: string
  title: string
  description: string | null
  flows: FlowItem[]
}

const [{ data }, { data: popularData }] = await Promise.all([
  useAsyncData('home-categories', () =>
    $fetch<{ categories: CategoryItem[]; uncategorized: FlowItem[] }>(
      `${apiBase}/api/v1/public/categories`,
    ).catch(() => ({ categories: [], uncategorized: [] })),
  ),
  useAsyncData('home-popular-flows', () =>
    $fetch<{ flows: PopularFlowItem[] }>(`${apiBase}/api/v1/public/flows/popular?limit=6`).catch(
      () => ({ flows: [] as PopularFlowItem[] }),
    ),
  ),
])

const categorySource = computed(() => ({
  categories: data.value?.categories ?? [],
  uncategorized: data.value?.uncategorized ?? [],
}))

const popularFlows = computed(() =>
  resolvePopularFlows(popularData.value?.flows, categorySource.value, 6),
)

const primaryCtaHref = computed(() => {
  const mostPopular = popularFlows.value[0]
  if (mostPopular) return `/flows/${mostPopular.slug}`

  return '#populair'
})

useSeoMeta({
  title: 'Veraio — Vind het product dat écht bij jou past',
  description: 'Beantwoord een paar vragen en krijg een persoonlijke aanbeveling. Gratis, zonder account.',
  ogTitle: 'Veraio — Persoonlijke productadviezen',
  ogDescription: 'Beantwoord een paar vragen en krijg een persoonlijke aanbeveling.',
})
</script>

<template>
  <div>
    <LandingNav />
    <LandingHero :cta-href="primaryCtaHref" :popular-flows="popularFlows" />
    <LandingPopularFlows :flows="popularFlows" />
    <LandingTrustBar />
    <LandingHowItWorks />
    <LandingExamples
      :popular-flows="popularFlows"
      :categories="data?.categories ?? []"
      :uncategorized="data?.uncategorized ?? []"
    />
    <LandingWhy />
    <LandingCta :cta-href="primaryCtaHref" />
    <LandingFooter />
  </div>
</template>

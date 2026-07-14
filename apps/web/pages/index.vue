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
  const first = popularFlows.value[0]
  if (first) return `/flows/${first.slug}`
  return '/flows/robotmaaiers'
})

useSeoMeta({
  title: 'Veraio — De juiste keuze, zonder uren uitzoeken',
  description:
    'Vertel wat je nodig hebt. Veraio analyseert de opties en geeft één persoonlijk advies met transparante uitleg. Gratis, geen account nodig.',
  ogTitle: 'Veraio — Jouw persoonlijke aankoopadviseur',
  ogDescription:
    'Geen productlijst. Eén duidelijke aanbeveling die past bij jouw situatie.',
})
</script>

<template>
  <div>
    <LandingNav />
    <LandingHero :cta-href="primaryCtaHref" />
    <LandingSampleAdvice />
    <LandingProblem />
    <LandingHowItWorks />
    <LandingCategories :flows="popularFlows" />
    <LandingWhy />
    <LandingCta :cta-href="primaryCtaHref" />
    <LandingFooter />
  </div>
</template>

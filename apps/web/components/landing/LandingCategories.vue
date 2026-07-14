<script setup lang="ts">
import type { PopularFlowItem } from '@besliswijzer/flow-schema'

const props = defineProps<{
  flows: PopularFlowItem[]
}>()

const { register } = useRevealOnScroll()

type CategoryItem = {
  slug: string
  title: string
  outcome: string
  resultHint: string
  image: string
  imageAlt: string
  minutes: number
}

const catalog: CategoryItem[] = [
  {
    slug: 'robotmaaiers',
    title: 'Robotmaaiers',
    outcome: 'Ontdek welke robotmaaier bij jouw gazon hoort',
    resultHint: 'Bijv. Worx Landroid · 94% match',
    image: 'https://images.unsplash.com/photo-1558904544-1a4561ddfb6e?w=600&q=80',
    imageAlt: 'Robotmaaier op een gazon',
    minutes: 2,
  },
  {
    slug: 'warmtepomp',
    title: 'Warmtepompen',
    outcome: 'Vind de warmtepomp die past bij jouw woning',
    resultHint: 'Bijv. Daikin Altherma · 91% match',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80',
    imageAlt: 'Warmtepomp installatie',
    minutes: 3,
  },
  {
    slug: 'tv',
    title: "TV's",
    outcome: 'Welk scherm hoort in jouw woonkamer?',
    resultHint: 'Bijv. Samsung QLED · 89% match',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
    imageAlt: 'Televisie in een woonkamer',
    minutes: 2,
  },
  {
    slug: 'powerbank',
    title: 'Powerbanks',
    outcome: 'De juiste capaciteit voor jouw apparaten',
    resultHint: 'Bijv. Anker PowerCore · 92% match',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80',
    imageAlt: 'Powerbank en smartphone',
    minutes: 2,
  },
  {
    slug: 'mesh-wifi',
    title: 'Mesh wifi',
    outcome: 'Wifi-dekking in elk hoekje van je huis',
    resultHint: 'Bijv. TP-Link Deco · 90% match',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    imageAlt: 'Wifi router thuis',
    minutes: 2,
  },
]

const categories = computed(() => {
  const flowBySlug = new Map(props.flows.map((f) => [f.slug, f]))

  return catalog.map((item) => {
    const match =
      flowBySlug.get(item.slug) ??
      props.flows.find((f) => f.slug.includes(item.slug) || item.slug.includes(f.slug))

    return {
      ...item,
      href: match ? `/flows/${match.slug}` : `/flows/${item.slug}`,
    }
  })
})
</script>

<template>
  <section id="categorieen" class="categories">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal categories__header"
      >
        <p class="landing-eyebrow">Advies per categorie</p>
        <h2 class="landing-heading">Waar heb jij hulp bij nodig?</h2>
        <p class="landing-subheading">
          Kies een categorie en ontvang één aanbeveling die past — geen account nodig.
        </p>
      </div>

      <ul class="categories__list">
        <li
          v-for="(cat, index) in categories"
          :key="cat.slug"
          :ref="(el) => register(el)"
          class="landing-reveal"
          :style="{ transitionDelay: `${index * 0.05}s` }"
        >
          <NuxtLink :to="cat.href" class="categories__item">
            <div class="categories__image-wrap">
              <img
                class="categories__image"
                :src="cat.image"
                :alt="cat.imageAlt"
                width="600"
                height="400"
                loading="lazy"
              />
            </div>
            <div class="categories__body">
              <div class="categories__badges">
                <span class="categories__badge categories__badge--match">Eén aanbeveling</span>
                <span class="categories__badge">~{{ cat.minutes }} min</span>
              </div>
              <h3 class="categories__title">{{ cat.title }}</h3>
              <p class="categories__outcome">{{ cat.outcome }}</p>
              <p class="categories__hint">{{ cat.resultHint }}</p>
              <span class="categories__link">Ontvang jouw advies →</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.categories {
  padding: 5.5rem 0;
  border-top: 1px solid var(--veraio-border);
  background: var(--veraio-bg);
}

.categories__header {
  margin-bottom: 3rem;
}

.categories__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.categories__item {
  display: grid;
  gap: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--veraio-border);
  border-radius: var(--veraio-radius-lg);
  text-decoration: none;
  color: inherit;
  background: var(--veraio-surface);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.categories__item:hover {
  border-color: rgba(31, 107, 92, 0.25);
  box-shadow: var(--veraio-shadow);
  transform: translateY(-2px);
}

.categories__item:hover .categories__link {
  color: var(--veraio-primary-hover);
}

.categories__image-wrap {
  overflow: hidden;
  border-radius: var(--veraio-radius);
}

.categories__image {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.categories__item:hover .categories__image {
  transform: scale(1.03);
}

.categories__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.625rem;
}

.categories__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.3rem 0.625rem;
  border-radius: 999px;
  background: var(--veraio-surface-muted);
  color: var(--veraio-muted);
}

.categories__badge--match {
  background: var(--veraio-primary-soft);
  color: var(--veraio-primary);
}

.categories__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.375rem;
}

.categories__outcome {
  font-size: 0.9375rem;
  color: var(--veraio-text);
  line-height: 1.5;
  margin: 0 0 0.5rem;
  font-weight: 500;
}

.categories__hint {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  margin: 0 0 0.875rem;
  padding: 0.375rem 0.625rem;
  background: var(--veraio-gold-muted);
  border-radius: 6px;
  display: inline-block;
}

.categories__link {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--veraio-primary);
  text-decoration: none;
}

@media (min-width: 640px) {
  .categories__item {
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 2rem;
    padding: 1.5rem;
  }
}

@media (min-width: 900px) {
  .categories__item {
    grid-template-columns: 280px 1fr;
  }
}
</style>

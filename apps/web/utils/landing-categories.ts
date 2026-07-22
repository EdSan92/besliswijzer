export type LandingCategorySource = {
  slug: string
  title: string
  description: string | null
  flows: Array<{ id: string; slug: string; title: string }>
}

export type LandingCategoryCard = {
  slug: string
  title: string
  outcome: string
  resultHint: string
  href: string
  image: string
  imageAlt: string
  minutes: number
}

const categoryImages: Record<string, { image: string; imageAlt: string }> = {
  energie: {
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80',
    imageAlt: 'Warmtepomp en energiebesparing',
  },
  subsidie: {
    image: 'https://images.unsplash.com/photo-1454165804603-c3d57bc86b40?w=600&q=80',
    imageAlt: 'Subsidie en regelingen',
  },
  verbouwen: {
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80',
    imageAlt: 'Verbouwen en renovatie',
  },
  'tuin-en-buitenleven': {
    image: 'https://images.unsplash.com/photo-1558904544-1a4561ddfb6e?w=600&q=80',
    imageAlt: 'Tuin en buitenleven',
  },
}

const defaultImage = {
  image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  imageAlt: 'Persoonlijk aankoopadvies',
}

function getCategoryImage(slug: string, title: string) {
  return (
    categoryImages[slug] ?? {
      image: defaultImage.image,
      imageAlt: `${title} — ${defaultImage.imageAlt}`,
    }
  )
}

function formatFlowHint(count: number): string {
  if (count === 1) return '1 keuzehulp beschikbaar'
  return `${count} keuzehulpen beschikbaar`
}

export function buildLandingCategoryCards(
  categories: LandingCategorySource[],
): LandingCategoryCard[] {
  return categories
    .filter((category) => category.flows.length > 0)
    .map((category) => {
      const visuals = getCategoryImage(category.slug, category.title)

      return {
        slug: category.slug,
        title: category.title,
        outcome: category.description ?? `Keuzehulpen in ${category.title.toLowerCase()}`,
        resultHint: formatFlowHint(category.flows.length),
        href: `/categorie/${category.slug}`,
        minutes: 2,
        ...visuals,
      }
    })
}

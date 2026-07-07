import type { ComponentPublicInstance } from 'vue'

function resolveRevealTarget(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  if (el instanceof SVGElement) return el as unknown as HTMLElement

  const root = (el as ComponentPublicInstance).$el
  if (root instanceof HTMLElement) return root
  if (root instanceof SVGElement) return root as unknown as HTMLElement

  return null
}

export function useRevealOnScroll() {
  let observer: IntersectionObserver | null = null

  function getObserver(): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null

    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      )
    }

    return observer
  }

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  function register(el: Element | ComponentPublicInstance | null) {
    const target = resolveRevealTarget(el)
    if (!target) return

    const obs = getObserver()
    if (!obs) {
      target.classList.add('is-visible')
      return
    }

    nextTick(() => {
      if (target.isConnected) {
        obs.observe(target)
      }
    })
  }

  return { register }
}

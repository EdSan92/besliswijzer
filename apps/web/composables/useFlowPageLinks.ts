import { resolveFlowHref } from '~/utils/resolve-flow-href'

export function useFlowPageLinks() {
  const apiBase = useApiBase()

  const { data } = useAsyncData('flow-page-links', () =>
    $fetch<{ links: Record<string, string> }>(
      `${apiBase}/api/v1/public/flows/page-links`,
    ).catch(() => ({ links: {} as Record<string, string> })),
  )

  const links = computed(() => data.value?.links ?? {})

  function flowHref(flowSlug: string) {
    return resolveFlowHref(flowSlug, links.value)
  }

  return { links, flowHref }
}

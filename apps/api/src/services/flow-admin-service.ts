const ARCHIVED_TITLE_MARKER = '[archief]'

export function isArchivedFlowTitle(title: string): boolean {
  return title.toLowerCase().includes(ARCHIVED_TITLE_MARKER)
}

export function isArchivedFlow(flow: { title: string }): boolean {
  return isArchivedFlowTitle(flow.title)
}

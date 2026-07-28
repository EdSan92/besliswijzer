export const CORRECTABLE_ARTIFACT_KINDS = [
  'flow_brief',
  'content_package',
  'compiled_flow',
] as const

export type CorrectableArtifactKind = (typeof CORRECTABLE_ARTIFACT_KINDS)[number]

export function isCorrectableArtifactKind(kind: string): kind is CorrectableArtifactKind {
  return (CORRECTABLE_ARTIFACT_KINDS as readonly string[]).includes(kind)
}

export type ParsedArtifactCorrection =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string }

export function parseArtifactCorrectionJson(text: string): ParsedArtifactCorrection {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Payload moet een JSON-object zijn.' }
    }
    return { ok: true, payload: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'Ongeldige JSON-syntax.' }
  }
}

export function formatArtifactPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}

export type PipelineArtifactView = {
  id: string
  kind: string
  version: number
  payload: Record<string, unknown>
}

export function groupArtifactsByKind(
  artifacts: PipelineArtifactView[],
): Map<string, PipelineArtifactView[]> {
  const grouped = new Map<string, PipelineArtifactView[]>()

  for (const artifact of artifacts) {
    const list = grouped.get(artifact.kind) ?? []
    list.push(artifact)
    grouped.set(artifact.kind, list)
  }

  for (const [kind, list] of grouped) {
    grouped.set(
      kind,
      [...list].sort((left, right) => left.version - right.version),
    )
  }

  return grouped
}

export function getLatestCorrectableArtifacts(
  artifacts: PipelineArtifactView[],
): PipelineArtifactView[] {
  const grouped = groupArtifactsByKind(artifacts)
  const latest: PipelineArtifactView[] = []

  for (const kind of CORRECTABLE_ARTIFACT_KINDS) {
    const versions = grouped.get(kind)
    if (versions?.length) {
      latest.push(versions[versions.length - 1]!)
    }
  }

  return latest
}

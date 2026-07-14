export type ApiFlowStep = {
  id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
  detail?: string
  timestamp: string
  durationMs?: number
}

export type GeminiChatResponse = {
  reply: string
  steps: ApiFlowStep[]
  model: string
}

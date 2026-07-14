import type { ApiFlowStep, GeminiChatResponse } from '~/types/gemini'

export type { ApiFlowStep, GeminiChatResponse }

export function useGeminiChat() {
  const message = ref('')
  const reply = ref('')
  const steps = ref<ApiFlowStep[]>([])
  const model = ref('')
  const loading = ref(false)
  const error = ref('')
  const lastStatus = ref<'idle' | 'success' | 'error'>('idle')

  async function send() {
    const text = message.value.trim()
    if (!text || loading.value) return

    loading.value = true
    error.value = ''
    reply.value = ''
    steps.value = []
    model.value = ''
    lastStatus.value = 'idle'

    try {
      const response = await $fetch<GeminiChatResponse>('/api/gemini/chat', {
        method: 'POST',
        body: { message: text },
      })

      reply.value = response.reply
      steps.value = response.steps
      model.value = response.model
      lastStatus.value = 'success'
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Kon geen verbinding maken met Gemini.')
      lastStatus.value = 'error'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    message.value = ''
    reply.value = ''
    steps.value = []
    model.value = ''
    error.value = ''
    lastStatus.value = 'idle'
  }

  return {
    message,
    reply,
    steps,
    model,
    loading,
    error,
    lastStatus,
    send,
    reset,
  }
}

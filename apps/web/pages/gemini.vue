<script setup lang="ts">
const { message, reply, steps, model, loading, error, lastStatus, send, reset } = useGeminiChat()

useHead({
  title: 'Gemini API Flow',
})

function onSubmit() {
  send()
}
</script>

<template>
  <div class="container gemini-page">
    <header class="gemini-page__header">
      <h1>Gemini API Flow</h1>
      <p class="gemini-page__intro">
        Stuur een bericht naar de Google Gemini API en volg elke stap van het verzoek live.
      </p>
    </header>

    <div class="gemini-page__grid">
      <section class="card gemini-page__input">
        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <label for="gemini-message">Bericht</label>
            <textarea
              id="gemini-message"
              v-model="message"
              rows="4"
              placeholder="Typ hier je vraag aan Gemini…"
              :disabled="loading"
            />
          </div>

          <div class="gemini-page__actions">
            <button type="submit" class="btn" :disabled="loading || !message.trim()">
              {{ loading ? 'Versturen…' : 'Verstuur naar Gemini' }}
            </button>
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="reset">
              Wissen
            </button>
          </div>
        </form>

        <p v-if="error" class="gemini-page__error" role="alert">{{ error }}</p>

        <p
          v-else-if="lastStatus === 'success'"
          class="gemini-page__success"
          role="status"
        >
          API-call geslaagd — zie de stappen rechts en het antwoord hieronder.
        </p>
      </section>

      <GeminiApiFlowVisualizer :steps="steps" :loading="loading" />
    </div>

    <section v-if="reply" class="card gemini-page__reply">
      <div class="gemini-page__reply-header">
        <h2>Antwoord van Gemini</h2>
        <span v-if="model" class="gemini-page__model">{{ model }}</span>
      </div>
      <p class="gemini-page__reply-text">{{ reply }}</p>
    </section>

    <section class="card gemini-page__diagram">
      <h2>Overzicht</h2>
      <div class="gemini-page__pipeline">
        <div class="gemini-page__node">Browser</div>
        <span class="gemini-page__arrow">→</span>
        <div class="gemini-page__node">Nuxt Server<br><small>/api/gemini/chat</small></div>
        <span class="gemini-page__arrow">→</span>
        <div class="gemini-page__node gemini-page__node--highlight">Google Gemini API</div>
        <span class="gemini-page__arrow">→</span>
        <div class="gemini-page__node">Antwoord</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gemini-page__header {
  margin-bottom: 2rem;
}

.gemini-page__header h1 {
  margin: 0 0 0.5rem;
}

.gemini-page__intro {
  margin: 0;
  color: var(--color-muted);
}

.gemini-page__grid {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .gemini-page__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.gemini-page__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.gemini-page__error {
  margin: 1rem 0 0;
  color: #dc2626;
  font-size: 0.9rem;
}

.gemini-page__success {
  margin: 1rem 0 0;
  color: var(--color-success);
  font-size: 0.9rem;
}

.gemini-page__reply {
  margin-bottom: 1.5rem;
}

.gemini-page__reply-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.gemini-page__reply-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.gemini-page__model {
  font-size: 0.8rem;
  color: var(--color-muted);
  background: #f1f5f9;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
}

.gemini-page__reply-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
}

.gemini-page__diagram h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.gemini-page__pipeline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.gemini-page__node {
  background: #f1f5f9;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
}

.gemini-page__node small {
  font-weight: 400;
  color: var(--color-muted);
}

.gemini-page__node--highlight {
  background: #eff6ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.gemini-page__arrow {
  color: var(--color-muted);
  font-size: 1.25rem;
}
</style>

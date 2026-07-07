<script setup lang="ts">
type DemoStep = {
  question: string
  description: string
  options: string[]
}

const steps: DemoStep[] = [
  {
    question: 'Waarvoor zoek je een product?',
    description: 'Kies het gebied dat het beste past.',
    options: ['Tuin & buiten', 'Energie & wonen', 'Mobiliteit'],
  },
  {
    question: 'Hoe groot is je situatie?',
    description: 'Een ruwe schatting is genoeg.',
    options: ['Klein', 'Gemiddeld', 'Groot'],
  },
  {
    question: 'Wat is je prioriteit?',
    description: 'Dit helpt ons de beste match te vinden.',
    options: ['Lage prijs', 'Gemak', 'Topkwaliteit'],
  },
]

const currentStep = ref(0)
const selectedOption = ref<number | null>(null)
const showResult = ref(false)
const paused = ref(false)

const progress = computed(() => {
  if (showResult.value) return 100
  return Math.round(((currentStep.value + (selectedOption.value !== null ? 0.5 : 0)) / steps.length) * 100)
})

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function schedule(fn: () => void, delay: number) {
  clearTimer()
  if (paused.value) return
  timer = setTimeout(fn, delay)
}

function advanceDemo() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    selectedOption.value = null
    schedule(() => pickRandomOption(), 1800)
  } else {
    showResult.value = true
    schedule(resetDemo, 4500)
  }
}

function pickRandomOption() {
  const index = Math.floor(Math.random() * steps[currentStep.value].options.length)
  selectOption(index, true)
}

function selectOption(index: number, fromAuto = false) {
  if (!fromAuto) paused.value = true
  selectedOption.value = index
  schedule(advanceDemo, 700)
}

function resetDemo() {
  currentStep.value = 0
  selectedOption.value = null
  showResult.value = false
  paused.value = false
  schedule(pickRandomOption, 1500)
}

onMounted(() => {
  schedule(pickRandomOption, 2200)
})

onUnmounted(clearTimer)
</script>

<template>
  <div class="hero-preview" aria-label="Interactieve preview van een keuzehulp">
    <div class="hero-preview__chrome">
      <div class="hero-preview__dots" aria-hidden="true">
        <span /><span /><span />
      </div>
      <span class="hero-preview__url">veraio.nl/keuzehulp</span>
    </div>

    <div class="hero-preview__body">
      <div class="hero-preview__progress">
        <div class="hero-preview__progress-fill" :style="{ width: `${progress}%` }" />
      </div>

      <Transition name="preview-fade" mode="out-in">
        <div v-if="showResult" key="result" class="hero-preview__result">
          <div class="hero-preview__result-badge">Aanbeveling</div>
          <h3 class="hero-preview__result-title">Premium Robotmaaier X1</h3>
          <p class="hero-preview__result-text">
            Perfect voor middelgrote tuinen met lichte hellingen — stil, efficiënt en app-gestuurd.
          </p>
          <button type="button" class="hero-preview__result-btn" @click="resetDemo">
            Opnieuw proberen
          </button>
        </div>

        <div v-else :key="currentStep" class="hero-preview__question">
          <p class="hero-preview__step">Vraag {{ currentStep + 1 }} van {{ steps.length }}</p>
          <h3 class="hero-preview__title">{{ steps[currentStep].question }}</h3>
          <p class="hero-preview__desc">{{ steps[currentStep].description }}</p>

          <div class="hero-preview__options">
            <button
              v-for="(option, index) in steps[currentStep].options"
              :key="option"
              type="button"
              class="hero-preview__option"
              :class="{ 'hero-preview__option--selected': selectedOption === index }"
              @click="selectOption(index)"
            >
              {{ option }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.hero-preview {
  width: 100%;
  max-width: 420px;
  background: var(--veraio-surface);
  overflow: hidden;
  animation: landing-float 6s ease-in-out infinite;
}

.hero-preview__chrome {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--veraio-border);
}

.hero-preview__dots {
  display: flex;
  gap: 0.375rem;
}

.hero-preview__dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
}

.hero-preview__dots span:first-child {
  background: #ff5f57;
}

.hero-preview__dots span:nth-child(2) {
  background: #febc2e;
}

.hero-preview__dots span:nth-child(3) {
  background: #28c840;
}

.hero-preview__url {
  font-size: 0.75rem;
  color: var(--veraio-muted);
}

.hero-preview__body {
  padding: 1.75rem 1.5rem 2rem;
  min-height: 320px;
}

.hero-preview__progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 1.75rem;
}

.hero-preview__progress-fill {
  height: 100%;
  background: var(--veraio-gradient);
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-preview__step {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--veraio-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.75rem;
}

.hero-preview__title {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 0 0 0.5rem;
}

.hero-preview__desc {
  font-size: 0.875rem;
  color: var(--veraio-muted);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.hero-preview__options {
  display: grid;
  gap: 0.5rem;
}

.hero-preview__option {
  width: 100%;
  text-align: left;
  padding: 0.875rem 1rem;
  border: 1px solid var(--veraio-border);
  border-radius: 12px;
  background: transparent;
  font-size: 0.9375rem;
  font-family: inherit;
  color: var(--veraio-text);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.hero-preview__option:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: var(--veraio-accent-soft);
}

.hero-preview__option--selected {
  border-color: var(--veraio-accent);
  background: var(--veraio-accent-soft);
  transform: scale(0.98);
}

.hero-preview__result {
  text-align: center;
  padding: 0.5rem 0;
}

.hero-preview__result-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--veraio-accent);
  background: var(--veraio-accent-soft);
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}

.hero-preview__result-title {
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}

.hero-preview__result-text {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.hero-preview__result-btn {
  font-size: 0.875rem;
  color: var(--veraio-accent);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
}

.hero-preview__result-btn:hover {
  text-decoration: underline;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

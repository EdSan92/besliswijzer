<script setup lang="ts">
import type { FlowSearchResult } from '@besliswijzer/flow-schema'

const props = withDefaults(
  defineProps<{
    variant?: 'hero' | 'compact'
    placeholder?: string
  }>(),
  {
    variant: 'hero',
    placeholder: 'Zoek een keuzehulp, bijv. robotmaaier of warmtepomp…',
  },
)

const router = useRouter()
const { query, results, loading, open, close, reset } = useFlowSearch()

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(-1)

const listboxId = `flow-search-${useId()}`
const hasResults = computed(() => results.value.length > 0)
const showDropdown = computed(() => open.value && (hasResults.value || loading.value || query.value.trim().length >= 2))

function onFocus() {
  if (query.value.trim().length >= 2 && results.value.length > 0) {
    open.value = true
  }
}

function onInputKeydown(event: KeyboardEvent) {
  if (!showDropdown.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = results.value[activeIndex.value]
    if (selected) {
      navigateToFlow(selected)
    } else if (results.value[0]) {
      navigateToFlow(results.value[0])
    }
  } else if (event.key === 'Escape') {
    close()
    inputRef.value?.blur()
  }
}

function navigateToFlow(flow: FlowSearchResult) {
  close()
  reset()
  router.push(`/flows/${flow.slug}`)
}

function onClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close()
  }
}

watch(results, () => {
  activeIndex.value = results.value.length > 0 ? 0 : -1
})

watch(query, () => {
  activeIndex.value = -1
})

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div
    ref="rootRef"
    class="flow-search"
    :class="[`flow-search--${props.variant}`]"
    role="search"
  >
    <label class="flow-search__label" :for="listboxId + '-input'">
      <span class="sr-only">Zoek keuzehulpen</span>
      <div class="flow-search__field">
        <svg class="flow-search__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>

        <input
          :id="listboxId + '-input'"
          ref="inputRef"
          v-model="query"
          type="search"
          class="flow-search__input"
          :placeholder="placeholder"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="showDropdown"
          :aria-controls="listboxId"
          :aria-activedescendant="activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined"
          @focus="onFocus"
          @keydown="onInputKeydown"
        />

        <button
          v-if="query && !loading"
          type="button"
          class="flow-search__clear"
          aria-label="Zoekopdracht wissen"
          @click="reset(); inputRef?.focus()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <span v-if="loading" class="flow-search__spinner" aria-hidden="true" />
      </div>
    </label>

    <Transition name="flow-search-dropdown">
      <ul
        v-if="showDropdown"
        :id="listboxId"
        class="flow-search__results"
        role="listbox"
        :aria-label="`${results.length} resultaten`"
      >
        <li v-if="loading && !hasResults" class="flow-search__status" role="status">
          Zoeken…
        </li>

        <li v-else-if="!loading && !hasResults" class="flow-search__status" role="status">
          Geen keuzehulpen gevonden voor "{{ query.trim() }}"
        </li>

        <li
          v-for="(flow, index) in results"
          :key="flow.id"
          :id="`${listboxId}-option-${index}`"
          role="option"
          :aria-selected="activeIndex === index"
        >
          <NuxtLink
            :to="`/flows/${flow.slug}`"
            class="flow-search__result"
            :class="{ 'flow-search__result--active': activeIndex === index }"
            @click="close"
            @mouseenter="activeIndex = index"
          >
            <span class="flow-search__result-main">
              <span class="flow-search__result-title">{{ flow.title }}</span>
              <span v-if="flow.description" class="flow-search__result-desc">{{ flow.description }}</span>
            </span>
            <span class="flow-search__result-category">{{ flow.category }}</span>
          </NuxtLink>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.flow-search {
  position: relative;
  width: 100%;
}

.flow-search--hero {
  max-width: 520px;
}

.flow-search--compact {
  max-width: 280px;
}

.flow-search__label {
  display: block;
}

.flow-search__field {
  position: relative;
  display: flex;
  align-items: center;
}

.flow-search__icon {
  position: absolute;
  left: 1.125rem;
  color: var(--veraio-muted);
  pointer-events: none;
}

.flow-search__input {
  width: 100%;
  padding: 1rem 3rem 1rem 3rem;
  border: 1px solid var(--veraio-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  font: inherit;
  font-size: 1rem;
  color: var(--veraio-text);
  box-shadow: var(--veraio-shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.flow-search__input::placeholder {
  color: #a3a3a3;
}

.flow-search__input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), var(--veraio-shadow-md);
}

.flow-search--compact .flow-search__input {
  padding: 0.625rem 2.5rem 0.625rem 2.5rem;
  font-size: 0.875rem;
}

.flow-search--compact .flow-search__icon {
  left: 0.875rem;
  width: 16px;
  height: 16px;
}

.flow-search__clear {
  position: absolute;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  color: var(--veraio-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.flow-search__clear:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--veraio-text);
}

.flow-search__spinner {
  position: absolute;
  right: 1rem;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(99, 102, 241, 0.15);
  border-top-color: var(--veraio-accent);
  border-radius: 50%;
  animation: flow-search-spin 0.7s linear infinite;
}

.flow-search__results {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 50;
  margin: 0;
  padding: 0.5rem;
  list-style: none;
  border-radius: var(--veraio-radius);
  border: 1px solid var(--veraio-border);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  box-shadow: var(--veraio-shadow-md);
  max-height: 320px;
  overflow-y: auto;
}

.flow-search__status {
  padding: 1rem 1.125rem;
  font-size: 0.875rem;
  color: var(--veraio-muted);
}

.flow-search__result {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
}

.flow-search__result:hover,
.flow-search__result--active {
  background: var(--veraio-accent-soft);
}

.flow-search__result-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.flow-search__result-title {
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.flow-search__result-desc {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.flow-search__result-category {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--veraio-accent);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: var(--veraio-accent-soft);
  white-space: nowrap;
}

.flow-search-dropdown-enter-active,
.flow-search-dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.flow-search-dropdown-enter-from,
.flow-search-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes flow-search-spin {
  to {
    transform: rotate(360deg);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

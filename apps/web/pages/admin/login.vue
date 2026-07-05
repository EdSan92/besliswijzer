<script setup lang="ts">
const isDev = import.meta.dev
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password: password.value },
    })
    await navigateTo('/admin', { external: true })
  } catch {
    error.value =
      'Onjuist wachtwoord. Gebruik je ADMIN_API_KEY (Railway: web-service, variabele ADMIN_API_KEY of NUXT_ADMIN_API_KEY).'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <div class="card login-card">
      <h1>Besliswijzer Admin</h1>
      <p>Log in met je admin wachtwoord om flows te beheren.</p>

      <form class="login-form" @submit.prevent="login">
        <div class="form-group">
          <label for="password">Wachtwoord</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="ADMIN_API_KEY uit .env"
            autocomplete="current-password"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? 'Bezig…' : 'Inloggen' }}
        </button>
      </form>

      <p v-if="isDev" class="hint">
        Development: admin is open zonder login.
        <NuxtLink to="/admin">Direct naar admin →</NuxtLink>
      </p>    </div>
  </div>
</template>

<style scoped>
.login-card {
  max-width: 420px;
  margin: 4rem auto;
}

.login-form {
  margin-top: 1.5rem;
}

.error {
  color: #dc2626;
  margin-bottom: 0.75rem;
}

.hint {
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-muted);
}
</style>

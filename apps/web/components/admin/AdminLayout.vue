<script setup lang="ts">
const isDev = import.meta.dev

async function logout() {  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <h2>Besliswijzer</h2>
      <nav>
        <NuxtLink to="/admin">Flows</NuxtLink>
        <slot name="nav" />
        <NuxtLink to="/" target="_blank">Site bekijken</NuxtLink>
      </nav>      <button v-if="!isDev" class="logout-btn" type="button" @click="logout">
        Uitloggen
      </button>
      <p v-else class="dev-badge">Dev — geen login</p>
    </aside>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.logout-btn {
  margin-top: 2rem;
  background: transparent;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}

.logout-btn:hover {
  background: #1e293b;
}

.dev-badge {
  margin-top: 2rem;
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>

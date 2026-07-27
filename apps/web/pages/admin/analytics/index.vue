<script setup lang="ts">
import type { BetaAnalyticsReport } from '@besliswijzer/flow-schema'

definePageMeta({ middleware: 'admin' })

const { data: report, error, pending } = await useAsyncData('admin-beta-analytics', () =>
  useAdminFetch<BetaAnalyticsReport>('/api/v1/admin/analytics/beta-report'),
)
</script>

<template>
  <div class="container">
    <header class="page-header">
      <div>
        <NuxtLink to="/admin" class="back">← Admin</NuxtLink>
        <h1>Publieke bèta — analytics</h1>
        <p class="muted">Page views, flow-funnel en affiliatekliks per categorie.</p>
      </div>
    </header>

    <p v-if="pending" class="muted">Laden…</p>
    <p v-else-if="error" class="error">Kon rapport niet laden.</p>

    <template v-else-if="report">
      <section class="stats-grid">
        <div class="stat-card"><span>Page views</span><strong>{{ report.totals.pageViews }}</strong></div>
        <div class="stat-card"><span>Flow starts</span><strong>{{ report.totals.flowStarts }}</strong></div>
        <div class="stat-card"><span>Voltooid</span><strong>{{ report.totals.flowCompletions }}</strong></div>
        <div class="stat-card"><span>Affiliatekliks</span><strong>{{ report.totals.affiliateClicks }}</strong></div>
        <div class="stat-card"><span>Completion rate</span><strong>{{ report.totals.completionRate }}%</strong></div>
        <div class="stat-card"><span>CTR</span><strong>{{ report.totals.clickThroughRate }}%</strong></div>
      </section>

      <section class="panel">
        <h2>Per categorie</h2>
        <table v-if="report.byCategory.length">
          <thead>
            <tr>
              <th>Categorie</th>
              <th>Views</th>
              <th>Starts</th>
              <th>Voltooid</th>
              <th>Kliks</th>
              <th>Completion</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.byCategory" :key="row.categorySlug">
              <td>{{ row.categoryTitle }}</td>
              <td>{{ row.pageViews }}</td>
              <td>{{ row.flowStarts }}</td>
              <td>{{ row.flowCompletions }}</td>
              <td>{{ row.affiliateClicks }}</td>
              <td>{{ row.completionRate }}%</td>
              <td>{{ row.clickThroughRate }}%</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Nog geen categoriedata.</p>
      </section>

      <section class="panel">
        <h2>Affiliatekliks per tracking-id</h2>
        <table v-if="report.byProduct.length">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Kliks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.byProduct" :key="row.trackingId">
              <td>{{ row.trackingId }}</td>
              <td>{{ row.affiliateClicks }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Nog geen affiliatekliks.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.back {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.muted {
  color: var(--color-muted);
}

.error {
  color: #b42318;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-surface);
}

.stat-card span {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.panel {
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
</style>

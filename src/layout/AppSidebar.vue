<script setup>
// LinePulse sol menüsü (gerçek uygulamadaki sırayla).
// active/navigasyon App.vue'de yönetilir (v-model:active).
// İkonlar: PrimeIcons (pi pi-*) yerine DevExtreme'in tema içi ikon fontu (dx-icon-*).
const props = defineProps({
  active: { type: String, default: 'line-daily-kpi' },
})
const emit = defineEmits(['update:active'])
const select = (key) => emit('update:active', key)

const menu = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dx-icon-mediumiconslayout' },
  { key: 'timeline', label: 'Time Line', icon: 'dx-icon-clock' },
  { key: 'loss-tree', label: 'Loss Tree', icon: 'dx-icon-hierarchy' },
  { key: 'operator', label: 'Operator Dashboard', icon: 'dx-icon-user' },
  { key: 'orders', label: 'Orders', icon: 'dx-icon-cart' }
]

const reportsAnalysis = [
  { key: 'pr-losses', label: 'Uptime & Losses' },
  { key: 'unplanned-downtime', label: 'Unplanned Downtime' },
  { key: 'planned-downtime', label: 'Planned Downtime' },
  { key: 'mtbf-up-stops', label: 'MTBF & Up Stops' }
]

const reportsGeneral = [
  { key: 'line-daily-kpi', label: 'Line Daily KPI' },
  { key: 'custom-report', label: 'Custom Report' },
  { key: 'pivot-analysis', label: 'Pivot Analysis' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'detail', label: 'Detail' },
  { key: 'machine-timeline', label: 'Machine Timeline' }
]

const bottom = [
  { key: 'alarms', label: 'Alarms', icon: 'dx-icon-bell' },
  { key: 'definitions', label: 'Definitions', icon: 'dx-icon-preferences' },
  { key: 'auth', label: 'Auth', icon: 'dx-icon-lock' }
]
</script>

<template>
  <aside class="lp-sidebar">
    <div class="lp-logo">
      <span class="lp-logo-mark"><i class="dx-icon-datatrending"></i></span>
      LinePulse
    </div>

    <nav class="lp-nav">
      <div
        v-for="item in menu"
        :key="item.key"
        class="lp-nav-item"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">Reports · Analysis</div>
      <div
        v-for="item in reportsAnalysis"
        :key="item.key"
        class="lp-nav-item lp-nav-sub"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">Reports · General</div>
      <div
        v-for="item in reportsGeneral"
        :key="item.key"
        class="lp-nav-item lp-nav-sub"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">System</div>
      <div
        v-for="item in bottom"
        :key="item.key"
        class="lp-nav-item"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
// PrimeVue SelectButton'ın DevExtreme karşılığı: DxButtonGroup (tekli seçim modunda).
// Fark: v-model yok — seçim 'selected-item-keys' prop'u + 'selection-changed'
// event'iyle yönetilir (controlled pattern).
import { DxButtonGroup } from 'devextreme-vue/button-group'
import { locale, setLocale, LOCALES, t } from '../lib/i18n.js'
import { isDark, toggleDark } from '../lib/theme.js'

defineProps({
  title: { type: String, default: 'Reports' }
})

// DxButtonGroup item'ları dxButton konfigürasyonudur: 'label' değil 'text' bekler.
const langItems = LOCALES.map((l) => ({ text: l.label, value: l.value }))
const selectedLangKeys = computed(() => [locale.value])

function onLangChanged(e) {
  const val = e.addedItems[0]?.value
  if (val) setLocale(val)
}
</script>

<template>
  <header class="lp-topbar">
    <div class="lp-topbar-title">{{ title }}</div>
    <div class="lp-topbar-right">
      <DxButtonGroup
        :items="langItems"
        key-expr="value"
        :selected-item-keys="selectedLangKeys"
        selection-mode="single"
        styling-mode="outlined"
        :element-attr="{ 'aria-label': t('topbar.lang') }"
        @selection-changed="onLangChanged"
      />
      <button
        class="lp-icon-btn"
        :title="isDark ? t('topbar.light') : t('topbar.dark')"
        :aria-label="isDark ? t('topbar.light') : t('topbar.dark')"
        @click="toggleDark"
      >
        <i :class="isDark ? 'dx-icon-sun' : 'dx-icon-moon'"></i>
      </button>
      <button class="lp-icon-btn" title="Notifications"><i class="dx-icon-bell"></i></button>
      <div class="lp-avatar">AD</div>
    </div>
  </header>
</template>

import { ref } from 'vue'
import { idbGet, idbSet } from '@/utils/idb'
import { asObject } from '@/utils/helpers'

const settings = ref({
  nightMode: false,
  notifications: true,
  autoUpdate: true
})

let initialized = false

function applyNightMode(enabled) {
  document.documentElement.classList.toggle('night-mode', enabled)
}

export function useSettings() {
  async function initSettings() {
    if (initialized) return
    const saved = asObject(await idbGet('appSettings'))
    settings.value = {
      nightMode: !!saved.nightMode,
      notifications: saved.notifications !== false,
      autoUpdate: saved.autoUpdate !== false
    }
    applyNightMode(settings.value.nightMode)
    initialized = true
  }

  async function updateSettings(patch) {
    settings.value = { ...settings.value, ...patch }
    if ('nightMode' in patch) applyNightMode(settings.value.nightMode)
    await idbSet('appSettings', settings.value)
  }

  return {
    settings,
    initSettings,
    updateSettings
  }
}

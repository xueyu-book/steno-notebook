import { ref } from 'vue'
import { idbGet, idbSet } from '@/utils/idb'
import { asArray } from '@/utils/helpers'
import { DEFAULT_WEBSITE_GROUPS, DEFAULT_WEBSITES } from '@/constants/websites'

const websites = ref([])
const websiteGroups = ref([])
let initialized = false

export function useWebsites() {
  async function persist() {
    await idbSet('websites', websites.value)
    await idbSet('websiteGroups', websiteGroups.value)
  }

  async function initWebsites() {
    if (initialized) return
    const savedSites = await idbGet('websites')
    const savedGroups = await idbGet('websiteGroups')
    let seeded = false

    if (savedSites == null) {
      websites.value = DEFAULT_WEBSITES.map((item) => ({ ...item }))
      seeded = true
    } else {
      websites.value = asArray(savedSites)
    }

    if (savedGroups == null) {
      websiteGroups.value = [...DEFAULT_WEBSITE_GROUPS]
      seeded = true
    } else {
      websiteGroups.value = asArray(savedGroups)
    }

    initialized = true
    if (seeded) await persist()
  }

  async function saveWebsites(nextSites, nextGroups) {
    if (nextSites) websites.value = asArray(nextSites)
    if (nextGroups) websiteGroups.value = asArray(nextGroups)
    await persist()
  }

  return {
    websites,
    websiteGroups,
    initWebsites,
    saveWebsites
  }
}

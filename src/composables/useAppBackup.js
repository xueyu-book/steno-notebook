import { downloadJson, readJsonFile, todayKey, asArray, asObject } from '@/utils/helpers'
import { confirmAction, toast } from '@/composables/useFeedback'
import { useNotes } from '@/composables/useNotes'
import { useWebsites } from '@/composables/useWebsites'
import { useMdNotes } from '@/composables/useMdNotes'
import { useSettings } from '@/composables/useSettings'
import { useAiConfig } from '@/composables/useAiConfig'

export const BACKUP_VERSION = 2

function isFullBackup(data) {
  if (!data || typeof data !== 'object') return false
  return Array.isArray(data.notes) || Array.isArray(data.noteRecords) || data.version != null
}

export function useAppBackup() {
  const notesApi = useNotes()
  const websitesApi = useWebsites()
  const mdApi = useMdNotes()
  const settingsApi = useSettings()
  const aiApi = useAiConfig()

  async function ensureLoaded() {
    await Promise.all([
      notesApi.initNotes(),
      websitesApi.initWebsites(),
      mdApi.initMdNotes(),
      settingsApi.initSettings(),
      aiApi.initAiConfig()
    ])
  }

  function buildPayload() {
    return {
      version: BACKUP_VERSION,
      exportTime: new Date().toISOString(),
      notes: notesApi.notes.value,
      noteRecords: notesApi.noteRecords.value,
      noteStats: notesApi.noteStats.value,
      websites: websitesApi.websites.value,
      websiteGroups: websitesApi.websiteGroups.value,
      mdNotes: mdApi.mdNotes.value,
      appSettings: settingsApi.settings.value,
      aiConfig: aiApi.aiConfig.value
    }
  }

  async function exportBackup(prefix = '零点笔记_数据备份') {
    await ensureLoaded()
    downloadJson(`${prefix}_${todayKey()}.json`, buildPayload())
  }

  async function importBackup(file) {
    const data = await readJsonFile(file)
    if (!isFullBackup(data)) {
      throw new Error('无效的备份文件')
    }

    const mdNotes = asArray(data.mdNotes || data.md_notes)
    const confirmed = await confirmAction(
      `即将导入：\n活跃便签 ${asArray(data.notes).length} 条，操作记录 ${asArray(data.noteRecords).length} 条，网站书签 ${asArray(data.websites).length} 条，Markdown 笔记 ${mdNotes.length} 条。\n当前数据将被覆盖，确定导入吗？`,
      '导入备份'
    )
    if (!confirmed) return false

    await notesApi.replaceAllNoteData({
      nextNotes: data.notes || notesApi.notes.value,
      nextRecords: data.noteRecords || notesApi.noteRecords.value,
      nextStats: data.noteStats || notesApi.noteStats.value
    })

    if (data.websites || data.websiteGroups) {
      await websitesApi.saveWebsites(
        data.websites || websitesApi.websites.value,
        data.websiteGroups || websitesApi.websiteGroups.value
      )
    }

    if (data.mdNotes || data.md_notes) {
      await mdApi.saveMdNotes(mdNotes)
    }

    if (data.appSettings) {
      await settingsApi.updateSettings(asObject(data.appSettings))
    }

    if (data.aiConfig) {
      await aiApi.saveAiConfig(asObject(data.aiConfig))
    }

    toast('导入成功')
    return true
  }

  return {
    exportBackup,
    importBackup
  }
}

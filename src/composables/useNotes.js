import { ref } from 'vue'
import { idbGet, idbSet } from '@/utils/idb'
import { asArray, asObject, todayKey } from '@/utils/helpers'
import { toast } from '@/composables/useFeedback'

const notes = ref([])
const noteRecords = ref([])
const noteStats = ref({})
let initialized = false

async function persistNotes() {
  await idbSet('notes', notes.value)
}

async function persistRecords() {
  await idbSet('noteRecords', noteRecords.value)
}

async function persistStats() {
  await idbSet('noteStats', noteStats.value)
}

async function safePersist(task, label) {
  try {
    await task()
  } catch {
    toast(`${label}失败，请稍后重试`, 'error')
  }
}

function bumpStat(field, dateKey) {
  const key = dateKey || todayKey()
  const stats = { ...noteStats.value }
  const current = stats[key] || { created: 0, completed: 0, deleted: 0 }
  stats[key] = {
    created: current.created || 0,
    completed: current.completed || 0,
    deleted: current.deleted || 0,
    [field]: (current[field] || 0) + 1
  }
  noteStats.value = stats
  return safePersist(persistStats, '保存统计')
}

export function useNotes() {
  async function initNotes() {
    if (initialized) return
    notes.value = asArray(await idbGet('notes'))
    noteRecords.value = asArray(await idbGet('noteRecords'))
    noteStats.value = asObject(await idbGet('noteStats'))
    initialized = true
  }

  async function reloadNotes() {
    notes.value = asArray(await idbGet('notes'))
    noteRecords.value = asArray(await idbGet('noteRecords'))
    noteStats.value = asObject(await idbGet('noteStats'))
    initialized = true
  }

  async function saveNotes(nextNotes) {
    notes.value = nextNotes
    await safePersist(persistNotes, '保存便签')
  }

  async function addNote(note) {
    notes.value = [...notes.value, note]
    await bumpStat('created')
    await safePersist(persistNotes, '保存便签')
  }

  async function updateNote(id, patch) {
    notes.value = notes.value.map((note) => (note.id === id ? { ...note, ...patch } : note))
    await safePersist(persistNotes, '保存便签')
  }

  async function archiveNote(note, action) {
    const record = {
      id: note.id,
      content: note.content,
      color: note.color,
      priority: note.priority,
      createdAt: note.createdAt,
      action,
      actionTime: new Date().toISOString()
    }
    notes.value = notes.value.filter((item) => item.id !== note.id)
    noteRecords.value = [record, ...noteRecords.value]
    await bumpStat(action === 'complete' ? 'completed' : 'deleted')
    await safePersist(persistNotes, '保存便签')
    await safePersist(persistRecords, '保存记录')
  }

  async function deleteRecords(ids) {
    const idSet = new Set(ids)
    noteRecords.value = noteRecords.value.filter((item) => !idSet.has(item.id))
    await safePersist(persistRecords, '删除记录')
  }

  async function replaceAllNoteData({ nextNotes, nextRecords, nextStats }) {
    if (nextNotes) notes.value = asArray(nextNotes)
    if (nextRecords) noteRecords.value = asArray(nextRecords)
    if (nextStats) noteStats.value = asObject(nextStats)
    await safePersist(persistNotes, '保存便签')
    await safePersist(persistRecords, '保存记录')
    await safePersist(persistStats, '保存统计')
  }

  return {
    notes,
    noteRecords,
    noteStats,
    initNotes,
    reloadNotes,
    saveNotes,
    addNote,
    updateNote,
    archiveNote,
    deleteRecords,
    replaceAllNoteData
  }
}

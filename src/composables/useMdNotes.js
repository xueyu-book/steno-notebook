import { ref } from 'vue'
import { idbGet, idbSet } from '@/utils/idb'
import { asArray } from '@/utils/helpers'

const mdNotes = ref([])
let initialized = false

export function useMdNotes() {
  async function persist() {
    await idbSet('md_notes', mdNotes.value)
  }

  async function initMdNotes() {
    if (initialized) return
    mdNotes.value = asArray(await idbGet('md_notes'))
    initialized = true
  }

  async function saveMdNotes(nextNotes) {
    mdNotes.value = asArray(nextNotes)
    await persist()
  }

  async function upsertMdNote(note) {
    const index = mdNotes.value.findIndex((item) => item.id === note.id)
    if (index === -1) mdNotes.value = [note, ...mdNotes.value]
    else mdNotes.value = mdNotes.value.map((item) => (item.id === note.id ? note : item))
    await persist()
  }

  async function removeMdNote(id) {
    mdNotes.value = mdNotes.value.filter((item) => item.id !== id)
    await persist()
  }

  return {
    mdNotes,
    initMdNotes,
    saveMdNotes,
    upsertMdNote,
    removeMdNote
  }
}

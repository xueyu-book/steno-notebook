<template>
  <div class="note-list-view">
    <div class="note-list-header">
      <h2><i class="fas fa-book"></i> 我的笔记</h2>
      <span>共 {{ mdNotes.length }} 篇</span>
    </div>
    <div class="note-cards">
      <div v-if="!sortedNotes.length" class="empty-state">
        <i class="fas fa-pen-fancy"></i>
        暂无笔记<br />从首页「Markdown 笔记」开始创建吧
      </div>
      <button
        v-for="note in sortedNotes"
        :key="note.id"
        class="note-card"
        type="button"
        @click="emit('open-note', note)"
      >
        <div class="nc-title">{{ note.title }}</div>
        <div class="nc-preview">{{ preview(note.content) }}</div>
        <div class="nc-meta">
          <span>{{ formatDateTime(note.updatedAt) }}</span>
          <span class="nc-delete" title="删除" @click.stop="remove(note)">
            <i class="fas fa-trash-alt"></i>
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMdNotes } from '@/composables/useMdNotes'
import { confirmAction } from '@/composables/useFeedback'
import { formatDateTime } from '@/utils/helpers'

const emit = defineEmits(['open-note'])
const { mdNotes, removeMdNote } = useMdNotes()

const sortedNotes = computed(() =>
  [...mdNotes.value].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
)

function preview(content) {
  return (content || '').replace(/#/g, '').slice(0, 80)
}

async function remove(note) {
  if (!(await confirmAction(`确定删除笔记「${note.title}」吗？此操作不可恢复。`, '删除笔记'))) return
  await removeMdNote(note.id)
}
</script>

<template>
  <SplitEditor>
    <template #left>
      <div class="pane-header">
        <input
          v-model="title"
          class="note-title-input"
          placeholder="笔记标题"
          @input="onTitleInput"
          @keydown="onSaveHotkey"
        />
        <span class="save-indicator" :class="{ fading: saveFading }">{{ saveText }}</span>
        <div class="note-toolbar">
          <span class="char-count">{{ content.length }} 字符</span>
          <button class="action-btn" type="button" title="保存" @click="saveNote">
            <i class="fas fa-save"></i> 保存
          </button>
          <button class="action-btn" type="button" title="导出为 Word" @click="exportWord">
            <i class="fas fa-file-word"></i>
          </button>
        </div>
      </div>
      <textarea
        v-model="content"
        class="md-input"
        placeholder="# 开始编写笔记...&#10;&#10;点保存或按 Ctrl+S"
        @input="onContentInput"
        @keydown="onSaveHotkey"
      ></textarea>
    </template>
    <template #right>
      <div class="pane-header">
        <span>预览</span>
        <span class="char-count">{{ previewLines }} 行</span>
      </div>
      <div class="md-preview markdown-body" v-html="previewHtml"></div>
    </template>
  </SplitEditor>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SplitEditor from '@/components/SplitEditor.vue'
import { useMdNotes } from '@/composables/useMdNotes'
import { exportMarkdownToWord, renderMarkdown } from '@/utils/markdown'
import { generateId } from '@/utils/helpers'

const props = defineProps({
  tab: { type: Object, required: true }
})
const emit = defineEmits(['dirty', 'saved', 'title-change', 'update-content', 'update-note-id'])
const { upsertMdNote, mdNotes } = useMdNotes()

const title = ref(props.tab.title)
const content = ref(props.tab.content)
const saveText = ref('')
const saveFading = ref(false)
let fadeTimer = 0
let clearTimer = 0

const previewHtml = computed(() => {
  if (!content.value.trim()) return '<span style="color:#5a5b7e;">预览将在这里显示...</span>'
  return renderMarkdown(content.value)
})

const previewLines = computed(() => {
  if (!content.value.trim()) return 0
  return content.value.split('\n').filter((line) => line.trim()).length
})

watch(
  () => props.tab.id,
  () => {
    title.value = props.tab.title
    content.value = props.tab.content
  }
)

function onTitleInput() {
  const next = title.value.trim() || '未命名笔记'
  emit('title-change', next)
  emit('dirty')
}

function onContentInput() {
  emit('update-content', content.value)
  emit('dirty')
}

async function saveNote() {
  const nextTitle = title.value.trim() || '未命名笔记'
  title.value = nextTitle
  emit('title-change', nextTitle)
  const note = {
    id: props.tab.noteId || `note_${generateId()}`,
    title: nextTitle,
    content: content.value,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
  if (props.tab.noteId) {
    const old = mdNotes.value.find((item) => item.id === props.tab.noteId)
    if (old?.createdAt) note.createdAt = old.createdAt
  } else {
    emit('update-note-id', note.id)
  }
  await upsertMdNote(note)
  emit('saved')
  saveText.value = '已保存'
  saveFading.value = false
  window.clearTimeout(fadeTimer)
  window.clearTimeout(clearTimer)
  fadeTimer = window.setTimeout(() => {
    saveFading.value = true
  }, 1500)
  clearTimer = window.setTimeout(() => {
    saveText.value = ''
    saveFading.value = false
  }, 2500)
}

function onSaveHotkey(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    saveNote()
  }
}

function exportWord() {
  exportMarkdownToWord(title.value || '未命名笔记', content.value)
}

onBeforeUnmount(() => {
  window.clearTimeout(fadeTimer)
  window.clearTimeout(clearTimer)
})
</script>

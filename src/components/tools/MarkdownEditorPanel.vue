<template>
  <SplitEditor>
    <template #left>
      <div class="pane-header">
        <div class="dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span>MARKDOWN</span>
        <div class="note-toolbar">
          <span class="char-count">{{ content.length }} 字符</span>
          <button class="action-btn" type="button" @click="exportWord">
            <i class="fas fa-file-word"></i> 导出 Word
          </button>
        </div>
      </div>
      <textarea
        v-model="content"
        class="md-input"
        placeholder="# 开始编写 Markdown..."
        @input="emit('update-content', content)"
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
import { computed, ref } from 'vue'
import SplitEditor from '@/components/SplitEditor.vue'
import { exportMarkdownToWord, renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  tab: { type: Object, required: true }
})
const emit = defineEmits(['update-content'])

const content = ref(props.tab.content || '')

const previewHtml = computed(() => {
  if (!content.value.trim()) return '<span style="color:#5a5b7e;">预览将在这里显示...</span>'
  return renderMarkdown(content.value)
})

const previewLines = computed(() => {
  if (!content.value.trim()) return 0
  return content.value.split('\n').filter((line) => line.trim()).length
})

function exportWord() {
  exportMarkdownToWord('Markdown文档', content.value)
}
</script>

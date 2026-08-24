<template>
  <SplitEditor>
    <template #left>
      <div class="pane-header">
        <span>INPUT</span>
        <div class="json-actions">
          <button class="action-btn" type="button" @click="formatJson">
            <i class="fas fa-align-left"></i> 格式化
          </button>
          <button class="action-btn" type="button" @click="minifyJson">
            <i class="fas fa-compress-alt"></i> 压缩
          </button>
          <button class="action-btn" type="button" @click="escapeJson">
            <i class="fas fa-shield-alt"></i> 转义
          </button>
          <button class="action-btn" type="button" @click="unescapeJson">
            <i class="fas fa-unlock-alt"></i> 反转义
          </button>
        </div>
      </div>
      <textarea
        v-model="input"
        class="json-textarea"
        placeholder="粘贴或输入 JSON 文本..."
        @input="onInput"
        @keydown="onHotkey"
      ></textarea>
    </template>
    <template #right>
      <div class="pane-header">
        <span>OUTPUT</span>
        <div class="json-actions">
          <button class="action-btn" :class="{ 'copy-success': copied }" type="button" @click="copyOutput">
            <i class="fas" :class="copied ? 'fa-check' : 'fa-copy'"></i>
            {{ copied ? '已复制' : '复制' }}
          </button>
          <button class="action-btn" type="button" @click="clearAll">
            <i class="fas fa-eraser"></i> 清空
          </button>
        </div>
      </div>
      <div class="json-output" :class="status" v-html="outputHtml"></div>
    </template>
  </SplitEditor>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import SplitEditor from '@/components/SplitEditor.vue'
import { highlightJson } from '@/utils/markdown'
import { copyText, escapeHtml } from '@/utils/helpers'
import { toast } from '@/composables/useFeedback'

const props = defineProps({
  tab: { type: Object, required: true }
})
const emit = defineEmits(['update-content'])

const EMPTY_HINT = '<span style="color:#5a5b7e;">格式化结果将在这里显示...</span>'
const input = ref(props.tab.content || '')
const outputHtml = ref(EMPTY_HINT)
const outputText = ref('')
const status = ref('')
const copied = ref(false)
let debounceTimer = 0
let copiedTimer = 0

function syncContent(value) {
  emit('update-content', value)
}

function setOutput(html, text, nextStatus) {
  outputHtml.value = html
  outputText.value = text
  status.value = nextStatus
}

function formatJson() {
  const raw = input.value.trim()
  if (!raw) {
    setOutput(EMPTY_HINT, '', '')
    return
  }
  try {
    const formatted = JSON.stringify(JSON.parse(raw), null, 2)
    setOutput(highlightJson(formatted), formatted, 'success')
  } catch (error) {
    setOutput(escapeHtml(`JSON 解析错误：${error.message}`), error.message, 'error')
  }
}

function minifyJson() {
  const raw = input.value.trim()
  if (!raw) return
  try {
    const minified = JSON.stringify(JSON.parse(raw))
    setOutput(highlightJson(minified), minified, 'success')
  } catch (error) {
    setOutput(escapeHtml(`JSON 解析错误：${error.message}`), error.message, 'error')
  }
}

function escapeJson() {
  if (!input.value.trim()) return
  const escaped = JSON.stringify(input.value)
  input.value = escaped
  syncContent(escaped)
  setOutput(escapeHtml(escaped), escaped, 'success')
}

function unescapeJson() {
  const raw = input.value.trim()
  if (!raw) return
  try {
    const unescaped = JSON.parse(raw)
    const formatted = typeof unescaped === 'string' ? unescaped : JSON.stringify(unescaped, null, 2)
    input.value = formatted
    syncContent(formatted)
    setOutput(
      typeof unescaped === 'string' ? `<span style="color:#4ade80;">${escapeHtml(unescaped)}</span>` : highlightJson(formatted),
      formatted,
      'success'
    )
  } catch (error) {
    setOutput(escapeHtml(`反转义错误：${error.message}`), error.message, 'error')
  }
}

async function copyOutput() {
  if (!outputText.value || status.value === 'error') return
  try {
    await copyText(outputText.value)
    copied.value = true
    window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast('复制失败，请手动复制', 'error')
  }
}

function clearAll() {
  input.value = ''
  syncContent('')
  setOutput(EMPTY_HINT, '', '')
}

function onInput() {
  syncContent(input.value)
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(formatJson, 400)
}

function onHotkey(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    formatJson()
  }
}

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer)
  window.clearTimeout(copiedTimer)
})
</script>

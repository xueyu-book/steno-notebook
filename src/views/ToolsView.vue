<template>
  <div class="tools-page">
    <div class="tab-bar">
      <button class="tab-home-btn" type="button" title="工具首页" @click="showHome">
        <i class="fas fa-th"></i>
      </button>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        type="button"
        @click="switchTab(tab.id)"
      >
        <i :class="tabIcon(tab.type)"></i>
        <span>{{ tab.title.length > 12 ? `${tab.title.slice(0, 12)}...` : tab.title }}</span>
        <span v-if="tab.dirty" class="tab-dirty">●</span>
        <span class="tab-close" @click.stop="closeTab(tab.id)">&times;</span>
      </button>
    </div>

    <div class="main-area">
      <div v-show="!activeTabId" class="home-grid">
        <h2><i class="fas fa-toolbox"></i> 工具箱</h2>
        <div class="tool-cards">
          <button class="tool-card card-note" type="button" @click="openTool('markdown-note')">
            <i class="fas fa-pen-fancy"></i>
            <div class="card-title">Markdown 笔记</div>
            <div class="card-desc">可保存的富文本笔记，点保存或 Ctrl+S</div>
          </button>
          <button class="tool-card card-md" type="button" @click="openTool('markdown-editor')">
            <i class="fab fa-markdown"></i>
            <div class="card-title">Markdown 编辑器</div>
            <div class="card-desc">实时预览 · 导出 Word · 临时编辑</div>
          </button>
          <button class="tool-card card-json" type="button" @click="openTool('json-formatter')">
            <i class="fas fa-code"></i>
            <div class="card-title">JSON 格式化</div>
            <div class="card-desc">格式化 · 压缩 · 转义 · 反转义</div>
          </button>
          <button class="tool-card card-list" type="button" @click="openTool('note-list')">
            <i class="fas fa-book"></i>
            <div class="card-title">我的笔记</div>
            <div class="card-desc">查看、编辑、删除已保存的笔记</div>
          </button>
        </div>
      </div>

      <div v-show="activeTabId" class="tab-panels">
        <div
          v-for="tab in tabs"
          v-show="tab.id === activeTabId"
          :key="tab.id"
          class="tab-panel"
        >
          <MarkdownNotePanel
            v-if="tab.type === 'markdown-note'"
            :tab="tab"
            @dirty="markDirty(tab)"
            @saved="markClean(tab)"
            @title-change="(title) => patchTab(tab, { title })"
            @update-content="(content) => patchTab(tab, { content })"
            @update-note-id="(noteId) => patchTab(tab, { noteId })"
          />
          <MarkdownEditorPanel
            v-else-if="tab.type === 'markdown-editor'"
            :tab="tab"
            @update-content="(content) => patchTab(tab, { content })"
          />
          <JsonFormatterPanel
            v-else-if="tab.type === 'json-formatter'"
            :tab="tab"
            @update-content="(content) => patchTab(tab, { content })"
          />
          <NoteListPanel v-else-if="tab.type === 'note-list'" @open-note="openSavedNote" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MarkdownNotePanel from '@/components/tools/MarkdownNotePanel.vue'
import MarkdownEditorPanel from '@/components/tools/MarkdownEditorPanel.vue'
import JsonFormatterPanel from '@/components/tools/JsonFormatterPanel.vue'
import NoteListPanel from '@/components/tools/NoteListPanel.vue'
import { useMdNotes } from '@/composables/useMdNotes'
import { confirmAction } from '@/composables/useFeedback'
import '@/styles/tools.css'

const TOOL_META = {
  'markdown-note': { title: '未命名笔记', icon: 'fas fa-pen-fancy' },
  'markdown-editor': { title: 'Markdown 编辑器', icon: 'fab fa-markdown' },
  'json-formatter': { title: 'JSON 格式化', icon: 'fas fa-code' },
  'note-list': { title: '我的笔记', icon: 'fas fa-book' }
}

const { initMdNotes } = useMdNotes()
const tabs = ref([])
const activeTabId = ref('')
let tabCounter = 0

function defaultTitle(type) {
  return TOOL_META[type]?.title || '工具'
}

function tabIcon(type) {
  return TOOL_META[type]?.icon || 'fas fa-file'
}

function patchTab(tab, patch) {
  Object.assign(tab, patch)
}

function openTool(type, opts = {}) {
  const id = `tab_${++tabCounter}`
  tabs.value.push({
    id,
    type,
    title: opts.title || defaultTitle(type),
    content: opts.content || '',
    dirty: false,
    noteId: opts.noteId || null
  })
  activeTabId.value = id
}

function switchTab(id) {
  activeTabId.value = id
}

function showHome() {
  activeTabId.value = ''
}

async function closeTab(id) {
  const tab = tabs.value.find((item) => item.id === id)
  if (!tab) return
  if (tab.dirty && !(await confirmAction(`笔记「${tab.title}」有未保存的修改，是否放弃修改？`, '放弃修改'))) {
    return
  }
  tabs.value = tabs.value.filter((item) => item.id !== id)
  if (activeTabId.value === id) {
    activeTabId.value = tabs.value.length ? tabs.value[tabs.value.length - 1].id : ''
  }
}

function markDirty(tab) {
  if (tab.type === 'markdown-note' && !String(tab.content || '').trim() && !tab.noteId) {
    tab.dirty = false
    return
  }
  tab.dirty = true
}

function markClean(tab) {
  tab.dirty = false
}

function openSavedNote(note) {
  const existing = tabs.value.find((tab) => tab.noteId === note.id && tab.type === 'markdown-note')
  if (existing) {
    activeTabId.value = existing.id
    return
  }
  openTool('markdown-note', {
    title: note.title,
    content: note.content,
    noteId: note.id
  })
}

function onBeforeUnload(event) {
  if (!tabs.value.some((tab) => tab.dirty)) return
  event.preventDefault()
  event.returnValue = '有未保存的笔记页签'
}

onMounted(async () => {
  await initMdNotes()
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<style scoped>
.tools-page {
  height: 100%;
  background: #1a1b2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  align-items: center;
  background: #14152a;
  border-bottom: 1px solid #2d2f5a;
  height: 40px;
  overflow-x: auto;
  padding: 0 4px;
}

.tab-home-btn,
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  border: none;
  cursor: pointer;
  color: #7c7ea8;
  background: transparent;
}

.tab-home-btn {
  width: 32px;
  justify-content: center;
  border-radius: 6px;
}

.tab-home-btn:hover,
.tab-item:hover {
  color: #c0c2e8;
  background: rgba(167, 139, 250, 0.08);
}

.tab-item {
  padding: 0 14px;
  border-radius: 6px 6px 0 0;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.tab-item.active {
  color: #a78bfa;
  background: #1a1b2e;
}

.tab-dirty {
  color: #fbbf24;
  font-size: 0.7rem;
}

.tab-close {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}

.tab-close:hover {
  background: rgba(255, 105, 97, 0.25);
  color: #ff6961;
  opacity: 1;
}

.main-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.home-grid {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.home-grid h2 {
  font-size: 1.3rem;
  color: #a78bfa;
  margin-bottom: 2rem;
}

.tool-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  max-width: 700px;
  width: 100%;
}

.tool-card {
  background: #1e1f3a;
  border: 1px solid #2d2f5a;
  border-radius: 14px;
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  color: inherit;
}

.tool-card:hover {
  transform: translateY(-4px);
  border-color: #a78bfa;
}

.tool-card i {
  font-size: 2.4rem;
  display: block;
  margin-bottom: 0.8rem;
}

.card-note i { color: #fbbf24; }
.card-md i { color: #7dd3fc; }
.card-json i { color: #4ade80; }
.card-list i { color: #f472b6; }

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}

.card-desc {
  font-size: 0.75rem;
  color: #7c7ea8;
}

.tab-panels,
.tab-panel {
  position: absolute;
  inset: 0;
}

.tab-panel {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .tab-bar {
    height: 44px;
    -webkit-overflow-scrolling: touch;
  }

  .home-grid {
    padding: 1.25rem 1rem 5.5rem;
    justify-content: flex-start;
    padding-top: 2rem;
  }

  .tool-cards {
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }

  .tool-card {
    padding: 1.2rem 0.8rem;
  }

  .tab-item {
    min-height: 36px;
  }
}

@media (max-width: 420px) {
  .tool-cards {
    grid-template-columns: 1fr;
  }
}
</style>

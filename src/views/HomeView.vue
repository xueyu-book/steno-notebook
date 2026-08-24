<template>
  <div class="home-page" @pointerdown="touchActivity">
    <div
      ref="notesAreaRef"
      class="notes-area"
      :class="{ 'organize-mode': organized }"
      @mouseenter="stopFreeMove"
      @pointerdown="stopFreeMove"
    >
      <div
        v-for="note in notes"
        :key="note.id"
        class="note"
        :class="[
          note.color,
          animationClass(note),
          {
            active: note.id === activeId,
            flash: note.id === flashId,
            'near-delete': note.id === nearDeleteId,
            'near-complete': note.id === nearCompleteId,
            flying: note.id === flyingId
          }
        ]"
        :style="noteStyle(note)"
        @pointerdown.stop="startDrag($event, note)"
        @pointerup="onNotePointerUp($event, note)"
        @click.stop="onNoteClick($event, note)"
        @dblclick.stop="tryOpenEdit(note)"
      >
        <div class="ribbon" :class="note.priority">{{ getPriorityLabel(note.priority) }}</div>
        <div v-if="showNoteTitle(note.content)" class="note-title">{{ noteTitle(note.content) }}</div>
        <div class="note-content">{{ note.content }}</div>
      </div>
    </div>

    <div class="action-area">
      <div ref="completeZoneRef" class="action-zone complete-zone" :class="{ active: zoneActive === 'complete' }">
        <i class="fas fa-check-circle"></i>
      </div>
      <div ref="deleteZoneRef" class="action-zone delete-zone" :class="{ active: zoneActive === 'delete' }">
        <i class="fas fa-trash-alt"></i>
      </div>
    </div>

    <div class="bottom-buttons">
      <button class="bottom-btn" type="button" aria-label="新建便签" @click="openCreate">
        <i class="fas fa-plus"></i><span>新建便签</span>
      </button>
      <button class="bottom-btn" type="button" aria-label="整理便签" @click="organizeNotes">
        <i class="fas fa-layer-group"></i><span>整理便签</span>
      </button>
      <button class="bottom-btn" type="button" aria-label="随机动画" @click="onPlayRandomAnimation">
        <i class="fas fa-play"></i><span>随机动画</span>
      </button>
      <button class="bottom-btn" type="button" aria-label="导出" @click="exportData">
        <i class="fas fa-download"></i><span>导出</span>
      </button>
      <button class="bottom-btn" type="button" aria-label="导入" @click="importInput?.click()">
        <i class="fas fa-upload"></i><span>导入</span>
      </button>
      <input ref="importInput" type="file" accept=".json" hidden @change="importData" />
    </div>

    <AppModal v-model="modalOpen" :title="editingId ? '编辑便签' : '新建便签'">
      <div class="form-group">
        <label>内容（最多 200 字）</label>
        <textarea v-model="form.content" class="form-control" maxlength="200" rows="5"></textarea>
      </div>
      <div class="form-group">
        <label>选择颜色</label>
        <div class="color-options">
          <button
            v-for="color in colors"
            :key="color"
            type="button"
            class="color-option"
            :class="[color, { selected: form.color === color }]"
            :aria-label="color"
            @click="form.color = color"
          ></button>
        </div>
      </div>
      <div class="form-group">
        <label>优先级</label>
        <div class="priority-options">
          <button
            v-for="item in priorities"
            :key="item.value"
            type="button"
            class="priority-option"
            :class="[item.value, { selected: form.priority === item.value }]"
            @click="form.priority = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="modalOpen = false">取消</button>
        <button class="btn btn-primary" type="button" @click="saveNote">保存</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { NOTE_COLORS, NOTE_PRIORITIES } from '@/constants/notes'
import { useNotes } from '@/composables/useNotes'
import { useNoteMotion } from '@/composables/useNoteMotion'
import { useAppBackup } from '@/composables/useAppBackup'
import { toast } from '@/composables/useFeedback'
import { generateId, getNoteMetrics, getPriorityLabel, isMobileViewport } from '@/utils/helpers'

const colors = NOTE_COLORS
const priorities = NOTE_PRIORITIES

const { notes, initNotes, addNote, updateNote, archiveNote, saveNotes } = useNotes()
const { exportBackup, importBackup } = useAppBackup()

const notesAreaRef = ref(null)
const completeZoneRef = ref(null)
const deleteZoneRef = ref(null)
const importInput = ref(null)
const modalOpen = ref(false)
const editingId = ref('')
const activeId = ref('')
const flashId = ref('')
const nearDeleteId = ref('')
const nearCompleteId = ref('')
const flyingId = ref('')
const zoneActive = ref('')
const flyingOffset = reactive({ x: '0px', y: '0px' })
const form = reactive({ content: '', color: 'color1', priority: 'normal' })
const drag = reactive({ id: '', offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false, moves: 0, threshold: 32 })
let flyTimer = 0
let lastTap = { id: '', at: 0 }
let lastPointerAt = 0
let lastPointerType = ''
let lastEditAt = 0
let ignoreClickUntil = 0
let resizeTimer = 0

const {
  currentAnimation,
  organized,
  touchActivity,
  stopFreeMove,
  stopAllMotion,
  playRandomAnimation,
  startListening,
  stopListening
} = useNoteMotion(notes, notesAreaRef, {
  persist: () => saveNotes([...notes.value])
})

const organizeZ = ref({})

const zMap = computed(() => {
  const map = {}
  notes.value.forEach((note, index) => {
    if (note.id === activeId.value) {
      map[note.id] = 1000
    } else if (organized.value && organizeZ.value[note.id] != null) {
      map[note.id] = organizeZ.value[note.id]
    } else {
      map[note.id] = index + 2
    }
  })
  return map
})

function noteTitle(content) {
  const text = content || ''
  return text.length > 10 ? `${text.slice(0, 10)}...` : text
}

function showNoteTitle(content) {
  return (content || '').length > 10
}

function animationClass(note) {
  if (!currentAnimation.value || note.id === drag.id || note.id === flyingId.value) return ''
  return `anim-${currentAnimation.value}`
}

function noteStyle(note) {
  const style = {
    left: `${note.left}px`,
    top: `${note.top}px`,
    zIndex: zMap.value[note.id] || 2
  }
  if (note.id === flyingId.value) {
    style['--end-x'] = flyingOffset.x
    style['--end-y'] = flyingOffset.y
  }
  return style
}

function resetForm() {
  form.content = ''
  form.color = 'color1'
  form.priority = 'normal'
}

function openCreate() {
  stopAllMotion()
  editingId.value = ''
  resetForm()
  modalOpen.value = true
  touchActivity()
}

function openEdit(note) {
  stopAllMotion()
  editingId.value = note.id
  form.content = note.content
  form.color = note.color
  form.priority = note.priority
  modalOpen.value = true
  touchActivity()
}

function tryOpenEdit(note) {
  const now = Date.now()
  if (modalOpen.value && editingId.value === note.id && now - lastEditAt < 800) return
  lastEditAt = now
  lastTap = { id: '', at: 0 }
  openEdit(note)
}

async function saveNote() {
  const content = form.content.trim()
  if (!content) {
    toast('请输入便签内容', 'error')
    return
  }

  if (editingId.value) {
    await updateNote(editingId.value, {
      content,
      color: form.color,
      priority: form.priority,
      updatedAt: new Date().toISOString()
    })
  } else {
    const { width, height } = getNoteMetrics()
    const area = notesAreaRef.value
    const maxLeft = Math.max(8, (area?.clientWidth || window.innerWidth) - width - 8)
    const maxTop = Math.max(8, (area?.clientHeight || window.innerHeight) - height - 8)
    const note = {
      id: generateId(),
      content,
      color: form.color,
      priority: form.priority,
      left: Math.random() * maxLeft,
      top: Math.random() * maxTop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await addNote(note)
    flashId.value = note.id
    window.setTimeout(() => {
      if (flashId.value === note.id) flashId.value = ''
    }, 1000)
  }
  modalOpen.value = false
}

function isDuplicatePointer(event) {
  return (
    event.pointerType === 'mouse' &&
    lastPointerType !== 'mouse' &&
    Date.now() - lastPointerAt < 80
  )
}

function rememberPointer(event) {
  lastPointerAt = Date.now()
  lastPointerType = event.pointerType || ''
}

function isDoubleTap(note) {
  if (lastTap.id !== note.id) return false
  const dt = Date.now() - lastTap.at
  return dt > 80 && dt <= 800
}

function recordTap(note) {
  const now = Date.now()
  if (lastTap.id === note.id && now - lastTap.at < 80) return false
  if (isDoubleTap(note)) {
    tryOpenEdit(note)
    return true
  }
  lastTap = { id: note.id, at: now }
  return false
}

function onNotePointerUp(event, note) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isDuplicatePointer(event)) return
  if (drag.moved || drag.id !== note.id) return
  rememberPointer(event)
  recordTap(note)
}

function onNoteClick(event, note) {
  if (Date.now() < ignoreClickUntil) return
  if (event.detail >= 2) tryOpenEdit(note)
}

function detachDrag() {
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  drag.id = ''
  drag.moved = false
}

function startDrag(event, note) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isDuplicatePointer(event)) return
  rememberPointer(event)

  if (isDoubleTap(note)) {
    detachDrag()
    tryOpenEdit(note)
    return
  }

  stopAllMotion()
  activeId.value = note.id
  organized.value = false
  drag.id = note.id
  drag.offsetX = event.clientX - note.left
  drag.offsetY = event.clientY - note.top
  drag.startX = event.clientX
  drag.startY = event.clientY
  drag.moved = false
  drag.moves = 0
  drag.threshold = 32
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}

function onDrag(event) {
  if (!drag.id) return
  const note = notes.value.find((item) => item.id === drag.id)
  if (!note) return
  drag.moves += 1
  const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
  if (!drag.moved && (drag.moves <= 1 || dist < drag.threshold)) return
  drag.moved = true
  lastTap = { id: '', at: 0 }
  ignoreClickUntil = Date.now() + 400
  event.preventDefault()
  note.left = event.clientX - drag.offsetX
  note.top = event.clientY - drag.offsetY
  checkZones(event.clientX, event.clientY)
}

async function stopDrag(event) {
  const note = notes.value.find((item) => item.id === drag.id)
  const didMove = drag.moved
  detachDrag()
  rememberPointer(event)
  if (!note) {
    resetZones()
    return
  }

  if (!didMove) {
    recordTap(note)
    resetZones()
    return
  }

  const deleteEl = deleteZoneRef.value
  const completeEl = completeZoneRef.value
  if (!deleteEl || !completeEl) {
    await saveNotes([...notes.value])
    resetZones()
    return
  }

  const deleteRect = deleteEl.getBoundingClientRect()
  const completeRect = completeEl.getBoundingClientRect()
  const { clientX: x, clientY: y } = event

  if (x >= deleteRect.left && x <= deleteRect.right && y >= deleteRect.top && y <= deleteRect.bottom) {
    await flyToZone(note, deleteEl, 'delete')
  } else if (x >= completeRect.left && x <= completeRect.right && y >= completeRect.top && y <= completeRect.bottom) {
    await flyToZone(note, completeEl, 'complete')
  } else {
    await saveNotes([...notes.value])
  }
  resetZones()
}

function distanceTo(el, x, y) {
  if (!el) return Number.POSITIVE_INFINITY
  const rect = el.getBoundingClientRect()
  return Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
}

function checkZones(x, y) {
  const threshold = isMobileViewport() ? 56 : 40
  const toDelete = distanceTo(deleteZoneRef.value, x, y)
  const toComplete = distanceTo(completeZoneRef.value, x, y)
  if (toDelete < threshold) {
    zoneActive.value = 'delete'
    nearDeleteId.value = drag.id
    nearCompleteId.value = ''
  } else if (toComplete < threshold) {
    zoneActive.value = 'complete'
    nearCompleteId.value = drag.id
    nearDeleteId.value = ''
  } else {
    resetZones()
  }
}

function resetZones() {
  zoneActive.value = ''
  nearDeleteId.value = ''
  nearCompleteId.value = ''
}

function flyToZone(note, zoneEl, action) {
  return new Promise((resolve) => {
    const zoneRect = zoneEl.getBoundingClientRect()
    const { width, height } = getNoteMetrics()
    flyingOffset.x = `${zoneRect.left + zoneRect.width / 2 - note.left - width / 2}px`
    flyingOffset.y = `${zoneRect.top + zoneRect.height / 2 - note.top - height / 2}px`
    flyingId.value = note.id
    window.clearTimeout(flyTimer)
    flyTimer = window.setTimeout(async () => {
      flyingId.value = ''
      await archiveNote(note, action)
      resolve()
    }, 400)
  })
}

function onPlayRandomAnimation() {
  if (!playRandomAnimation()) toast('请先创建便签', 'error')
}

async function organizeNotes() {
  stopAllMotion()
  organized.value = true
  const area = notesAreaRef.value
  if (!area) return

  const { width: noteWidth } = getNoteMetrics()
  const mobile = isMobileViewport()
  const margin = mobile ? 12 : 20
  const visiblePart = mobile ? 36 : 40
  const colsGap = mobile ? 12 : 20
  const areaHeight = area.offsetHeight
  const areaWidth = area.offsetWidth
  const maxPerCol = Math.max(1, Math.floor((areaHeight - margin) / visiblePart))
  const groups = { normal: [], important: [], urgent: [] }
  const nextZ = {}

  notes.value
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((note) => {
      const key = groups[note.priority] ? note.priority : 'normal'
      groups[key].push(note)
    })

  const maxCols = Math.max(1, Math.floor((areaWidth - margin) / (noteWidth + colsGap)))
  if (areaWidth < noteWidth * 3 + colsGap * 2 + margin * 2) {
    let cursor = 0
    function arrangeWrapped(list) {
      list.forEach((note) => {
        const col = cursor % maxCols
        const row = Math.floor(cursor / maxCols)
        note.left = margin + col * (noteWidth + colsGap)
        note.top = 20 + row * visiblePart
        nextZ[note.id] = row + 2
        cursor += 1
      })
    }
    arrangeWrapped(groups.normal)
    arrangeWrapped(groups.important)
    arrangeWrapped(groups.urgent)
  } else {
    function arrange(list, startX, priorityIndex) {
      list.forEach((note, index) => {
        const col = Math.floor(index / maxPerCol)
        const row = index % maxPerCol
        note.left = startX + col * (noteWidth + colsGap)
        note.top = 20 + row * visiblePart
        nextZ[note.id] = priorityIndex * 100 + row + 2
      })
      return Math.ceil(list.length / maxPerCol) || 0
    }
    const normalCols = arrange(groups.normal, margin, 0)
    const importantCols = arrange(groups.important, margin + (noteWidth + colsGap) * normalCols, 1)
    arrange(groups.urgent, margin + (noteWidth + colsGap) * (normalCols + importantCols), 2)
  }
  organizeZ.value = nextZ
  await saveNotes([...notes.value])
  touchActivity()
}

function clampNotesToArea() {
  const area = notesAreaRef.value
  if (!area) return false
  const { width, height } = getNoteMetrics()
  const maxX = Math.max(0, area.clientWidth - width)
  const maxY = Math.max(0, area.clientHeight - height)
  let changed = false
  notes.value.forEach((note) => {
    const left = Math.min(Math.max(0, note.left), maxX)
    const top = Math.min(Math.max(0, note.top), maxY)
    if (left !== note.left || top !== note.top) {
      note.left = left
      note.top = top
      changed = true
    }
  })
  return changed
}

function onResize() {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(async () => {
    if (clampNotesToArea()) await saveNotes([...notes.value])
  }, 200)
}

async function exportData() {
  await exportBackup()
}

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    await importBackup(file)
  } catch (error) {
    toast(`导入失败：${error.message}`, 'error')
  }
}

onMounted(async () => {
  await initNotes()
  startListening()
  clampNotesToArea()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.clearTimeout(flyTimer)
  window.clearTimeout(resizeTimer)
  stopListening()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
})
</script>

<style scoped>
.home-page {
  height: 100%;
  background: var(--page-bg);
  position: relative;
  overflow: hidden;
  user-select: none;
}

.notes-area {
  position: absolute;
  inset: 0 0 80px 0;
  padding: 20px;
  overflow: hidden;
}

.action-area {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 400;
}

.action-zone {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.action-zone.active {
  opacity: 1;
  transform: scale(1.3);
}

.delete-zone {
  background: rgba(255, 105, 97, 0.9);
  box-shadow: 0 4px 15px rgba(255, 105, 97, 0.4);
}

.complete-zone {
  background: rgba(97, 184, 255, 0.9);
  box-shadow: 0 4px 15px rgba(97, 184, 255, 0.4);
}

.action-zone i {
  font-size: 22px;
  color: white;
}

.bottom-buttons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  padding: 10px 20px;
  border-radius: 30px;
  box-shadow: var(--shadow-sm);
  z-index: 400;
  backdrop-filter: blur(5px);
}

.bottom-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.bottom-btn:hover {
  background: var(--surface);
  transform: translateY(-3px);
}

.note {
  position: absolute;
  width: 200px;
  min-height: 200px;
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 15px;
  cursor: move;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(5px);
  touch-action: none;
}

.note:hover {
  box-shadow: var(--shadow-md);
}

.note.active {
  box-shadow: var(--shadow-lg);
}

.note.near-delete {
  transform: scale(0.8);
  opacity: 0.8;
  border: 2px dashed rgba(255, 105, 97, 0.7);
}

.note.near-complete {
  transform: scale(0.8);
  opacity: 0.8;
  border: 2px dashed rgba(97, 184, 255, 0.7);
}

.note.flying {
  animation: flyToAction 0.4s ease forwards;
}

.note.color1 { background: rgba(255, 241, 118, 0.7); }
.note.color2 { background: rgba(255, 138, 128, 0.7); }
.note.color3 { background: rgba(128, 222, 234, 0.7); }
.note.color4 { background: rgba(255, 209, 220, 0.7); }
.note.color5 { background: rgba(204, 255, 144, 0.7); }
.note.color6 { background: rgba(255, 183, 77, 0.7); }
.note.color7 { background: rgba(179, 157, 219, 0.7); }
.note.color8 { background: rgba(255, 224, 178, 0.7); }

.organize-mode .note {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.organize-mode .note.color1 { background: rgb(255, 241, 118); }
.organize-mode .note.color2 { background: rgb(255, 138, 128); }
.organize-mode .note.color3 { background: rgb(128, 222, 234); }
.organize-mode .note.color4 { background: rgb(255, 209, 220); }
.organize-mode .note.color5 { background: rgb(204, 255, 144); }
.organize-mode .note.color6 { background: rgb(255, 183, 77); }
.organize-mode .note.color7 { background: rgb(179, 157, 219); }
.organize-mode .note.color8 { background: rgb(255, 224, 178); }

.ribbon {
  position: absolute;
  top: 10px;
  right: -30px;
  width: 100px;
  height: 30px;
  transform: rotate(45deg);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.ribbon.normal { background: #4caf50; }
.ribbon.important { background: #ff9800; }
.ribbon.urgent { background: #f44336; }

.note-title {
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-content {
  height: 140px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  overflow: hidden;
}

.note-title + .note-content {
  margin-top: 12px;
}

.note.flash {
  animation: flash 0.5s 2;
}

.note.anim-float { animation: float 2s ease-in-out infinite; }
.note.anim-shake { animation: shake 0.5s ease-in-out infinite; }
.note.anim-pulse { animation: pulse 1s ease-in-out infinite; }
.note.anim-swing { animation: swing 2s ease-in-out infinite; }
.note.anim-bounce { animation: bounce 1s ease-in-out infinite; }
.note.anim-wobble { animation: wobble 1s ease-in-out infinite; }
.note.anim-jiggle { animation: jiggle 0.5s ease-in-out infinite; }
.note.anim-flip { animation: flip 2s ease-in-out infinite; }
.note.anim-glow { animation: glow 1.5s ease-in-out infinite; }

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 14px;
  resize: vertical;
  background: var(--surface);
  color: var(--text-primary);
}

.color-options,
.priority-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-option,
.priority-option {
  border: 2px solid transparent;
  cursor: pointer;
}

.color-option {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.color-option.selected,
.priority-option.selected {
  border-color: var(--text-primary);
  transform: scale(1.08);
}

.color-option.color1 { background: rgba(255, 241, 118, 0.7); }
.color-option.color2 { background: rgba(255, 138, 128, 0.7); }
.color-option.color3 { background: rgba(128, 222, 234, 0.7); }
.color-option.color4 { background: rgba(255, 209, 220, 0.7); }
.color-option.color5 { background: rgba(204, 255, 144, 0.7); }
.color-option.color6 { background: rgba(255, 183, 77, 0.7); }
.color-option.color7 { background: rgba(179, 157, 219, 0.7); }
.color-option.color8 { background: rgba(255, 224, 178, 0.7); }

.priority-option {
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.priority-option.normal { background: #4caf50; }
.priority-option.important { background: #ff9800; }
.priority-option.urgent { background: #f44336; }

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary { background: #2196f3; color: white; }
.btn-secondary { background: var(--btn-muted-bg); color: var(--text-primary); }

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes flyToAction {
  to {
    transform: translate(var(--end-x), var(--end-y)) scale(0.2);
    opacity: 0;
  }
}

@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-10px); } 75% { transform: translateY(-5px); } }
@keyframes wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
@keyframes jiggle { 0%, 100% { transform: skewX(0deg); } 25% { transform: skewX(-5deg); } 75% { transform: skewX(5deg); } }
@keyframes flip { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg); } }
@keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(255,255,255,0.5); } 50% { box-shadow: 0 0 20px rgba(255,255,255,0.9); } }

@media (max-width: 768px) {
  .notes-area {
    inset: 0 0 72px 0;
    padding: 12px;
  }

  .action-area {
    top: 12px;
    right: 12px;
    gap: 10px;
  }

  .action-zone {
    width: 44px;
    height: 44px;
  }

  .bottom-buttons {
    left: 12px;
    right: 72px;
    transform: none;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
    padding: 8px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .bottom-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
    justify-content: center;
    gap: 0;
  }

  .bottom-btn span {
    display: none;
  }

  .note {
    width: 156px;
    min-height: 168px;
    padding: 12px;
  }

  .note-content {
    height: 110px;
    font-size: 13px;
  }

  .ribbon {
    font-size: 10px;
    width: 90px;
    right: -28px;
  }

  .form-control,
  .btn {
    font-size: 16px;
    min-height: 44px;
  }

  .color-option {
    width: 36px;
    height: 36px;
  }

  .priority-option {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>

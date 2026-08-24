<template>
  <div ref="splitRef" class="split-editor">
    <div class="split-pane" :style="{ flex: leftFlex }">
      <slot name="left" />
    </div>
    <div
      class="gutter"
      :class="{ dragging }"
      @pointerdown.prevent="startDrag"
    ></div>
    <div class="split-pane" :style="{ flex: rightFlex }">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'

const splitRef = ref(null)
const leftFlex = ref(1)
const rightFlex = ref(1)
const dragging = ref(false)

let startPos = 0
let startLeft = 1
let startRight = 1

function isVertical() {
  return Boolean(splitRef.value && getComputedStyle(splitRef.value).flexDirection === 'column')
}

function startDrag(event) {
  if (event.button != null && event.button !== 0) return
  dragging.value = true
  startPos = isVertical() ? event.clientY : event.clientX
  startLeft = leftFlex.value
  startRight = rightFlex.value
  document.body.classList.add('no-select')
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', stopDrag)
}

function onMove(event) {
  if (!dragging.value || !splitRef.value) return
  const vertical = isVertical()
  const delta = (vertical ? event.clientY : event.clientX) - startPos
  const size = (vertical ? splitRef.value.offsetHeight : splitRef.value.offsetWidth) || 1
  const total = startLeft + startRight
  let nextLeft = startLeft + (delta / size) * total
  let nextRight = startRight - (delta / size) * total
  const min = 0.25
  if (nextLeft < min) {
    nextLeft = min
    nextRight = total - min
  }
  if (nextRight < min) {
    nextRight = min
    nextLeft = total - min
  }
  leftFlex.value = nextLeft
  rightFlex.value = nextRight
}

function stopDrag() {
  dragging.value = false
  document.body.classList.remove('no-select')
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', stopDrag)
}

onBeforeUnmount(stopDrag)
</script>

<style scoped>
.split-editor {
  display: flex;
  height: 100%;
  width: 100%;
}

.split-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.gutter {
  width: 8px;
  background: #1e1f3a;
  cursor: col-resize;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.gutter::after {
  content: '';
  width: 3px;
  height: 40px;
  background: #3a3b6e;
  border-radius: 2px;
}

.gutter:hover,
.gutter.dragging {
  background: #a78bfa;
}

.gutter:hover::after,
.gutter.dragging::after {
  background: white;
}

@media (max-width: 768px) {
  .split-editor {
    flex-direction: column;
  }

  .gutter {
    width: 100%;
    height: 16px;
    cursor: row-resize;
  }

  .gutter::after {
    width: 40px;
    height: 3px;
  }
}
</style>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="app-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="onOverlay"
    >
      <div ref="panelRef" class="modal-content">
        <div :id="titleId" class="modal-header">
          <slot name="title">{{ title }}</slot>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  closeOnOverlay: { type: Boolean, default: true }
})

const open = defineModel({ type: Boolean, default: false })
const panelRef = ref(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`
let lastFocus = null
let openedAt = 0

function close() {
  open.value = false
}

function onOverlay() {
  if (!props.closeOnOverlay) return
  if (Date.now() - openedAt < 700) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close()
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    openedAt = Date.now()
    lastFocus = document.activeElement
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    const focusable = panelRef.value?.querySelector(
      'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
    return
  }
  document.removeEventListener('keydown', onKeydown)
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.app-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: var(--surface);
  color: var(--text-primary);
  padding: 30px;
  border-radius: 12px;
  width: 420px;
  max-width: 92%;
  max-height: 85vh;
  max-height: 85dvh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: modalFadeIn 0.25s ease;
}

@media (max-width: 768px) {
  .app-modal {
    align-items: flex-end;
  }

  .modal-content {
    width: 100%;
    max-width: 100%;
    max-height: min(92vh, 92dvh);
    border-radius: 16px 16px 0 0;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .modal-footer {
    flex-wrap: wrap;
  }

  .modal-footer :deep(button) {
    min-height: 44px;
    font-size: 16px;
  }
}

.modal-header {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

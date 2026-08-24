<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-relevant="additions">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="item.type">
        {{ item.message }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useFeedback } from '@/composables/useFeedback'

const { toasts } = useFeedback()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 420px);
  padding: 0 8px;
  z-index: 1400;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  min-width: 220px;
  max-width: 80vw;
  padding: 10px 16px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  text-align: center;
  white-space: pre-line;
  box-shadow: var(--shadow-md);
  background: #455a64;
}

.toast.success {
  background: #2e7d32;
}

.toast.error {
  background: #c62828;
}

.toast.info {
  background: #1565c0;
}
</style>

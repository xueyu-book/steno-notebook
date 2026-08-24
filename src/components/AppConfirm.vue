<template>
  <AppModal v-model="visible" :title="confirmState?.title || '请确认'" :close-on-overlay="false">
    <p class="confirm-message">{{ confirmState?.message }}</p>
    <template #footer>
      <button class="btn btn-secondary" type="button" @click="resolveConfirm(false)">取消</button>
      <button class="btn btn-primary" type="button" @click="resolveConfirm(true)">确定</button>
    </template>
  </AppModal>
</template>

<script setup>
import { computed } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { useFeedback } from '@/composables/useFeedback'

const { confirmState, resolveConfirm } = useFeedback()

const visible = computed({
  get: () => Boolean(confirmState.value),
  set: (open) => {
    if (!open) resolveConfirm(false)
  }
})
</script>

<style scoped>
.confirm-message {
  white-space: pre-line;
  line-height: 1.6;
  color: var(--text-secondary);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--btn-muted-bg);
  color: var(--text-primary);
}
</style>

import { ref } from 'vue'

const toasts = ref([])
const confirmState = ref(null)

let toastSeq = 0
const TOAST_DURATION = 2800

export function toast(message, type = 'info') {
  const id = ++toastSeq
  toasts.value = [...toasts.value, { id, message: String(message), type }]
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }, TOAST_DURATION)
}

export function confirmAction(message, title = '请确认') {
  if (confirmState.value) {
    confirmState.value.resolve(false)
    confirmState.value = null
  }
  return new Promise((resolve) => {
    confirmState.value = { message: String(message), title, resolve }
  })
}

export function resolveConfirm(ok) {
  if (!confirmState.value) return
  const { resolve } = confirmState.value
  confirmState.value = null
  resolve(Boolean(ok))
}

export function useFeedback() {
  return {
    toasts,
    confirmState,
    toast,
    confirmAction,
    resolveConfirm
  }
}

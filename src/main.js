import { createApp } from 'vue'
import '@fortawesome/fontawesome-free/css/all.min.css'
import App from './App.vue'
import router from '@/router'
import { openDB, migrateFromLocalStorage, isMemoryFallback } from '@/utils/idb'
import { useSettings } from '@/composables/useSettings'
import { toast } from '@/composables/useFeedback'
import '@/styles/global.css'

function showBootError(message) {
  const root = document.getElementById('app')
  if (!root) return
  root.textContent = ''
  const box = document.createElement('div')
  box.className = 'boot-error'
  box.textContent = message
  root.appendChild(box)
}

async function bootstrap() {
  try {
    await openDB()
    await migrateFromLocalStorage()
    const { initSettings } = useSettings()
    await initSettings()

    const app = createApp(App)
    app.use(router)
    app.mount('#app')

    if (isMemoryFallback()) {
      toast('当前浏览器无法使用本地数据库，数据仅保存在本次会话中。', 'error')
    }
  } catch (error) {
    console.error(error)
    showBootError('应用启动失败，请检查浏览器是否支持 IndexedDB，或关闭无痕模式后重试。')
  }
}

bootstrap()

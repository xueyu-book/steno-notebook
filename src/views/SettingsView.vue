<template>
  <div class="settings-page">
    <h1>系统设置</h1>
    <div class="settings-box">
      <div class="setting-row">
        <span>夜间模式</span>
        <label class="switch">
          <input type="checkbox" :checked="settings.nightMode" @change="toggle('nightMode', $event)" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <span>消息通知</span>
        <label class="switch">
          <input type="checkbox" :checked="settings.notifications" @change="toggle('notifications', $event)" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <span>自动更新</span>
        <label class="switch">
          <input type="checkbox" :checked="settings.autoUpdate" @change="toggle('autoUpdate', $event)" />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettings } from '@/composables/useSettings'

const { settings, initSettings, updateSettings } = useSettings()

onMounted(() => initSettings())

function toggle(key, event) {
  updateSettings({ [key]: event.target.checked })
}
</script>

<style scoped>
.settings-page {
  height: 100%;
  overflow: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text-primary);
}

h1 {
  color: #56f596;
  margin-bottom: 2rem;
  font-size: 2.4rem;
  font-weight: 300;
}

.settings-box {
  width: 80%;
  max-width: 500px;
}

.setting-row {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background: #56f596;
}

input:checked + .slider::before {
  transform: translateX(26px);
}

@media (max-width: 768px) {
  .settings-page {
    padding: 1.25rem 1.25rem 5.5rem;
    justify-content: flex-start;
  }

  h1 {
    font-size: 1.7rem;
    margin: 1.5rem 0;
  }

  .settings-box {
    width: 100%;
  }

  .setting-row {
    min-height: 48px;
  }
}
</style>

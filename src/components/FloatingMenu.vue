<template>
  <div class="floating-menu" :class="{ active: open }" @click.stop>
    <button
      class="main-button"
      type="button"
      aria-label="打开导航菜单"
      :aria-expanded="open"
      @click="open = !open"
    >
      <i class="fas fa-bars" aria-hidden="true"></i>
    </button>
    <div class="menu-items">
      <button
        v-for="item in items"
        :key="item.path"
        class="menu-item"
        type="button"
        :aria-label="item.label"
        :aria-current="route.path === item.path ? 'page' : undefined"
        @click="go(item.path)"
      >
        <i :class="item.icon" aria-hidden="true"></i>
        <span class="tooltip">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const open = ref(false)

const items = [
  { path: '/', label: '首页', icon: 'fas fa-home' },
  { path: '/tools', label: '工具', icon: 'fas fa-toolbox' },
  { path: '/settings', label: '设置', icon: 'fas fa-cog' },
  { path: '/profile', label: '个人中心', icon: 'fas fa-user' },
  { path: '/websites', label: '网站', icon: 'fas fa-globe' }
]

function go(path) {
  open.value = false
  if (route.path !== path) router.push(path)
}

function onDocumentClick() {
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="app-root">
    <div v-if="showLoader" class="loader-container" :style="{ opacity: loaderOpacity }">
      <div class="loader"></div>
      <p>加载中...</p>
    </div>

    <router-view v-slot="{ Component }">
      <transition name="page-view" mode="out-in">
        <component :is="Component" class="page-view" />
      </transition>
    </router-view>

    <FloatingMenu />
    <AppToast />
    <AppConfirm />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FloatingMenu from '@/components/FloatingMenu.vue'
import AppToast from '@/components/AppToast.vue'
import AppConfirm from '@/components/AppConfirm.vue'

const router = useRouter()
const showLoader = ref(true)
const loaderOpacity = ref(1)
let hideTimer = 0

function hideLoader() {
  loaderOpacity.value = 0
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    showLoader.value = false
    loaderOpacity.value = 1
  }, 400)
}

const removeBefore = router.beforeEach((to, from) => {
  if (to.path !== from.path && from.matched.length) {
    showLoader.value = true
    loaderOpacity.value = 1
  }
})

const removeAfter = router.afterEach(() => {
  if (showLoader.value) hideLoader()
})

onMounted(hideLoader)

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer)
  removeBefore()
  removeAfter()
})
</script>

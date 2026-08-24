import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/tools', name: 'tools', component: () => import('@/views/ToolsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/websites', name: 'websites', component: () => import('@/views/WebsitesView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router

<template>
  <div class="websites-page">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="fas fa-globe"></i> 常用网站</h1>
        <span class="site-count">{{ websites.length }} 个书签</span>
      </div>
      <div class="header-actions">
        <button class="header-btn" type="button" @click="groupModal = true">
          <i class="fas fa-folder"></i> 管理分组
        </button>
        <button class="header-btn" type="button" @click="exportData">
          <i class="fas fa-download"></i> 导出
        </button>
        <button class="header-btn" type="button" @click="importInput?.click()">
          <i class="fas fa-upload"></i> 导入
        </button>
        <input ref="importInput" type="file" accept=".json" hidden @change="importData" />
        <button class="header-btn primary" type="button" @click="openCreate">
          <i class="fas fa-plus"></i> 添加网站
        </button>
      </div>
    </div>

    <div class="content">
      <div class="group-tabs">
        <button class="group-tab" :class="{ active: groupFilter === '__all__' }" type="button" @click="groupFilter = '__all__'">
          全部<span class="group-count">{{ websites.length }}</span>
        </button>
        <button class="group-tab" :class="{ active: groupFilter === '__ungrouped__' }" type="button" @click="groupFilter = '__ungrouped__'">
          未分组<span class="group-count">{{ ungroupedCount }}</span>
        </button>
        <button
          v-for="group in sortedGroups"
          :key="group"
          class="group-tab"
          :class="{ active: groupFilter === group }"
          type="button"
          @click="groupFilter = group"
        >
          {{ group }}<span class="group-count">{{ countByGroup(group) }}</span>
        </button>
      </div>
      <div class="search-bar">
        <input v-model="keyword" type="text" placeholder="搜索网站名称或网址..." />
      </div>
      <div class="site-grid">
        <div v-if="!filteredSites.length" class="empty">
          <i class="fas fa-bookmark"></i>
          {{ keyword ? '没有匹配的书签' : '暂无书签，点击上方按钮添加' }}
        </div>
        <div v-for="site in filteredSites" :key="site.id" class="site-card">
          <div class="site-icon" :style="{ background: site.color }">
            <i class="fas fa-link"></i>
          </div>
          <div class="site-info">
            <span class="site-title">{{ site.title }}</span>
            <span class="site-url">{{ site.url }}</span>
          </div>
          <div class="site-actions">
            <button class="site-action-btn btn-open" type="button" title="打开" @click="openSite(site)">
              <i class="fas fa-external-link-alt"></i>
            </button>
            <button class="site-action-btn btn-edit" type="button" title="编辑" @click="openEdit(site)">
              <i class="fas fa-pen"></i>
            </button>
            <button class="site-action-btn btn-delete" type="button" title="删除" @click="removeSite(site)">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppModal v-model="siteModal" :title="editingId ? '编辑网站' : '添加网站'">
      <div class="form-group">
        <label>网站名称 *</label>
        <input v-model="form.title" maxlength="30" placeholder="例如：GitHub" />
      </div>
      <div class="form-group">
        <label>网址 *</label>
        <input v-model="form.url" placeholder="例如：https://github.com" />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="form.desc" maxlength="60" placeholder="简短描述这个网站..."></textarea>
      </div>
      <div class="form-group">
        <label>分组</label>
        <select v-model="form.group">
          <option value="">未分组</option>
          <option v-for="group in sortedGroups" :key="group" :value="group">{{ group }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>图标颜色</label>
        <div class="color-options">
          <button
            v-for="color in colors"
            :key="color"
            type="button"
            class="color-dot"
            :class="{ selected: form.color === color }"
            :style="{ background: color }"
            :aria-label="color"
            @click="form.color = color"
          ></button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-cancel" type="button" @click="siteModal = false">取消</button>
        <button class="btn btn-primary" type="button" @click="saveSite">保存</button>
      </template>
    </AppModal>

    <AppModal v-model="groupModal" title="管理分组">
      <div class="add-group">
        <input v-model="newGroupName" maxlength="20" placeholder="输入新分组名称..." @keydown.enter="addGroup" />
        <button class="btn btn-primary" type="button" @click="addGroup">添加</button>
      </div>
      <div class="group-list">
        <div v-if="!sortedGroups.length" class="empty-groups">暂无分组，请添加</div>
        <div v-for="group in sortedGroups" :key="group" class="group-list-item">
          <span>{{ group }}</span>
          <span class="gcount">{{ countByGroup(group) }} 个</span>
          <button class="gdel" type="button" @click="deleteGroup(group)">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-cancel" type="button" @click="groupModal = false">关闭</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { WEBSITE_COLORS } from '@/constants/websites'
import { useWebsites } from '@/composables/useWebsites'
import { confirmAction, toast } from '@/composables/useFeedback'
import { asArray, downloadJson, ensureHttpUrl, generateId, openExternalUrl, readJsonFile, todayKey } from '@/utils/helpers'

const colors = WEBSITE_COLORS
const { websites, websiteGroups, initWebsites, saveWebsites } = useWebsites()
const importInput = ref(null)
const groupFilter = ref('__all__')
const keyword = ref('')
const siteModal = ref(false)
const groupModal = ref(false)
const editingId = ref('')
const newGroupName = ref('')
const form = reactive({ title: '', url: '', desc: '', group: '', color: '#667eea' })

const sortedGroups = computed(() => [...websiteGroups.value].sort())
const ungroupedCount = computed(() => websites.value.filter((site) => !site.group).length)

const filteredSites = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return [...websites.value]
    .filter((site) => {
      if (groupFilter.value === '__ungrouped__' && site.group) return false
      if (groupFilter.value !== '__all__' && groupFilter.value !== '__ungrouped__' && site.group !== groupFilter.value) return false
      if (!key) return true
      return [site.title, site.url, site.desc].some((value) => (value || '').toLowerCase().includes(key))
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

function countByGroup(group) {
  return websites.value.filter((site) => site.group === group).length
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    title: '',
    url: '',
    desc: '',
    group: groupFilter.value !== '__all__' && groupFilter.value !== '__ungrouped__' ? groupFilter.value : '',
    color: '#667eea'
  })
  siteModal.value = true
}

function openEdit(site) {
  editingId.value = site.id
  Object.assign(form, {
    title: site.title,
    url: site.url,
    desc: site.desc || '',
    group: site.group || '',
    color: site.color
  })
  siteModal.value = true
}

async function saveSite() {
  const title = form.title.trim()
  const url = ensureHttpUrl(form.url)
  if (!title) {
    toast('请输入网站名称', 'error')
    return
  }
  if (!url) {
    toast('请输入有效网址', 'error')
    return
  }
  let next = [...websites.value]
  if (editingId.value) {
    next = next.map((site) =>
      site.id === editingId.value
        ? { ...site, title, url, desc: form.desc.trim(), group: form.group, color: form.color }
        : site
    )
  } else {
    next.push({
      id: generateId(),
      title,
      url,
      desc: form.desc.trim(),
      group: form.group,
      color: form.color,
      createdAt: new Date().toISOString()
    })
  }
  await saveWebsites(next)
  siteModal.value = false
}

async function removeSite(site) {
  if (!(await confirmAction(`确定删除书签「${site.title}」吗？`, '删除书签'))) return
  await saveWebsites(websites.value.filter((item) => item.id !== site.id))
}

function openSite(site) {
  if (!openExternalUrl(site.url)) toast('无效的网址', 'error')
}

async function addGroup() {
  const name = newGroupName.value.trim()
  if (!name) {
    toast('请输入分组名称', 'error')
    return
  }
  if (websiteGroups.value.includes(name)) {
    toast('该分组已存在', 'error')
    return
  }
  await saveWebsites(null, [...websiteGroups.value, name])
  newGroupName.value = ''
}

async function deleteGroup(group) {
  if (!(await confirmAction(`确定删除分组「${group}」吗？组内网站将变为未分组。`, '删除分组'))) return
  const nextSites = websites.value.map((site) => (site.group === group ? { ...site, group: '' } : site))
  await saveWebsites(nextSites, websiteGroups.value.filter((item) => item !== group))
  if (groupFilter.value === group) groupFilter.value = '__all__'
}

function exportData() {
  downloadJson(`网站书签_${todayKey()}.json`, {
    websites: websites.value,
    websiteGroups: websiteGroups.value
  })
}

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const data = await readJsonFile(file)
    if (!Array.isArray(data.websites)) {
      toast('无效的网站书签文件。', 'error')
      return
    }
    if (!(await confirmAction(`即将导入 ${data.websites.length} 个书签，当前数据将被覆盖，确定吗？`, '导入书签'))) {
      return
    }
    await saveWebsites(data.websites, asArray(data.websiteGroups).length ? data.websiteGroups : websiteGroups.value)
    groupFilter.value = '__all__'
    toast('导入成功')
  } catch (error) {
    toast(`导入失败：${error.message}`, 'error')
  }
}

onMounted(() => initWebsites())
</script>

<style scoped>
.websites-page {
  height: 100%;
  overflow: auto;
  background: var(--page-bg);
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.8rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-left, .header-actions { display: flex; align-items: center; gap: 1rem; }
.page-header h1 { font-size: 1.4rem; }
.site-count { font-size: 0.82rem; opacity: 0.8; }

.header-btn {
  padding: 7px 16px;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 20px;
  background: rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
}

.header-btn.primary {
  background: rgba(255,255,255,0.9);
  color: #667eea;
  border: none;
  font-weight: 600;
}

.content { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.group-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
.group-tab {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}
.group-tab.active { background: #667eea; border-color: #667eea; color: white; }
.group-count { margin-left: 6px; font-size: 0.7rem; }

.search-bar input {
  width: 100%;
  max-width: 400px;
  padding: 10px 16px;
  border: 2px solid var(--border-color);
  border-radius: 25px;
  outline: none;
  margin-bottom: 1.5rem;
  background: var(--surface);
  color: var(--text-primary);
}

.site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.site-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: var(--shadow-sm);
}

.site-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.site-info { min-width: 0; flex: 1; }
.site-title, .site-url { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.site-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
.site-url { font-size: 0.72rem; color: var(--text-muted); }

.site-actions { display: flex; gap: 4px; }
.site-action-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-open { background: #e8f0fe; color: #1a73e8; }
.btn-edit { background: var(--btn-muted-bg); color: var(--text-secondary); }
.btn-delete { background: var(--btn-muted-bg); color: var(--text-muted); }

.empty { grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 0; }
.empty i { display: block; font-size: 3rem; margin-bottom: 1rem; color: var(--border-color); }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 6px; font-size: 0.88rem; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  background: var(--surface);
  color: var(--text-primary);
}
.color-options { display: flex; gap: 8px; flex-wrap: wrap; }
.color-dot { width: 32px; height: 32px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; }
.color-dot.selected { border-color: var(--text-primary); transform: scale(1.1); }

.add-group { display: flex; gap: 8px; margin-bottom: 1rem; }
.add-group input { flex: 1; padding: 9px 12px; border: 1.5px solid var(--border-color); border-radius: 8px; background: var(--surface); color: var(--text-primary); }
.group-list-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.gcount { margin-left: auto; color: var(--text-muted); font-size: 0.75rem; }
.gdel { border: none; background: none; color: var(--text-muted); cursor: pointer; }
.empty-groups { text-align: center; color: var(--text-muted); padding: 1.5rem 0; }

.btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #667eea; color: white; }
.btn-cancel { background: var(--btn-muted-bg); color: var(--text-secondary); }

@media (max-width: 768px) {
  .page-header { padding: 0.8rem 1rem; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .header-btn { min-height: 40px; }
  .content { padding: 1rem 1rem 5rem; }
  .site-grid { grid-template-columns: 1fr; }
  .site-action-btn { width: 36px; height: 36px; }
  .search-bar input { max-width: none; font-size: 16px; }
  .add-group { flex-direction: column; }
}
</style>

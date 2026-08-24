<template>
  <div class="profile-page">
    <div class="page-header">
      <h1><i class="fas fa-user-circle"></i> 个人中心</h1>
      <div class="header-actions">
        <button class="header-btn" type="button" @click="exportData">
          <i class="fas fa-download"></i> 导出数据
        </button>
        <button class="header-btn" type="button" @click="importInput?.click()">
          <i class="fas fa-upload"></i> 导入数据
        </button>
        <input ref="importInput" type="file" accept=".json" hidden @change="importData" />
      </div>
    </div>

    <div class="content">
      <div class="stats-cards">
        <div class="stat-card create">
          <div class="stat-number">{{ totals.created }}</div>
          <div class="stat-label">累计创建</div>
        </div>
        <div class="stat-card complete">
          <div class="stat-number">{{ totals.completed }}</div>
          <div class="stat-label">累计完成</div>
        </div>
        <div class="stat-card delete">
          <div class="stat-number">{{ totals.deleted }}</div>
          <div class="stat-label">累计删除</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><i class="fas fa-chart-bar"></i> 每日统计直方图</div>
        <div class="chart-wrap">
          <canvas ref="chartRef"></canvas>
        </div>
        <div v-if="!chartDates.length" class="empty">暂无统计数据</div>
      </div>

      <div class="section">
        <div class="section-title"><i class="fas fa-history"></i> 便签记录</div>
        <div class="filter-bar">
          <input v-model="filters.keyword" type="text" placeholder="搜索便签内容..." @keydown.enter="applyFilter" />
          <span>创建:</span>
          <input v-model="filters.createFrom" type="date" />
          <span>至</span>
          <input v-model="filters.createTo" type="date" />
          <span>操作:</span>
          <input v-model="filters.actionFrom" type="date" />
          <span>至</span>
          <input v-model="filters.actionTo" type="date" />
          <button class="btn-sm search" type="button" @click="applyFilter">查询</button>
          <button class="btn-sm" type="button" @click="resetFilter">重置</button>
        </div>
        <div class="batch-bar">
          <input type="checkbox" :checked="allChecked" @change="toggleAll" />
          <span>已选 <b>{{ selectedIds.length }}</b> 条</span>
          <button class="batch-delete" type="button" :disabled="!selectedIds.length" @click="batchDelete">批量删除</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>便签内容</th>
                <th>优先级</th>
                <th>操作</th>
                <th>创建时间</th>
                <th>操作时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in pageRecords" :key="record.id">
                <td><input v-model="selectedIds" type="checkbox" :value="record.id" /></td>
                <td data-label="便签内容" class="content-cell" @click="viewRecord(record)">{{ preview(record.content) }}</td>
                <td data-label="优先级">
                  <span class="priority-dot" :class="record.priority"></span>
                  {{ getPriorityLabel(record.priority) }}
                </td>
                <td data-label="操作">
                  <span class="action-badge" :class="record.action">{{ getActionLabel(record.action) }}</span>
                </td>
                <td data-label="创建时间">{{ formatDateTime(record.createdAt) }}</td>
                <td data-label="操作时间">{{ formatDateTime(record.actionTime) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!filteredRecords.length" class="empty">暂无便签操作记录</div>
        <div v-else class="pagination">
          <button :disabled="page === 1" type="button" @click="page = 1">«</button>
          <button :disabled="page === 1" type="button" @click="page--">‹</button>
          <button
            v-for="num in pageNumbers"
            :key="num"
            type="button"
            :class="{ active: num === page }"
            @click="page = num"
          >
            {{ num }}
          </button>
          <button :disabled="page === totalPages" type="button" @click="page++">›</button>
          <button :disabled="page === totalPages" type="button" @click="page = totalPages">»</button>
          <span>第 {{ page }}/{{ totalPages }} 页，共 {{ filteredRecords.length }} 条</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><i class="fas fa-calendar-week"></i> 周报整理</div>
        <div class="week-bar">
          <span>选择周：</span>
          <input v-model="weekValue" type="week" />
          <button class="btn-sm search" type="button" @click="generateReport">生成周报</button>
          <button class="btn-sm ai" type="button" :disabled="aiLoading" @click="generateAiReport">
            {{ aiLoading ? 'AI 生成中...' : 'AI 生成周报' }}
          </button>
          <button class="btn-sm" type="button" @click="aiModal = true">AI 设置</button>
          <button v-if="reportText" class="btn-sm" type="button" @click="copyReport">复制</button>
        </div>
        <div v-if="reportHtml" class="week-output rendered" v-html="reportHtml"></div>
        <div v-else class="week-output">{{ reportText }}</div>
      </div>
    </div>

    <AppModal v-model="detailModal" title="便签详情">
      <div class="detail-body">{{ detailRecord?.content }}</div>
      <div class="detail-meta" v-if="detailRecord">
        <span>{{ getPriorityLabel(detailRecord.priority) }}</span>
        <span>{{ getActionLabel(detailRecord.action) }}</span>
        <span>创建于 {{ formatDateTime(detailRecord.createdAt) }}</span>
        <span>操作于 {{ formatDateTime(detailRecord.actionTime) }}</span>
      </div>
      <template #footer>
        <button class="btn-sm" type="button" @click="detailModal = false">关闭</button>
      </template>
    </AppModal>

    <AppModal v-model="aiModal" title="AI 周报设置">
      <div class="form-group">
        <label>OpenAI 兼容 API 地址</label>
        <input v-model="aiForm.apiUrl" placeholder="https://api.openai.com/v1" />
      </div>
      <div class="form-group">
        <label>API Key</label>
        <input v-model="aiForm.apiKey" type="password" placeholder="sk-..." />
      </div>
      <div class="form-group">
        <label>模型名称</label>
        <input v-model="aiForm.model" placeholder="gpt-3.5-turbo" />
      </div>
      <div class="form-group">
        <label>AI 周报提示词</label>
        <textarea v-model="aiForm.prompt" rows="8"></textarea>
        <div class="presets">
          <button type="button" @click="aiForm.prompt = DEFAULT_AI_PROMPTS.default">默认模板</button>
          <button type="button" @click="aiForm.prompt = DEFAULT_AI_PROMPTS.concise">简洁版</button>
          <button type="button" @click="aiForm.prompt = DEFAULT_AI_PROMPTS.detailed">详细版</button>
        </div>
      </div>
      <template #footer>
        <button class="btn-sm" type="button" @click="aiModal = false">取消</button>
        <button class="btn-sm search" type="button" @click="saveAi">保存设置</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import AppModal from '@/components/AppModal.vue'
import { useNotes } from '@/composables/useNotes'
import { DEFAULT_AI_PROMPTS, useAiConfig } from '@/composables/useAiConfig'
import { useAppBackup } from '@/composables/useAppBackup'
import { confirmAction, toast } from '@/composables/useFeedback'
import { copyText, formatDateTime, getActionLabel, getISOWeekValue, getPriorityLabel, getWeekRange, todayKey, toLocalDateKey } from '@/utils/helpers'
import { renderMarkdown } from '@/utils/markdown'

const PAGE_SIZE = 20
const { notes, noteRecords, noteStats, initNotes, deleteRecords } = useNotes()
const { aiConfig, initAiConfig, saveAiConfig } = useAiConfig()
const { exportBackup, importBackup } = useAppBackup()

const importInput = ref(null)
const chartRef = ref(null)
const page = ref(1)
const selectedIds = ref([])
const detailModal = ref(false)
const detailRecord = ref(null)
const aiModal = ref(false)
const aiLoading = ref(false)
const weekValue = ref(getISOWeekValue())
const reportText = ref('')
const reportHtml = ref('')
const filters = reactive({ keyword: '', createFrom: '', createTo: '', actionFrom: '', actionTo: '' })
const applied = reactive({ ...filters })
const aiForm = reactive({ apiUrl: '', apiKey: '', model: 'gpt-3.5-turbo', prompt: DEFAULT_AI_PROMPTS.default })

let chart = null
let abortController = null

const totals = computed(() => {
  return Object.values(noteStats.value).reduce(
    (sum, day) => ({
      created: sum.created + (day.created || 0),
      completed: sum.completed + (day.completed || 0),
      deleted: sum.deleted + (day.deleted || 0)
    }),
    { created: 0, completed: 0, deleted: 0 }
  )
})

const chartDates = computed(() => Object.keys(noteStats.value).sort())

const filteredRecords = computed(() => {
  return [...noteRecords.value]
    .filter((record) => {
      if (applied.keyword && !(record.content || '').includes(applied.keyword)) return false
      const created = toLocalDateKey(record.createdAt)
      const acted = toLocalDateKey(record.actionTime)
      if (applied.createFrom && created < applied.createFrom) return false
      if (applied.createTo && created > applied.createTo) return false
      if (applied.actionFrom && acted < applied.actionFrom) return false
      if (applied.actionTo && acted > applied.actionTo) return false
      return true
    })
    .sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / PAGE_SIZE)))
const pageRecords = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredRecords.value.slice(start, start + PAGE_SIZE)
})
const pageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.max(1, page.value - 2)
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
const allChecked = computed(
  () => Boolean(pageRecords.value.length) && pageRecords.value.every((record) => selectedIds.value.includes(record.id))
)

function preview(content) {
  const text = content || ''
  return text.length > 20 ? `${text.slice(0, 20)}...` : text
}

function applyFilter() {
  Object.assign(applied, filters)
  page.value = 1
}

function resetFilter() {
  Object.assign(filters, { keyword: '', createFrom: '', createTo: '', actionFrom: '', actionTo: '' })
  applyFilter()
}

function toggleAll(event) {
  if (event.target.checked) {
    selectedIds.value = [...new Set([...selectedIds.value, ...pageRecords.value.map((record) => record.id)])]
  } else {
    const pageIds = new Set(pageRecords.value.map((record) => record.id))
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) return
  if (!(await confirmAction(`确定删除选中的 ${selectedIds.value.length} 条记录吗？此操作不可恢复。`, '批量删除'))) {
    return
  }
  await deleteRecords(selectedIds.value)
  selectedIds.value = []
}

function viewRecord(record) {
  detailRecord.value = record
  detailModal.value = true
}

function renderChart() {
  if (!chartRef.value) return
  const dates = chartDates.value
  if (chart) chart.destroy()
  if (!dates.length) return
  chart = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        { label: '创建', data: dates.map((d) => noteStats.value[d].created || 0), backgroundColor: 'rgba(76, 175, 80, 0.7)' },
        { label: '完成', data: dates.map((d) => noteStats.value[d].completed || 0), backgroundColor: 'rgba(97, 184, 255, 0.7)' },
        { label: '删除', data: dates.map((d) => noteStats.value[d].deleted || 0), backgroundColor: 'rgba(255, 105, 97, 0.7)' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  })
}

function weekData() {
  const range = getWeekRange(weekValue.value)
  if (!range) return null
  const start = todayKey(range.start)
  const end = todayKey(range.end)
  const completed = noteRecords.value.filter((record) => {
    const day = toLocalDateKey(record.actionTime)
    return record.action === 'complete' && day >= start && day <= end
  })
  const created = [...notes.value, ...noteRecords.value].filter((item) => {
    const day = toLocalDateKey(item.createdAt)
    return day >= start && day <= end
  })
  return { start, end, completed, created, active: notes.value }
}

function generateReport() {
  const data = weekData()
  if (!data) {
    toast('请先选择一周。', 'error')
    return
  }
  const line = (item, extra) => `  - [${getPriorityLabel(item.priority)}] ${item.content}${extra}`
  reportHtml.value = ''
  reportText.value = [
    `工作周报  ${data.start} ~ ${data.end}`,
    '',
    `【一、本周已完成】 共 ${data.completed.length} 项`,
    ...(data.completed.length ? data.completed.map((item) => line(item, `  完成时间：${formatDateTime(item.actionTime)}`)) : ['  无']),
    '',
    `【二、本周新增】 共 ${data.created.length} 项`,
    ...(data.created.length ? data.created.map((item) => line(item, `  创建时间：${formatDateTime(item.createdAt)}`)) : ['  无']),
    '',
    `【三、下周计划】 共 ${data.active.length} 项`,
    ...(data.active.length ? data.active.map((item) => line(item, '')) : ['  暂无计划'])
  ].join('\n')
}

async function generateAiReport() {
  const data = weekData()
  if (!data) {
    toast('请先选择一周。', 'error')
    return
  }
  await initAiConfig()
  if (!aiConfig.value.apiUrl || !aiConfig.value.apiKey) {
    Object.assign(aiForm, aiConfig.value)
    aiModal.value = true
    toast('请先配置 API 地址和 Key', 'error')
    return
  }
  aiLoading.value = true
  reportText.value = 'AI 正在生成周报，请稍候...'
  reportHtml.value = ''
  const prompt = (aiConfig.value.prompt || DEFAULT_AI_PROMPTS.default)
    .replaceAll('{{weekStart}}', data.start)
    .replaceAll('{{weekEnd}}', data.end)
  const user = [
    `【选择周期】${data.start} ~ ${data.end}`,
    `【本周已完成】`,
    data.completed.map((item) => `${getPriorityLabel(item.priority)} ${item.content}`).join('\n') || '无',
    `【当前活跃便签】`,
    data.active.map((item) => `${getPriorityLabel(item.priority)} ${item.content}`).join('\n') || '无'
  ].join('\n')
  abortController?.abort()
  abortController = new AbortController()
  try {
    const response = await fetch(`${aiConfig.value.apiUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.value.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.value.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: user }
        ],
        temperature: 0.7
      }),
      signal: abortController.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    const text = result.choices?.[0]?.message?.content
    if (!text) throw new Error('AI 未返回有效内容')
    reportText.value = text
    reportHtml.value = renderMarkdown(text)
  } catch (error) {
    if (error.name === 'AbortError') return
    reportHtml.value = ''
    reportText.value = `AI 周报生成失败：${error.message}`
  } finally {
    aiLoading.value = false
  }
}

async function copyReport() {
  if (!reportText.value) return
  try {
    await copyText(reportText.value)
    toast('已复制到剪贴板')
  } catch {
    toast('复制失败，请手动复制', 'error')
  }
}

async function saveAi() {
  if (!aiForm.apiUrl.trim() || !aiForm.apiKey.trim()) {
    toast('请填写 API 地址和 API Key', 'error')
    return
  }
  await saveAiConfig({ ...aiForm })
  aiModal.value = false
  toast('AI 设置已保存')
}

async function exportData() {
  await exportBackup()
}

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const imported = await importBackup(file)
    if (imported) renderChart()
  } catch (error) {
    toast(`导入失败：${error.message}`, 'error')
  }
}

watch(totalPages, (total) => {
  if (page.value > total) page.value = total
})
watch(chartDates, () => nextTick(renderChart))
watch(aiModal, (open) => {
  if (open) Object.assign(aiForm, aiConfig.value)
})

onMounted(async () => {
  await initNotes()
  await initAiConfig()
  await nextTick()
  renderChart()
})

onBeforeUnmount(() => {
  abortController?.abort()
  if (chart) chart.destroy()
})
</script>

<style scoped>
.profile-page { height: 100%; overflow: auto; background: var(--page-bg); }
.page-header {
  background: linear-gradient(135deg, #ff9a5c 0%, #ff6b6b 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
}
.header-actions { display: flex; gap: 0.5rem; }
.header-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 20px;
  background: rgba(255,255,255,0.15);
  color: white;
  cursor: pointer;
}
.content { max-width: 860px; margin: 0 auto; padding: 1.5rem; }
.stats-cards { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { flex: 1; background: var(--surface); border-radius: 12px; padding: 1.2rem; text-align: center; box-shadow: var(--shadow-sm); color: var(--text-primary); }
.stat-number { font-size: 2rem; font-weight: 700; }
.stat-label { font-size: 0.85rem; color: var(--text-muted); }
.create .stat-number { color: #4caf50; }
.complete .stat-number { color: #61b8ff; }
.delete .stat-number { color: #ff6961; }
.section { background: var(--surface); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm); color: var(--text-primary); }
.section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary); }
.chart-wrap { height: 300px; }
.empty { text-align: center; color: var(--text-muted); padding: 1.5rem 0; }
.filter-bar, .week-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 1rem; }
.filter-bar input[type="text"] { flex: 1; min-width: 140px; padding: 7px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); color: var(--text-primary); }
.filter-bar input[type="date"], .week-bar input { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); color: var(--text-primary); }
.btn-sm { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; background: var(--btn-muted-bg); color: var(--text-primary); }
.btn-sm.search { background: #ff9a5c; color: white; }
.btn-sm.ai { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 0.8rem; padding: 8px 12px; background: color-mix(in srgb, #ff9a5c 8%, var(--surface)); border-radius: 8px; }
.batch-delete { margin-left: auto; padding: 5px 14px; border: none; border-radius: 6px; background: #ff6961; color: white; cursor: pointer; }
.batch-delete:disabled { background: #ccc; }
.table-wrap { max-height: 400px; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th { background: color-mix(in srgb, var(--text-primary) 4%, var(--surface)); padding: 0.7rem 0.6rem; text-align: left; }
td { padding: 0.6rem; border-bottom: 1px solid var(--border-color); }
.content-cell { color: #1976d2; cursor: pointer; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.priority-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.priority-dot.normal { background: #4caf50; }
.priority-dot.important { background: #ff9800; }
.priority-dot.urgent { background: #f44336; }
.action-badge { padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; }
.action-badge.complete { background: #e3f2fd; color: #1976d2; }
.action-badge.delete { background: #ffebee; color: #c62828; }
.pagination { display: flex; justify-content: center; gap: 6px; margin-top: 1rem; flex-wrap: wrap; align-items: center; }
.pagination button { min-width: 36px; padding: 6px 10px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-primary); border-radius: 6px; cursor: pointer; }
.pagination button.active { background: #ff9a5c; color: white; border-color: #ff9a5c; }
.week-output { margin-top: 1rem; background: color-mix(in srgb, var(--text-primary) 4%, var(--surface)); border-radius: 8px; padding: 1.2rem; white-space: pre-wrap; min-height: 80px; }
.week-output.rendered { white-space: normal; }
.detail-body { background: color-mix(in srgb, var(--text-primary) 4%, var(--surface)); border-radius: 8px; padding: 1rem; white-space: pre-wrap; }
.detail-meta { margin-top: 1rem; font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 1rem; flex-wrap: wrap; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.82rem; font-weight: 600; }
.form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface); color: var(--text-primary); }
.presets { display: flex; gap: 6px; margin-top: 6px; }
.presets button { border: none; background: color-mix(in srgb, #667eea 12%, var(--surface)); color: #667eea; border-radius: 12px; padding: 3px 10px; cursor: pointer; }

@media (max-width: 768px) {
  .page-header { padding: 1rem; }
  .content { padding: 1rem 1rem 5rem; }
  .stats-cards { flex-direction: column; }
  .chart-wrap { height: 220px; }
  .section { padding: 1rem; }
  .filter-bar input[type="text"],
  .filter-bar input[type="date"],
  .week-bar input { width: 100%; min-width: 0; }
  .btn-sm { min-height: 40px; }
  .table-wrap { max-height: none; overflow: visible; }
  table, thead, tbody, th, td, tr { display: block; width: 100%; }
  thead { display: none; }
  tbody tr {
    position: relative;
    margin-bottom: 10px;
    padding: 10px 10px 10px 36px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--surface);
  }
  td { border: none; padding: 4px 0; white-space: normal; }
  td:first-child { position: absolute; left: 10px; top: 12px; width: auto; }
  td[data-label]::before {
    content: attr(data-label) "：";
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-right: 4px;
  }
  .content-cell { max-width: none; }
}
</style>

import { ref } from 'vue'
import { idbGet, idbSet } from '@/utils/idb'
import { asObject } from '@/utils/helpers'

export const DEFAULT_AI_PROMPTS = {
  default: [
    '你是一位专业的周报撰写助手。请根据以下数据生成一份结构清晰的工作周报。',
    '',
    '【要求】',
    '1. 为每个任务列出：任务内容、实际完成时间/预期完成时间、是否完成、是否超期',
    '2. 对超期任务，单独列出并保留「超期原因：______」供用户补充',
    '3. 对未完成任务，标注当前状态并预估剩余时间',
    '4. 最后附上下周工作计划（来自活跃便签）',
    '5. 语气专业但不生硬，格式清晰',
    '6. 按紧急、重要、一般的顺序排序',
    '',
    '【输出结构】',
    '▎本周工作完成情况',
    '▎超期任务及原因',
    '▎下周工作计划',
    '▎总结'
  ].join('\n'),
  concise: [
    '你是一位高效的周报助手，请用 Markdown 格式输出简洁周报。',
    '',
    '要求：',
    '- 用 Markdown 表格展示任务，列名：状态|任务名称|时间',
    '- 状态用 ✅已完成 / ⏳进行中 / ⚠️超期',
    '- 超期任务在表格中标注，未完成原因列留空',
    '- 最后用列表列出下周计划'
  ].join('\n'),
  detailed: [
    '你是一位资深项目经理，请用 Markdown 格式生成一份详尽、可归档的工作周报。',
    '',
    '## 一、本周工作概述',
    '## 二、已完成任务详情',
    '## 三、超期任务分析',
    '## 四、下周工作计划',
    '## 五、需要协调的事项'
  ].join('\n')
}

const aiConfig = ref({
  apiUrl: '',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  prompt: DEFAULT_AI_PROMPTS.default
})

let initialized = false

export function useAiConfig() {
  async function initAiConfig() {
    if (initialized) return
    const saved = asObject(await idbGet('aiConfig'))
    aiConfig.value = {
      apiUrl: saved.apiUrl || '',
      apiKey: saved.apiKey || '',
      model: saved.model || 'gpt-3.5-turbo',
      prompt: saved.prompt || DEFAULT_AI_PROMPTS.default
    }
    initialized = true
  }

  async function saveAiConfig(next) {
    aiConfig.value = { ...aiConfig.value, ...next }
    await idbSet('aiConfig', aiConfig.value)
  }

  return {
    aiConfig,
    initAiConfig,
    saveAiConfig
  }
}

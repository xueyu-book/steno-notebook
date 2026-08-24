const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export function generateId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function toLocalDateKey(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return todayKey(date)
}

export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${todayKey(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function readJsonFile(file, { maxBytes = MAX_BACKUP_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('未选择文件'))
      return
    }
    if (file.size > maxBytes) {
      reject(new Error('文件过大，请选择小于 10MB 的备份'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || '')))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

export function ensureHttpUrl(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

export function openExternalUrl(url) {
  const safe = ensureHttpUrl(url)
  if (!safe) return false
  window.open(safe, '_blank', 'noopener,noreferrer')
  return true
}

export function getPriorityLabel(priority) {
  if (priority === 'urgent') return '紧急'
  if (priority === 'important') return '重要'
  return '一般'
}

export function getActionLabel(action) {
  if (action === 'complete') return '完成'
  if (action === 'delete') return '删除'
  return action || '-'
}

export function downloadWordDoc(title, htmlBody) {
  const safeTitle = escapeHtml(title)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body>${htmlBody}</body></html>`
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword' })
  triggerDownload(blob, `${title || '文档'}.doc`)
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      /* fall through to execCommand */
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('复制失败')
}

export function getISOWeekValue(date = new Date()) {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function getWeekRange(weekValue) {
  if (!weekValue) return null
  const [yearStr, weekStr] = weekValue.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  if (!year || !week) return null
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const day = simple.getDay()
  const isoWeekStart = simple
  if (day <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1)
  else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay())
  isoWeekStart.setHours(0, 0, 0, 0)
  const isoWeekEnd = new Date(isoWeekStart)
  isoWeekEnd.setDate(isoWeekStart.getDate() + 6)
  isoWeekEnd.setHours(23, 59, 59, 999)
  return { start: isoWeekStart, end: isoWeekEnd }
}

export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export const NOTE_DESKTOP_SIZE = { width: 200, height: 200 }
export const NOTE_MOBILE_SIZE = { width: 156, height: 168 }

export function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

export function getNoteMetrics() {
  return isMobileViewport() ? { ...NOTE_MOBILE_SIZE } : { ...NOTE_DESKTOP_SIZE }
}

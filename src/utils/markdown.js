import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { toast } from '@/composables/useFeedback'
import { downloadWordDoc, escapeHtml } from './helpers'

marked.use({
  gfm: true,
  breaks: true
})

export function renderMarkdown(text) {
  const source = text || ''
  try {
    const html = marked.parse(source, { async: false })
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  } catch {
    return escapeHtml(source).replace(/\n/g, '<br>')
  }
}

export function exportMarkdownToWord(title, mdText) {
  if (!mdText || !mdText.trim()) {
    toast('内容为空，无法导出。', 'error')
    return
  }
  downloadWordDoc(title, renderMarkdown(mdText))
}

export function highlightJson(json) {
  return escapeHtml(json).replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
}

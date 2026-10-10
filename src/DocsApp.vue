<template>
  <div class="docs-shell">
    <div class="reading-progress" :style="{ transform: `scaleX(${readingProgress})` }"></div>
    <header class="docs-header">
      <a class="docs-brand" href="/" aria-label="返回 Gin Layout 首页">
        <img :src="theme === 'dark' ? '/gin-layout-mark-dark.svg' : '/gin-layout-mark.svg'" alt="Gin Layout Logo" />
        <span>Gin Layout</span>
        <b>DOCS</b>
      </a>
      <div class="docs-header-actions">
        <button
          type="button"
          class="theme-toggle-btn"
          :aria-label="theme === 'dark' ? '切换为浅色模式' : '切换为暗色模式'"
          @click="handleThemeToggle"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <a href="/">官网首页</a>
        <a href="/api/">API 目录</a>
        <a href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </header>

    <div class="docs-layout">
      <aside class="docs-sidebar">
        <label class="docs-search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.5" /><path d="m13 13 4 4" /></svg>
          <input v-model.trim="searchQuery" type="search" placeholder="搜索文档" aria-label="搜索文档" />
          <kbd>/</kbd>
        </label>

        <nav aria-label="文档目录">
          <template v-for="group in filteredGroups" :key="group.name">
            <span class="nav-group">{{ group.name }}</span>
            <button
              v-for="guide in group.guides"
              :key="guide.id"
              type="button"
              :class="{ active: guide.id === currentGuide.id }"
              :aria-current="guide.id === currentGuide.id ? 'page' : undefined"
              @click="openGuide(guide.id)"
            >
              <span>{{ guide.index }}</span>
              <div><b>{{ guide.title }}</b><small>{{ guide.shortTitle }}</small></div>
            </button>
          </template>
          <p v-if="filteredGroups.length === 0" class="nav-empty">没有匹配的教程</p>
        </nav>

      </aside>

      <main class="docs-main">
        <div class="mobile-guide-select">
          <span>当前文档</span>
          <select :value="currentGuide.id" aria-label="选择文档" @change="openGuide($event.target.value)">
            <option v-for="guide in guides" :key="guide.id" :value="guide.id">{{ guide.title }}</option>
          </select>
        </div>

        <Transition name="doc-fade" mode="out-in" @after-enter="handleContentReady">
          <article :key="currentGuide.id" class="doc-article">
            <div class="doc-meta">
              <span>{{ currentGuide.category }}</span>
              <span>{{ currentGuide.readingTime }} 分钟阅读</span>
              <a :href="currentGuide.sourceUrl" target="_blank" rel="noreferrer">在 GitHub 查看 Markdown</a>
            </div>

            <div v-if="loadingContent" class="doc-loading">
              <div class="loading-spinner"></div>
              <span>加载教程内容...</span>
            </div>
            <div v-else-if="contentError" class="doc-loading doc-error" role="alert">
              <span>教程内容加载失败，请重试。</span>
              <button type="button" @click="loadGuideContent(currentGuide.id)">重新加载</button>
            </div>
            <div v-else class="doc-content" @click="handleContentClick" v-html="renderedContent"></div>

            <footer class="doc-pager">
              <button v-if="previousGuide" type="button" @click="openGuide(previousGuide.id)"><span>上一篇</span><b>← {{ previousGuide.title }}</b></button>
              <span v-else></span>
              <button v-if="nextGuide" type="button" @click="openGuide(nextGuide.id)"><span>下一篇</span><b>{{ nextGuide.title }} →</b></button>
            </footer>
          </article>
        </Transition>
      </main>

      <aside class="docs-outline" aria-label="本文目录">
        <span>本页内容</span>
        <a v-for="item in outline" :key="item.id" :class="[`level-${item.level}`, { active: activeHeading === item.id }]" :href="`#${item.id}`">{{ item.title }}</a>
        <div class="outline-help"><b>发现文档问题？</b><p>欢迎在 GitHub 提交 Issue 或直接完善 Markdown。</p><a href="https://github.com/wannanbigpig/go-layout-doc/issues" target="_blank" rel="noreferrer">提交反馈 →</a></div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Prism from 'prismjs'
import 'prismjs/components/prism-go.js'
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-yaml.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-sql.js'
import { getPreferredTheme, initTheme, toggleTheme } from './theme.js'
import { useGuideContent, guideHref } from './guide-content.js'

const theme = ref(typeof window !== 'undefined' ? getPreferredTheme() : 'light')

function handleThemeToggle() {
  theme.value = toggleTheme()
}

const repositoryBase = 'https://github.com/wannanbigpig/go-layout-doc/blob/master/docs'

// 教程元数据定义
const guides = [
  { id: 'overview', index: '01', category: '开始使用', group: '开始', title: '教程文档总览', shortTitle: '先了解项目与阅读路径', readingTime: 6, sourceUrl: `${repositoryBase}/README.md` },
  { id: 'permissions', index: '02', category: '权限与安全', group: '核心教程', title: '权限配置与代码接入', shortTitle: '接口、菜单、角色与按钮', readingTime: 18, sourceUrl: `${repositoryBase}/permissions.md` },
  { id: 'system-config', index: '03', category: '系统管理', group: '核心教程', title: '系统参数完整指南', shortTitle: '配置、读取、缓存与扩展', readingTime: 20, sourceUrl: `${repositoryBase}/system-config.md` },
  { id: 'sms-providers', index: '04', category: '二次开发', group: '扩展开发', title: '短信供应商扩展', shortTitle: 'Provider、场景路由与密钥保护', readingTime: 18, sourceUrl: `${repositoryBase}/sms-providers.md` },
  { id: 'storage-providers', index: '05', category: '二次开发', group: '扩展开发', title: '存储供应商扩展', shortTitle: 'Driver、能力接口与直传', readingTime: 20, sourceUrl: `${repositoryBase}/storage-providers.md` },
  { id: 'task-runtime', index: '06', category: '任务与稳定性', group: '运维与发布', title: '任务、Worker 与 Cron', shortTitle: '职责、同步、并发与幂等', readingTime: 16, sourceUrl: `${repositoryBase}/task-runtime.md` },
  { id: 'deployment-upgrades', index: '07', category: '部署升级', group: '运维与发布', title: '部署、升级与回滚', shortTitle: '版本顺序、密钥与生产检查', readingTime: 18, sourceUrl: `${repositoryBase}/deployment-upgrades.md` },
]

// 动态 import 避免全量 markdown 塞入初始 JS bundle
const guideContentLoaders = {
  overview: () => import('../docs/README.md?raw'),
  permissions: () => import('../docs/permissions.md?raw'),
  'system-config': () => import('../docs/system-config.md?raw'),
  'sms-providers': () => import('../docs/sms-providers.md?raw'),
  'storage-providers': () => import('../docs/storage-providers.md?raw'),
  'task-runtime': () => import('../docs/task-runtime.md?raw'),
  'deployment-upgrades': () => import('../docs/deployment-upgrades.md?raw'),
}

const guideFiles = { overview: 'README.md', permissions: 'permissions.md', 'system-config': 'system-config.md', 'sms-providers': 'sms-providers.md', 'storage-providers': 'storage-providers.md', 'task-runtime': 'task-runtime.md', 'deployment-upgrades': 'deployment-upgrades.md' }
const searchQuery = ref('')
const currentGuideId = ref(resolveGuideFromUrl())
const readingProgress = ref(0)
const activeHeading = ref('')
const outline = ref([])
const renderedContent = ref('')
const { loading: loadingContent, error: contentError, load: loadContent, dispose: disposeContent } = useGuideContent(guideContentLoaders, applyContent)

let headingObserver = null

const currentGuide = computed(() => guides.find((guide) => guide.id === currentGuideId.value) || guides[0])
const currentIndex = computed(() => guides.findIndex((guide) => guide.id === currentGuide.value.id))
const previousGuide = computed(() => guides[currentIndex.value - 1])
const nextGuide = computed(() => guides[currentIndex.value + 1])
const filteredGroups = computed(() => {
  const keyword = searchQuery.value.toLowerCase()
  const matched = keyword
    ? guides.filter((guide) => `${guide.title} ${guide.shortTitle} ${guide.category}`.toLowerCase().includes(keyword))
    : guides
  return ['开始', '核心教程', '扩展开发', '运维与发布'].map((name) => ({ name, guides: matched.filter((guide) => guide.group === name) })).filter((group) => group.guides.length)
})

function resolveGuideFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('guide')
  return guides.some((guide) => guide.id === requested) ? requested : guides[0].id
}

// 统一的 Markdown 渲染管线：outline 收集与 HTML 锚点 ID 在编译时一对一生成，彻底杜绝正则错位
function compileMarkdown(markdown) {
  const currentOutline = []
  let sectionIndex = 0

  const renderer = new marked.Renderer()

  renderer.heading = ({ text, depth }) => {
    if (depth === 2 || depth === 3) {
      sectionIndex++
      const id = `section-${sectionIndex}`
      const cleanTitle = text.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').trim()
      currentOutline.push({ id, level: depth, title: cleanTitle })
      return `<h${depth} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-label="链接到本节">#</a></h${depth}>`
    }
    return `<h${depth}>${text}</h${depth}>`
  }

  renderer.code = ({ text, lang }) => {
    const rawLang = (lang || '').trim().toLowerCase()
    let highlightLang = ''
    if (rawLang === 'go' || rawLang === 'golang') highlightLang = 'go'
    else if (rawLang === 'sh' || rawLang === 'bash' || rawLang === 'shell' || rawLang === 'terminal') highlightLang = 'bash'
    else if (rawLang === 'yaml' || rawLang === 'yml') highlightLang = 'yaml'
    else if (rawLang === 'json') highlightLang = 'json'
    else if (rawLang === 'sql') highlightLang = 'sql'

    let codeHtml = ''
    if (highlightLang && Prism.languages[highlightLang]) {
      try {
        codeHtml = Prism.highlight(text, Prism.languages[highlightLang], highlightLang)
      } catch {
        codeHtml = escapeHtml(text)
      }
    } else {
      codeHtml = escapeHtml(text)
    }

    const badge = rawLang || 'code'
    return `<div class="doc-code" data-lang="${badge}"><div class="doc-code-header"><span class="code-badge">${badge}</span><button type="button" data-copy-code>复制</button></div><pre><code class="language-${highlightLang || 'text'}">${codeHtml}</code></pre></div>`
  }

  const rawHtml = marked.parse(markdown, { renderer, gfm: true })
  const sanitized = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['data-copy-code', 'data-lang', 'target', 'rel'],
    ADD_TAGS: ['button']
  })

  const template = document.createElement('template')
  template.innerHTML = sanitized
  for (const link of template.content.querySelectorAll('a[href]')) {
    link.setAttribute('href', guideHref(link.getAttribute('href'), guideFiles))
  }
  return { html: template.innerHTML, outline: currentOutline }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function loadGuideContent(id) {
  headingObserver?.disconnect()
  activeHeading.value = ''
  outline.value = []
  renderedContent.value = ''
  await loadContent(id)
  await nextTick()
  if (currentGuideId.value === id) handleContentReady()
}

function applyContent(markdown) {
  const compiled = compileMarkdown(markdown)
  outline.value = compiled.outline
  renderedContent.value = compiled.html
}

function handleContentReady() {
  if (loadingContent.value || contentError.value) return
  setupHeadingObserver()
  scrollToHashTarget()
}

// 解决外部直接访问形如 ?guide=xxx#section-3 时的锚点定位失效
function scrollToHashTarget() {
  const hash = window.location.hash
  if (hash) {
    try {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        activeHeading.value = hash.slice(1)
        return
      }
    } catch {}
  }
}

function setupHeadingObserver() {
  headingObserver?.disconnect()

  const headings = document.querySelectorAll('.doc-content h2, .doc-content h3')
  if (!headings.length || !('IntersectionObserver' in window)) return

  headingObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeHeading.value = entry.target.id
      }
    })
  }, {
    rootMargin: '-80px 0px -65% 0px',
    threshold: 0
  })

  headings.forEach((h) => headingObserver.observe(h))
}

function openGuide(id) {
  if (!guides.some((guide) => guide.id === id)) return
  currentGuideId.value = id
  const url = new URL(window.location.href)
  url.searchParams.set('guide', id)
  url.hash = ''
  window.history.pushState({ guide: id }, '', url)
  document.title = `${currentGuide.value.title} · Gin Layout 文档`
  window.scrollTo({ top: 0, behavior: 'smooth' })
  loadGuideContent(id)
}

async function handleContentClick(event) {
  // 1. 代码一键复制
  const copyButton = event.target.closest('[data-copy-code]')
  if (copyButton) {
    const codeEl = copyButton.closest('.doc-code')?.querySelector('pre code')
    const code = codeEl?.textContent || ''
    try {
      await navigator.clipboard.writeText(code)
      copyButton.textContent = '已复制'
      window.setTimeout(() => { copyButton.textContent = '复制' }, 1400)
    } catch {
      copyButton.textContent = '复制失败'
    }
    return
  }

  // 2. 内部链接智能拦截，防止相对 .md 引发 404
  const link = event.target.closest('a')
  if (!link) return
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
  const href = link.getAttribute('href') || ''

  if (href.startsWith('?guide=')) {
    event.preventDefault()
    const id = new URL(link.href).searchParams.get('guide')
    openGuide(id)
  } else if (href.endsWith('.md') || href.includes('.md#')) {
    const parts = href.split('#')
    const filename = parts[0].split('/').pop().replace('.md', '')
    const matched = guides.find((g) => g.id === filename || (filename === 'README' && g.id === 'overview'))
    if (matched) {
      event.preventDefault()
      openGuide(matched.id)
      if (parts[1]) {
        nextTick(() => {
          window.location.hash = parts[1]
          scrollToHashTarget()
        })
      }
    }
  }
}

function updateScrollState() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0
}

function focusSearch(event) {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault()
    document.querySelector('.docs-search input')?.focus()
  }
}

async function handleHistoryChange() {
  const nextId = resolveGuideFromUrl()
  currentGuideId.value = nextId
  document.title = `${currentGuide.value.title} · Gin Layout 文档`
  loadGuideContent(nextId)
}

onMounted(async () => {
  theme.value = initTheme()
  document.title = `${currentGuide.value.title} · Gin Layout 文档`
  window.addEventListener('scroll', updateScrollState, { passive: true })
  window.addEventListener('keydown', focusSearch)
  window.addEventListener('popstate', handleHistoryChange)
  loadGuideContent(currentGuideId.value)
})

onUnmounted(() => {
  disposeContent()
  window.removeEventListener('scroll', updateScrollState)
  window.removeEventListener('keydown', focusSearch)
  window.removeEventListener('popstate', handleHistoryChange)
  headingObserver?.disconnect()
})
</script>

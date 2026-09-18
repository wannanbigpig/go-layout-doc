<template>
  <div class="docs-shell">
    <div class="reading-progress" :style="{ transform: `scaleX(${readingProgress})` }"></div>
    <header class="docs-header">
      <a class="docs-brand" href="/" aria-label="返回 Gin Layout 首页">
        <img src="/gin-layout-mark.svg" alt="" />
        <span>Gin Layout</span>
        <b>DOCS</b>
      </a>
      <div class="docs-header-actions">
        <a href="/">官网首页</a>
        <a href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </header>

    <div class="docs-layout">
      <aside class="docs-sidebar">
        <label class="docs-search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.5" /><path d="m13 13 4 4" /></svg>
          <input v-model.trim="searchQuery" type="search" placeholder="搜索教程" aria-label="搜索教程" />
          <kbd>/</kbd>
        </label>

        <nav aria-label="教程目录">
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

        <div class="docs-version"><i></i><span>当前文档对应<br /><b>Gin Layout master</b></span></div>
      </aside>

      <main class="docs-main">
        <div class="mobile-guide-select">
          <span>当前教程</span>
          <select :value="currentGuide.id" aria-label="选择教程" @change="openGuide($event.target.value)">
            <option v-for="guide in guides" :key="guide.id" :value="guide.id">{{ guide.title }}</option>
          </select>
        </div>

        <Transition name="doc-fade" mode="out-in">
          <article :key="currentGuide.id" class="doc-article">
            <div class="doc-meta">
              <span>{{ currentGuide.category }}</span>
              <span>{{ currentGuide.readingTime }} 分钟阅读</span>
              <a :href="currentGuide.sourceUrl" target="_blank" rel="noreferrer">在 GitHub 查看 Markdown</a>
            </div>
            <div class="doc-content" @click="handleContentClick" v-html="renderedContent"></div>

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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { marked } from 'marked'
import overviewMarkdown from '../docs/README.md?raw'
import permissionsMarkdown from '../docs/permissions.md?raw'
import systemConfigMarkdown from '../docs/system-config.md?raw'
import smsProvidersMarkdown from '../docs/sms-providers.md?raw'
import storageProvidersMarkdown from '../docs/storage-providers.md?raw'
import taskRuntimeMarkdown from '../docs/task-runtime.md?raw'
import deploymentUpgradesMarkdown from '../docs/deployment-upgrades.md?raw'

const repositoryBase = 'https://github.com/wannanbigpig/go-layout-doc/blob/master/docs'
const guides = [
  { id: 'overview', index: '01', category: '开始使用', group: '开始', title: '教程文档总览', shortTitle: '先了解项目与阅读路径', readingTime: 6, content: overviewMarkdown, sourceUrl: `${repositoryBase}/README.md` },
  { id: 'permissions', index: '02', category: '权限与安全', group: '核心教程', title: '权限配置与代码接入', shortTitle: '接口、菜单、角色与按钮', readingTime: 18, content: permissionsMarkdown, sourceUrl: `${repositoryBase}/permissions.md` },
  { id: 'system-config', index: '03', category: '系统管理', group: '核心教程', title: '系统参数完整指南', shortTitle: '配置、读取、缓存与扩展', readingTime: 20, content: systemConfigMarkdown, sourceUrl: `${repositoryBase}/system-config.md` },
  { id: 'sms-providers', index: '04', category: '二次开发', group: '扩展开发', title: '短信供应商扩展', shortTitle: 'Provider、场景路由与密钥保护', readingTime: 18, content: smsProvidersMarkdown, sourceUrl: `${repositoryBase}/sms-providers.md` },
  { id: 'storage-providers', index: '05', category: '二次开发', group: '扩展开发', title: '存储供应商扩展', shortTitle: 'Driver、能力接口与直传', readingTime: 20, content: storageProvidersMarkdown, sourceUrl: `${repositoryBase}/storage-providers.md` },
  { id: 'task-runtime', index: '06', category: '任务与稳定性', group: '运维与发布', title: '任务、Worker 与 Cron', shortTitle: '职责、同步、并发与幂等', readingTime: 16, content: taskRuntimeMarkdown, sourceUrl: `${repositoryBase}/task-runtime.md` },
  { id: 'deployment-upgrades', index: '07', category: '部署升级', group: '运维与发布', title: '部署、升级与回滚', shortTitle: '版本顺序、密钥与生产检查', readingTime: 18, content: deploymentUpgradesMarkdown, sourceUrl: `${repositoryBase}/deployment-upgrades.md` },
]

const searchQuery = ref('')
const currentGuideId = ref(resolveGuideFromUrl())
const readingProgress = ref(0)
const activeHeading = ref('')

const currentGuide = computed(() => guides.find((guide) => guide.id === currentGuideId.value) || guides[0])
const currentIndex = computed(() => guides.findIndex((guide) => guide.id === currentGuide.value.id))
const previousGuide = computed(() => guides[currentIndex.value - 1])
const nextGuide = computed(() => guides[currentIndex.value + 1])
const outline = computed(() => extractOutline(currentGuide.value.content))
const renderedContent = computed(() => renderMarkdown(currentGuide.value.content, outline.value))
const filteredGroups = computed(() => {
  const keyword = searchQuery.value.toLowerCase()
  const matched = keyword
    ? guides.filter((guide) => `${guide.title} ${guide.shortTitle} ${guide.content}`.toLowerCase().includes(keyword))
    : guides
  return ['开始', '核心教程', '扩展开发', '运维与发布'].map((name) => ({ name, guides: matched.filter((guide) => guide.group === name) })).filter((group) => group.guides.length)
})

function resolveGuideFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('guide')
  return guides.some((guide) => guide.id === requested) ? requested : guides[0].id
}

function extractOutline(markdown) {
  const result = []
  let inCodeBlock = false
  markdown.split('\n').forEach((line) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (inCodeBlock) return
    const match = line.match(/^(##|###)\s+(.+)$/)
    if (!match) return
    result.push({ id: `section-${result.length + 1}`, level: match[1].length, title: match[2].replace(/[`*_]/g, '').trim() })
  })
  return result
}

function renderMarkdown(markdown, headings) {
  let headingIndex = 0
  const html = marked.parse(markdown, { gfm: true })
  return html
    .replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (matched, level, content) => {
      const heading = headings[headingIndex++]
      return heading ? `<h${level} id="${heading.id}">${content}<a class="heading-anchor" href="#${heading.id}" aria-label="链接到本节">#</a></h${level}>` : matched
    })
    .replace(/<pre>([\s\S]*?)<\/pre>/g, '<div class="doc-code"><button type="button" data-copy-code>复制</button><pre>$1</pre></div>')
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
}

async function handleContentClick(event) {
  const copyButton = event.target.closest('[data-copy-code]')
  if (copyButton) {
    const code = copyButton.nextElementSibling?.textContent || ''
    try {
      await navigator.clipboard.writeText(code)
      copyButton.textContent = '已复制'
      window.setTimeout(() => { copyButton.textContent = '复制' }, 1400)
    } catch {
      copyButton.textContent = '复制失败'
    }
    return
  }

  const guideLink = event.target.closest('a[href^="?guide="]')
  if (!guideLink) return
  event.preventDefault()
  const id = new URL(guideLink.href).searchParams.get('guide')
  openGuide(id)
}

function updateScrollState() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0

  let current = ''
  outline.value.forEach((item) => {
    const heading = document.getElementById(item.id)
    if (heading && heading.getBoundingClientRect().top <= 120) current = item.id
  })
  activeHeading.value = current
}

function focusSearch(event) {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault()
    document.querySelector('.docs-search input')?.focus()
  }
}

function handleHistoryChange() {
  currentGuideId.value = resolveGuideFromUrl()
  document.title = `${currentGuide.value.title} · Gin Layout 文档`
  window.scrollTo({ top: 0 })
}

onMounted(() => {
  document.title = `${currentGuide.value.title} · Gin Layout 文档`
  window.addEventListener('scroll', updateScrollState, { passive: true })
  window.addEventListener('keydown', focusSearch)
  window.addEventListener('popstate', handleHistoryChange)
  updateScrollState()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollState)
  window.removeEventListener('keydown', focusSearch)
  window.removeEventListener('popstate', handleHistoryChange)
})
</script>

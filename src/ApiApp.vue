<template>
  <div class="api-shell">
    <header class="api-header">
      <div class="api-header-inner">
        <a class="api-brand" href="/" aria-label="返回 Gin Layout 首页">
          <img :src="theme === 'dark' ? '/gin-layout-mark-dark.svg' : '/gin-layout-mark.svg'" alt="Gin Layout Logo" />
          <span>Gin Layout</span>
          <b>API</b>
        </a>
        <div class="api-header-actions">
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
          <a href="/docs/">文档</a>
          <a href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer" class="github-nav-link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>

    <main class="api-main-content">
      <div class="api-container">
        <ApiVersionInfo :source="versionSource" :selected="selectedVersion" :versions="availableVersions" :loading="versionLoading" :error="versionError" :discovery-error="discoveryError" :current-tag="currentSource.tag" :current-state="currentSource.state" :href="apiVersions.referenceHref" @change="changeVersion" @refresh="apiVersions.refresh(true)" @reference="apiVersions.openReference" />
        <ApiReference v-if="documentation && referenceView" :view="referenceView" :documentation="documentation" :source="versionSource" :back-href="apiVersions.referenceHref('')" @close="apiVersions.openReference('')" />
        <template v-if="documentation && !referenceView">
        <!-- 页面 Hero 标头 -->
        <section class="api-hero-head">
          <div class="hero-head-text">
            <span class="eyebrow">DECLARATIVE ROUTE CATALOG</span>
            <h1>完整 API 目录</h1>
            <p>全站共 {{ apiCatalog.length }} 个路由端点，方法、路径和安全策略与后端 OpenAPI 同步校验。支持接口检索、安全策略查阅与请求示例。</p>
          </div>
          <div class="api-stats-strip">
            <div class="stat-pill">
              <strong>{{ apiCatalog.length }}</strong>
              <span>端点总数</span>
            </div>
            <div class="stat-pill">
              <strong>{{ apiGroups.length - 1 }}</strong>
              <span>业务分组</span>
            </div>
            <div class="stat-pill">
              <strong>100%</strong>
              <span>示例覆盖</span>
            </div>
          </div>
        </section>

        <!-- 公共调用约定折叠/快捷展示 -->
        <section class="api-conventions-section">
          <div class="conventions-bar" @click="showConventions = !showConventions">
            <div class="conventions-bar-left">
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 6v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <span>查看公共调用约定（Token 凭证、统一响应结构、HTTP 状态码与分页规范）</span>
            </div>
            <button type="button" class="conventions-toggle-btn" :aria-expanded="showConventions">
              {{ showConventions ? '收起约定' : '展开约定' }}
            </button>
          </div>

          <div v-show="showConventions" class="conventions-content">
            <div class="conventions-grid">
              <article class="convention-card">
                <div class="convention-title"><span>01</span><div><h4>Token 与凭证策略</h4><p>普通登录态与权限接口共用 Bearer Token</p></div></div>
                <div class="convention-code">
                  <code>Authorization: Bearer &lt;access_token&gt;</code>
                  <button type="button" @click="copyText(authHeaderExample, 'auth-header')">{{ copiedKey === 'auth-header' ? '已复制' : '复制' }}</button>
                </div>
                <ul class="convention-list">
                  <li><b>公开</b><span>无需凭证，如登录、验证码与公开下载。</span></li>
                  <li><b>Access Token</b><span>仅校验登录态与 Token 有效期。</span></li>
                  <li><b>接口权限</b><span>校验登录身份后继续进入 Casbin RBAC 鉴权判定。</span></li>
                  <li><b>Refresh Cookie</b><span>携带 HttpOnly refresh_token，并需附带 X-Requested-With。</span></li>
                  <li><b>WebSocket Ticket</b><span>先申请单次 ticket，再通过 Query 参数握手建连。</span></li>
                </ul>
              </article>

              <article class="convention-card">
                <div class="convention-title"><span>02</span><div><h4>统一响应规范</h4><p><code>code=0</code> 恒对应业务成功且 HTTP 状态为 200</p></div></div>
                <div class="convention-json">
                  <div><span>SUCCESS RESPONSE</span><button type="button" @click="copyText(commonSuccessExample, 'common-response')">{{ copiedKey === 'common-response' ? '已复制' : '复制' }}</button></div>
                  <pre><code>{{ commonSuccessExample }}</code></pre>
                </div>
                <p class="convention-note">无返回数据时 data 为 <code>{}</code>；数组或标量自动包装为 <code>data.result</code>；<code>request_id</code> 全链路打通日志跟踪。</p>
              </article>

              <article class="convention-card">
                <div class="convention-title"><span>03</span><div><h4>分页与状态约定</h4><p>分页数据标准规范与主流异常状态</p></div></div>
                <div class="pagination-contract"><code>total</code><code>per_page</code><code>current_page</code><code>last_page</code><code>data[]</code></div>
                <div class="status-list">
                  <div><b>400</b><span>参数校验失败、业务前置条件冲突</span></div>
                  <div><b>401</b><span>未登录、Token 过期或凭证无效</span></div>
                  <div><b>403</b><span>已认证但未被授予此 API 访问权限</span></div>
                  <div><b>404</b><span>目标数据或路由未找到</span></div>
                  <div><b>500 / 503</b><span>服务端内部故障或数据库/Redis 依赖未就绪</span></div>
                </div>
                <p class="convention-note">失败时始终 <code>code != 0</code>，客户端请优先读取 <code>code</code> 与 <code>msg</code> 做统一错误捕获。</p>
              </article>
            </div>
          </div>
        </section>

        <!-- API 核心工作台 -->
        <section class="api-workbench">
          <!-- 顶部检索与过滤栏 -->
          <div class="api-toolbar">
            <div class="api-search-box">
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
              <input v-model="apiQuery" type="search" placeholder="搜索接口路径、中文名称或描述 (按 / 聚焦)" aria-label="搜索接口" />
              <kbd>/</kbd>
            </div>

            <div class="toolbar-filters">
              <div class="method-filters" role="group" aria-label="按 HTTP 方法筛选">
                <button
                  v-for="method in ['ALL', 'GET', 'POST', 'PUT', 'DELETE']"
                  :key="method"
                  :class="{ active: apiMethod === method }"
                  type="button"
                  @click="apiMethod = method"
                >
                  {{ method }}
                </button>
              </div>

              <div class="api-result-badge">{{ filteredApis.length }} 个接口匹配</div>
            </div>
          </div>

          <!-- 分组标签栏 -->
          <div class="api-groups-bar" role="tablist" aria-label="业务分组">
            <button
              v-for="group in apiGroups"
              :key="group"
              :class="{ active: apiGroup === group }"
              type="button"
              role="tab"
              :aria-selected="apiGroup === group"
              @click="apiGroup = group"
            >
              {{ group }}
            </button>
          </div>

          <!-- 双栏主体：左侧列表 + 右侧详情 -->
          <div class="api-panes">
            <!-- 左侧列表 -->
            <div class="api-list-pane" aria-label="接口列表">
              <button
                v-for="endpoint in filteredApis"
                :key="`${endpoint.method}-${endpoint.path}`"
                :class="['api-row', { active: activeEndpoint === endpoint }]"
                type="button"
                @click="selectEndpoint(endpoint)"
              >
                <span :class="['method-tag', `method-${endpoint.method.toLowerCase()}`]">{{ endpoint.method }}</span>
                <div class="api-row-text">
                  <code>{{ endpoint.path }}</code>
                  <span class="api-title">{{ endpoint.title }}</span>
                </div>
                <span class="auth-mini-badge" :title="endpoint.auth">{{ endpoint.auth }}</span>
              </button>
              <div v-if="filteredApis.length === 0" class="api-empty-state">
                <p>未找到符合条件的接口</p>
                <small>请尝试调整搜索关键词或重置方法/分组筛选条件</small>
              </div>
            </div>

            <!-- 右侧详情卡片 -->
            <div class="api-detail-pane">
              <article v-if="activeEndpoint" class="api-detail-card">
                <!-- 头部元信息 -->
                <div class="detail-header">
                  <div class="detail-group-crumb">
                    <span>{{ activeEndpoint.group }}</span>
                    <i>/</i>
                    <span>{{ activeEndpoint.title }}</span>
                  </div>
                  <button type="button" class="action-btn" @click="copyText(activeEndpoint.path, 'api-path')">
                    {{ copiedKey === 'api-path' ? '已复制路径' : '复制接口路径' }}
                  </button>
                </div>

                <!-- 路径大字 -->
                <div class="detail-title-line">
                  <span :class="['method-tag', `method-${activeEndpoint.method.toLowerCase()}`]">{{ activeEndpoint.method }}</span>
                  <code>{{ activeEndpoint.path }}</code>
                </div>

                <!-- 描述 -->
                <div class="detail-desc">
                  <h3>{{ activeEndpoint.title }}</h3>
                  <p>{{ activeEndpoint.description || '该接口遵循系统统一响应格式，由对应业务控制器处理参数校验并调用服务层。' }}</p>
                </div>

                <!-- 鉴权卡片 -->
                <div class="auth-info-card">
                  <span class="auth-label">SECURITY POLICY</span>
                  <div class="auth-body">
                    <b>{{ activeEndpoint.auth }}</b>
                    <p>{{ authDescription[activeEndpoint.auth] }}</p>
                  </div>
                </div>

                <!-- 请求参数表格 -->
                <section class="params-block">
                  <div class="block-title">
                    <h4>请求参数</h4>
                    <span class="count-tag">{{ activeEndpoint.parameters.length ? `${activeEndpoint.parameters.length} 个参数` : '无参数' }}</span>
                  </div>

                  <div v-if="activeEndpoint.parameters.length" class="table-responsive">
                    <table class="params-table">
                      <thead>
                        <tr>
                          <th>参数名称</th>
                          <th>位置</th>
                          <th>类型</th>
                          <th>必填</th>
                          <th>说明与示例</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in activeEndpoint.parameters" :key="`${item.location}-${item.name}`">
                          <td><code>{{ item.name }}</code></td>
                          <td><span class="loc-pill">{{ item.location }}</span></td>
                          <td><span class="type-text">{{ item.type }}</span></td>
                          <td><span :class="['req-badge', { required: item.required }]">{{ item.required ? '必填' : '可选' }}</span></td>
                          <td class="desc-cell">
                            <p>{{ item.description }}</p>
                            <code v-if="item.example !== undefined" class="example-code">{{ formatParameterExample(item.example) }}</code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="params-none">
                    该接口无需携带特定业务参数；凭证等通用标头按上方认证策略规则传递。
                  </div>
                </section>

                <!-- cURL 示例 -->
                <section class="code-block-section">
                  <div class="code-block-header">
                    <span>cURL 请求示例</span>
                    <button type="button" class="action-btn" @click="copyText(curlExample, 'curl')">
                      {{ copiedKey === 'curl' ? '已复制' : '复制代码' }}
                    </button>
                  </div>
                  <pre><code>{{ curlExample }}</code></pre>
                </section>

                <!-- 成功响应示例 -->
                <section class="code-block-section">
                  <div class="code-block-header">
                    <span>成功响应 JSON 示例</span>
                    <button type="button" class="action-btn" @click="copyText(responseExampleText, 'response')">{{ copiedKey === 'response' ? '已复制' : '复制 JSON' }}</button>
                  </div>
                  <pre><code>{{ responseExampleText }}</code></pre>
                </section>
              </article>
            </div>
          </div>
        </section>
        </template>
      </div>
    </main>

    <footer class="api-footer">
      <div class="api-container footer-inner">
        <div>
          <a class="api-brand" href="/">
            <img :src="theme === 'dark' ? '/gin-layout-mark-dark.svg' : '/gin-layout-mark.svg'" alt="Gin Layout Logo" />
            <span>Gin Layout</span>
          </a>
          <p>面向真实后台业务的 Go 工程骨架<template v-if="documentation"> · {{ apiCatalog.length }} 个路由端点</template></p>
        </div>
        <div class="footer-links">
          <a href="/">官网首页</a>
          <a href="/docs/">文档</a>
          <a href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer">后端仓库</a>
          <a href="https://github.com/wannanbigpig/go-admin-ui" target="_blank" rel="noreferrer">前端仓库</a>
        </div>
        <small>© {{ currentYear }} Gin Layout · MIT License</small>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import currentSource from './data/api-source.json'
import { useAPIVersions } from './api-versions.js'
import { getPreferredTheme, initTheme, toggleTheme } from './theme.js'

import ApiVersionInfo from './ApiVersionInfo.vue'
import ApiReference from './ApiReference.vue'

const apiVersions = useAPIVersions()
const { source: versionSource, selected: selectedVersion, versions: availableVersions, loading: versionLoading, error: versionError, discoveryError, documentation, view: referenceView } = apiVersions
const apiCatalog = computed(() => documentation.value?.apiCatalog || [])
const apiGroups = computed(() => documentation.value?.apiGroups || [])
const authDescription = computed(() => documentation.value?.authDescription || {})
let refreshTimer
function changeVersion(tag) { apiGroup.value = '全部'; selectedApiKey.value = ''; apiVersions.choose(tag) }
function refreshVisible() { if (document.visibilityState === 'visible') apiVersions.refresh() }

const theme = ref(typeof window !== 'undefined' ? getPreferredTheme() : 'light')
const showConventions = ref(false)
const currentYear = new Date().getFullYear()

function handleThemeToggle() {
  theme.value = toggleTheme()
}

const copiedKey = ref('')
let copyTimer

async function copyText(value, key) {
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = key
    window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => (copiedKey.value = ''), 1600)
  } catch {
    copiedKey.value = ''
  }
}

const apiQuery = ref('')
const apiMethod = ref('ALL')
const apiGroup = ref('全部')
const selectedApiKey = ref('GET-/ping')
watch(documentation, (value) => {
  if (!value) return
  if (!value.apiGroups.includes(apiGroup.value)) apiGroup.value = '全部'
  if (!value.apiCatalog.some((entry) => `${entry.method}-${entry.path}` === selectedApiKey.value)) selectedApiKey.value = ''
})

const authHeaderExample = 'Authorization: Bearer <access_token>'
const commonSuccessExample = `{
  "code": 0,
  "msg": "OK",
  "data": {},
  "cost": "2.31ms",
  "request_id": "7d9d6d0e-51a3-4b80-a3b2-6ec759f5cd30"
}`

const filteredApis = computed(() => {
  const keyword = apiQuery.value.trim().toLowerCase()
  return apiCatalog.value.filter((endpoint) => {
    const matchGroup = apiGroup.value === '全部' || endpoint.group === apiGroup.value
    const matchMethod = apiMethod.value === 'ALL' || endpoint.method === apiMethod.value
    const matchKeyword = !keyword || `${endpoint.path} ${endpoint.title} ${endpoint.group} ${endpoint.description || ''}`.toLowerCase().includes(keyword)
    return matchGroup && matchMethod && matchKeyword
  })
})

const activeEndpoint = computed(() => {
  return filteredApis.value.find((ep) => `${ep.method}-${ep.path}` === selectedApiKey.value) || filteredApis.value[0]
})

function selectEndpoint(endpoint) {
  selectedApiKey.value = `${endpoint.method}-${endpoint.path}`
}

function formatExample(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? {}, null, 2)
}

function formatParameterExample(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

const responseExampleText = computed(() => formatExample(activeEndpoint.value?.responseExample))

const curlExample = computed(() => {
  if (!activeEndpoint.value) return ''
  const endpoint = activeEndpoint.value
  let requestPath = endpoint.path
  endpoint.parameters
    .filter((item) => item.location === 'Path')
    .forEach((item) => {
      requestPath = requestPath.replace(`:${item.name}`, String(item.example ?? ''))
    })
  const queryString = endpoint.parameters
    .filter((item) => item.location === 'Query' && item.example !== undefined && item.example !== '')
    .map((item) => `${encodeURIComponent(item.name)}=${encodeURIComponent(typeof item.example === 'object' ? JSON.stringify(item.example) : item.example)}`)
    .join('&')
  const url = `http://127.0.0.1:9001${requestPath}${queryString ? `?${queryString}` : ''}`
  const lines = [`curl -X ${endpoint.method} \\`]
  if (['Access Token', '接口权限'].includes(endpoint.auth)) {
    lines.push(`  -H 'Authorization: Bearer <access_token>' \\`)
  }
  if (endpoint.auth === 'Refresh Cookie') {
    lines.push(`  --cookie 'refresh_token=<refresh_token>' \\`)
  }
  endpoint.parameters
    .filter((item) => item.location === 'Header')
    .forEach((item) => lines.push(`  -H '${item.name}: ${formatParameterExample(item.example)}' \\`))
  if (endpoint.contentType === 'multipart/form-data') {
    endpoint.parameters
      .filter((item) => item.location === 'Body')
      .forEach((item) => lines.push(`  -F '${item.name}=${formatParameterExample(item.example)}' \\`))
  } else if (endpoint.requestBody && Object.keys(endpoint.requestBody).length) {
    lines.push(`  -H 'Content-Type: application/json' \\`)
    lines.push(`  -d '${JSON.stringify(endpoint.requestBody, null, 2)}' \\`)
  }
  lines.push(`  '${url}'`)
  return lines.join('\n')
})

function handleGlobalKeydown(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault()
    document.querySelector('.api-search-box input')?.focus()
  }
}

onMounted(() => {
  theme.value = initTheme()
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('popstate', apiVersions.handleHistory)
  document.addEventListener('visibilitychange', refreshVisible)
  refreshTimer = window.setInterval(refreshVisible, apiVersions.refreshInterval)
  apiVersions.refresh()
})
onUnmounted(() => { apiVersions.dispose(); window.clearTimeout(copyTimer); window.clearInterval(refreshTimer); window.removeEventListener('keydown', handleGlobalKeydown); window.removeEventListener('popstate', apiVersions.handleHistory); document.removeEventListener('visibilitychange', refreshVisible) })
</script>

<template>
  <section class="api-reference" aria-label="API 版本资料">
    <div class="reference-heading">
      <h2>{{ titles[view] }}</h2>
      <a :href="backHref" @click="closeReference">返回接口目录</a>
    </div>
    <p class="reference-version">后端 {{ source.tag }}<template v-if="source.frontend"> · 配套管理后台 {{ source.frontend.tag }}</template></p>
    <template v-if="view === 'errors'">
      <label class="reference-search">搜索错误码、名称或中文说明 <input v-model="query" type="search" placeholder="例如 20001、UserPasswordWrong 或密码错误" /></label>
      <section v-for="group in filteredErrors" :key="group.file" class="error-group">
        <h3>{{ group.comment }}</h3>
        <div class="reference-table">
          <table class="error-table">
            <thead><tr><th scope="col">业务错误码</th><th scope="col">错误名称</th><th scope="col">中文说明</th></tr></thead>
            <tbody>
              <tr v-for="code in group.codes" :key="code.name">
                <td>{{ code.code }}</td><td><code>{{ code.name }}</code></td><td>{{ code.description || '该版本未提供中文说明' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p v-if="!filteredErrors.length">没有匹配的错误码。</p>
    </template>
    <div v-else-if="view === 'upgrade'" class="reference-markdown" v-html="upgradeHTML"></div>
    <template v-else-if="view === 'versions'">
      <dl class="source-details">
        <dt>后端版本</dt><dd>{{ source.tag }}（{{ source.state === 'tagged' ? '已核对 Tag' : '开发候选' }}）</dd>
        <dt>后端提交</dt><dd><code>{{ source.commit }}</code><span v-if="source.dirty"> · 含未提交修改</span></dd>
        <dt>配套管理后台</dt><dd>{{ source.frontend?.tag || '尚无兼容的正式 Tag' }}</dd>
        <template v-if="source.frontend"><dt>管理后台提交</dt><dd><code>{{ source.frontend.commit }}</code><span v-if="source.frontend.dirty"> · 含未提交修改</span></dd></template>
        <dt>后端支持的管理后台</dt><dd>{{ rangeText(source.compatibility.frontend) }}</dd>
        <template v-if="source.compatibility.backend"><dt>管理后台支持的后端</dt><dd>{{ rangeText(source.compatibility.backend) }}</dd></template>
      </dl>
      <p>版本对应关系以此处的 Tag、提交和兼容范围为准。线上实际部署版本请通过部署环境的构建信息核对。</p>
    </template>
    <template v-else-if="view === 'openapi'">
      <p>此文件描述当前所选后端版本的路由和安全策略。业务参数与响应示例见接口目录。</p>
      <button type="button" class="reference-download" @click="downloadOpenAPI">下载 OpenAPI 文件</button>
      <pre class="reference-code"><code>{{ documentation.openapi }}</code></pre>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { filterErrorGroups } from './error-codes.js'

const props = defineProps({ view: String, documentation: Object, source: Object, backHref: String })
const emit = defineEmits(['close'])
function closeReference(event) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault(); emit('close')
}
const titles = { openapi: 'OpenAPI', errors: '错误码', upgrade: '后端升级说明', versions: '版本对应信息' }
const query = ref('')
const filteredErrors = computed(() => filterErrorGroups(props.documentation.errorCodes.groups, query.value))
const rangeText = (range) => `>=${range.min} <${range.maxExclusive}`
const upgradeHTML = computed(() => {
  const html = DOMPurify.sanitize(marked.parse(props.documentation.upgradeGuide))
  const template = document.createElement('template')
  template.innerHTML = html
  for (const link of template.content.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href')
    if (href.startsWith('#')) continue
    link.href = new URL(href, `${props.source.repository}/blob/${props.source.ref}/docs/upgrades/`).href
    link.target = '_blank'; link.rel = 'noopener noreferrer'
  }
  return template.innerHTML
})
function downloadOpenAPI() {
  const url = URL.createObjectURL(new Blob([props.documentation.openapi], { type: 'text/yaml;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = `openapi-${props.source.tag}.yaml`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<style scoped>
.api-reference { padding: 28px; border: 1px solid var(--api-line); border-radius: 12px; background: var(--api-card-bg); margin-bottom: 40px; min-width: 0; }
.reference-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0; color: var(--api-ink); }
a { color: var(--api-primary); }
.reference-version { color: var(--api-muted); font-size: 14px; }
.reference-search { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 24px 0; }
input { min-width: 0; width: min(100%, 340px); padding: 10px; color: var(--api-text); background: var(--api-soft); border: 1px solid var(--api-line); border-radius: 6px; }
.reference-table, .reference-markdown :deep(pre) { max-width: 100%; overflow-x: auto; }
table, .reference-markdown :deep(table) { border-collapse: collapse; width: 100%; }
th, td, .reference-markdown :deep(th), .reference-markdown :deep(td) { padding: 10px 14px; border-bottom: 1px solid var(--api-line); text-align: left; }
.error-table th:first-child, .error-table td:first-child { width: 110px; white-space: nowrap; }
.error-table td:nth-child(2) { overflow-wrap: anywhere; }
.error-table th:last-child, .error-table td:last-child { min-width: 220px; }
.reference-code { padding: 18px; max-height: 70vh; overflow: auto; background: var(--api-code); color: #cbd5e1; border-radius: 8px; font-size: 12px; }
.reference-download { padding: 8px 14px; margin-bottom: 8px; background: var(--api-primary-soft); color: var(--api-primary); border: 1px solid var(--api-line); border-radius: 6px; cursor: pointer; }
.source-details { display: grid; grid-template-columns: minmax(120px, auto) 1fr; gap: 12px; }
dt { color: var(--api-muted); }
dd { margin: 0; overflow-wrap: anywhere; }
.reference-markdown { line-height: 1.85; overflow-wrap: anywhere; }
.reference-markdown :deep(pre) { padding: 16px; background: var(--api-soft); border-radius: 8px; }
.reference-markdown :deep(a) { color: var(--api-primary); }
@media (max-width: 640px) { .api-reference { padding: 16px; } .source-details { grid-template-columns: 1fr; gap: 6px; } dd { margin-bottom: 12px; } }
</style>

<template>
  <section class="api-version-info" aria-label="API 版本与管理后台对应关系">
    <div class="api-version-controls">
      <label>后端 API 版本
        <select :value="selected" aria-label="后端 API 版本" @change="$emit('change', $event.target.value)">
          <option value="current">站点内置版本 {{ currentTag }}{{ currentState === 'tagged' ? '' : '（开发候选）' }}</option>
          <option v-for="entry in versions" :key="entry.tag" :value="entry.tag">{{ entry.tag }}</option>
          <option v-if="selected !== 'current' && !versions.some((entry) => entry.tag === selected)" :value="selected">{{ selected }}（待核对）</option>
        </select>
      </label>
      <button type="button" :disabled="loading" @click="$emit('refresh')">检查新版本</button>
    </div>
    <p v-if="loading" role="status">正在读取 {{ selected }} 的版本资料…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="discoveryError" role="status">暂时无法检查新版本：{{ discoveryError }}。<template v-if="source">正在显示 {{ source.tag }} 的已读取资料。</template></p>
    <div v-if="source" class="api-version-pair">
      <div><span>后端接口版本</span><b>{{ source.tag }}</b><small v-if="source.state !== 'tagged'">待发布</small></div>
      <div>
        <span>配套管理后台 Tag</span>
        <a v-if="source.frontend?.state === 'tagged'" :href="`${source.frontend.repository}/tree/${source.frontend.tag}`" target="_blank" rel="noreferrer">{{ source.frontend.tag }}</a>
        <b v-else>{{ source.frontend?.tag || '尚无兼容的正式 Tag' }}</b>
        <small v-if="source.frontend && source.frontend.state !== 'tagged'">待发布</small>
      </div>
    </div>
    <p v-if="source">目录对应后端 {{ source.tag }}。<template v-if="source.frontend">配套管理后台为 {{ source.frontend.tag }}。</template><template v-if="source.state !== 'tagged' || (source.frontend && source.frontend.state !== 'tagged')">当前包含开发候选。</template><template v-else-if="source.frontend">双方声明的兼容范围已核对。</template></p>
    <div v-if="source" class="api-contract-links">
      <a :href="href('openapi')" @click="openReference($event, 'openapi')">查看 OpenAPI</a>
      <a :href="href('errors')" @click="openReference($event, 'errors')">错误码</a>
      <a :href="href('upgrade')" @click="openReference($event, 'upgrade')">后端升级说明</a>
      <a :href="href('versions')" @click="openReference($event, 'versions')">版本对应信息</a>
    </div>
  </section>
</template>

<script setup>
defineProps({ source: Object, selected: String, versions: Array, loading: Boolean, error: String, discoveryError: String, currentTag: String, currentState: String, href: Function })
const emit = defineEmits(['change', 'refresh', 'reference'])
function openReference(event, name) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('reference', name)
}
</script>

<style scoped>
.api-version-info { padding: 20px; margin: 0 0 24px; border: 1px solid var(--api-line); border-radius: 12px; background: var(--api-card-bg); line-height: 1.6; }
.api-version-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
label { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
select, button { color: var(--api-text); background: var(--api-soft); border: 1px solid var(--api-line); border-radius: 6px; padding: 6px 10px; max-width: 100%; }
button { cursor: pointer; }
.api-version-pair { display: flex; flex-wrap: wrap; gap: 12px 40px; }
.api-version-pair > div { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.api-version-pair span, p { color: var(--api-muted); }
.api-version-pair b, .api-version-pair a { font-size: 18px; }
small { border-radius: 4px; padding: 1px 6px; background: var(--api-primary-soft); color: var(--api-muted); }
p { margin: 12px 0; font-size: 14px; }
.api-contract-links { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 14px; }
a { color: var(--api-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
@media (max-width: 640px) { .api-version-info { padding: 16px; } .api-version-pair { gap: 10px; } }
</style>

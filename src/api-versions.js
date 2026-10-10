import { computed, ref } from 'vue'
import currentSource from './data/api-source.json' with { type: 'json' }
import currentDocumentation from './data/api-documentation.json' with { type: 'json' }
import { createReleaseClient, releaseCacheTTL } from './release-client.js'

export function useAPIVersions({ client, location = window.location, history = window.history } = {}) {
  if (!client) {
    let storage = null
    try { storage = window.localStorage } catch { /* 禁用浏览器缓存仍可查版本。 */ }
    client = createReleaseClient({ storage })
  }
  const selected = ref(new URL(location.href).searchParams.get('apiVersion') || 'current')
  const source = ref(currentSource), documentation = ref(currentDocumentation)
  if (selected.value !== 'current') { source.value = null; documentation.value = null }
  const versions = ref([]), loading = ref(false), error = ref(''), discoveryError = ref('')
  const publishedFrontend = ref([])
  let generation = 0, discoveryGeneration = 0, disposed = false
  let followLatest = !new URL(location.href).searchParams.has('apiVersion')
  const view = ref(new URL(location.href).searchParams.get('view') || '')
  const validViews = ['openapi', 'errors', 'upgrade', 'versions']
  if (!validViews.includes(view.value)) view.value = ''
  const referenceHref = (name) => {
    const url = new URL(location.href)
    url.searchParams.set('apiVersion', selected.value)
    if (source.value?.frontend?.state === 'tagged') url.searchParams.set('adminVersion', source.value.frontend.tag)
    if (validViews.includes(name)) url.searchParams.set('view', name)
    else url.searchParams.delete('view')
    return url.pathname + url.search
  }
  function updateURL(replace = false) {
    const url = new URL(location.href)
    url.searchParams.set('apiVersion', selected.value)
    if (source.value?.frontend?.state === 'tagged') url.searchParams.set('adminVersion', source.value.frontend.tag)
    else url.searchParams.delete('adminVersion')
    if (view.value) url.searchParams.set('view', view.value)
    else url.searchParams.delete('view')
    history[replace ? 'replaceState' : 'pushState']({}, '', url)
  }
  async function select(tag, { adminTag = '', replace = false, update = true } = {}) {
    const request = ++generation
    selected.value = tag; source.value = null; documentation.value = null; error.value = ''; loading.value = true
    try {
      let result
      if (tag === 'current') result = { source: currentSource, documentation: currentDocumentation }
      else {
        if (!versions.value.some((entry) => entry.tag === tag)) throw new Error('所选后端版本未正式发布，或版本列表尚未读取成功')
        result = await client.backend(tag)
        const frontend = await client.compatibleFrontend(result.source.backendVersion, result.documentation.compatibleFrontend, publishedFrontend.value, adminTag)
        if (frontend) {
          result.source.frontend = frontend.source
          result.source.compatibility.backend = frontend.compatibleBackend
        }
      }
      if (disposed || request !== generation) return
      source.value = result.source; documentation.value = result.documentation
      if (update) updateURL(replace)
    } catch (cause) { if (!disposed && request === generation) error.value = cause.message }
    finally { if (!disposed && request === generation) loading.value = false }
  }
  async function refresh(force = false) {
    const discovery = ++discoveryGeneration, navigation = generation
    discoveryError.value = ''
    try {
      const [backend, frontend] = await Promise.all([client.list('backend', force), client.list('frontend', force)])
      if (disposed || discovery !== discoveryGeneration) return
      const frontendChanged = publishedFrontend.value.map((entry) => entry.tag).join(',') !== frontend.map((entry) => entry.tag).join(',')
      versions.value = backend; publishedFrontend.value = frontend
      if (navigation !== generation) return
      const url = new URL(location.href)
      const wanted = followLatest && backend.length ? backend[0].tag : url.searchParams.get('apiVersion') || selected.value
      if (wanted !== selected.value || !documentation.value || (followLatest && wanted !== 'current' && frontendChanged)) await select(wanted, { adminTag: followLatest ? '' : url.searchParams.get('adminVersion') || '', replace: true })
    } catch (cause) {
      if (disposed || discovery !== discoveryGeneration) return
      discoveryError.value = cause.message
      if (selected.value !== 'current' && !source.value) error.value = '无法核对所选发布版本，请重试版本查询'
    }
  }
  async function choose(tag) { followLatest = false; selected.value = tag; source.value = null; updateURL(); await select(tag, { replace: true }) }
  function openReference(name) { followLatest = false; view.value = validViews.includes(name) ? name : ''; updateURL() }
  async function handleHistory() {
    const url = new URL(location.href)
    followLatest = !url.searchParams.has('apiVersion')
    view.value = validViews.includes(url.searchParams.get('view')) ? url.searchParams.get('view') : ''
    await select(url.searchParams.get('apiVersion') || 'current', { adminTag: url.searchParams.get('adminVersion') || '', update: false })
  }
  function dispose() { disposed = true; generation++ }
  return { selected, source, documentation, versions, loading, error, discoveryError, view, referenceHref, refresh, choose, openReference, handleHistory, dispose, refreshInterval: releaseCacheTTL, count: computed(() => documentation.value?.apiCatalog.length || 0) }
}

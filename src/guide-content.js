import { ref } from 'vue'

export function guideHref(href, files) {
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) return href
  const url = new URL(href, 'https://docs.invalid/docs/')
  let guide = href.startsWith('?guide=') ? url.searchParams.get('guide') : null
  if (!guide) {
    const filename = url.pathname.split('/').pop()
    guide = Object.keys(files).find((id) => files[id] === filename)
    if (guide) url.searchParams.set('guide', guide)
  }
  if (!guide || !Object.hasOwn(files, guide)) return href
  return url.search + url.hash
}

// 动态 import 无法取消；仅当前导航可提交正文、错误和加载状态。
export function useGuideContent(loaders, applyContent) {
  const loading = ref(false)
  const error = ref(null)
  const cache = new Map()
  let requestId = 0
  let disposed = false

  async function load(id) {
    if (disposed) return
    const currentRequest = ++requestId
    loading.value = true
    error.value = null

    try {
      if (!cache.has(id)) {
        const module = await loaders[id]()
        cache.set(id, module.default ?? module)
      }
      if (disposed || currentRequest !== requestId) return
      applyContent(cache.get(id))
    } catch (cause) {
      if (!disposed && currentRequest === requestId) error.value = cause
    } finally {
      if (!disposed && currentRequest === requestId) loading.value = false
    }
  }

  function dispose() {
    disposed = true
    requestId++
  }

  return { loading, error, load, dispose }
}

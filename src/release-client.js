import { compareVersions, parseVersion, validateDocumentation } from './api-documentation.js'

const repositories = { backend: 'wannanbigpig/gin-layout', frontend: 'wannanbigpig/go-admin-ui' }
export const releaseCacheTTL = 5 * 60 * 1000
const inRange = (version, range) => range && compareVersions(version, range.min) >= 0 && compareVersions(version, range.maxExclusive) < 0

export function publishedReleases(entries) {
  if (!Array.isArray(entries)) throw new Error('发布版本列表格式错误')
  return entries.filter((entry) => {
    if (entry.draft || entry.prerelease || !entry.published_at || typeof entry.tag_name !== 'string' || !entry.tag_name.startsWith('v')) return false
    try { return !parseVersion(entry.tag_name.slice(1)).pre.length } catch { return false }
  }).map((entry) => ({ tag: entry.tag_name, version: entry.tag_name.slice(1), publishedAt: entry.published_at }))
    .sort((a, b) => compareVersions(b.version, a.version))
}

export function createReleaseClient({ fetcher = fetch, storage = null, now = Date.now } = {}) {
  const requests = new Map(), lists = new Map()
  async function request(url, json = true) {
    const response = await fetcher(url, { credentials: 'omit', signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) throw new Error('发布版本查询暂时受限，请稍后重试')
      if (response.status === 404) throw new Error('所选版本未提供对应 API 文档或版本资料')
      throw new Error(`版本资料读取失败（${response.status}）`)
    }
    return json ? response.json() : response.text()
  }
  function cached(url, json = true) {
    if (!requests.has(url)) requests.set(url, request(url, json).catch((error) => { requests.delete(url); throw error }))
    return requests.get(url)
  }
  async function list(kind, force = false) {
    if (!repositories[kind]) throw new Error('未知版本来源')
    const key = `gin-layout.releases.${kind}.v1`
    let previous = lists.get(kind)
    if (!previous) {
      try { previous = JSON.parse(storage?.getItem(key) || 'null') } catch { /* 浏览器禁止缓存时仍可读取公开发布资料。 */ }
    }
    const validCache = previous && Array.isArray(previous.entries) && previous.entries.every((entry) => {
      try { return entry.tag === `v${entry.version}` && !parseVersion(entry.version).pre.length && typeof entry.publishedAt === 'string' } catch { return false }
    })
    if (!force && validCache && Number.isFinite(previous.at) && now() - previous.at >= 0 && now() - previous.at < releaseCacheTTL) return previous.entries.slice().sort((a, b) => compareVersions(b.version, a.version))
    const entries = []
    for (let page = 1; page <= 20; page++) {
      const batch = await request(`https://api.github.com/repos/${repositories[kind]}/releases?per_page=100&page=${page}`)
      if (!Array.isArray(batch)) throw new Error('发布版本列表格式错误')
      entries.push(...batch)
      if (batch.length < 100) {
        const value = { at: now(), entries: publishedReleases(entries) }
        lists.set(kind, value)
        try { storage?.setItem(key, JSON.stringify(value)) } catch { /* 缓存不可写不影响资料阅读。 */ }
        return value.entries
      }
    }
    throw new Error('发布版本列表过大，未能完整读取；请使用仓库 Release 页面')
  }
  async function identity(kind, tag) {
    if (!tag.startsWith('v')) throw new Error('版本 Tag 格式错误')
    const version = tag.slice(1)
    parseVersion(version)
    const repository = repositories[kind]
    let object = (await cached(`https://api.github.com/repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`)).object
    for (let depth = 0; depth < 8; depth++) {
      if (!object || !/^[a-f0-9]{40,64}$/.test(object.sha)) throw new Error('版本 Tag 缺少有效提交')
      if (object.type === 'commit') return { version, tag, commit: object.sha, dirty: false, state: 'tagged', ref: tag, repository: `https://github.com/${repository}` }
      if (object.type !== 'tag') break
      object = (await cached(`https://api.github.com/repos/${repository}/git/tags/${object.sha}`)).object
    }
    throw new Error('无法解析版本 Tag 的提交')
  }
  const raw = (kind, commit, file, json = true) => cached(`https://raw.githubusercontent.com/${repositories[kind]}/${commit}/${file}`, json)
  async function backend(tag) {
    const source = await identity('backend', tag)
    const documentation = validateDocumentation(await raw('backend', source.commit, 'docs/api-documentation.json'), source.version)
    const [versionSource, policy] = await Promise.all([raw('backend', source.commit, 'internal/global/common.go', false), raw('backend', source.commit, 'docs/release.json')])
    if (versionSource.match(/Version\s*=\s*"([^"]+)"/)?.[1] !== source.version) throw new Error('后端 Tag 与源码版本不一致')
    if (JSON.stringify(policy.compatibleFrontend) !== JSON.stringify(documentation.compatibleFrontend) || policy.upgradeGuide !== `docs/upgrades/${source.version}.md`) throw new Error('后端 API 文档与发布兼容声明不一致')
    return { source: { backendVersion: source.version, ...Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'version')), frontend: null, compatibility: { frontend: documentation.compatibleFrontend } }, documentation }
  }
  async function frontend(tag) {
    const source = await identity('frontend', tag)
    const [pkg, policy] = await Promise.all([raw('frontend', source.commit, 'package.json'), raw('frontend', source.commit, 'docs/release.json')])
    if (pkg.version !== source.version) throw new Error('管理后台 Tag 与 package.json 版本不一致')
    const range = policy.compatibleBackend
    if (!range || compareVersions(range.min, range.maxExclusive) >= 0) throw new Error('管理后台缺少有效后端兼容范围')
    return { source, compatibleBackend: range }
  }
  async function compatibleFrontend(backendVersion, frontendRange, releases, requestedTag = '') {
    const candidates = releases.filter((entry) => inRange(entry.version, frontendRange) && (!requestedTag || entry.tag === requestedTag)).sort((a, b) => compareVersions(b.version, a.version))
    if (requestedTag && !candidates.length) throw new Error('所选管理后台 Tag 未正式发布或不在后端兼容范围内')
    for (const entry of candidates) {
      const result = await frontend(entry.tag)
      if (inRange(backendVersion, result.compatibleBackend)) return result
      if (requestedTag) throw new Error('所选管理后台 Tag 不支持该后端版本')
    }
    return null
  }
  return { list, backend, frontend, compatibleFrontend }
}

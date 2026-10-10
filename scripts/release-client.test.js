import test from 'node:test'
import assert from 'node:assert/strict'
import { createReleaseClient, publishedReleases, releaseCacheTTL } from '../src/release-client.js'

const release = (version, extra = {}) => ({ tag_name: `v${version}`, published_at: '2026-10-10T00:00:00Z', ...extra })
function documentation(version = '0.10.0') {
  return { schemaVersion: 1, backendVersion: version, compatibleFrontend: { min: '0.10.0', maxExclusive: '0.11.0' },
    apiGroups: ['全部', '示例'], authDescription: { 公开: '无需凭证' },
    apiCatalog: [{ method: 'GET', path: '/example', title: '示例', auth: '公开', parameters: [], responseExample: { code: 0 } }],
    openapi: `info:\n  version: "${version}"\npaths:\n  "/example":\n    get:\n      summary: "示例"\n      x-security-policy: "public"\n`, errorCodes: { groups: [] }, upgradeGuide: '# 升级说明' }
}
function network() {
  const routes = new Map(), calls = []
  const fetcher = async (url, options) => {
    calls.push(url)
    assert.equal(options.credentials, 'omit')
    assert.equal(options.headers?.Authorization, undefined)
    const data = routes.get(url)
    if (data instanceof Response) return data.clone()
    if (data === undefined) throw new Error(`Unexpected URL: ${url}`)
    return new Response(typeof data === 'string' ? data : JSON.stringify(data))
  }
  const addTag = (kind, version, { annotated = false, range, doc = documentation(version), sourceVersion = version } = {}) => {
    const repository = kind === 'backend' ? 'wannanbigpig/gin-layout' : 'wannanbigpig/go-admin-ui'
    const sha = (kind === 'backend' ? 'a' : version.endsWith('2') ? 'b' : 'c').repeat(40)
    routes.set(`https://api.github.com/repos/${repository}/git/ref/tags/v${version}`, { object: { type: annotated ? 'tag' : 'commit', sha: annotated ? 'd'.repeat(40) : sha } })
    if (annotated) routes.set(`https://api.github.com/repos/${repository}/git/tags/${'d'.repeat(40)}`, { object: { type: 'commit', sha } })
    const raw = `https://raw.githubusercontent.com/${repository}/${sha}/`
    if (kind === 'backend') {
      routes.set(raw + 'docs/api-documentation.json', doc)
      routes.set(raw + 'internal/global/common.go', `var Version = "${sourceVersion}"`)
      routes.set(raw + 'docs/release.json', { compatibleFrontend: doc.compatibleFrontend, upgradeGuide: `docs/upgrades/${version}.md` })
    } else {
      routes.set(raw + 'package.json', { version: sourceVersion })
      routes.set(raw + 'docs/release.json', { compatibleBackend: range || { min: '0.10.0', maxExclusive: '0.11.0' } })
    }
    return raw
  }
  return { routes, calls, fetcher, addTag }
}

test('only formal releases enter the selector, ordered by semantic version', () => {
  const result = publishedReleases([release('0.10.2'), release('0.10.10'), release('0.11.0', { draft: true }), release('0.11.0-rc.1'), release('0.12.0', { prerelease: true }), release('0.13.0', { published_at: null }), release('01.0.0')])
  assert.deepEqual(result.map((entry) => entry.tag), ['v0.10.10', 'v0.10.2'])
})

test('release discovery paginates, caches for five minutes and supports forced refresh', async () => {
  const net = network(), stored = new Map()
  let time = 1000
  const storage = { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) }
  const url = 'https://api.github.com/repos/wannanbigpig/gin-layout/releases?per_page=100&page='
  net.routes.set(url + 1, Array.from({ length: 100 }, (_, i) => release(`0.10.${i}`)))
  net.routes.set(url + 2, [release('0.11.0')])
  const client = createReleaseClient({ fetcher: net.fetcher, storage, now: () => time })
  assert.equal((await client.list('backend'))[0].tag, 'v0.11.0')
  assert.equal(net.calls.length, 2)
  await client.list('backend'); assert.equal(net.calls.length, 2)
  await createReleaseClient({ fetcher: net.fetcher, storage, now: () => time }).list('backend'); assert.equal(net.calls.length, 2)
  await client.list('backend', true); assert.equal(net.calls.length, 4)
  time += releaseCacheTTL
  await client.list('backend'); assert.equal(net.calls.length, 6)
})

test('invalid persisted metadata is discarded and rate limits remain visible', async () => {
  const net = network(), url = 'https://api.github.com/repos/wannanbigpig/gin-layout/releases?per_page=100&page=1'
  net.routes.set(url, new Response('', { status: 403 }))
  const storage = { getItem: () => JSON.stringify({ at: 1000, entries: [{ tag: 'v9.0.0', version: '0.10.0' }] }) }
  const client = createReleaseClient({ fetcher: net.fetcher, storage, now: () => 1000 })
  await assert.rejects(client.list('backend'), /受限/)
  net.routes.set(url, [])
  assert.deepEqual(await client.list('backend'), [])
})

test('annotated tags resolve to a commit and documentation must agree with that source', async () => {
  const net = network()
  net.addTag('backend', '0.10.0', { annotated: true })
  const client = createReleaseClient({ fetcher: net.fetcher })
  const result = await client.backend('v0.10.0')
  assert.equal(result.source.commit, 'a'.repeat(40))
  assert.equal(result.documentation.apiCatalog[0].path, '/example')
  assert.ok(net.calls.some((url) => url.includes(`/git/tags/${'d'.repeat(40)}`)))
  assert.ok(net.calls.filter((url) => url.includes('raw.githubusercontent')).every((url) => url.includes('a'.repeat(40))))
  const broken = network(); broken.addTag('backend', '0.10.0', { sourceVersion: '0.11.0' })
  await assert.rejects(createReleaseClient({ fetcher: broken.fetcher }).backend('v0.10.0'), /源码版本/)
  const mismatch = network(); mismatch.addTag('backend', '0.10.0', { doc: documentation('0.11.0') })
  await assert.rejects(createReleaseClient({ fetcher: mismatch.fetcher }).backend('v0.10.0'), /文档版本/)
})

test('missing version documentation and conflicting backend compatibility are rejected', async () => {
  for (const missing of [true, false]) {
    const net = network(), raw = net.addTag('backend', '0.10.0')
    if (missing) net.routes.set(raw + 'docs/api-documentation.json', new Response('', { status: 404 }))
    else net.routes.set(raw + 'docs/release.json', { compatibleFrontend: { min: '0.11.0', maxExclusive: '0.12.0' }, upgradeGuide: 'docs/upgrades/0.10.0.md' })
    await assert.rejects(createReleaseClient({ fetcher: net.fetcher }).backend('v0.10.0'), missing ? /未提供/ : /发布兼容声明/)
  }
})

test('newest compatible admin tag must satisfy both directions and its own source version', async () => {
  const net = network()
  net.addTag('frontend', '0.10.3', { range: { min: '0.11.0', maxExclusive: '0.12.0' } })
  net.addTag('frontend', '0.10.2')
  const entries = publishedReleases([release('0.10.2'), release('0.10.3')])
  const client = createReleaseClient({ fetcher: net.fetcher }), range = { min: '0.10.0', maxExclusive: '0.11.0' }
  assert.equal((await client.compatibleFrontend('0.10.0', range, entries)).source.tag, 'v0.10.2')
  assert.equal(await client.compatibleFrontend('0.9.0', range, entries), null)
  await assert.rejects(client.compatibleFrontend('0.10.0', range, entries, 'v0.10.3'), /不支持/)
  await assert.rejects(client.compatibleFrontend('0.10.0', range, entries, 'v0.11.0'), /未正式发布/)
  const mismatch = network(); mismatch.addTag('frontend', '0.10.2', { sourceVersion: '0.10.3' })
  await assert.rejects(createReleaseClient({ fetcher: mismatch.fetcher }).frontend('v0.10.2'), /package.json/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { useAPIVersions } from '../src/api-versions.js'
import bundledSource from '../src/data/api-source.json' with { type: 'json' }

const range = { min: '0.10.0', maxExclusive: '0.12.0' }
const releases = (...tags) => tags.map((tag) => ({ tag, version: tag.slice(1) }))
function fixture(href = 'https://docs.example/api/') {
  const location = { href }, history = { pushState: (_, __, url) => { location.href = String(url) }, replaceState: (_, __, url) => { location.href = String(url) } }
  let backend = releases('v0.11.0', 'v0.10.0'), frontend = releases('v0.10.2')
  const calls = [], client = {
    list: async (kind) => kind === 'backend' ? backend : frontend,
    backend: async (tag) => {
      calls.push(tag)
      const version = tag.slice(1)
      return { source: { tag, backendVersion: version, frontend: null, compatibility: { frontend: range } },
        documentation: { compatibleFrontend: range, apiCatalog: [{ path: `/version/${version}`, parameters: [{ name: version }], responseExample: { version } }] } }
    },
    compatibleFrontend: async (_, __, entries, requestedTag) => {
      const tag = requestedTag || entries[0]?.tag
      return tag ? { source: { tag, state: 'tagged' }, compatibleBackend: range } : null
    }
  }
  const state = useAPIVersions({ client, location, history })
  return { state, client, calls, location, backend: (value) => { backend = value }, frontend: (value) => { frontend = value } }
}

test('unversioned visitors follow new releases; pinned URLs preserve the requested backend/admin pair', async () => {
  const f = fixture()
  await f.state.refresh()
  assert.equal(f.state.selected.value, 'v0.11.0')
  assert.equal(new URL(f.location.href).searchParams.get('adminVersion'), 'v0.10.2')
  f.backend(releases('v0.11.1', 'v0.11.0', 'v0.10.0')); f.frontend(releases('v0.10.3', 'v0.10.2'))
  await f.state.refresh(true)
  assert.equal(f.state.source.value.tag, 'v0.11.1')
  assert.equal(f.state.source.value.frontend.tag, 'v0.10.3')
  const pinned = fixture('https://docs.example/api/?apiVersion=v0.10.0&adminVersion=v0.10.2&view=errors')
  await pinned.state.refresh()
  assert.equal(pinned.state.selected.value, 'v0.10.0')
  assert.equal(pinned.state.source.value.frontend.tag, 'v0.10.2')
  assert.equal(pinned.state.view.value, 'errors')
})

test('switching versions replaces business fields and examples, and produces reloadable reference links', async () => {
  const f = fixture(); await f.state.refresh(); await f.state.choose('v0.10.0')
  const api = f.state.documentation.value.apiCatalog[0]
  assert.equal(api.path, '/version/0.10.0')
  assert.equal(api.parameters[0].name, '0.10.0')
  assert.equal(api.responseExample.version, '0.10.0')
  const link = new URL(f.state.referenceHref('upgrade'), f.location.href)
  assert.equal(link.searchParams.get('apiVersion'), 'v0.10.0')
  assert.equal(link.searchParams.get('adminVersion'), 'v0.10.2')
  assert.equal(link.searchParams.get('view'), 'upgrade')
  f.state.openReference('upgrade'); f.state.openReference('')
  assert.equal(new URL(f.location.href).searchParams.has('view'), false)
  f.location.href = 'https://docs.example/api/?apiVersion=v0.11.0&view=versions'
  await f.state.handleHistory()
  assert.equal(f.state.source.value.tag, 'v0.11.0')
  assert.equal(f.state.view.value, 'versions')
})

test('unknown or unavailable version never displays another version catalog', async () => {
  const f = fixture('https://docs.example/api/?apiVersion=v9.0.0')
  assert.equal(f.state.documentation.value, null)
  await f.state.refresh(); assert.match(f.state.error.value, /未正式发布/)
  assert.equal(f.state.documentation.value, null)
  await f.state.choose('v0.10.0'); assert.ok(f.state.documentation.value)
  f.client.backend = async () => { throw new Error('该版本缺少文档') }
  await f.state.choose('v0.11.0')
  assert.match(f.state.error.value, /缺少文档/)
  assert.equal(f.state.documentation.value, null)
  assert.equal(new URL(f.location.href).searchParams.get('apiVersion'), 'v0.11.0')
})

test('failed discovery retains the bundled source identity but cannot validate an explicit tag', async () => {
  for (const pinned of [false, true]) {
    const f = fixture(`https://docs.example/api/${pinned ? '?apiVersion=v0.10.0' : ''}`)
    f.client.list = async () => { throw new Error('版本查询受限') }
    await f.state.refresh()
    assert.match(f.state.discoveryError.value, /受限/)
    if (pinned) { assert.equal(f.state.documentation.value, null); assert.match(f.state.error.value, /无法核对/) }
    else { assert.equal(f.state.selected.value, 'current'); assert.deepEqual(f.state.source.value, bundledSource); assert.ok(f.state.documentation.value) }
  }
})

test('a backend without a compatible formal admin release can still show its own API documentation', async () => {
  const f = fixture(); f.frontend([]); await f.state.refresh()
  assert.ok(f.state.documentation.value)
  assert.equal(f.state.source.value.frontend, null)
  assert.equal(f.state.error.value, '')
})

test('unchanged automatic refresh does not clear the catalog or repeat version requests', async () => {
  const f = fixture(); await f.state.refresh(); await f.state.refresh(true)
  assert.deepEqual(f.calls, ['v0.11.0'])
  assert.ok(f.state.documentation.value)
  f.frontend(releases('v0.10.3', 'v0.10.2')); await f.state.refresh(true)
  assert.equal(f.state.source.value.frontend.tag, 'v0.10.3')
})

test('reading reference pages pins the visible version instead of changing content during reading', async () => {
  const f = fixture(); await f.state.refresh(); f.state.openReference('upgrade')
  f.backend(releases('v0.11.1', 'v0.11.0')); await f.state.refresh(true)
  assert.equal(f.state.source.value.tag, 'v0.11.0')
  assert.equal(f.state.view.value, 'upgrade')
})

test('late requests and disposal cannot overwrite the active version', async () => {
  const f = fixture(); await f.state.refresh()
  let resolve
  const original = f.client.backend
  f.client.backend = (tag) => tag === 'v0.10.0' ? new Promise((done) => { resolve = done }) : original(tag)
  const pending = f.state.choose('v0.10.0')
  await f.state.choose('v0.11.0')
  resolve(await original('v0.10.0')); await pending
  assert.equal(f.state.source.value.tag, 'v0.11.0')
  const disposed = f.state.choose('v0.10.0'); f.state.dispose()
  resolve(await original('v0.10.0')); await disposed
  assert.equal(f.state.source.value, null)
})

test('late release discovery cannot override a user selection', async () => {
  const f = fixture(); await f.state.refresh()
  let resolve
  f.client.list = (kind) => kind === 'backend' ? new Promise((done) => { resolve = done }) : Promise.resolve(releases('v0.10.2'))
  const pending = f.state.refresh(true)
  await f.state.choose('v0.10.0')
  resolve(releases('v0.11.1', 'v0.11.0', 'v0.10.0')); await pending
  assert.equal(f.state.source.value.tag, 'v0.10.0')
})

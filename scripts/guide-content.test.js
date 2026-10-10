import assert from 'node:assert/strict'
import test from 'node:test'
import { useGuideContent, guideHref } from '../src/guide-content.js'

test('internal guide links support new tabs and anchors without a website version', () => {
  const files = { overview: 'README.md', permissions: 'permissions.md' }
  assert.equal(guideHref('?guide=permissions', files), '?guide=permissions')
  assert.equal(guideHref('./README.md#section-1', files), '?guide=overview#section-1')
  assert.equal(guideHref('https://external.invalid/README.md', files), 'https://external.invalid/README.md')
  assert.equal(guideHref('#section-2', files), '#section-2')
})

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function setup(loaders) {
  const applied = []
  return { ...useGuideContent(loaders, (markdown) => applied.push(markdown)), applied }
}

test('late success cannot overwrite the latest guide', async () => {
  const a = deferred(), b = deferred()
  const state = setup({ a: () => a.promise, b: () => b.promise })
  const old = state.load('a'), current = state.load('b')
  b.resolve({ default: 'B' })
  await current
  a.resolve({ default: 'A' })
  await old
  assert.deepEqual(state.applied, ['B'])
  assert.equal(state.loading.value, false)
  assert.equal(state.error.value, null)
})

test('an old success or failure does not stop the current loading indicator', async (t) => {
  for (const outcome of ['resolve', 'reject']) {
    await t.test(outcome, async () => {
      const a = deferred(), b = deferred()
      const state = setup({ a: () => a.promise, b: () => b.promise })
      const old = state.load('a'), current = state.load('b')
      a[outcome](outcome === 'resolve' ? { default: 'A' } : new Error('old failure'))
      await old
      assert.equal(state.loading.value, true)
      assert.equal(state.error.value, null)
      assert.deepEqual(state.applied, [])
      b.resolve({ default: 'B' })
      await current
      assert.deepEqual(state.applied, ['B'])
    })
  }
})

test('cached navigation clears loading and ignores a pending guide response', async () => {
  const pending = deferred()
  const state = setup({ cached: async () => ({ default: 'cached body' }), pending: () => pending.promise })
  await state.load('cached')
  const old = state.load('pending')
  await state.load('cached')
  assert.equal(state.loading.value, false)
  pending.reject(new Error('stale failure'))
  await old
  assert.equal(state.error.value, null)
  assert.deepEqual(state.applied, ['cached body', 'cached body'])
})

test('current failure is visible and retry clears it before succeeding', async () => {
  const retry = deferred()
  let attempts = 0
  const state = setup({ guide: () => ++attempts === 1 ? Promise.reject(new Error('network')) : retry.promise })
  await state.load('guide')
  assert.equal(state.error.value.message, 'network')
  assert.equal(state.loading.value, false)
  assert.deepEqual(state.applied, [])
  const current = state.load('guide')
  assert.equal(state.error.value, null)
  assert.equal(state.loading.value, true)
  retry.resolve({ default: 'retried body' })
  await current
  assert.equal(attempts, 2)
  assert.deepEqual(state.applied, ['retried body'])
  assert.equal(state.loading.value, false)
})

test('A to B to A navigation still ignores the first A request', async () => {
  const first = deferred(), latest = deferred()
  let calls = 0
  const state = setup({ a: () => ++calls === 1 ? first.promise : latest.promise, b: async () => ({ default: 'B' }) })
  const old = state.load('a')
  await state.load('b')
  const current = state.load('a')
  first.resolve({ default: 'old A' })
  await old
  assert.deepEqual(state.applied, ['B'])
  assert.equal(state.loading.value, true)
  latest.resolve({ default: 'new A' })
  await current
  assert.deepEqual(state.applied, ['B', 'new A'])
})

test('unmounted readers ignore pending completions', async () => {
  const pending = deferred()
  const state = setup({ guide: () => pending.promise })
  const request = state.load('guide')
  state.dispose()
  pending.resolve({ default: 'body' })
  await request
  assert.deepEqual(state.applied, [])
  assert.equal(state.error.value, null)
})

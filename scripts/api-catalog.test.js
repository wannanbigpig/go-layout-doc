import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { apiCatalog } from '../src/data/api-catalog.js'

const endpoint = (method, path) => {
  const result = apiCatalog.find((item) => item.method === method && item.path === `/admin/v1/${path}`)
  assert.ok(result, `${method} ${path} must be documented`)
  return result
}

test('personal groups, export summary and notification deletion have usable contracts', () => {
  assert.deepEqual(endpoint('GET', 'todo/groups').responseExample.data, { groups: [{ id: 3, name: '工作' }] })
  assert.deepEqual(endpoint('POST', 'todo/group/create').requestBody, { name: '工作' })
  assert.deepEqual(endpoint('POST', 'todo/group/rename').requestBody, { id: 3, name: '项目工作' })
  assert.deepEqual(endpoint('POST', 'todo/group/delete').requestBody, { id: 3 })
  assert.deepEqual(endpoint('POST', 'todo/group/move').requestBody, { id: 12, group_id: 3 })
  assert.equal(endpoint('POST', 'todo/group/move').responseExample.data.group_id, 3)
  assert.deepEqual(Object.keys(endpoint('GET', 'system/export/summary').responseExample.data).sort(),
    ['total', 'pending', 'running', 'retrying', 'success', 'failed', 'canceled'].sort())
  assert.deepEqual(endpoint('POST', 'system/notification/delete').requestBody, { id: 15 })
})

test('personal export detail uses its public ID and excludes operational identifiers', () => {
  const detail = endpoint('GET', 'system/export/detail')
  assert.deepEqual(detail.parameters.map((item) => item.name), ['public_id'])
  assert.equal(detail.parameters[0].required, true)
  for (const item of [detail.responseExample.data, endpoint('GET', 'system/export/list').responseExample.data.data[0]]) {
    assert.match(item.public_id, /^[0-9a-f-]{36}$/)
    for (const field of ['id', 'task_run_id', 'trigger_user_id', 'file_id', 'queue', 'error_message']) {
      assert.equal(field in item, false, `personal export must not advertise ${field}`)
    }
  }
  assert.ok(endpoint('GET', 'system/export/list').responseExample.data.summary)
})

test('todo list and summary document optional group filtering and list summary', () => {
  for (const path of ['todo/list', 'todo/summary']) {
    const group = endpoint('GET', path).parameters.find((item) => item.name === 'group_id')
    assert.equal(group?.required, false)
    assert.match(group.description, /0/)
  }
  assert.ok(endpoint('GET', 'todo/list').responseExample.data.summary)
})

test('update payloads preserve required fields and exclude immutable fields', () => {
  const requiredByPath = {
    'admin-user/update': ['id'],
    'permission/update': ['id', 'name', 'sort'],
    'menu/update': ['id', 'title_i18n', 'type'],
    'role/update': ['id', 'name'],
    'department/update': ['id', 'name'],
    'product/update': ['id', 'name'],
    'system/config/update': ['id', 'config_key', 'config_name_i18n', 'value_type'],
    'system/dict/type/update': ['id', 'type_name_i18n'],
    'system/dict/item/update': ['id', 'type_code', 'label_i18n', 'value'],
  }
  for (const [path, required] of Object.entries(requiredByPath)) {
    const item = endpoint('POST', path)
    assert.deepEqual(item.parameters.filter((field) => field.required).map((field) => field.name).sort(), required.sort(), path)
    assert.deepEqual(item.responseExample.data, {})
  }
  for (const [path, immutable] of [['role', 'code'], ['system/dict/type', 'type_code']]) {
    assert.ok(immutable in endpoint('POST', `${path}/create`).requestBody)
    const update = endpoint('POST', `${path}/update`)
    assert.equal(immutable in update.requestBody, false)
    assert.equal(update.parameters.some((field) => field.name === immutable), false)
  }
})

test('product menu examples share the semantic component key', () => {
  const guide = fs.readFileSync(new URL('../docs/permissions.md', import.meta.url), 'utf8')
  const guideKeys = [...guide.matchAll(/"component_key"\s*:\s*"([^"]+)"/g)].map((match) => match[1])
  assert.deepEqual(guideKeys, ['product:index'])
  assert.equal(endpoint('POST', 'menu/update').requestBody.component_key, guideKeys[0])
})

test('product menu example resolves to the actual frontend product page', (t) => {
  // 配对检出时核对真实前端；独立官网 CI 可显式传入映射文件路径。
  const mapPath = process.env.FRONTEND_COMPONENT_MAP_PATH || fileURLToPath(
    new URL('../../../frontend/x-l-admin-vue3/src/router/componentMap.ts', import.meta.url))
  if (!process.env.FRONTEND_COMPONENT_MAP_PATH && !fs.existsSync(mapPath)) {
    t.skip('paired frontend checkout unavailable; set FRONTEND_COMPONENT_MAP_PATH to verify its contract')
    return
  }
  const mapSource = fs.readFileSync(mapPath, 'utf8')
  const mappings = new Map([...mapSource.matchAll(/'([^']+)'\s*:\s*\(\)\s*=>\s*import\('(@\/[^']+)'\)/g)]
    .map((match) => [match[1], match[2]]))
  const componentPath = mappings.get(endpoint('POST', 'menu/update').requestBody.component_key)
  assert.equal(componentPath, '@/views/business/product/index.vue', 'example must open the real product page')
  assert.ok(fs.existsSync(path.resolve(path.dirname(mapPath), '..', componentPath.slice(2))),
    'mapped product component must exist')
})

test('login, refresh and token-check samples match the response envelope', () => {
  assert.deepEqual(Object.keys(endpoint('GET', 'login-captcha').responseExample.data).sort(), ['answer', 'b64s', 'id'])
  for (const path of ['login', 'login/sms', 'auth/refresh']) {
    const data = endpoint('POST', path).responseExample.data
    assert.deepEqual(Object.keys(data).sort(), ['access_token', 'expires_at', 'token_type'])
    assert.equal(Number.isInteger(data.expires_at), true)
    assert.ok(data.expires_at > 1_000_000_000)
  }
  assert.deepEqual(endpoint('GET', 'auth/check-token').responseExample.data, { result: true })
})

test('array responses use data.result, consistent with the shared response writer', () => {
  for (const item of apiCatalog) {
    assert.equal(Array.isArray(item.responseExample?.data), false, `${item.method} ${item.path}`)
  }
})

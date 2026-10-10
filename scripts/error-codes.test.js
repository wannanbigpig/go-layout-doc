import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { filterErrorGroups } from '../src/error-codes.js'

const groups = [
    { file: 'internal/pkg/errors/code_auth.go', codes: [{ code: 20001, name: 'UserPasswordWrong', description: '用户密码错误' }] },
    { file: 'internal/pkg/errors/code_common.go', codes: [{ code: 10000, name: 'InvalidParameter', description: '参数错误' }] },
    { file: 'internal/pkg/errors/code_file.go', codes: [{ code: 20012, name: 'FileIdentifierInvalid', description: '文件标识错误' }] }
]

test('common errors appear first without changing version data or other group ordering', () => {
    const before = structuredClone(groups)
    const result = filterErrorGroups(groups)
    assert.deepEqual(result.map((group) => group.file), [groups[1].file, groups[0].file, groups[2].file])
    assert.deepEqual(groups, before)
})

test('error lookup accepts Chinese descriptions, numeric codes and case-insensitive names', () => {
    for (const query of [' 密码错误 ', '20001', 'userpasswordwrong']) {
        assert.deepEqual(filterErrorGroups(groups, query).flatMap((group) => group.codes), groups[0].codes)
    }
    assert.deepEqual(filterErrorGroups(groups, '不存在的说明'), [])
    assert.deepEqual(filterErrorGroups(groups, '错误').map((group) => group.file), [groups[1].file, groups[0].file, groups[2].file])
})

test('historical versions without descriptions keep their own codes searchable', () => {
    const historical = [{ file: 'code_auth.go', codes: [{ code: 20001, name: 'UserPasswordWrong' }] }, { ...groups[1], file: 'code_common.go' }]
    const result = filterErrorGroups(historical, '20001')
    assert.deepEqual(result[0].codes, historical[0].codes)
    assert.equal('description' in result[0].codes[0], false)
    assert.equal(filterErrorGroups(historical)[0].file, 'code_common.go')
})

test('bundled backend snapshot has Chinese explanations for every code and common errors first', () => {
    const { errorCodes } = JSON.parse(fs.readFileSync(new URL('../src/data/api-documentation.json', import.meta.url), 'utf8'))
    assert.match(errorCodes.groups[0].file, /\/code_common\.go$/)
    const codes = errorCodes.groups.flatMap((group) => group.codes)
    assert.equal(codes.length, errorCodes.total)
    assert.ok(codes.length > 0)
    for (const code of codes) assert.match(code.description, /\p{Script=Han}/u, code.name)
})

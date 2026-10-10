import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import assert from 'node:assert/strict'
import { synchronize, checkContract, assertCatalog, compareVersions, sourceRoots, sha256 } from './api-contract.js'

const live = { apiCatalog: [{ method: 'GET', path: '/example/:id', title: '示例', auth: '公开', parameters: [], responseExample: { code: 0 } }], apiGroups: ['全部', '示例'], authDescription: { 公开: '无需凭证' } }
const yaml = 'openapi: "3.0.0"\ninfo:\n  version: "0.10.0"\npaths:\n  "/example/{id}":\n    get:\n      summary: "示例"\n      x-security-policy: "public"\n'
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
function fixture(t) {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'api-contract-'))
    t.after(() => fs.rmSync(parent, { recursive: true, force: true }))
    const root = path.join(parent, 'website'), backendRoot = path.join(parent, 'backend'), frontendRoot = path.join(parent, 'frontend')
    function write(base, name, bytes) { fs.mkdirSync(path.dirname(path.join(base, name)), { recursive: true }); fs.writeFileSync(path.join(base, name), bytes) }
    for (const base of [root, backendRoot, frontendRoot]) {
        fs.mkdirSync(base)
        for (const args of [['init', '-q'], ['config', 'user.email', 'contract-test@example.invalid'], ['config', 'user.name', 'Contract Test']]) git(base, ...args)
    }
    write(root, 'package.json', '{"private":true}')
    write(root, 'docs/README.md', '# Initial guide\n')
    write(backendRoot, 'internal/global/common.go', 'var Version = "0.10.0"\n')
    write(backendRoot, 'docs/openapi.yaml', yaml)
    write(backendRoot, 'docs/error_codes.json', '{"groups":[]}\n')
    write(backendRoot, 'docs/upgrades/0.10.0.md', '# Backend upgrade guide\n')
    write(backendRoot, 'docs/release.json', JSON.stringify({ compatibleFrontend: { min: '0.10.0', maxExclusive: '0.11.0' }, upgradeGuide: 'docs/upgrades/0.10.0.md' }))
    // 管理端版本独立演进，不能假设其数字等于后端。
    write(frontendRoot, 'package.json', '{"version":"0.10.2"}')
    write(frontendRoot, 'docs/release.json', '{"compatibleBackend":{"min":"0.10.0","maxExclusive":"0.11.0"}}')
    for (const base of [backendRoot, frontendRoot]) { git(base, 'add', '.'); git(base, 'commit', '-qm', 'source') }
    const sync = (options = {}) => {
        write(backendRoot, 'docs/api-documentation.json', JSON.stringify({ schemaVersion: 1, backendVersion: '0.10.0', compatibleFrontend: JSON.parse(fs.readFileSync(path.join(backendRoot, 'docs/release.json'))).compatibleFrontend, ...live, openapi: yaml, errorCodes: { groups: [] }, upgradeGuide: '# Backend upgrade guide\n' }))
        return synchronize({ root, backendRoot, frontendRoot, ...live, ...options })
    }
    return { root, backendRoot, frontendRoot, write, sync }
}

test('API docs have no website version; unreleased backend and admin tags remain candidates', (t) => {
    const { root, backendRoot, frontendRoot, write, sync } = fixture(t)
    const source = sync()
    assert.equal(source.tag, 'v0.10.0')
    assert.equal(source.frontend.tag, 'v0.10.2')
    assert.equal(source.state, 'development')
    assert.equal(source.frontend.state, 'development')
    assert.equal('docsVersion' in source, false)
    assert.equal(fs.existsSync(path.join(root, 'public/api-versions')), false)
    assert.doesNotThrow(() => checkContract(root, live, { backendRoot, frontendRoot }))
    write(root, 'docs/README.md', '# Corrected tutorial, no API resync needed\n')
    assert.doesNotThrow(() => checkContract(root, live))
    git(backendRoot, 'tag', 'v0.10.0')
    write(backendRoot, 'untracked.txt', 'dirty')
    assert.equal(sync().state, 'development')
})

test('selected backend and frontend tags read their actual contents despite newer dirty checkouts', (t) => {
    const { root, backendRoot, frontendRoot, write, sync } = fixture(t)
    sync()
    git(backendRoot, 'add', '.')
    git(backendRoot, 'commit', '-qm', 'versioned docs')
    git(backendRoot, 'tag', '-am', 'backend release', 'v0.10.0')
    git(frontendRoot, 'tag', 'v0.10.2')
    write(backendRoot, 'internal/global/common.go', 'var Version = "0.11.0"\n')
    write(backendRoot, 'docs/openapi.yaml', yaml.replace('/example/', '/new/'))
    write(frontendRoot, 'package.json', '{"version":"0.12.0"}')
    const source = sync({ backendTag: 'v0.10.0', frontendTag: 'v0.10.2' })
    assert.equal(source.backendVersion, '0.10.0')
    assert.equal(source.frontend.version, '0.10.2')
    assert.equal(source.dirty, false)
    assert.equal(source.state, 'tagged')
    assert.equal(source.frontend.state, 'tagged')
    assert.equal(fs.readFileSync(path.join(root, 'docs/openapi.snapshot.yaml'), 'utf8'), yaml)
    assert.doesNotThrow(() => checkContract(root, live, { backendRoot, frontendRoot }))
})

test('missing tags and tags that disagree with their source version are rejected before writing', (t) => {
    const { root, backendRoot, frontendRoot, sync } = fixture(t)
    sync()
    const original = fs.readFileSync(path.join(root, 'src/data/api-source.json'), 'utf8')
    assert.throws(() => sync({ backendTag: 'v99.0.0' }))
    git(backendRoot, 'tag', 'v0.11.0')
    git(frontendRoot, 'tag', 'v0.10.3')
    assert.throws(() => sync({ backendTag: 'v0.11.0' }), /tag differs/)
    assert.throws(() => sync({ frontendTag: 'v0.10.3' }), /tag differs/)
    assert.equal(fs.readFileSync(path.join(root, 'src/data/api-source.json'), 'utf8'), original)
})

test('catalog drift in method, path, title, security, duplicates or business documentation is rejected', () => {
    assert.doesNotThrow(() => assertCatalog(yaml, live.apiCatalog))
    for (const change of [{ method: 'POST' }, { path: '/other' }, { title: '旧标题' }, { auth: '接口权限' }, { source: 'fallback' }, { parameters: null }, { responseExample: null }]) {
        assert.throws(() => assertCatalog(yaml, [{ ...live.apiCatalog[0], ...change }]), /differs|missing/)
    }
    assert.throws(() => assertCatalog(yaml, [...live.apiCatalog, ...live.apiCatalog]), /count differs/)
})

test('both compatibility directions are required, including exclusive upper bounds', (t) => {
    const { backendRoot, frontendRoot, write, sync } = fixture(t)
    assert.doesNotThrow(() => sync())
    write(frontendRoot, 'docs/release.json', '{"compatibleBackend":{"min":"0.9.0","maxExclusive":"0.10.0"}}')
    assert.throws(() => sync(), /Frontend → backend/)
    write(frontendRoot, 'docs/release.json', '{"compatibleBackend":{"min":"0.10.0","maxExclusive":"0.11.0"}}')
    write(backendRoot, 'docs/release.json', '{"compatibleFrontend":{"min":"0.10.0","maxExclusive":"0.10.2"},"upgradeGuide":"docs/upgrades/0.10.0.md"}')
    assert.throws(() => sync(), /Backend → frontend/)
})

test('download drift, imported catalog drift and actual source drift fail verification', (t) => {
    const { root, backendRoot, frontendRoot, write, sync } = fixture(t)
    for (const name of ['documentation.json', 'openapi.yaml', 'catalog.json', 'error-codes.json', 'upgrade-guide.md']) {
        sync()
        fs.appendFileSync(path.join(root, 'public/api-current', name), '\n')
        assert.throws(() => checkContract(root, live), /hash differs/)
    }
    sync()
    assert.throws(() => checkContract(root, { ...live, apiCatalog: [] }), /catalog differs/)
    write(backendRoot, 'docs/openapi.yaml', yaml.replace('示例', '后端新标题'))
    assert.throws(() => checkContract(root, live, { backendRoot }), /Backend source differs|documentation differs/)
    write(backendRoot, 'docs/openapi.yaml', yaml)
    sync()
    write(frontendRoot, 'package.json', '{"version":"0.10.3"}')
    assert.throws(() => checkContract(root, live, { frontendRoot }), /Frontend source differs/)
})

test('unrelated OpenAPI cannot be attributed to the declared backend version', (t) => {
    const { root, write, sync } = fixture(t)
    write(root, 'unrelated.yaml', yaml + '\n')
    assert.throws(() => sync({ openapiPath: path.join(root, 'unrelated.yaml') }), /declared backend/)
})

test('snapshot-only verification rejects business fields that differ between the catalog and full document', (t) => {
    const { root, write, sync } = fixture(t)
    const source = sync()
    const document = JSON.parse(fs.readFileSync(path.join(root, 'src/data/api-documentation.json')))
    document.apiCatalog[0].parameters.push({ name: 'inconsistent_field', location: 'Query' })
    const bytes = JSON.stringify(document, null, 2) + '\n'
    for (const name of ['src/data/api-documentation.json', 'public/api-current/documentation.json']) write(root, name, bytes)
    source.hashes.documentation = sha256(bytes)
    for (const name of ['src/data/api-source.json', 'public/api-current/source.json']) write(root, name, JSON.stringify(source, null, 2) + '\n')
    assert.throws(() => checkContract(root, live), /Bundled API documentation differs/)
})

test('an explicitly missing source root fails instead of falling back to bundled documents', (t) => {
    const previous = process.env.BACKEND_ROOT
    t.after(() => { if (previous === undefined) delete process.env.BACKEND_ROOT; else process.env.BACKEND_ROOT = previous })
    process.env.BACKEND_ROOT = path.join(os.tmpdir(), 'missing-source-' + Date.now())
    assert.throws(() => sourceRoots(os.tmpdir()), /BACKEND_ROOT not found/)
})

test('API compatibility comparison respects semantic version and prerelease ordering', () => {
    assert.equal(compareVersions('0.10.0-rc.2', '0.10.0-rc.10'), -1)
    assert.equal(compareVersions('0.10.0-rc.10', '0.10.0'), -1)
    assert.equal(compareVersions('0.10.10', '0.10.2'), 1)
    assert.throws(() => compareVersions('0.10.0-01', '0.10.0'), /prerelease/)
})

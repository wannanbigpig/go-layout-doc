import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { parseVersion, compareVersions, assertRange, assertCatalog, validateDocumentation } from '../src/api-documentation.js'
export { compareVersions, assertCatalog } from '../src/api-documentation.js'

const json = (value) => JSON.stringify(value, null, 2) + '\n'
const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8')
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const repositories = { backend: 'https://github.com/wannanbigpig/gin-layout', frontend: 'https://github.com/wannanbigpig/go-admin-ui' }
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function repositorySource(root, kind, requestedTag) {
    if (requestedTag) parseVersion(requestedTag.startsWith('v') ? requestedTag.slice(1) : '')
    const tagRef = requestedTag ? `refs/tags/${requestedTag}` : ''
    // 指定 Tag 时读取该 Tag 的文件，不能用同版本号的工作区文件冒充。
    const readSource = (name) => tagRef ? git(root, 'show', `${tagRef}:${name}`) : read(root, name)
    const version = kind === 'backend'
        ? readSource('internal/global/common.go').match(/Version\s*=\s*"([^"]+)"/)?.[1]
        : JSON.parse(readSource('package.json')).version
    parseVersion(version)
    const tag = `v${version}`
    if (requestedTag && requestedTag !== tag) throw new Error(`${kind} tag differs from its source version`)
    const commit = git(root, 'rev-parse', tagRef ? `${tagRef}^{commit}` : 'HEAD').trim()
    const dirty = !tagRef && Boolean(git(root, 'status', '--porcelain').trim())
    const tagged = Boolean(tagRef) || (!dirty && git(root, 'tag', '--points-at', 'HEAD').trim().split('\n').includes(tag))
    return { identity: { version, tag, commit, dirty, state: tagged ? 'tagged' : 'development', ref: tagged ? tag : commit, repository: repositories[kind] }, read: readSource }
}

function backendData(root, tag) {
    const backend = repositorySource(root, 'backend', tag)
    const openapi = backend.read('docs/openapi.yaml')
    if (!openapi.includes(`  version: "${backend.identity.version}"`)) throw new Error('OpenAPI version differs from backend source')
    const release = JSON.parse(backend.read('docs/release.json'))
    if (release.upgradeGuide !== `docs/upgrades/${backend.identity.version}.md`) throw new Error('Backend upgrade guide differs from its version')
    const errorCodes = backend.read('docs/error_codes.json'), upgradeGuide = backend.read(release.upgradeGuide)
    const documentationBytes = backend.read('docs/api-documentation.json')
    const documentation = validateDocumentation(JSON.parse(documentationBytes), backend.identity.version)
    if (documentation.openapi !== openapi || json(documentation.errorCodes) !== json(JSON.parse(errorCodes)) || documentation.upgradeGuide !== upgradeGuide || json(documentation.compatibleFrontend) !== json(release.compatibleFrontend)) throw new Error('Versioned API documentation differs from backend files')
    return { ...backend, openapi, errorCodes, upgradeGuide, documentation, documentationBytes, compatibleFrontend: release.compatibleFrontend }
}

function frontendData(root, tag) {
    const frontend = repositorySource(root, 'frontend', tag)
    const pkg = frontend.read('package.json'), release = frontend.read('docs/release.json')
    return { ...frontend, compatibleBackend: JSON.parse(release).compatibleBackend, hashes: { package: sha256(pkg), release: sha256(release) } }
}

export function synchronize({ root, backendRoot, frontendRoot, backendTag, frontendTag, openapiPath, ...live }) {
    const backend = backendData(backendRoot, backendTag), frontend = frontendData(frontendRoot, frontendTag)
    if (openapiPath && fs.readFileSync(openapiPath, 'utf8') !== backend.openapi) throw new Error('OpenAPI bytes differ from the declared backend source')
    assertRange(frontend.identity.version, backend.compatibleFrontend, 'Backend → frontend')
    assertRange(backend.identity.version, frontend.compatibleBackend, 'Frontend → backend')
    const canonical = Object.fromEntries(['apiCatalog', 'apiGroups', 'authDescription'].map((key) => [key, backend.documentation[key]]))
    if (Object.keys(live).length && json(live) !== json(canonical)) throw new Error('Website catalog differs from canonical backend documentation')
    const catalog = json(canonical)
    const source = {
        backendVersion: backend.identity.version, ...Object.fromEntries(Object.entries(backend.identity).filter(([key]) => key !== 'version')),
        frontend: { ...frontend.identity, hashes: frontend.hashes },
        compatibility: { frontend: backend.compatibleFrontend, backend: frontend.compatibleBackend },
        schemaCoverage: 'routes-and-security',
        hashes: { documentation: sha256(backend.documentationBytes), openapi: sha256(backend.openapi), catalog: sha256(catalog), errorCodes: sha256(backend.errorCodes), upgradeGuide: sha256(backend.upgradeGuide) }
    }
    const files = { 'documentation.json': backend.documentationBytes, 'openapi.yaml': backend.openapi, 'catalog.json': catalog, 'error-codes.json': backend.errorCodes, 'upgrade-guide.md': backend.upgradeGuide, 'source.json': json(source) }
    for (const [name, bytes] of Object.entries(files)) {
        const target = path.join(root, 'public/api-current', name)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, bytes)
    }
    for (const [name, bytes] of [['docs/openapi.snapshot.yaml', backend.openapi], ['src/data/api-source.json', json(source)], ['src/data/api-catalog.json', catalog], ['src/data/api-documentation.json', backend.documentationBytes]]) {
        fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true })
        fs.writeFileSync(path.join(root, name), bytes)
    }
    return source
}

function assertIdentity(identity, version, kind) {
    parseVersion(version)
    if (identity.tag !== `v${version}` || !/^[a-f0-9]{40,64}$/.test(identity.commit) || typeof identity.dirty !== 'boolean' || !['tagged', 'development'].includes(identity.state) || identity.repository !== repositories[kind]) throw new Error(`Invalid ${kind} source identity`)
    if (identity.ref !== (identity.state === 'tagged' ? identity.tag : identity.commit) || (identity.state === 'tagged' && identity.dirty)) throw new Error(`Invalid ${kind} tagged source`)
}

export function checkContract(root, live, { backendRoot, frontendRoot, openapiPath } = {}) {
    const source = JSON.parse(read(root, 'src/data/api-source.json'))
    assertIdentity(source, source.backendVersion, 'backend')
    assertIdentity(source.frontend, source.frontend?.version, 'frontend')
    assertRange(source.frontend.version, source.compatibility?.frontend, 'Backend → frontend')
    assertRange(source.backendVersion, source.compatibility?.backend, 'Frontend → backend')
    if (json(source) !== read(root, 'public/api-current/source.json')) throw new Error('API source identity differs; run sync:openapi')
    const directory = path.join(root, 'public/api-current')
    for (const [name, hash] of [['documentation.json', 'documentation'], ['openapi.yaml', 'openapi'], ['catalog.json', 'catalog'], ['error-codes.json', 'errorCodes'], ['upgrade-guide.md', 'upgradeGuide']]) {
        if (sha256(read(directory, name)) !== source.hashes[hash]) throw new Error(`API contract hash differs: ${name}`)
    }
    if (read(directory, 'catalog.json') !== json(live)) throw new Error('API catalog differs; run sync:openapi')
    if (read(root, 'src/data/api-documentation.json') !== read(directory, 'documentation.json')) throw new Error('Bundled API documentation differs; run sync:openapi')
    const documentation = validateDocumentation(JSON.parse(read(directory, 'documentation.json')), source.backendVersion)
    const canonical = Object.fromEntries(['apiCatalog', 'apiGroups', 'authDescription'].map((key) => [key, documentation[key]]))
    if (json(canonical) !== json(live) ||
        documentation.openapi !== read(directory, 'openapi.yaml') ||
        json(documentation.errorCodes) !== json(JSON.parse(read(directory, 'error-codes.json'))) ||
        documentation.upgradeGuide !== read(directory, 'upgrade-guide.md') ||
        json(documentation.compatibleFrontend) !== json(source.compatibility.frontend)) throw new Error('Bundled API documentation differs from its catalog or references; run sync:openapi')
    const openapi = read(directory, 'openapi.yaml')
    if (!openapi.includes(`  version: "${source.backendVersion}"`) || read(root, 'docs/openapi.snapshot.yaml') !== openapi) throw new Error('Repository OpenAPI differs from API version')
    assertCatalog(openapi, live.apiCatalog)
    JSON.parse(read(directory, 'error-codes.json'))
    if (openapiPath && fs.readFileSync(openapiPath, 'utf8') !== openapi) throw new Error('Selected OpenAPI differs from API version')
    if (backendRoot) {
        const backend = backendData(backendRoot, source.state === 'tagged' ? source.tag : '')
        const identity = { version: source.backendVersion, ...Object.fromEntries(Object.entries(source).filter(([key]) => ['tag', 'commit', 'dirty', 'state', 'ref', 'repository'].includes(key))) }
        if (json(backend.identity) !== json(identity) || backend.openapi !== openapi || sha256(backend.documentationBytes) !== source.hashes.documentation || sha256(backend.errorCodes) !== source.hashes.errorCodes || sha256(backend.upgradeGuide) !== source.hashes.upgradeGuide || json(backend.compatibleFrontend) !== json(source.compatibility.frontend)) throw new Error('Backend source differs from documented API version; run sync:openapi')
    }
    if (frontendRoot) {
        const frontend = frontendData(frontendRoot, source.frontend.state === 'tagged' ? source.frontend.tag : '')
        if (json({ ...frontend.identity, hashes: frontend.hashes }) !== json(source.frontend) || json(frontend.compatibleBackend) !== json(source.compatibility.backend)) throw new Error('Frontend source differs from documented frontend tag; run sync:openapi')
    }
    return source
}

export function sourceRoots(root, required = false) {
    const result = {}
    for (const [key, env, fallback] of [['backendRoot', 'BACKEND_ROOT', '../../go/src/go-layout'], ['frontendRoot', 'FRONTEND_ROOT', '../../frontend/x-l-admin-vue3']]) {
        const selected = process.env[env] || (key === 'backendRoot' && process.env.OPENAPI_PATH ? path.dirname(path.dirname(path.resolve(process.env.OPENAPI_PATH))) : path.resolve(root, fallback))
        if (fs.existsSync(selected)) result[key] = selected
        else if (process.env[env] || (key === 'backendRoot' && process.env.OPENAPI_PATH) || required) throw new Error(`${env} not found; set ${env} to the corresponding source checkout`)
    }
    if (process.env.OPENAPI_PATH) result.openapiPath = process.env.OPENAPI_PATH
    return result
}

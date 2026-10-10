export function parseVersion(value) {
    const match = typeof value === 'string' && value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\dA-Za-z.-]+))?$/)
    if (!match) throw new Error(`Invalid API or frontend version: ${value}`)
    const pre = match[4] ? match[4].split('.') : []
    if (pre.some((item) => !item || /^0\d+$/.test(item))) throw new Error('Invalid prerelease identifier')
    return { core: match.slice(1, 4).map(BigInt), pre }
}

export function compareVersions(a, b) {
    const av = parseVersion(a), bv = parseVersion(b)
    for (let i = 0; i < 3; i++) if (av.core[i] !== bv.core[i]) return av.core[i] < bv.core[i] ? -1 : 1
    if (!av.pre.length || !bv.pre.length) return av.pre.length === bv.pre.length ? 0 : av.pre.length ? -1 : 1
    for (let i = 0; i < Math.min(av.pre.length, bv.pre.length); i++) {
        const left = av.pre[i], right = bv.pre[i]
        if (left === right) continue
        const ln = /^\d+$/.test(left), rn = /^\d+$/.test(right)
        if (ln && rn) return BigInt(left) < BigInt(right) ? -1 : 1
        if (ln !== rn) return ln ? -1 : 1
        return left < right ? -1 : 1
    }
    return av.pre.length === bv.pre.length ? 0 : av.pre.length < bv.pre.length ? -1 : 1
}

export function assertRange(version, range, label) {
    if (!range || compareVersions(range.min, range.maxExclusive) >= 0 || compareVersions(version, range.min) < 0 || compareVersions(version, range.maxExclusive) >= 0) throw new Error(`${label} compatibility range does not include ${version}`)
}

export function assertCatalog(yaml, catalog) {
    const operations = new Map()
    let route = '', key = ''
    for (const line of yaml.split('\n')) {
        const p = line.match(/^  "([^"]+)":/)
        if (p) { route = p[1]; key = '' }
        const m = line.match(/^    (get|post|put|patch|delete|head|options|trace):/)
        if (m && route) {
            key = `${m[1].toUpperCase()} ${route.replace(/\{([^}]+)\}/g, ':$1')}`
            if (operations.has(key)) throw new Error(`Duplicate OpenAPI operation: ${key}`)
            operations.set(key, {})
        }
        const summary = line.match(/^      summary: ("(?:\\.|[^"])*")$/)
        const policy = line.match(/^      x-security-policy: "([^"]+)"$/)
        if (key && summary) operations.get(key).title = JSON.parse(summary[1])
        if (key && policy) operations.get(key).policy = policy[1]
    }
    const policies = { 公开: 'public', 'Access Token': 'access_token', 'Refresh Cookie': 'refresh_cookie', 'WebSocket Ticket': 'websocket_ticket', 接口权限: 'access_token_permission' }
    const keys = new Set(catalog.map((entry) => `${entry.method.toUpperCase()} ${entry.path}`))
    if (!operations.size || keys.size !== catalog.length || operations.size !== keys.size) throw new Error('Catalog operation count differs from OpenAPI')
    for (const entry of catalog) {
        const op = `${entry.method.toUpperCase()} ${entry.path}`, metadata = operations.get(op)
        if (!metadata || metadata.title !== entry.title || metadata.policy !== policies[entry.auth]) throw new Error(`Catalog metadata differs: ${op}`)
        if (entry.source === 'fallback' || !Array.isArray(entry.parameters) || !entry.responseExample) throw new Error(`Business documentation missing: ${op}`)
    }
}


export function validateDocumentation(documentation, expectedVersion) {
    if (!documentation || documentation.schemaVersion !== 1 || documentation.backendVersion !== expectedVersion) throw new Error('API 文档版本与所选后端版本不一致')
    parseVersion(expectedVersion)
    const range = documentation.compatibleFrontend
    if (!range || compareVersions(range.min, range.maxExclusive) >= 0) throw new Error('API 文档缺少有效管理端兼容范围')
    if (!Array.isArray(documentation.apiCatalog) || !Array.isArray(documentation.apiGroups) || !documentation.authDescription || !Array.isArray(documentation.errorCodes?.groups) || typeof documentation.upgradeGuide !== 'string' || !documentation.upgradeGuide.trim()) throw new Error('所选后端版本缺少完整 API 资料')
    if (typeof documentation.openapi !== 'string' || !documentation.openapi.includes(`  version: "${expectedVersion}"`)) throw new Error('OpenAPI 版本与所选后端版本不一致')
    assertCatalog(documentation.openapi, documentation.apiCatalog)
    return documentation
}

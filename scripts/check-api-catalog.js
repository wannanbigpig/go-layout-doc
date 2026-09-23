import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiCatalog } from '../src/data/api-catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 解析顺序（不依赖跨仓 CI checkout）：
 * 1. OPENAPI_PATH 环境变量
 * 2. 本机同目录布局下的后端 openapi（开发机）
 * 3. 仓库内 docs/openapi.snapshot.yaml（CI / 独立部署的固定真相）
 */
function resolveOpenApiPath() {
    const fromEnv = process.env.OPENAPI_PATH
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

    const sibling = path.resolve(__dirname, '../../../go/src/go-layout/docs/openapi.yaml')
    if (fs.existsSync(sibling)) return sibling

    const snapshot = path.resolve(__dirname, '../docs/openapi.snapshot.yaml')
    if (fs.existsSync(snapshot)) return snapshot

    return null
}

const openApiPath = resolveOpenApiPath()
if (!openApiPath) {
    console.error('未找到 openapi 来源：请设置 OPENAPI_PATH，或保留 docs/openapi.snapshot.yaml')
    process.exit(1)
}

const yaml = fs.readFileSync(openApiPath, 'utf8')
const openApiOps = new Set()
let currentPath = ''
for (const line of yaml.split('\n')) {
    const pathMatch = line.match(/^  "([^"]+)":/)
    if (pathMatch) {
        currentPath = pathMatch[1]
    }
    const methodMatch = line.match(/^    (get|post|put|delete):/)
    if (methodMatch && currentPath) {
        openApiOps.add(`${methodMatch[1].toUpperCase()} ${currentPath.replace(/\{([^}]+)\}/g, ':$1')}`)
    }
}

const catalogOps = new Set(apiCatalog.map((x) => `${x.method.toUpperCase()} ${x.path}`))
const missingInCatalog = [...openApiOps].filter((x) => !catalogOps.has(x))
const missingInOpenApi = [...catalogOps].filter((x) => !openApiOps.has(x))

if (missingInCatalog.length > 0 || missingInOpenApi.length > 0) {
    console.error('API 目录与 OpenAPI 不一致！')
    console.error(`openapi 来源: ${path.relative(path.resolve(__dirname, '..'), openApiPath)}`)
    if (missingInCatalog.length > 0) {
        console.error('官网 Catalog 缺失的接口:', missingInCatalog)
    }
    if (missingInOpenApi.length > 0) {
        console.error('OpenAPI 缺失的接口:', missingInOpenApi)
    }
    process.exit(1)
}

const sourceLabel = openApiPath.includes('openapi.snapshot')
    ? 'repo snapshot'
    : openApiPath.includes('go-layout')
        ? 'backend openapi.yaml'
        : openApiPath
console.log(`✅ API 目录与 OpenAPI 完全同步（${sourceLabel}），共 ${openApiOps.size} 个接口端点，零漂移。`)

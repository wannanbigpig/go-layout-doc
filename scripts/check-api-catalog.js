import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiCatalog, apiGroups, authDescription } from '../src/data/api-catalog.js'
import { checkContract, sourceRoots } from './api-contract.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
    const args = process.argv.slice(2)
    if (args.some((arg) => arg !== '--snapshot-only')) throw new Error('Usage: check-api-catalog.js [--snapshot-only]')
    const roots = args.includes('--snapshot-only') ? {} : sourceRoots(root)
    const source = checkContract(root, { apiCatalog, apiGroups, authDescription }, roots)
    const checked = [roots.backendRoot && '后端源码', roots.frontendRoot && '管理端源码'].filter(Boolean)
    console.log(`✅ API ${source.tag}：${apiCatalog.length} 个端点的方法、路径、标题、安全策略及示例覆盖一致；配套管理端 ${source.frontend.tag}，双方兼容范围满足。`)
    console.log(checked.length ? `已核对来源：${checked.join('、')}；后端 ${source.state}，管理端 ${source.frontend.state}。` : '仅核对仓库内契约快照；外部 Tag 未在此次检查中核对。')
} catch (error) { console.error(error.message); process.exitCode = 1 }

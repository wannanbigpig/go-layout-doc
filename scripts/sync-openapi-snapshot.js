import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const candidates = [
  process.env.OPENAPI_PATH,
  path.resolve(__dirname, '../../../go/src/go-layout/docs/openapi.yaml'),
  path.resolve(__dirname, '../../../../go/src/go-layout/docs/openapi.yaml'),
].filter(Boolean)

const source = candidates.find((p) => fs.existsSync(p))
if (!source) {
  console.error('未找到后端 openapi.yaml。可设置 OPENAPI_PATH 后重试。')
  process.exit(1)
}

const dest = path.join(root, 'docs/openapi.snapshot.yaml')
fs.copyFileSync(source, dest)
console.log(`✅ 已同步 openapi 快照: ${source} -> ${path.relative(root, dest)}`)

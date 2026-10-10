import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { synchronize, sourceRoots } from './api-contract.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
    if (process.argv.length > 2) throw new Error('Usage: sync-openapi-snapshot.js (set BACKEND_TAG / FRONTEND_TAG to select existing tags)')
    const source = synchronize({ root, ...sourceRoots(root, true), backendTag: process.env.BACKEND_TAG, frontendTag: process.env.FRONTEND_TAG })
    console.log(`Synced API ${source.tag} (${source.state}), admin ${source.frontend.tag} (${source.frontend.state}); no website version or tag required.`)
} catch (error) { console.error(error.message); process.exitCode = 1 }

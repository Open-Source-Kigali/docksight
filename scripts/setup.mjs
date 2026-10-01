import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const copies = [
  ['.env.example', '.env'],
  ['apps/server/.env.example', 'apps/server/.env'],
  ['apps/web/.env.example', 'apps/web/.env'],
]

for (const [from, to] of copies) {
  const source = resolve(root, from)
  const target = resolve(root, to)
  if (!existsSync(target)) {
    copyFileSync(source, target)
    console.log(`Created ${to}`)
  } else {
    console.log(`Skipped ${to} (already exists)`)
  }
}

console.log('Setup complete. Run: npm install && npm run docker:infra')

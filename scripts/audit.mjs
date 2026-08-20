// Audits agents.json data quality. Usage: node scripts/audit.mjs [agents.json]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = process.argv[2] ?? fileURLToPath(new URL('../agents.json', import.meta.url))
const agents = JSON.parse(readFileSync(file, 'utf8'))

const byCategory = {}
for (const a of agents) byCategory[a.metadata.category] = (byCategory[a.metadata.category] ?? 0) + 1

const descLens = agents.map((a) => a.description.length).sort((x, y) => x - y)
const contentLens = agents.map((a) => a.content.length).sort((x, y) => x - y)
const sum = (arr) => arr.reduce((x, y) => x + y, 0)
const pct = (arr, p) => arr[Math.floor((arr.length - 1) * p)]

console.log('total agents:', agents.length)
console.log('by category:', JSON.stringify(byCategory))

console.log('\n--- description length (chars) ---')
console.log('min:', descLens[0], '| avg:', Math.round(sum(descLens) / descLens.length), '| median:', pct(descLens, 0.5), '| p90:', pct(descLens, 0.9), '| max:', descLens[descLens.length - 1])
console.log('over 60 chars:', descLens.filter((n) => n > 60).length)
console.log('over 80 chars:', descLens.filter((n) => n > 80).length)
console.log('under 15 chars:', descLens.filter((n) => n < 15).length)

console.log('\n--- content length (chars) ---')
console.log('min:', contentLens[0], '| avg:', Math.round(sum(contentLens) / contentLens.length), '| median:', pct(contentLens, 0.5), '| p90:', pct(contentLens, 0.9), '| max:', contentLens[contentLens.length - 1])

console.log('\n--- issues ---')
const issues = []
const names = new Set()
for (const a of agents) {
  if (!a.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.name)) issues.push(`bad name: ${a.name}`)
  if (names.has(a.name)) issues.push(`duplicate name: ${a.name}`)
  names.add(a.name)
  if (!a.description) issues.push(`empty description: ${a.name}`)
  if (!a.content) issues.push(`empty content: ${a.name}`)
  if (!a.metadata?.category) issues.push(`missing category: ${a.name}`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(a.description + a.content)) issues.push(`control chars: ${a.name}`)
  if (/(\r|\r\n){2,}/.test(a.content)) issues.push(`double newlines in content: ${a.name}`)
}
console.log(issues.length === 0 ? 'none' : issues.join('\n'))

console.log('\n--- 10 longest descriptions ---')
for (const a of [...agents].sort((x, y) => y.description.length - x.description.length).slice(0, 10)) {
  console.log(`[${a.description.length}] ${a.name}: ${a.description}`)
}
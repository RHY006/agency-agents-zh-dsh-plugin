// Builds agents.json for the dsh plugin from a checkout of agency-agents-zh.
//
// Usage:
//   node scripts/build.mjs [path-to-agency-agents-zh]
//
// The source defaults to ./vendor/agency-agents-zh. Every Markdown file under
// the agent directories (all top-level category folders except `strategy`,
// whose files are strategy docs rather than agent personas) is parsed. Only
// files carrying a YAML frontmatter block with `name` and `description` are
// treated as agents. Skill names are the file stems, which are already unique
// kebab-case identifiers.
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = process.argv[2] ?? join(root, 'vendor', 'agency-agents-zh')
const outFile = join(root, 'agents.json')

// `strategy` is intentionally excluded: its Markdown files are playbooks and
// runbooks, not agent personas.
const AGENT_DIRS = [
  'academic',
  'design',
  'engineering',
  'finance',
  'game-development',
  'gis',
  'hr',
  'legal',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'security',
  'spatial-computing',
  'specialized',
  'supply-chain',
  'support',
  'testing',
]

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.includes(':')) continue
    const idx = line.indexOf(':')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) fields[key] = value
  }
  return { fields, body: md.slice(match[0].length).trim() }
}

function walkMarkdown(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkMarkdown(full))
    } else if (entry.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

const agents = []
const skipped = []
const seen = new Map()

for (const category of AGENT_DIRS) {
  const categoryDir = join(sourceDir, category)
  if (!exists(categoryDir)) {
    console.warn(`[build] missing category directory: ${categoryDir}`)
    continue
  }
  for (const file of walkMarkdown(categoryDir)) {
    const raw = readFileSync(file, 'utf8')
    const parsed = parseFrontmatter(raw)
    const name = basename(file, '.md')
    if (!parsed) {
      skipped.push({ file, reason: 'no frontmatter' })
      continue
    }
    const { fields, body } = parsed
    if (!fields.name || !fields.description) {
      skipped.push({ file, reason: `missing name/description (got name=${fields.name ?? '∅'}, description=${fields.description ? 'ok' : '∅'})` })
      continue
    }
    if (!SKILL_NAME.test(name)) {
      skipped.push({ file, reason: `invalid skill name "${name}"` })
      continue
    }
    if (seen.has(name)) {
      skipped.push({ file, reason: `duplicate skill name "${name}" (also ${seen.get(name)})` })
      continue
    }
    seen.set(name, file)
    agents.push({
      name,
      description: fields.description,
      whenToUse: fields.whenToUse || fields['适用场景'] || undefined,
      metadata: {
        title: fields.name,
        emoji: fields.emoji,
        color: fields.color,
        category,
      },
      content: body,
    })
  }
}

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(agents, null, 2), 'utf8')

const byCategory = {}
for (const agent of agents) {
  byCategory[agent.metadata.category] = (byCategory[agent.metadata.category] ?? 0) + 1
}

console.log(`[build] wrote ${outFile}`)
console.log(`[build] agents: ${agents.length}, skipped: ${skipped.length}`)
console.log('[build] by category:', JSON.stringify(byCategory))
if (skipped.length > 0) {
  console.log('[build] skipped files:')
  for (const s of skipped) console.log(`  - ${s.file} (${s.reason})`)
}

function exists(p) {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}
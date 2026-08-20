import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const agents = require('./agents.json')

export const name = 'agency-agents-zh'
export const inject = ['skills']

const VALID_CATEGORIES = new Set(agents.map((agent) => agent.metadata.category))

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

// Zero-dependency Standard Schema (https://standardschema.dev) object.
// Cordis validates a plugin's `Config` through `Config["~standard"].validate`
// and passes the normalized `value` to `apply(ctx, config)`.
export const Config = {
  '~standard': {
    version: 1,
    vendor: 'agency-agents-zh-dsh-plugin',
    validate(value) {
      if (value === undefined || value === null) value = {}
      if (typeof value !== 'object' || Array.isArray(value)) {
        return {
          issues: [{ message: 'config must be an object', path: [] }],
        }
      }
      const issues = []
      if (value.categories !== undefined && !isStringArray(value.categories)) {
        issues.push({ message: 'categories must be an array of strings', path: ['categories'] })
      }
      if (value.excludeCategories !== undefined && !isStringArray(value.excludeCategories)) {
        issues.push({ message: 'excludeCategories must be an array of strings', path: ['excludeCategories'] })
      }
      if (value.maxSkills !== undefined && !(Number.isInteger(value.maxSkills) && value.maxSkills > 0)) {
        issues.push({ message: 'maxSkills must be a positive integer', path: ['maxSkills'] })
      }
      if (issues.length > 0) return { issues }
      return {
        value: {
          categories: value.categories ?? [],
          excludeCategories: value.excludeCategories ?? [],
          maxSkills: value.maxSkills ?? 0,
        },
      }
    },
  },
}

export function apply(ctx, config = {}) {
  const categories = config.categories ?? []
  const excludeCategories = config.excludeCategories ?? []
  const maxSkills = config.maxSkills ?? 0

  let list = agents

  if (categories.length > 0) {
    const unknown = categories.filter((name) => !VALID_CATEGORIES.has(name))
    if (unknown.length > 0) {
      ctx.logger.warn(
        `[agency-agents-zh] ignoring unknown categories: ${unknown.join(', ')} ` +
          `(valid: ${[...VALID_CATEGORIES].sort().join(', ')})`,
      )
    }
    const known = new Set(categories.filter((name) => VALID_CATEGORIES.has(name)))
    if (known.size > 0) list = list.filter((agent) => known.has(agent.metadata.category))
  }

  if (excludeCategories.length > 0) {
    list = list.filter((agent) => !excludeCategories.includes(agent.metadata.category))
  }

  if (maxSkills > 0 && list.length > maxSkills) {
    ctx.logger.warn(
      `[agency-agents-zh] maxSkills=${maxSkills} truncates ${list.length} agents to ${maxSkills}`,
    )
    list = list.slice(0, maxSkills)
  }

  for (const agent of list) {
    const skill = {
      name: agent.name,
      description: agent.description,
      source: 'runtime',
      content: agent.content,
    }
    if (agent.whenToUse) skill.whenToUse = agent.whenToUse
    if (agent.metadata) skill.metadata = agent.metadata
    ctx.skills.register(skill)
  }

  ctx.logger.info(
    `[agency-agents-zh] registered ${list.length}/${agents.length} expert agent skills ` +
      `(categories: ${categories.length > 0 ? categories.join(',') : 'all'})`,
  )
}
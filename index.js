import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const agents = require('./agents.json')

export const name = 'agency-agents-zh'
export const inject = ['skills']

export function apply(ctx) {
  let registered = 0
  for (const agent of agents) {
    const skill = {
      name: agent.name,
      description: agent.description,
      source: 'runtime',
      content: agent.content,
    }
    if (agent.whenToUse) skill.whenToUse = agent.whenToUse
    if (agent.metadata) skill.metadata = agent.metadata
    ctx.skills.register(skill)
    registered += 1
  }

  ctx.logger.info(
    `[agency-agents-zh] registered ${registered} expert agent skills from agency-agents-zh`,
  )
}
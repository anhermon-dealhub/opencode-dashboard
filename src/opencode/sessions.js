import { readdir, readFile } from 'fs/promises'
import { basename, join } from 'path'
import { enrichSessionAgent, createCache } from './enrichment.js'

// Module-level cache for agent detection
const agentCache = createCache()

function determineStatus(ageMinutes, thresholds) {
  if (ageMinutes < thresholds.busyMinutes) return 'busy'
  if (ageMinutes < thresholds.staleMinutes) return 'idle'
  return 'stale'
}

function determinePhase(title, ageMinutes, thresholds) {
  const t = (title || '').toLowerCase()

  if (t.includes('research') || t.includes('explore') || t.includes('investigate')) return 'research'
  if (t.includes('plan') || t.includes('design') || t.includes('phase')) return 'planning'
  if (ageMinutes < thresholds.busyMinutes && (t.includes('implement') || t.includes('fix') || t.includes('add'))) return 'implementing'
  if (t.includes('complete') || t.includes('done') || t.includes('verify')) return 'done'

  return ageMinutes < thresholds.busyMinutes ? 'implementing' : 'done'
}

export async function discoverSessions(storageRoot, thresholds) {
  const sessions = []
  const sessionPath = join(storageRoot, 'session')

  let projects
  try {
    projects = await readdir(sessionPath, { withFileTypes: true })
  } catch {
    return []
  }

  for (const project of projects) {
    if (!project.isDirectory() || project.name === 'global') continue

    const projectPath = join(sessionPath, project.name)
    let files
    try {
      files = await readdir(projectPath)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.startsWith('ses_') || !file.endsWith('.json')) continue

      try {
        const content = await readFile(join(projectPath, file), 'utf-8')
        const session = JSON.parse(content)

        const now = Date.now()
        const updated = session.time?.updated || 0
        const ageMinutes = Math.floor((now - updated) / 60000)

        const status = determineStatus(ageMinutes, thresholds)
        const title = session.title || ''
        const phase = determinePhase(title, ageMinutes, thresholds)

        let description = title
        let agent = 'general'
        let isSubagent = false

        const subagentMatch = title.match(/@(\w+)\s+subagent/i)
        if (subagentMatch) {
          agent = subagentMatch[1]
          isSubagent = true
          description = title.replace(/\s*\(@\w+\s+subagent\)/i, '').trim()
        }

        const baseSession = {
          id: session.id,
          slug: session.slug || 'unknown',
          title: session.title,
          description,
          directory: session.directory,
          projectName: session.directory ? basename(session.directory) : 'unknown',
          updated,
          ageMinutes,
          status,
          phase,
          agent,
          isSubagent,
          parentID: session.parentID || null,
          version: session.version,
          summary: session.summary || { additions: 0, deletions: 0, files: 0 },
        }

        // Enrich with actual agent from message metadata if not already a subagent
        const enrichedSession = isSubagent 
          ? baseSession 
          : await enrichSessionAgent(baseSession, storageRoot, agentCache)

        sessions.push(enrichedSession)
      } catch {
        // Skip unreadable/bad JSON files.
      }
    }
  }

  sessions.sort((a, b) => b.updated - a.updated)
  return sessions
}

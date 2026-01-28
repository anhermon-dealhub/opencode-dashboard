import { Hono } from 'hono'
import { getConfig } from './src/config.js'
import { openUrl } from './src/open-url.js'
import { discoverSessions } from './src/opencode/sessions.js'
import { renderDashboardPage } from './src/ui/dashboardPage.js'

const app = new Hono()

const config = getConfig()

// API endpoint - get all sessions
app.get('/api/sessions', async (c) => {
  const sessions = await discoverSessions(
    config.opencode.storagePath,
    config.dashboard.thresholds,
  )
  return c.json(sessions)
})

// Endpoint to open a session in OpenCode
app.post('/api/open-session', async (c) => {
  const { sessionId } = await c.req.json()

  try {
    const url = `${config.opencode.webUrl}?session=${encodeURIComponent(sessionId)}`
    await openUrl(url)
    return c.json({ success: true, url })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Serve dashboard HTML
app.get('/', (c) => {
  return c.html(
    renderDashboardPage({
      title: 'OpenCode Dashboard',
      refreshIntervalMs: config.dashboard.refreshIntervalMs,
      opencodeWebUrl: config.opencode.webUrl,
    }),
  )
})

console.log(`OpenCode Dashboard running at http://${config.server.host}:${config.server.port}`)
console.log(`Monitoring OpenCode storage at: ${config.opencode.storagePath}`)

export default {
  port: config.server.port,
  fetch: app.fetch,
}

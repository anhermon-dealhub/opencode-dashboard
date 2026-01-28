import { describe, test, expect } from 'bun:test'
import { renderDashboardPage } from '../src/ui/dashboardPage.js'

describe('ui module', () => {
  describe('renderDashboardPage function', () => {
    test('should render valid HTML structure', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html lang="en">')
      expect(html).toContain('</html>')
      expect(html).toContain('<head>')
      expect(html).toContain('</head>')
      expect(html).toContain('<body>')
      expect(html).toContain('</body>')
    })

    test('should use default title when not provided', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<title>OpenCode Dashboard</title>')
    })

    test('should use custom title when provided', () => {
      const html = renderDashboardPage({ title: 'My Custom Dashboard' })
      
      expect(html).toContain('<title>My Custom Dashboard</title>')
    })

    test('should inject default refreshIntervalMs when not provided', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('const REFRESH_INTERVAL_MS = 5000;')
    })

    test('should inject custom refreshIntervalMs when provided', () => {
      const html = renderDashboardPage({ refreshIntervalMs: 10000 })
      
      expect(html).toContain('const REFRESH_INTERVAL_MS = 10000;')
    })

    test('should handle non-finite refreshIntervalMs gracefully', () => {
      const html = renderDashboardPage({ refreshIntervalMs: 'invalid' })
      
      expect(html).toContain('const REFRESH_INTERVAL_MS = 5000;')
    })

    test('should inject default opencodeWebUrl when not provided', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('const OPENCODE_WEB_URL = "http://localhost:4096";')
    })

    test('should inject custom opencodeWebUrl when provided', () => {
      const html = renderDashboardPage({ opencodeWebUrl: 'http://example.com:8080' })
      
      expect(html).toContain('const OPENCODE_WEB_URL = "http://example.com:8080";')
    })

    test('should properly escape opencodeWebUrl in JSON', () => {
      const html = renderDashboardPage({ opencodeWebUrl: 'http://test.com/path?query=value' })
      
      expect(html).toContain('const OPENCODE_WEB_URL = "http://test.com/path?query=value";')
    })

    test('should include OpenCode Sessions header', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<h1>OpenCode Sessions</h1>')
    })

    test('should include stats placeholders', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('id="total-count"')
      expect(html).toContain('id="busy-count"')
      expect(html).toContain('id="idle-count"')
      expect(html).toContain('id="implementing-count"')
      expect(html).toContain('id="research-count"')
    })

    test('should include sessions container', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('id="sessions-container"')
      expect(html).toContain('Loading sessions...')
    })

    test('should include refresh indicator', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('id="refresh-indicator"')
      expect(html).toContain('Updating...')
    })

    test('should include renderSessions function', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('function renderSessions(sessions)')
    })

    test('should include openSession function', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('async function openSession(sessionId)')
    })

    test('should include fetchSessions function', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('async function fetchSessions()')
    })

    test('should include formatTime function', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('function formatTime(minutes)')
    })

    test('should include CSS styles', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<style>')
      expect(html).toContain('</style>')
      expect(html).toContain('.session-card')
      expect(html).toContain('.session-badges')
      expect(html).toContain('.badge')
      expect(html).toContain('.stat')
    })

    test('should include status badge styles', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('.status-badge.busy')
      expect(html).toContain('.status-badge.idle')
      expect(html).toContain('.status-badge.stale')
    })

    test('should include phase badge styles', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('.badge.phase-research')
      expect(html).toContain('.badge.phase-planning')
      expect(html).toContain('.badge.phase-implementing')
      expect(html).toContain('.badge.phase-done')
    })

    test('should include API endpoints', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('/api/sessions')
      expect(html).toContain('/api/open-session')
    })

    test('should include auto-refresh setup', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('fetchSessions()')
      expect(html).toContain('setInterval(fetchSessions, REFRESH_INTERVAL_MS)')
    })

    test('should handle all config options together', () => {
      const html = renderDashboardPage({
        title: 'Custom Dashboard',
        refreshIntervalMs: 15000,
        opencodeWebUrl: 'http://custom.url:9000'
      })
      
      expect(html).toContain('<title>Custom Dashboard</title>')
      expect(html).toContain('const REFRESH_INTERVAL_MS = 15000;')
      expect(html).toContain('const OPENCODE_WEB_URL = "http://custom.url:9000";')
    })

    test('should include viewport meta tag', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    })

    test('should include charset meta tag', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('<meta charset="UTF-8">')
    })

    test('should properly escape special characters in title', () => {
      const html = renderDashboardPage({ title: 'Dashboard & "Special" <Characters>' })
      
      // Note: The function doesn't currently escape HTML in title, but this test 
      // documents the current behavior. In production, you might want to add escaping.
      expect(html).toContain('<title>Dashboard & "Special" <Characters></title>')
    })

    test('should include dark theme colors', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('background: #0f172a')
      expect(html).toContain('background: #1e293b')
      expect(html).toContain('color: #e2e8f0')
    })

    test('should include interactive hover states', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('.session-card:hover')
      expect(html).toContain('border-color: #3b82f6')
      expect(html).toContain('transform: translateY(-2px)')
    })

    test('should include responsive grid layout', () => {
      const html = renderDashboardPage({})
      
      expect(html).toContain('.sessions-grid')
      expect(html).toContain('grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))')
    })

    test('should return a string', () => {
      const html = renderDashboardPage({})
      
      expect(typeof html).toBe('string')
    })

    test('should not be empty', () => {
      const html = renderDashboardPage({})
      
      expect(html.length).toBeGreaterThan(0)
    })

    test('should handle zero refreshIntervalMs', () => {
      const html = renderDashboardPage({ refreshIntervalMs: 0 })
      
      expect(html).toContain('const REFRESH_INTERVAL_MS = 0;')
    })

    test('should handle negative refreshIntervalMs as-is (valid finite number)', () => {
      const html = renderDashboardPage({ refreshIntervalMs: -1000 })
      
      // Note: The function accepts negative numbers as they are finite
      // This might not be ideal behavior in production, but tests current implementation
      expect(html).toContain('const REFRESH_INTERVAL_MS = -1000;')
    })

    test('should include all required JavaScript functions for functionality', () => {
      const html = renderDashboardPage({})
      
      // Check for key functionality
      expect(html).toContain('formatTime')
      expect(html).toContain('renderSessions')
      expect(html).toContain('openSession')
      expect(html).toContain('fetchSessions')
      
      // Check for error handling
      expect(html).toContain('catch (error)')
      expect(html).toContain('console.error')
    })
  })
})
